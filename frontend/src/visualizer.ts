type GL = WebGLRenderingContext | WebGL2RenderingContext;

type VizOpts = {
  onStatus?: (s: string) => void;
  onFps?: (fps: number) => void;
};

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private animationId: number | null = null;

  // Audio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private stream: MediaStream | null = null;
  private demo = false;

  // uniforms
  private uTime: WebGLUniformLocation | null = null;
  private uRes:  WebGLUniformLocation | null = null;
  private uLevel: WebGLUniformLocation | null = null;
  private uBands: WebGLUniformLocation | null = null;

  // fps
  private lastTick = performance.now();
  private frames = 0;

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
    this.initGL();
    this.opts.onStatus?.('Ready');
  }

  start() {
    const loop = (now: number) => {
      this.render(now);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  // ---------- Screen share audio ----------
  async startScreenShare() {
    this.opts.onStatus?.('Requesting screen…');
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false }
    });

    // Ensure there's an audio track
    const hasAudio = stream.getAudioTracks().length > 0;
    if (!hasAudio) {
      stream.getTracks().forEach(t => t.stop());
      throw new Error('No audio shared');
    }

    // Setup audio graph
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 512;
    const src = this.audioCtx.createMediaStreamSource(stream);
    src.connect(this.analyser);

    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.stream = stream;
    this.demo = false;
    this.opts.onStatus?.('Screen sharing active');

    // Handle manual stop
    const vtrack = stream.getVideoTracks()[0];
    if (vtrack) {
      vtrack.onended = () => {
        this.stopScreenShare();
        this.opts.onStatus?.('Screen share ended');
      };
    }
  }

  stopScreenShare() {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.freq = null;
    if (this.audioCtx) { this.audioCtx.close().catch(()=>{}); this.audioCtx = null; }
    this.analyser = null;
  }

  isSharing() { return !!this.stream; }

  setDemoMode(v: boolean) {
    this.demo = v;
    if (v) this.stopScreenShare();
  }

  // ---------- GL init / render ----------
  private resizeCanvas() {
    const container = this.canvas.parentElement ?? document.body;
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor((rect.height || 0) || 420));
    const dpr  = Math.max(1, Math.round(window.devicePixelRatio || 1));
    this.canvas.style.width  = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    if (this.canvas.width !== cssW*dpr || this.canvas.height !== cssH*dpr) {
      this.canvas.width = cssW*dpr; this.canvas.height = cssH*dpr;
    }
    this.gl?.viewport(0,0,this.canvas.width,this.canvas.height);
  }

  private initGL() {
    const gl = this.gl!;
    const verts = new Float32Array([ -1,-1, 1,-1, -1,1,  1,-1, 1,1, -1,1 ]);

    const vs = `
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    // Audio-reactive fragment: uLevel (0..1) & uBands[4] shape the effect
    const fs = `
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      uniform vec2  uRes;
      uniform float uLevel;
      uniform float uBands[4];

      float sat(float x){ return clamp(x, 0.0, 1.0); }

      void main() {
        vec2 uv = vUV;
        float t = uTime * 0.6;

        // combine bands
        float bass   = uBands[0];
        float mid    = uBands[1];
        float high   = uBands[2];
        float air    = uBands[3];
        float energy = uLevel;

        // warps modulated by energy
        float swirl = sin( (uv.x*12.0 + uv.y*8.0) + t*3.0 + bass*6.0 ) * 0.5 + 0.5;
        float ring  = sin( (length(uv-0.5)*24.0 - t*2.5) + mid*8.0 ) * 0.5 + 0.5;

        vec3 base = vec3(
          sat(0.35 + 0.65*sin(t + swirl + 0.0)),
          sat(0.35 + 0.65*sin(t + ring  + 2.1)),
          sat(0.35 + 0.65*sin(t + swirl + 4.2))
        );

        // intensity & tint react to energy/high band
        float boost = 0.4 + 1.6*energy;
        vec3 tint = mix(vec3(0.10,0.90,0.85), vec3(1.0,0.2,0.6), air);
        vec3 col = base * boost;
        col = mix(col, tint, 0.25*high);

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const vsh = this.compile(gl.VERTEX_SHADER, vs);
    const fsh = this.compile(gl.FRAGMENT_SHADER, fs);
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      this.paintFallback(); return;
    }
    this.program = prog;

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf;

    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.uTime  = gl.getUniformLocation(this.program, 'uTime');
    this.uRes   = gl.getUniformLocation(this.program, 'uRes');
    this.uLevel = gl.getUniformLocation(this.program, 'uLevel');
    this.uBands = gl.getUniformLocation(this.program, 'uBands');

    this.resizeCanvas();
  }

  private render(nowMs: number) {
    const gl = this.gl; if (!gl || !this.program) return;

    // FPS
    this.frames++;
    const dt = nowMs - this.lastTick;
    if (dt >= 1000) {
      this.opts.onFps?.(this.frames);
      this.frames = 0;
      this.lastTick = nowMs;
    }

    // Audio levels
    let level = 0;
    let bands = [0,0,0,0];
    if (this.analyser && this.freq) {
      this.analyser.getByteFrequencyData(this.freq);
      const N = this.freq.length;

      const band = (a:number,b:number) => {
        let s = 0; for(let i=a;i<b;i++) s += this.freq[i];
        return s / ((b-a) * 255);
      };

      // simple quad bands over the spectrum
      bands[0] = band(0, N/8|0);              // bass
      bands[1] = band(N/8|0, N/4|0);          // low-mid
      bands[2] = band(N/4|0, N/2|0);          // high-mid
      bands[3] = band(N/2|0, N);              // air
      level = (bands[0] + bands[1] + bands[2] + bands[3]) / 4;
    } else if (this.demo) {
      const t = nowMs/1000;
      bands = [
        (Math.sin(t*1.2)+1)/2,
        (Math.sin(t*1.8+1.0)+1)/2,
        (Math.sin(t*2.3+2.0)+1)/2,
        (Math.sin(t*2.9+3.0)+1)/2,
      ];
      level = (bands[0]+bands[1]+bands[2]+bands[3])/4;
    }

    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (this.uTime)  gl.uniform1f(this.uTime, nowMs/1000);
    if (this.uRes)   gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);
    if (this.uLevel) gl.uniform1f(this.uLevel, level);
    if (this.uBands) gl.uniform1fv(this.uBands, new Float32Array(bands));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private paintFallback() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#9efcff';
    ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('WebGL unavailable — using fallback', 16, 28);
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
}
