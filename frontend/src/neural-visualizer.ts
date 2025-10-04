import * as THREE from "three";
import { wsUrl } from "./backend-config";

export class NeuralVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points;
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

    this.init();
  }

  private async init() {
    this.setupRenderer();
    this.setupCamera();
    this.setupLighting();
    await this.connectToAIBackend();
    this.animate();
  }

  private setupRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private setupCamera() {
    this.camera.position.z = 50;
    this.camera.lookAt(0, 0, 0);
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    this.scene.add(directionalLight);
  }

  private handleBinaryFrame(buf: ArrayBuffer) {
  // Interpret as float32 PCM or magnitudes; downsample to ~64 bars
  const samples = new Float32Array(buf);
  if (!samples.length) return;

  const canvas = (this as any).canvas as HTMLCanvasElement; // adapt to your field
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const bars = 64;
  const binSize = Math.max(1, Math.floor(samples.length / bars));
  for (let i = 0; i < bars; i++) {
    let acc = 0;
    for (let j = 0; j < binSize; j++) {
      const v = samples[i * binSize + j] ?? 0;
      acc += Math.abs(v);
    }
    const avg = acc / binSize;                // 0..1-ish
    const barH = Math.min(h, avg * h * 0.9);  // scale
    const x = (i / bars) * w;
    const bw = Math.max(2, (w / bars) * 0.8);
    ctx.fillRect(x, h - barH, bw, barH);
  }
}


  private async connectToAIBackend() {
  try {
    // create and ASSIGN the socket
    this.ws = new WebSocket(wsUrl("/ws", import.meta.env?.VITE_BACKEND_BASE));


    this.ws.onopen = () => {
      console.log("Connected to AI Visual Processor");
      this.startAudioProcessing();
    };

    this.ws.onmessage = async (event) => {
  const parsed = await parseWsMessage(event.data);

  if (!parsed) return;

  if (parsed.kind === "json") {
    try {
      // Your existing JSON handler
      this.handleAIMessage?.(parsed.value);
    } catch (e) {
      console.warn("handleAIMessage failed:", e);
    }
    return;
  }

  // Binary fallback: render something from samples
  try {
    this.handleBinaryFrame?.(parsed.value);
  } catch (e) {
    console.warn("handleBinaryFrame failed:", e);
  }
};

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  } catch (error) {
    console.error("Failed to connect to AI backend:", error);
  }
}

  private async startAudioProcessing() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          sampleRate: 44100,
          channelCount: 2,
        },
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.processAudio();
    } catch (error) {
      console.error("Audio capture failed:", error);
    }
  }

  private processAudio() {
    if (!this.analyser || !this.ws) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);

    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const audioData = {
          fft: Array.from(data),
          timestamp: Date.now(),
          sessionId: Math.random().toString(36).substr(2, 9),
        };
        this.ws.send(JSON.stringify(audioData));
      }

      requestAnimationFrame(processFrame);
    };

    processFrame();
  }

  private handleAIMessage(universe: any) {
    console.log("AI Generated Universe:", universe);
    this.createVisualUniverse(universe);
  }

  private createVisualUniverse(universe: any) {
    if (this.particles) {
      this.scene.remove(this.particles);
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(universe.particleCount * 3);
    const colors = new Float32Array(universe.particleCount * 3);

    for (let i = 0; i < universe.particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 100;

      const colorIndex = Math.floor(
        Math.random() * universe.colorPalette.length,
      );
      const color = new THREE.Color(universe.colorPalette[colorIndex]);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    if (this.particles) {
      this.particles.rotation.x += 0.001;
      this.particles.rotation.y += 0.002;
    }

    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

async function parseWsMessage(data: unknown): Promise<{ kind: "json"; value: any } | { kind: "binary"; value: ArrayBuffer } | null> {
  try {
    if (typeof data === "string") {
      return { kind: "json", value: JSON.parse(data) };
    }
    if (data instanceof Blob) {
      // Try to parse as JSON first
      const text = await data.text();
      try {
        return { kind: "json", value: JSON.parse(text) };
      } catch {
        // Not JSON — treat as binary
        return { kind: "binary", value: await data.arrayBuffer() };
      }
    }
    if (data instanceof ArrayBuffer) {
      return { kind: "binary", value: data };
    }
  } catch (e) {
    console.warn("WS message parse failed:", e);
  }
  return null;
}