import * as THREE from "three";
import { wsUrl } from "./backend-config";

function isSecureLike() {
  return window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1";
}
function assertMediaDevices() {
  if (!("mediaDevices" in navigator)) {
    throw new Error("Audio capture requires a secure context. Open via http://localhost:5173 or use HTTPS.");
  }
}
async function parseWsMessage(data: unknown): Promise<
  | { kind: "json"; value: any }
  | { kind: "binary"; value: ArrayBuffer }
  | null
> {
  try {
    if (typeof data === "string") return { kind: "json", value: JSON.parse(data) };
    if (data instanceof Blob) {
      const text = await data.text();
      try { return { kind: "json", value: JSON.parse(text) }; }
      catch { return { kind: "binary", value: await data.arrayBuffer() }; }
    }
    if (data instanceof ArrayBuffer) return { kind: "binary", value: data };
  } catch {}
  return null;
}

const frag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform vec3  uTint;   // NEW

  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }

  void main() {
    vec2 uv = vUv;
    uv -= 0.5;
    uv.x *= uRes.x / uRes.y;

    float bass = clamp(uBass, 0.0, 1.0);
    float mid  = clamp(uMid,  0.0, 1.0);
    float high = clamp(uHigh, 0.0, 1.0);

    float t = uTime * (0.2 + 0.8*mid);
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float ripple = sin(10.0*r - t*6.2831) * (0.2 + 0.8*bass);
    float swirl  = sin(a*6.0 + t*2.0) * (0.1 + 0.6*high);
    float bands  = sin((r*30.0 + a*4.0) + t*3.0) * (0.2 + mid);

    float m = ripple + swirl + bands;
    vec3 col = vec3(0.05,0.05,0.06);
    col += uTint * max(0.0, m);   // use tint

    col *= smoothstep(1.2, 0.2, r);
    gl_FragColor = vec4(col, 1.0);
  }
