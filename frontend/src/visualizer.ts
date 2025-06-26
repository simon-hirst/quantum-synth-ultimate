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
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;

  // uniforms & textures
  private u: Record<string, WebGLUniformLocation | null> = {};
  private textures: { name: string; tex: WebGLTexture; unit: number; meta?: ServerTexture }[] = [];

  // STREAM texture (updated via WS)
  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null;
  private streamUnit = 5; // keep out of the way of server-provided textures
  private streamW = 0; private streamH = 0;

  // audio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  // audio envelope / beat
  private env = 0; // smoothed RMS (0..1)
  private envAttack = 0.25; // faster rise
  private envRelease = 0.05; // slower fall
  private lastEnergy = 0;
  private beat = 0; // short impulse 0..1
  private beatCooldown = 0;

  private demo = false;

  // loop/fps
  private anim: number | null = null;
  private frames = 0;
  private lastTick = performance.now();

  // VS shared
  private vsrc = `
    attribute vec2 aPos;
    varying vec2 vUV;
    void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
  `;

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => this.resizeCanvas());
    this.gl = (canvas.getContext('webgl2') as GL) || (canvas.getContext('webgl') as GL);
    if (!this.gl) { this.paintFallback(); this.opts.onStatus?.('WebGL not supported'); }
  }

  async start() {
    await this.loadServerShader('composite'); // prefer composite by default
    this.connectStream(); // subscribe WS stream
    this.loop();
  }

  stop(){ if(this.anim) cancelAnimationFrame(this.anim); this.anim=null; this.ws?.close(); }

  // ------- Screen share -------
  async startScreenShare(){
    const stream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:{ echoCancellation:false, noiseSuppression:false } });
    if(!stream.getAudioTracks().length){ stream.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser(); this.analyser.fftSize = 1024; // finer bands
    const src = this.audioCtx.createMediaStreamSource(stream); src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.stream = stream;
    const v = stream.getVideoTracks()[0]; if (v) v.onended = () => this.stopScreenShare();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; if(this.audioCtx){this.audioCtx.close().catch(()=>{}); this.audioCtx=null;} this.analyser=null; }
  isSharing(){ return !!this.stream; }
  setDemoMode(v:boolean){ this.demo=v; if(v) this.stopScreenShare(); }

  // ------- Server shader -------
  async loadServerShader(type?: string) {
    if (!this.gl) return;
    this.opts.onStatus?.('Fetching shader…');
    try {
      const url = '/api/shader/next' + (type ? `?type=${encodeURIComponent(type)}` : '') + '&ts=' + Date.now();
      const res = await fetch(url, { cache:'no-store' });
      if(!res.ok) throw new Error('fetch failed: '+res.status);
      const payload = (await res.json()) as ServerShader;
      await this.buildFromServer(payload);
      this.opts.onStatus?.(`Loaded: ${payload.name}`);
    } catch (e) {
      this.opts.onStatus?.('Backend unreachable; using local shader');
      await this.buildLocal();
    }
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl!; const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)){ const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('Shader compile error: '+log); }
    return sh;
  }

  private async buildFromServer(s: ServerShader) {
    const gl = this.gl!;

    const vsh = this.compile(gl.VERTEX_SHADER, this.vsrc);
    const fsh = this.compile(gl.FRAGMENT_SHADER, s.code);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if(!gl.getProgramParameter(prog, gl.LINK_STATUS)){ console.error('Program link error:', gl.getProgramInfoLog(prog)); await this.buildLocal(); return; }
    this.program = prog;
    this.u = {}; this.textures = [];

    // Quad
    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);
    const buf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW); this.buffer = buf;
    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Likely uniforms
    for (const name of ['uTime','uRes','uLevel','uBands','uPulse','uBeat','uBlendFlow','uBlendRD','uBlendStream','uFrame','uAtlasGrid','uAtlasFrames','uAtlasFPS','uStreamRes']) {
      this.u[name] = gl.getUniformLocation(this.program, name);
    }

    // Server textures
    let unit = 0;
    if (Array.isArray(s.textures)) {
      for (const t of s.textures) {
        const tex = gl.createTexture()!;
        await this.uploadTexture(tex, t.dataUrl, unit, true);
        this.textures.push({ name: t.name, tex, unit, meta: t });
        const uSampler = gl.getUniformLocation(this.program, t.name);
        if (uSampler) gl.uniform1i(uSampler, unit);
        unit++;
        if (t.gridCols && t.gridRows) {
          this.u['uAtlasGrid']   && gl.uniform2f(this.u['uAtlasGrid']!, t.gridCols, t.gridRows);
          this.u['uAtlasFrames'] && gl.uniform1f(this.u['uAtlasFrames']!, t.frames ?? (t.gridCols*t.gridRows));
          this.u['uAtlasFPS']    && gl.uniform1f(this.u['uAtlasFPS']!, t.fps ?? 24);
        }
      }
    }

    // Prepare stream texture sampler binding (even if frames arrive later)
    if (this.streamTex) {
      const uSampler = gl.getUniformLocation(this.program, 'uStreamTex');
      if (uSampler) gl.uniform1i(uSampler, this.streamUnit);
      if (this.u['uStreamRes']) gl.uniform2f(this.u['uStreamRes']!, this.streamW, this.streamH);
    }

    this.resizeCanvas();
  }

  private async buildLocal() {
    const gl = this.gl!;
    const vsh = this.compile(gl.VERTEX_SHADER, this.vsrc);
    const fsh = this.compile(gl.FRAGMENT_SHADER, `
      precision mediump float; varying vec2 vUV; uniform float uTime, uLevel; void main(){
        float t=uTime*.6; vec3 col=vec3(.4+.6*sin(t+(vUV.x+vUV.y)*18.0), .4+.6*sin(t+(vUV.x-vUV.y)*22.0+2.1), .4+.6*sin(t+vUV.y*20.0+4.2))*(.5+1.5*uLevel);
        gl_FragColor=vec4(col,1.0);
      }`);
    const prog = gl.createProgram()!; gl.attachShader(prog,vsh); gl.attachShader(prog,fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('Link error:', gl.getProgramInfoLog(prog)); this.paintFallback(); return; }
    this.program = prog; this.u = { uTime: gl.getUniformLocation(prog,'uTime'), uLevel: gl.getUniformLocation(prog,'uLevel') };
    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);
    const buf = gl.createBuffer()!; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf; gl.useProgram(prog); const loc = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.resizeCanvas();
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

  // ------- WS stream → texture -------
  private connectStream() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws?.close();
    this.ws = new WebSocket(`${proto}//${location.host}/ws`);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = () => {
      this.opts.onStatus?.('WS connected (stream)…');
      this.ws?.send(JSON.stringify({ type:'subscribe', field:'waves', w:256, h:256, fps:24 }));
    };
    this.ws.onmessage = (ev) => {
      if (typeof ev.data === 'string') return; // ignore text for now
      this.onStreamFrame(ev.data as ArrayBuffer);
    };
    this.ws.onerror = () => this.opts.onStatus?.('WS error');
    this.ws.onclose = () => this.opts.onStatus?.('WS disconnected');
  }

  private onStreamFrame(buf: ArrayBuffer) {
    const gl = this.gl; if (!gl) return;
    const dv = new DataView(buf, 0, 24);
    const magic = String.fromCharCode(...new Uint8Array(buf.slice(0,8)));
    if (!magic.startsWith('FRAMEv1')) return;
    const w = dv.getUint32(8, true), h = dv.getUint32(12, true), ch = dv.getUint32(16, true);
    const pixels = new Uint8Array(buf, 24);
    if (ch !== 4) return;

    // (re)create texture if size changed
    if (!this.streamTex || this.streamW !== w || this.streamH !== h) {
      this.streamTex = gl.createTexture()!;
      this.streamW = w; this.streamH = h;
      gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.streamTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      // bind sampler
      const uSampler = gl.getUniformLocation(this.program!, 'uStreamTex');
      if (uSampler) gl.uniform1i(uSampler, this.streamUnit);
      if (this.u['uStreamRes']) gl.uniform2f(this.u['uStreamRes']!, w, h);
    } else {
      gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.streamTex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    }
  }

  // ------- Render loop -------
  private loop(){ const step = (now:number)=>{ this.render(now); this.anim = requestAnimationFrame(step) }; this.anim = requestAnimationFrame(step); }

  private render(now: number) {
    const gl = this.gl; if(!gl || !this.program) return;

    // FPS
    this.frames++; const dt = now - this.lastTick;
    if(dt >= 1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastTick = now; }

    // Audio analysis → env (RMS) + bands + beat
    let level = 0; let bands = [0,0,0,0];
    if (this.analyser && this.freq) {
      this.analyser.getByteFrequencyData(this.freq);
      const N = this.freq.length;

      // RMS (normalize)
      let sum=0; for (let i=0;i<N;i++) { const v=this.freq[i]/255; sum += v*v; }
      const rms = Math.sqrt(sum/N);

      // attack/release smoothing
      if (rms > this.env) this.env = this.env + (rms - this.env)*this.envAttack;
      else this.env = this.env + (rms - this.env)*this.envRelease;

      // crude onset: if energy jumps vs trailing average and cooldown<=0
      const energy = rms;
      const diff = energy - this.lastEnergy;
      this.lastEnergy = energy;
      this.beat = Math.max(0, this.beat - 0.12); // decay
      if (diff > 0.08 && this.beatCooldown <= 0) { this.beat = 1.0; this.beatCooldown = 8; }
      if (this.beatCooldown > 0) this.beatCooldown--;

      const band = (a:number,b:number)=>{ let s=0; for(let i=a;i<b;i++) s+=this.freq[i]; return s/((b-a)*255); };
      bands[0]=band(0,N/8|0); bands[1]=band(N/8|0,N/4|0); bands[2]=band(N/4|0,N/2|0); bands[3]=band(N/2|0,N);
      level = this.env;
    } else if (this.demo) {
      const t = now/1000;
      bands=[(Math.sin(t*1.2)+1)/2,(Math.sin(t*1.7+1)+1)/2,(Math.sin(t*2.3+2)+1)/2,(Math.sin(t*2.9+3)+1)/2];
      level=(bands[0]+bands[1]+bands[2]+bands[3])/4;
      this.beat = Math.max(0, this.beat - 0.05);
      if (Math.sin(t*2.5) > 0.995) this.beat = 1.0;
      if (this.beat > 0) this.beat -= 0.06;
    }

    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);

    // common uniforms
    this.u['uTime']  && gl.uniform1f(this.u['uTime']!, now/1000);
    this.u['uRes']   && gl.uniform2f(this.u['uRes']!, this.canvas.width, this.canvas.height);
    this.u['uLevel'] && gl.uniform1f(this.u['uLevel']!, level);
    this.u['uBands'] && gl.uniform1fv(this.u['uBands']!, new Float32Array(bands));
    this.u['uPulse'] && gl.uniform1f(this.u['uPulse']!, Math.max(0, this.env - 0.5)*2.0);
    this.u['uBeat']  && gl.uniform1f(this.u['uBeat']!, this.beat);

    // Atlas animation if present
    const atlas = this.textures.find(t => t.meta && t.meta.gridCols && t.meta.gridRows);
    if (atlas?.meta) {
      const frames = atlas.meta.frames ?? (atlas.meta.gridCols! * atlas.meta.gridRows!);
      const fps    = atlas.meta.fps ?? 24;
      const frame  = Math.floor((now/1000) * fps) % Math.max(1, frames);
      this.u['uAtlasGrid']   && gl.uniform2f(this.u['uAtlasGrid']!, atlas.meta.gridCols!, atlas.meta.gridRows!);
      this.u['uAtlasFrames'] && gl.uniform1f(this.u['uAtlasFrames']!, frames);
      this.u['uAtlasFPS']    && gl.uniform1f(this.u['uAtlasFPS']!, fps);
      this.u['uFrame']       && gl.uniform1f(this.u['uFrame']!, frame);
    }

    // Blend weights: reactive mapping
    // Flow fills lows, RD is mid-highs, Stream kicks on peaks & beats
    const wFlow   = 0.4*(1.0 - Math.min(1, level*1.2)) + 0.15*bands[0];
    const wRD     = 0.4 + 0.6*bands[2];
    const wStream = Math.min(1, 0.2 + 1.8*level) + this.beat*0.4;

    this.u['uBlendFlow']   && gl.uniform1f(this.u['uBlendFlow']!, wFlow);
    this.u['uBlendRD']     && gl.uniform1f(this.u['uBlendRD']!, wRD);
    this.u['uBlendStream'] && gl.uniform1f(this.u['uBlendStream']!, wStream);

    // Bind server textures
    for (const t of this.textures) {
      gl.activeTexture(gl.TEXTURE0 + t.unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
    }
    // Bind stream texture if present
    if (this.streamTex) {
      gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
      gl.bindTexture(gl.TEXTURE_2D, this.streamTex);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // ------- Utils -------
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
    const dpr=Math.max(1, Math.round(window.devicePixelRatio||1));
    this.canvas.style.width=`${cssW}px`; this.canvas.style.height=`${cssH}px`;
    if(this.canvas.width!==cssW*dpr || this.canvas.height!==cssH*dpr){ this.canvas.width=cssW*dpr; this.canvas.height=cssH*dpr; }
    this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);
  }
}
