// Minimal, standalone WebGL visualizer with DPR-aware sizing.
// Cycles a few shader styles to avoid the flat gradient look.

type GL = WebGLRenderingContext | WebGL2RenderingContext;

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private animationId: number | null = null;
  private shaderIndex = 0;
  private lastSwitch = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => this.resizeCanvas());

    this.gl = (canvas.getContext('webgl2') as GL) || (canvas.getContext('webgl') as GL);
    if (!this.gl) {
      this.setup2DFallback();
      return;
    }

    this.initGL();
  }

  start() {
    if (!this.gl || !this.program) return;
    const render = (now: number) => {
      this.render(now);
      this.animationId = requestAnimationFrame(render);
    };
    this.animationId = requestAnimationFrame(render);
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.animationId = null;
  }

  // ---------- internals ----------

  private resizeCanvas() {
    const container = this.canvas.parentElement ?? document.body;
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor((rect.height || 0) || 420));
    const dpr  = Math.max(1, Math.round(window.devicePixelRatio || 1));

    this.canvas.style.width  = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    const need = (this.canvas.width !== cssW * dpr) || (this.canvas.height !== cssH * dpr);
    if (need) {
      this.canvas.width  = cssW * dpr;
      this.canvas.height = cssH * dpr;
    }
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private initGL() {
    if (!this.gl) return;
    const gl = this.gl;

    // Quad
    const verts = new Float32Array([
      -1, -1,  1, -1,  -1,  1,
       1, -1,  1,  1,  -1,  1,
    ]);

    const vs = `
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fsList = [
      // 0 — bands + bloom-ish mix
      `
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        uniform vec2  uRes;
        void main() {
          vec2 uv = vUV;
          float t = uTime * 0.6;
          float bands = sin(uv.y*24.0 + t*3.0)*0.5 + 0.5;
          float rings = sin(length(uv-0.5)*20.0 - t*2.0)*0.5 + 0.5;
          float glow  = 0.25 / (0.05 + pow(distance(uv, vec2(0.5,0.5)), 1.5));
          vec3 col = mix(vec3(0.08,0.15,0.9), vec3(1.0,0.1,0.6), bands);
          col = mix(col, vec3(0.2,1.0,0.9), rings);
          col += glow * vec3(0.9,0.6,0.2);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      // 1 — flow field
      `
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        void main() {
          vec2 uv = vUV * 2.0 - 1.0;
          float t = uTime * 0.3;
          float a = atan(uv.y, uv.x);
          float r = length(uv);
          float k = sin(5.0*a + t*2.0) * cos(6.0*r - t*3.0);
          vec3 col = vec3(0.5 + 0.5*sin(t + k + 0.0),
                          0.5 + 0.5*sin(t + k + 2.1),
                          0.5 + 0.5*sin(t + k + 4.2));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      // 2 — chromatic warp
      `
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        void main() {
          vec2 uv = vUV;
          float t = uTime * 0.8;
          vec2 p = uv - 0.5;
          float d = length(p);
          float wave = sin(30.0*d - t*4.0);
          vec3 col = vec3(
            0.6 + 0.4*sin(t + wave + 0.0),
            0.6 + 0.4*sin(t + wave + 2.0),
            0.6 + 0.4*sin(t + wave + 4.0)
          );
          col *= smoothstep(0.0, 0.7, 0.85 - d);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    ];

    const vsh = this.createShader(gl.VERTEX_SHADER, vs);
    const fsh = this.createShader(gl.FRAGMENT_SHADER, fsList[this.shaderIndex]);
    if (!vsh || !fsh) { this.setup2DFallback(); return; }

    const prog = gl.createProgram();
    if (!prog) { this.setup2DFallback(); return; }
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      this.setup2DFallback();
      return;
    }
    this.program = prog;

    const buf = gl.createBuffer();
    if (!buf) { this.setup2DFallback(); return; }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf;

    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.resizeCanvas();
    this.lastSwitch = performance.now();
  }

  private render(nowMs: number) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Auto-cycle shader every ~18s to keep it lively
    if (nowMs - this.lastSwitch > 18000) {
      this.shaderIndex = (this.shaderIndex + 1) % 3;
      this.initGL(); // recompile with next fragment shader
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const uTime = gl.getUniformLocation(this.program!, 'uTime');
    const uRes  = gl.getUniformLocation(this.program!, 'uRes');
    if (uTime) gl.uniform1f(uTime, nowMs / 1000);
    if (uRes)  gl.uniform2f(uRes, this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private setup2DFallback() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const paint = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      ctx.clearRect(0,0,w,h);
      const grd = ctx.createLinearGradient(0,0,w,h);
      grd.addColorStop(0, '#0b1020'); grd.addColorStop(1, '#000');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);
      ctx.fillStyle = '#9efcff';
      ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText('WebGL unavailable — using fallback', 16, 28);
    };
    paint();
  }

  private createShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!;
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, source);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  }
}
