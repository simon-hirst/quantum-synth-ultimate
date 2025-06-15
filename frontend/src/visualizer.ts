import { QuantumSynthUI } from './ui';

export class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ui: QuantumSynthUI;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private buffer: WebGLBuffer | null = null;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ui = new QuantumSynthUI();

    // DPR/container-aware sizing
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => this.resizeCanvas());

    // Try WebGL2 then WebGL1
    this.gl = (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
              (canvas.getContext('webgl')  as WebGLRenderingContext  | null);

    if (!this.gl) {
      this.setup2DFallback();
      this.ui.updateStatus('WebGL not supported - Using 2D fallback');
      return;
    }

    // WebGL init
    if (!this.initGL()) {
      this.setup2DFallback();
      this.ui.updateStatus('WebGL init failed - Using 2D fallback');
      return;
    }

    this.ui.updateStatus('Ready');
  }

  initialize() {
    // Start the render loop if GL is available; otherwise 2D fallback paints once.
    if (this.gl && this.program) this.start();
  }

  private resizeCanvas() {
    const container = this.canvas.parentElement ?? document.body;
    const rect = container.getBoundingClientRect();
    const cssW = Math.max(1, Math.floor(rect.width));
    const cssH = Math.max(1, Math.floor((rect.height || 0) || 400));
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));

    this.canvas.style.width  = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const needResize = this.canvas.width !== cssW * dpr || this.canvas.height !== cssH * dpr;
    if (needResize) {
      this.canvas.width  = cssW * dpr;
      this.canvas.height = cssH * dpr;
    }
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private initGL(): boolean {
    const gl = this.gl!;
    // Fullscreen quad (two triangles)
    const verts = new Float32Array([
      -1, -1,   1, -1,  -1,  1,
       1, -1,   1,  1,  -1,  1,
    ]);

    const vs = `
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `;

    const fs = `
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      void main() {
        // simple animated color field
        float t = uTime * 0.5;
        vec2 uv = vUV;
        float w1 = sin(uv.x * 10.0 + t);
        float w2 = cos(uv.y *  8.0 + t * 1.3);
        vec3 col = vec3(
          abs(sin(t + uv.x * 2.0)),
          abs(cos(t + uv.y * 2.0)),
          abs(sin(t * 1.5 + uv.x * 3.0))
        ) * 0.85 + 0.15;
        col += 0.08 * vec3(w1, w2, w1*w2);
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    const vsh = this.createShader(gl.VERTEX_SHADER, vs);
    const fsh = this.createShader(gl.FRAGMENT_SHADER, fs);
    if (!vsh || !fsh) return false;

    const prog = gl.createProgram();
    if (!prog) return false;
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return false;
    }
    this.program = prog;

    const buf = gl.createBuffer();
    if (!buf) return false;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    this.buffer = buf;

    gl.useProgram(this.program);
    const loc = gl.getAttribLocation(this.program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    this.resizeCanvas(); // ensure viewport matches backing size
    return true;
  }

  private start() {
    const render = () => {
      if (!this.gl || !this.program) return;
      const gl = this.gl;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const tLoc = gl.getUniformLocation(this.program, 'uTime');
      if (tLoc) gl.uniform1f(tLoc, performance.now() / 1000);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      this.animationId = requestAnimationFrame(render);
    };
    render();
  }

  private stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private setup2DFallback() {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const draw = () => {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0f0';
      ctx.font = '16px Arial';
      ctx.fillText('WebGL not available - Using 2D fallback', 20, 40);
    };
    draw();
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

  // for cleanup if needed
  disconnect() {
    this.stop();
  }
}
