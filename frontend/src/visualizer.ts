type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerTexture = {
  name: string; dataUrl: string; width: number; height: number;
  gridCols?: number; gridRows?: number; frames?: number; fps?: number;
};
type ServerShader = {
  type: string; name: string; code: string; complexity: number; version?: string;
  uniforms?: { name: string; type: string }[];
  textures?: ServerTexture[];
};

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;

  // server program & data
  private program: WebGLProgram | null = null;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private textures: { name: string; tex: WebGLTexture; unit: number; meta?: ServerTexture }[] = [];

  // WOW MODE (local) pipeline
  private wow = true; // default ON
  private fbA: WebGLFramebuffer | null = null;
  private fbB: WebGLFramebuffer | null = null;
  private texA: WebGLTexture | null = null;
  private texB: WebGLTexture | null = null;
  private copyProg: WebGLProgram | null = null;
  private wowProg: WebGLProgram | null = null;
  private posBuf: WebGLBuffer | null = null;
  private decay = 0.82; // trail decay (higher=longer)
  private wowUniforms: Record<string, WebGLUniformLocation | null> = {};

  // Stream sampler (kept valid)
  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null;
  private streamUnit = 5;
  private streamW = 1; private streamH = 1;

  // audio analysis
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private lastMag: Float32Array | null = null; // for spectral flux
  private fluxRing: number[] = [];
  private fluxIdx = 0;
  private fluxSize = 43; // ~0.7s at 60fps
  private env = 0; private envAttack=0.28; private envRelease=0.06;
  private lastEnergy = 0; private beat = 0; private beatCooldown = 0;
  private bands = [0,0,0,0]; // low, low-mid, high-mid, air
  private kick=0; private snare=0; private hat=0;

  private stream: MediaStream | null = null;
  private demo=false;

  // loop/fps
  private anim: number | null = null;
  private frames=0; private lastTick=performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => this.resizeCanvas());
    // Prefer WebGL1 for maximum GLSL compatibility
    this.gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if (!this.gl) { this.paintFallback(); this.opts.onStatus?.('WebGL not supported'); return; }
    this.initGLCommon();
    this.initDefaultStreamTexture();
  }

  // ───────────────────── GL init ─────────────────────
  private initGLCommon() {
    const gl = this.gl!;
    // full-screen quad
    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);
    const buf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW); this.posBuf = buf;

    // copy program (blit to screen)
    const vs = `
      attribute vec2 aPos; varying vec2 vUV;
      void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
    `;
    const fsCopy = `
      precision mediump float; varying vec2 vUV; uniform sampler2D uTex;
      void main(){ gl_FragColor = texture2D(uTex, vUV); }
    `;
    this.copyProg = this.link(vs, fsCopy);
    gl.useProgram(this.copyProg);
    const loc = gl.getAttribLocation(this.copyProg!, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);

    // WOW shader (feedback + kaleido + audio-react)
    const fsWow = `
      precision mediump float;
      varying vec2 vUV;
      uniform sampler2D uFeedback;
      uniform sampler2D uStreamTex;
      uniform vec2  uRes;
      uniform float uTime;
      uniform float uDecay;
      uniform float uEnv;     // smoothed RMS 0..1
      uniform float uBeat;    // 0..1 impulse
      uniform float uKick;    // 0..1
      uniform float uSnare;   // 0..1
      uniform float uHat;     // 0..1
      uniform float uLow;     // bands[0]
      uniform float uMid;     // bands[2]
      uniform float uAir;     // bands[3]

      // palette
      vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + t)); }

      vec2 kaleido(vec2 uv, float seg){
        uv = uv*2.0 - 1.0;
        float a = atan(uv.y, uv.x);
        float r = length(uv);
        float m = 6.2831/seg;
        a = mod(a, m);
        a = abs(a - 0.5*m);
        uv = vec2(cos(a), sin(a))*r;
        return uv*0.5 + 0.5;
      }

      void main(){
        vec2 res = uRes;
        vec2 uv = vUV;
        float t = uTime;

        // hats increase kaleido segments
        float seg = 5.0 + floor(uHat*7.0);
        uv = kaleido(uv, seg);

        // radial bass warp
        vec2 c = uv - 0.5;
        float r = length(c);
        float bassWarp = 0.35*uKick + 0.12*uSnare;
        uv += c * (bassWarp * r);

        // swirl drift with mids
        float angle = (uMid*0.8 + 0.2)*sin(t*0.4) + r*(0.3 + 0.25*uLow);
        vec2 sw = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (uv-0.5) + 0.5;
        vec3 stream = texture2D(uStreamTex, sw + vec2(t*0.02, -t*0.015)).rgb;

        // base pattern (bands animate frequency)
        float f1 = 16.0 + 9.0*uLow;
        float f2 = 22.0 + 12.0*uAir;
        float w = sin((uv.x+uv.y)*f1 + t*3.0 + uSnare*8.0)*0.5 + 0.5;
        float v = cos((uv.x-uv.y)*f2 - t*2.2 + uHat*12.0)*0.5 + 0.5;
        vec3 base = pal(w*0.7 + v*0.3 + t*0.05 + uMid*0.2);

        // previous frame (trail)
        vec3 prev = texture2D(uFeedback, uv + c*0.01*uEnv).rgb * uDecay;

        // composite with stream color
        vec3 col = mix(base, stream, 0.35 + 0.25*uAir);
        col = mix(prev, col, 0.55 + 0.4*(uEnv));

        // beat flash & chroma-ish tint
        col += uBeat * vec3(0.75, 0.5, 0.9);

        // vignette
        float vg = 1.0 - dot(c,c)*0.9;
        col *= clamp(vg, 0.25, 1.1);

        gl_FragColor = vec4(col,1.0);
      }
    `;
    this.wowProg = this.link(vs, fsWow);

    // allocate ping-pong FBOs
    this.ensureFBOs();
  }

  private link(vsSrc: string, fsSrc: string): WebGLProgram {
    const gl = this.gl!;
    const vs = gl.createShader(gl.VERTEX_SHADER)!; gl.shaderSource(vs, vsSrc); gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) throw new Error('VS: '+gl.getShaderInfoLog(vs));
    const fs = gl.createShader(gl.FRAGMENT_SHADER)!; gl.shaderSource(fs, fsSrc); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) throw new Error('FS: '+gl.getShaderInfoLog(fs));
    const p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('LINK: '+gl.getProgramInfoLog(p));
    return p;
  }

  private ensureFBOs() {
    const gl = this.gl!; if (!gl) return;
    const w = Math.max(2, Math.floor(this.canvas.width / 2));
    const h = Math.max(2, Math.floor(this.canvas.height / 2));

    const makeTex = () => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    const makeFB = (tex: WebGLTexture) => {
      const fb = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return fb;
    };

    // recreate if size changed
    const needNew =
      !this.texA || !this.texB ||
      (gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_WIDTH) !== w) || (gl.getTexParameter(gl.TEXTURE_2D, gl.TEXTURE_HEIGHT) !== h);

    if (!this.texA || !this.texB || needNew) {
      this.texA = makeTex(); this.fbA = makeFB(this.texA);
      this.texB = makeTex(); this.fbB = makeFB(this.texB);
    }
  }

  private initDefaultStreamTexture() {
    const gl = this.gl!;
    this.streamTex = gl.createTexture()!;
    this.streamW = 1; this.streamH = 1;
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.streamTex);
    const pix = new Uint8Array([0,0,0,255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pix);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  // ───────────────────── lifecycle ─────────────────────
  async start() {
    await this.loadServerShader('composite').catch(()=>{});
    this.connectStream();
    this.loop();
  }
  stop(){ if(this.anim) cancelAnimationFrame(this.anim); this.anim=null; this.ws?.close(); }

  // ───────────────────── server shader loader ─────────────────────
  async loadServerShader(type?: string) {
    const gl = this.gl!; if (!gl) return;
    const params = new URLSearchParams(); if (type) params.set('type', type); params.set('ts', Date.now().toString());
    const url = '/api/shader/next?' + params.toString();
    try {
      const r = await fetch(url, { cache:'no-store' }); if (!r.ok) throw new Error('HTTP '+r.status);
      const s = (await r.json()) as ServerShader;
      const prog = this.link(`
        attribute vec2 aPos; varying vec2 vUV;
        void main(){ vUV=aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0); }`, s.code);
      this.program = prog; this.u = {}; this.textures = [];

      this.useProgram(prog);
      // likely uniforms
      for (const name of ['uTime','uRes','uLevel','uBands','uPulse','uBeat','uBlendFlow','uBlendRD','uBlendStream','uFrame','uAtlasGrid','uAtlasFrames','uAtlasFPS','uStreamRes']) {
        this.u[name] = gl.getUniformLocation(prog, name);
      }
      // server textures
      let unit = 0;
      if (s.textures) for (const t of s.textures) {
        const tex = gl.createTexture()!;
        await this.uploadTexture(tex, t.dataUrl, unit, true);
        this.textures.push({ name:t.name, tex, unit, meta:t });
        const uSampler = gl.getUniformLocation(prog, t.name); if (uSampler) gl.uniform1i(uSampler, unit);
        if (t.gridCols && t.gridRows) {
          this.u['uAtlasGrid']   && gl.uniform2f(this.u['uAtlasGrid']!, t.gridCols, t.gridRows);
          this.u['uAtlasFrames'] && gl.uniform1f(this.u['uAtlasFrames']!, t.frames ?? (t.gridCols*t.gridRows));
          this.u['uAtlasFPS']    && gl.uniform1f(this.u['uAtlasFPS']!, t.fps ?? 24);
        }
        unit++;
      }
      // valid stream sampler
      const uSampler = gl.getUniformLocation(prog, 'uStreamTex'); if (uSampler) gl.uniform1i(uSampler, this.streamUnit);
      this.u['uStreamRes'] && gl.uniform2f(this.u['uStreamRes']!, this.streamW, this.streamH);
      this.opts.onStatus?.(`Loaded: ${s.name}`);
    } catch (e) {
      this.opts.onStatus?.('Server shader failed; using WOW mode');
      this.wow = true;
    }
  }

  private useProgram(p: WebGLProgram) {
    const gl = this.gl!; gl.useProgram(p);
    const loc = gl.getAttribLocation(p, 'aPos');
    if (loc !== -1) { gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }
  }

  private async uploadTexture(tex: WebGLTexture, dataUrl: string, unit: number, potWrap: boolean) {
    const gl = this.gl!;
    await new Promise<void>((resolve,reject)=>{
      const img = new Image();
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        const wrap = potWrap ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        resolve();
      };
      img.onerror = () => reject(new Error('texture load failed'));
      img.src = dataUrl;
    });
  }

  // ───────────────────── audio (screen share) ─────────────────────
  async startScreenShare(){
    const stream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:{ echoCancellation:false, noiseSuppression:false } });
    if(!stream.getAudioTracks().length){ stream.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser(); this.analyser.fftSize = 1024;
    const src = this.audioCtx.createMediaStreamSource(stream); src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.lastMag = new Float32Array(this.analyser.frequencyBinCount);
    this.stream = stream;
    const v = stream.getVideoTracks()[0]; if (v) v.onended = () => this.stopScreenShare();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; if(this.audioCtx){this.audioCtx.close().catch(()=>{}); this.audioCtx=null;} this.analyser=null; }
  isSharing(){ return !!this.stream; }
  setDemoMode(v:boolean){ this.demo=v; if(v) this.stopScreenShare(); }

  // ───────────────────── WS stream → texture ─────────────────────
  private connectStream() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws?.close();
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => { this.ws?.send(JSON.stringify({ type:'subscribe', field:'waves', w:256, h:256, fps:24 })); };
    this.ws.onmessage = (ev) => { if (typeof ev.data !== 'string') this.onStreamFrame(ev.data as ArrayBuffer); };
  }
  private onStreamFrame(buf: ArrayBuffer) {
    const gl = this.gl; if (!gl) return;
    const dv = new DataView(buf, 0, 24);
    const magic = String.fromCharCode(...new Uint8Array(buf.slice(0,8)));
    if (!magic.startsWith('FRAMEv1')) return;
    const w = dv.getUint32(8, true), h = dv.getUint32(12, true), ch = dv.getUint32(16, true);
    if (ch !== 4) return;
    const pixels = new Uint8Array(buf, 24);
    if (!this.streamTex || this.streamW !== w || this.streamH !== h) {
      this.streamTex = gl.createTexture()!;
      this.streamW = w; this.streamH = h;
      const uSampler = this.program ? gl.getUniformLocation(this.program!, 'uStreamTex') : null;
      if (uSampler) gl.uniform1i(uSampler, this.streamUnit);
    }
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.streamTex!);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    // allocate or update
    if (pixels.length === w*h*4) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  }

  // ───────────────────── main loop ─────────────────────
  private loop(){ const step=(now:number)=>{ this.render(now); this.anim=requestAnimationFrame(step) }; this.anim=requestAnimationFrame(step); }

  private render(now: number) {
    const gl = this.gl; if(!gl) return;

    // FPS
    this.frames++; const dt = now - this.lastTick;
    if(dt >= 1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastTick = now; }

    // Audio analysis (RMS, spectral flux, bands, kick/snare/hat)
    let level=0;
    if (this.analyser && this.freq) {
      this.analyser.getByteFrequencyData(this.freq);
      const N = this.freq.length;

      // magnitude spectrum 0..1
      const mag = new Float32Array(N);
      for (let i=0;i<N;i++) mag[i] = this.freq[i]/255;

      // spectral flux
      let flux = 0;
      if (this.lastMag) {
        for (let i=0;i<N;i++) {
          const d = mag[i] - this.lastMag[i];
          if (d > 0) flux += d;
        }
      }
      this.lastMag = mag;

      // adaptive threshold over ring buffer
      if (this.fluxRing.length < this.fluxSize) this.fluxRing.push(flux);
      else { this.fluxRing[this.fluxIdx] = flux; this.fluxIdx = (this.fluxIdx+1)%this.fluxSize; }
      const mean = this.fluxRing.reduce((a,b)=>a+b,0) / Math.max(1,this.fluxRing.length);
      const beatTrig = flux > mean * 1.35 && this.beatCooldown <= 0;
      this.beat = Math.max(0, this.beat - 0.12);
      if (beatTrig) { this.beat = 1.0; this.beatCooldown = 8; }
      if (this.beatCooldown>0) this.beatCooldown--;

      // RMS envelope with attack/release
      let sum=0; for (let i=0;i<N;i++) sum += mag[i]*mag[i];
      const rms=Math.sqrt(sum/N);
      if (rms > this.env) this.env += (rms-this.env)*this.envAttack; else this.env += (rms-this.env)*this.envRelease;
      level = this.env;

      // frequency bands from actual sampleRate
      const sr = this.audioCtx?.sampleRate || 48000;
      const ny = sr/2;
      const hzPerBin = ny / N;
      const bin = (hz:number)=>Math.max(0, Math.min(N-1, Math.round(hz / hzPerBin)));

      const kickLo=bin(20),  kickHi=bin(120);
      const snLo =bin(150),  snHi =bin(250);
      const hatLo=bin(5000), hatHi=bin(12000);
      const midLo=bin(500),  midHi=bin(2000);
      const lowLo=bin(80),   lowHi=bin(250);
      const airLo=bin(8000), airHi=bin(16000);

      const band=(a:number,b:number)=>{ let s=0; const A=Math.min(a,b), B=Math.max(a,b); const len=Math.max(1,B-A); for(let i=A;i<B;i++) s+=mag[i]; return s/len; };

      this.kick = band(kickLo,kickHi);
      this.snare = band(snLo,snHi);
      this.hat = band(hatLo,hatHi);
      this.bands[0] = band(lowLo,lowHi);
      this.bands[1] = band(snLo,snHi);
      this.bands[2] = band(midLo,midHi);
      this.bands[3] = band(airLo,airHi);
    } else if (this.demo) {
      const t = now/1000;
      level = 0.5 + 0.5*Math.sin(t*0.8);
      this.kick = (Math.sin(t*2.0)+1)/2;
      this.snare = (Math.sin(t*3.1+1)+1)/2;
      this.hat = (Math.sin(t*9.0+2)+1)/2;
      this.bands = [this.kick*0.8, this.snare*0.6, 0.5, this.hat*0.7];
      this.beat = Math.max(0, this.beat - 0.08);
      if (Math.sin(t*2.5) > 0.99) this.beat = 1.0;
    }

    if (this.wow) this.renderWOW(now/1000, level);
    else this.renderServer(now/1000, level);
  }

  private renderServer(timeSec:number, level:number){
    const gl = this.gl!; if (!this.program) { this.wow=true; return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

    this.useProgram(this.program);
    this.u['uTime']  && gl.uniform1f(this.u['uTime']!, timeSec);
    this.u['uRes']   && gl.uniform2f(this.u['uRes']!, this.canvas.width, this.canvas.height);
    this.u['uLevel'] && gl.uniform1f(this.u['uLevel']!, level);
    this.u['uBands'] && gl.uniform1fv(this.u['uBands']!, new Float32Array(this.bands));
    this.u['uPulse'] && gl.uniform1f(this.u['uPulse']!, Math.max(0, this.env-0.5)*2.0);
    this.u['uBeat']  && gl.uniform1f(this.u['uBeat']!, this.beat);

    for (const t of this.textures) { gl.activeTexture(gl.TEXTURE0 + t.unit); gl.bindTexture(gl.TEXTURE_2D, t.tex); }
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!);

    // Atlas anim if present
    const atlas = this.textures.find(t => t.meta && t.meta.gridCols && t.meta.gridRows);
    if (atlas?.meta) {
      const frames = atlas.meta.frames ?? (atlas.meta.gridCols! * atlas.meta.gridRows!);
      const fps    = atlas.meta.fps ?? 24;
      const frame  = Math.floor(timeSec * fps) % Math.max(1, frames);
      this.u['uAtlasGrid']   && gl.uniform2f(this.u['uAtlasGrid']!, atlas.meta.gridCols!, atlas.meta.gridRows!);
      this.u['uAtlasFrames'] && gl.uniform1f(this.u['uAtlasFrames']!, frames);
      this.u['uAtlasFPS']    && gl.uniform1f(this.u['uAtlasFPS']!, fps);
      this.u['uFrame']       && gl.uniform1f(this.u['uFrame']!, frame);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private renderWOW(timeSec:number, level:number){
    const gl = this.gl!; this.ensureFBOs();
    // pass 1: into fbA using wow shader; feedback = texB
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA);
    gl.viewport(0,0,Math.max(2, Math.floor(this.canvas.width/2)), Math.max(2, Math.floor(this.canvas.height/2)));
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

    this.useProgram(this.wowProg!);
    const u = (name:string)=>gl.getUniformLocation(this.wowProg!, name);
    gl.uniform1f(u('uTime')!, timeSec);
    gl.uniform2f(u('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(u('uDecay')!, this.decay);
    gl.uniform1f(u('uEnv')!, level);
    gl.uniform1f(u('uBeat')!, this.beat);
    gl.uniform1f(u('uKick')!, this.kick);
    gl.uniform1f(u('uSnare')!, this.snare);
    gl.uniform1f(u('uHat')!, this.hat);
    gl.uniform1f(u('uLow')!, this.bands[0]);
    gl.uniform1f(u('uMid')!, this.bands[2]);
    gl.uniform1f(u('uAir')!, this.bands[3]);

    // feedback sampler (unit 7)
    gl.activeTexture(gl.TEXTURE0 + 7);
    gl.bindTexture(gl.TEXTURE_2D, this.texB!);
    gl.uniform1i(u('uFeedback')!, 7);

    // stream sampler (unit 5 reserved)
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.streamTex!);
    gl.uniform1i(gl.getUniformLocation(this.wowProg!, 'uStreamTex')!, this.streamUnit);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // pass 2: blit fbA to screen
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
    this.useProgram(this.copyProg!);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texA!);
    gl.uniform1i(gl.getUniformLocation(this.copyProg!, 'uTex')!, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // swap ping-pong
    const t = this.texA; this.texA = this.texB; this.texB = t;
    const f = this.fbA;  this.fbA  = this.fbB;  this.fbB  = f;
  }

  // ───────────────────── utils ─────────────────────
  private paintFallback() {
    const ctx = this.canvas.getContext('2d'); if(!ctx) return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    const g=ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#0b1020'); g.addColorStop(1,'#000');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#9efcff'; ctx.font='14px system-ui,-apple-system,Segoe UI,Roboto';
    ctx.fillText('WebGL unavailable — using fallback',16,28);
  }

  private resizeCanvas() {
    const c = this.canvas.parentElement ?? document.body; const r = c.getBoundingClientRect();
    const cssW=Math.max(1, Math.floor(r.width)), cssH=Math.max(1, Math.floor((r.height||0)||420));
    const dpr=Math.max(1, Math.round((window.devicePixelRatio||1)));
    this.canvas.style.width=`${cssW}px`; this.canvas.style.height=`${cssH}px`;
    if(this.canvas.width!==cssW*dpr || this.canvas.height!==cssH*dpr){ this.canvas.width=cssW*dpr; this.canvas.height=cssH*dpr; }
    this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);
    this.ensureFBOs();
  }

  // exposed toggles
  public setDemoMode(v:boolean){ this.demo=v; if(v) this.stopScreenShare(); }
  public isSharing(){ return !!this.stream; }
  public toggleWow(){ this.wow = !this.wow; this.opts.onStatus?.(this.wow ? 'WOW mode (local)' : 'Server shader mode'); }
  public async loadServerShaderPublic(){ await this.loadServerShader('composite'); }
}
