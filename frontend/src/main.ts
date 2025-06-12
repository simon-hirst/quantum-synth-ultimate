import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private visualizationElement: HTMLElement;
  private lastUpdate: number = 0;
  private currentVizType: string = 'quantum';
  private nextVizType: string = 'quantum';
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private pollingInterval: number | null = null;
  private currentVizName: string = 'Quantum Resonance';
  private statusElement: HTMLElement;
  private statusDot: HTMLElement;
  private resizeObserver: ResizeObserver;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement, statusElement: HTMLElement, statusDot: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    this.visualizationElement = visualizationElement;
    this.statusElement = statusElement;
    this.statusDot = statusDot;
    
    // Set up resize observer to handle container size changes
    this.resizeObserver = new ResizeObserver(() => {
      this.setupCanvas();
    });
    this.resizeObserver.observe(canvas.parentElement!);
    
    this.setupCanvas();
    this.startPolling();
  }

  private setupCanvas() {
    // Get the container dimensions
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Set the canvas size to match the container
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Scale for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    
    // Set the CSS size to maintain correct aspect ratio
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  private async startPolling() {
    // Start polling for new shaders
    this.pollingInterval = window.setInterval(() => {
      this.fetchNewShader();
    }, 15000);

    // Initialize with a local shader
    this.generateLocalShader();
  }

  private async fetchNewShader() {
    try {
      // Try the Azure backend first
      let response = await fetch('https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next', {
        signal: AbortSignal.timeout(5000)
      });

      // If that fails, try localhost for development
      if (!response.ok) {
        response = await fetch('http://localhost:8080/api/shader/next', {
          signal: AbortSignal.timeout(5000)
        });
      }

      if (response.ok) {
        const data = await response.json();
        this.nextVizType = data.type || 'quantum';
        this.currentVizName = data.name || 'Quantum Resonance';
        this.statusDot.classList.remove('pending');
        this.statusDot.classList.add('active');
        this.statusElement.textContent = 'Active';
        this.startTransition();
      } else {
        throw new Error('Backend not available');
      }
    } catch (error) {
      console.log('Using local visualization fallback');
      this.statusDot.classList.remove('active');
      this.statusDot.classList.add('pending');
      this.statusElement.textContent = 'Local Mode';
      this.generateLocalShader();
    }
  }

  // ... (rest of the class remains the same until the end)
}

// ... (rest of the file remains the same)
