type GL = WebGLRenderingContext | WebGL2RenderingContext;

type VizOpts = {
  onStatus?: (s: string) => void;
  onFps?: (fps: number) => void;
};

type ServerTexture = {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
};

type ServerShader = {
  type: string;
  name: string;
  code: string;            // full fragment shader (expects varying vUV)
  complexity: number;
  uniforms?: { name: string; type: string; }[];
  textures?: ServerTexture[];
  version?: string;
};

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;

  // GL objects
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private vertexShaderSrc = `
    attribute vec2 aPos;
    varying vec2 vUV;
    void main(){
      vUV = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  // audio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private demo = false;

  // uniforms (dynamic map)
  private u: Record<string, WebGLUniformLocation | null> = {};
  private textures: { name: string; tex: WebGLTexture; unit: number; }[] = [];

  // loop/fps
  private anim: number | null = null;
  private frames = 0;
  private lastTick = performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => this.resizeCanvas());

    this.gl = (canvas.getContext('webgl2') as GL) || (canvas.getContext('webgl') as GL);
    if (!this.gl) {
      this.paintFallback();
      this.opts.onStatus?.('WebGL not supported');
      return;
    }
  }

  async start() {
    await this.loadServerShader();
    this.loop();
  }

  stop() { if (this.anim) cancelAnimationFrame(this.anim); this.anim = null; }

  // ---- Screen share ----
  async startScreenShare() {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false }
    });
    if (!stream.getAudioTracks().length) { stream.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    const src = this.audioCtx.createMediaStreamSource(stream);
    src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.stream = stream;
    const v = stream.getVideoTracks()[0];
    if (v) v.onended = () => this.stopScreenShare();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; if(this.audioCtx){this.audioCtx.close().catch(()=>{}); this.audioCtx=null;} this.analyser=null; }
  isSharing(){ return !!this.stream; }
  setDemoMode(v:boolean){ this.demo = v; if(v) this.stopScreenShare(); }

  // ---- Server shader loader ----
  async loadServerShader() {
    this.opts.onStatus?.('Fetching shader…');
    let res: Response;
    try {
      res = await fetch('/api/shader/next', { cache: 'no-store' });
    } catch (e) {
      this.opts.onStatus?.('Backend unreachable, using local shader');
      await this.buildLocal();
      return;
    }
    if (!res.ok) {
      this.opts.onStatus?.('Shader fetch failed, using local shader');
      await this.buildLocal();
      return;
    }
    const payload = (await res.json()) as ServerShader;
    await this.buildFromServer(payload);
    this.opts.onStatus?.(`Loaded: ${payload.name}`);
  }

  // Build from server-provided fragment + textures
  private async buildFromServer(s: ServerShader) {
    const gl = this.gl!;

    const vsh = this.compile(gl.VERTEX_SHADER, this.vertexShaderSrc);
    const fsh = this.compile(gl.FRAGMENT_SHADER, s.code);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      await this.buildLocal();
      return;
    }
    this.program = prog;
    this.u = {}; // reset uniform map

    // Quad
    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf;

    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    // Resolve common uniforms (optional if shader declares them)
    const common = ['uTime','uRes','uLevel','uBands'];
    for (const name of common) this.u[name] = gl.getUniformLocation(this.program, name);

    // Load textures if provided
    this.textures = [];
    if (Array.isArray(s.textures) && s.textures.length) {
      let unit = 0;
      for (const t of s.textures) {
        const tex = gl.createTexture()!;
        await this.uploadTextureFromDataURL(tex, t.dataUrl, unit);
        this.textures.push({ name: t.name, tex, unit });
        const uLoc = gl.getUniformLocation(this.program, t.name);
        if (uLoc) gl.uniform1i(uLoc, unit);
        unit++;
      }
    }

    this.resizeCanvas();
  }

  // Fallback local shader (still audio-reactive)
  private async buildLocal() {
    const gl = this.gl!;
    const vsh = this.compile(gl.VERTEX_SHADER, this.vertexShaderSrc);
    const fsh = this.compile(gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      uniform vec2  uRes;
      uniform float uLevel;
      uniform float uBands[4];
      void main(){
        vec2 uv = vUV;
        float t = uTime * .6;
        float b = uBands[0]*.5 + uBands[2]*.5;
        vec3 col = vec3(
          .4 + .6*sin(t + (uv.x+uv.y)*18.0 + b*4.0),
          .4 + .6*sin(t + (uv.x-uv.y)*22.0 + b*6.0 + 2.1),
          .4 + .6*sin(t + (uv.y)*20.0 + b*5.0 + 4.2)
        ) * (0.5 + 1.5*uLevel);
        gl_FragColor = vec4(col,1.0);
      }
    `);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog));
      this.paintFallback(); return;
    }
    this.program = prog;
    this.u = {
      uTime:  gl.getUniformLocation(this.program,'uTime'),
      uRes:   gl.getUniformLocation(this.program,'uRes'),
      uLevel: gl.getUniformLocation(this.program,'uLevel'),
      uBands: gl.getUniformLocation(this.program,'uBands'),
    };

    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);
    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf;

    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.resizeCanvas();
  }

  private compile(type: number, src: string): WebGLShader {
    const gl = this.gl!;
    const sh = gl.createShader(type)!;
    gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      gl.deleteShader(sh);
      throw new Error('Shader compile error: ' + log);
    }
    return sh;
  }

  private async uploadTextureFromDataURL(tex: WebGLTexture, dataUrl: string, unit: number): Promise<void> {
    const gl = this.gl!;
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        resolve();
      };
      img.onerror = () => reject(new Error('texture load failed'));
      img.src = dataUrl;
    });
  }

  private loop() {
    const step = (now: number) => { this.render(now); this.anim = requestAnimationFrame(step); };
    this.anim = requestAnimationFrame(step);
  }

  private render(now: number) {
    const gl = this.gl; if (!gl || !this.program) return;

    // FPS
    this.frames++;
    const dt = now - this.lastTick;
    if (dt >= 1000) { this.opts.onFps?.(this.frames); this.frames = 0; this.lastTick = now; }

    // Audio bands
    let level = 0; let bands = [0,0,0,0];
    if (this.analyser && this.freq) {
      this.analyser.getByteFrequencyData(this.freq);
      const N = this.freq.length;
      const band = (a:number,b:number)=>{ let s=0; for(let i=a;i<b;i++) s+=this.freq[i]; return s/((b-a)*255); };
      bands[0] = band(0, N/8|0);
      bands[1] = band(N/8|0, N/4|0);
      bands[2] = band(N/4|0, N/2|0);
      bands[3] = band(N/2|0, N);
      level = (bands[0]+bands[1]+bands[2]+bands[3])/4;
    } else if (this.demo) {
      const t = now/1000;
      bands = [(Math.sin(t*1.2)+1)/2,(Math.sin(t*1.7+1)+1)/2,(Math.sin(t*2.3+2)+1)/2,(Math.sin(t*2.9+3)+1)/2];
      level = (bands[0]+bands[1]+bands[2]+bands[3])/4;
    }

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Common uniforms (if they exist in shader)
    if (this.u.uTime)  gl.uniform1f(this.u.uTime, now/1000);
    if (this.u.uRes)   gl.uniform2f(this.u.uRes, this.canvas.width, this.canvas.height);
    if (this.u.uLevel) gl.uniform1f(this.u.uLevel, level);
    if (this.u.uBands) gl.uniform1fv(this.u.uBands, new Float32Array(bands));

    // Bind textures each frame (simple)
    for (const t of this.textures) {
      gl.activeTexture(gl.TEXTURE0 + t.unit);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private paintFallback() {
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight;
    const g = ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'#0b1020'); g.addColorStop(1,'#000');
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#9efcff'; ctx.font='14px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('WebGL unavailable — using fallback', 16, 28);
  }

  // sizing
  private resizeCanvas() {
    const container = this.canvas.parentElement ?? document.body;
    const r = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(r.width));
    const cssH = Math.max(1, Math.floor((r.height || 0) || 420));
    const dpr  = Math.max(1, Math.round(window.devicePixelRatio || 1));
    this.canvas.style.width  = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    if (this.canvas.width !== cssW*dpr || this.canvas.height !== cssH*dpr) {
      this.canvas.width = cssW*dpr; this.canvas.height = cssH*dpr;
    }
    this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);
  }
}