`;


private uniforms = {
  uTime: { value: 0 },
  uRes:  { value: new THREE.Vector2(1,1) },
  uBass: { value: 0 },
  uMid:  { value: 0 },
  uHigh: { value: 0 },
  uTint: { value: new THREE.Vector3(0.9, 0.5, 1.2) }, // NEW
};
private visualGain = 1.0; // NEW

setGain(v: number) { this.visualGain = Math.max(0.1, Math.min(5, v)); }
setTheme(name: "Purple"|"Neon"|"Sunset") {
  this.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);

  if (name === "Neon")    t.set(0.5, 1.2, 1.2);
  else if (name === "Sunset") t.set(1.2, 0.8, 0.4);
  else                    t.set(0.9, 0.5, 1.2); // Purple default
}


const g = this.visualGain;
return {
  bass: Math.min(1, range(20, 140)   * g),
  mid:  Math.min(1, range(140, 2000) * g),
  high: Math.min(1, range(2000,8000) * g),
};


export class NeuralVisualizer {
  // canvases
  private overlay: HTMLCanvasElement;
  private octx: CanvasRenderingContext2D | null;

  // three
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  // audio + ws
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private fft: Uint8Array | null = null;

  // misc
  private lastStatus = "";
  private raf = 0;

  constructor(private canvas: HTMLCanvasElement) {
    // THREE on main canvas
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // overlay 2D for bars/status
    this.overlay = document.createElement("canvas");
    this.overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10";
    document.body.appendChild(this.overlay);
    this.octx = this.overlay.getContext("2d");

    this.setupLighting();
    window.addEventListener("resize", () => this.resize());
    this.resize();

    this.connectToAIBackend();
    this.animate(); // start loop
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0x404040);
    this.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(1, 1, 1);
    this.scene.add(dir);
    this.camera.position.z = 50;
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;

    // WebGL canvas
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // 2D overlay with DPR scaling
    const dpr = window.devicePixelRatio || 1;
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;
    this.overlay.width = Math.floor(w * dpr);
    this.overlay.height = Math.floor(h * dpr);
    if (this.octx) {
      this.octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.octx.clearRect(0, 0, w, h);
    }
    if (this.lastStatus) this.renderStatus(this.lastStatus);
  }

  private renderStatus(msg: string) {
    this.lastStatus = msg;
    const ctx = this.octx; if (!ctx) return;
    const w = this.overlay.width / (window.devicePixelRatio || 1);
    const h = this.overlay.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, w, h);
    if (!msg) return;
    ctx.fillStyle = "#fff";
    ctx.font = "16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(msg, w / 2, h / 2);
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    this.drawBarsFromAnalyser(); // <- this exists below
    this.renderer.render(this.scene, this.camera);
  };

  async connectToAIBackend() {
    try {
      this.ws = new WebSocket(wsUrl("/ws", import.meta.env?.VITE_BACKEND_BASE));
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = () => console.log("Connected to AI Visual Processor");
      this.ws.onmessage = async (event) => {
        const parsed = await parseWsMessage(event.data);
        if (!parsed) return;
        if (parsed.kind === "binary") {
          this.drawBarsFromArrayBuffer(parsed.value);
        } else {
          // future: handle JSON protocol
        }
      };
      this.ws.onerror = (e) => console.error("WebSocket error:", e);
    } catch (e) {
      console.error("WS connect failed:", e);
    }
  }

  // start audio capture from UI
  async startAudioProcessing(mode: "display" | "mic" | "osc" = "display") {
    try {
      if (mode !== "osc") assertMediaDevices();

      if (!this.audioCtx) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        this.audioCtx = new AC();
      }
      await this.audioCtx.resume();

      let sourceNode: MediaStreamAudioSourceNode | OscillatorNode;

      if (mode === "display") {
        if (!isSecureLike()) throw new Error("Screen-audio capture is blocked on non-secure origins. Use http://localhost:5173 or HTTPS.");
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 } as any,
        });
        if (!stream.getAudioTracks().length) throw new Error('No audio track. Select "Entire screen" and tick "Share audio".');
        sourceNode = this.audioCtx.createMediaStreamSource(stream);
      } else if (mode === "mic") {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
        });
        sourceNode = this.audioCtx.createMediaStreamSource(stream);
      } else {
        const osc = this.audioCtx.createOscillator();
        osc.type = "sawtooth"; osc.frequency.value = 220; osc.start();
        sourceNode = osc;
      }

      if (!this.analyser) {
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.analyser.smoothingTimeConstant = 0.8;
      }
      // @ts-expect-error narrow type ok
      sourceNode.connect(this.analyser);
      this.fft = new Uint8Array(this.analyser.frequencyBinCount);

      this.renderStatus("");
      console.log("Audio processing started via mode:", mode);
    } catch (err) {
      console.error("Audio capture failed:", err);
      this.renderStatus(String((err as Error)?.message || err));
    }
  }

  // ===== single, canonical versions below (no duplicates) =====

  private drawBarsFromAnalyser() {
    if (!this.analyser || !this.fft || !this.octx) return;
    this.analyser.getByteFrequencyData(this.fft);

    const ctx = this.octx;
    const w = this.overlay.width / (window.devicePixelRatio || 1);
    const h = this.overlay.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";

    const bars = 64;
    const binSize = Math.max(1, Math.floor(this.fft.length / bars));
    const bw = Math.max(2, (w / bars) * 0.8);

    for (let i = 0; i < bars; i++) {
      let acc = 0;
      for (let j = 0; j < binSize; j++) acc += this.fft[i * binSize + j] || 0;
      const avg = acc / binSize;                 // 0..255
      const barH = (avg / 255) * h * 0.9;        // scale
      const x = (i / bars) * w;
      ctx.fillRect(x, h - barH, bw, barH);
    }
  }

  private drawBarsFromArrayBuffer(buf: ArrayBuffer) {
    if (!this.octx) return;
    const samples = new Float32Array(buf);
    if (!samples.length) return;

    const ctx = this.octx;
    const w = this.overlay.width / (window.devicePixelRatio || 1);
    const h = this.overlay.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";

    const bars = 64;
    const binSize = Math.max(1, Math.floor(samples.length / bars));
    const bw = Math.max(2, (w / bars) * 0.8);

    for (let i = 0; i < bars; i++) {
      let acc = 0;
      for (let j = 0; j < binSize; j++) acc += Math.abs(samples[i * binSize + j] || 0);
      const avg = acc / binSize;
      const barH = Math.min(h, avg * h * 0.9);
      const x = (i / bars) * w;
      ctx.fillRect(x, h - barH, bw, barH);
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.ws) { this.ws.close(); this.ws = null; }
  }
}
