import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    this.setupCanvas();
    this.attachResize();
    this.render();
  }

  private setupCanvas() {
    const container = this.canvas.parentElement ?? document.body;
    const rect = container.getBoundingClientRect();
    const cssWidth  = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor((rect.height || 0) || 400));
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));

    // Only resize when necessary
    if (this.canvas.width !== cssWidth * dpr || this.canvas.height !== cssHeight * dpr) {
      // CSS size (in CSS pixels)
      this.canvas.style.width  = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
      // Backing store size (in device pixels)
      this.canvas.width  = cssWidth * dpr;
      this.canvas.height = cssHeight * dpr;
    }

    // Reset then scale the context so drawing uses CSS pixels
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  private attachResize() {
    try {
      const el = this.canvas.parentElement ?? document.body;
      const ro = new ResizeObserver(() => this.setupCanvas());
      ro.observe(el);
      this.resizeObserver = ro;
    } catch {
      // Fallback for older browsers
      window.addEventListener('resize', () => this.setupCanvas());
      window.addEventListener('orientationchange', () => this.setupCanvas());
    }
  }

  private render = () => {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;

    this.ctx.clearRect(0, 0, w, h);
    // Simple placeholder render (replace with actual drawing)
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, w, h);
    this.ctx.fillStyle = '#0ff';
    this.ctx.fillRect(16, 16, Math.max(80, w * 0.2), 8);

    requestAnimationFrame(this.render);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  app.innerHTML = `
    <div class="quantum-container">
      <canvas id="visualizer"></canvas>
    </div>
  `;

  const canvas = document.getElementById('visualizer') as HTMLCanvasElement | null;
  if (!canvas) return;

  // 2D fallback app for basic pages; WebGL path uses visualizer.ts
  new QuantumSynth(canvas);
});
