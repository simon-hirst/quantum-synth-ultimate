import * as THREE from "three";
import { wsUrl } from "./backend-config";

/* ---------- tiny shader ---------- */
const vert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const frag = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform vec3  uTint;

  void main() {
    vec2 uv = vUv - 0.5;
    uv.x *= uRes.x / uRes.y;

    float t = uTime;
    float r = length(uv);
    float a = atan(uv.y, uv.x);

    float ripple = sin(10.0*r - t*6.2831) * (0.2 + 0.8*uBass);
    float swirl  = sin(a*6.0 + t*2.0) * (0.1 + 0.6*uHigh);
    float bands  = sin((r*30.0 + a*4.0) + t*3.0) * (0.2 + uMid);

    float m = ripple + swirl + bands;
    vec3 col = vec3(0.05,0.05,0.06) + uTint * max(0.0, m);
    col *= smoothstep(1.2, 0.2, r);
    gl_FragColor = vec4(col, 1.0);
  }
`;

/* ---------- helpers ---------- */
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

/* ---------- visualizer ---------- */
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

  // uniforms, shader, config
  private uniforms: {
    uTime: { value: number };
    uRes:  { value: THREE.Vector2 };
    uBass: { value: number };
    uMid:  { value: number };
    uHigh: { value: number };
    uTint: { value: THREE.Vector3 };
  };
  private shaderMesh: THREE.Mesh | null = null;
  private startTime = performance.now();
  private smoothing = 0.8;
  private fftSize = 2048;
  private visualGain = 1.0;

  // status + ui hooks
  private lastStatus = "";
  private raf = 0;
  public onConnection?: (s: "connected"|"closed"|"error") => void;

  constructor(private canvas: HTMLCanvasElement) {
    // uniforms
    this.uniforms = {
      uTime: { value: 0 },
      uRes:  { value: new THREE.Vector2(1,1) },
      uBass: { value: 0 },
      uMid:  { value: 0 },
      uHigh: { value: 0 },
      uTint: { value: new THREE.Vector3(0.9, 0.5, 1.2) },
    };

    // three on main canvas
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.camera.position.z = 50;

    // overlay for bars/status
    this.overlay = document.createElement("canvas");
    this.overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:10";
    document.body.appendChild(this.overlay);
    this.octx = this.overlay.getContext("2d");

    this.addShaderBackground();
    window.addEventListener("resize", () => this.resize());
    this.resize();

    this.connectToAIBackend();
    this.animate();
  }

  private addShaderBackground() {
    const geo = new THREE.PlaneGeometry(200, 200);
    const mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: this.uniforms,
      depthWrite: false,
      depthTest: false,
    });
    this.shaderMesh = new THREE.Mesh(geo, mat);
    this.shaderMesh.position.set(0,0,-10);
    this.scene.add(this.shaderMesh);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;

    // WebGL canvas
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // shader resolution
    this.uniforms.uRes.value.set(w, h);

    // overlay with DPR
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

    // analyser-driven overlay bars
    this.drawBarsFromAnalyser();

    // shader uniforms
    const t = (performance.now() - this.startTime) / 1000;
    this.uniforms.uTime.value = t;
    const { bass, mid, high } = this.computeBands();
    this.uniforms.uBass.value = bass;
    this.uniforms.uMid.value  = mid;
    this.uniforms.uHigh.value = high;

    this.renderer.render(this.scene, this.camera);
  };

  async connectToAIBackend() {
    try {
      this.ws = new WebSocket(wsUrl("/ws", import.meta.env?.VITE_BACKEND_BASE));
      this.ws.binaryType = "arraybuffer";
      this.ws.onopen = () => { console.log("WS connected"); this.onConnection?.("connected"); };
      this.ws.onclose = () => { console.log("WS closed");    this.onConnection?.("closed"); };
      this.ws.onerror = () => { console.log("WS error");     this.onConnection?.("error"); };
      this.ws.onmessage = async (event) => {
        const parsed = await parseWsMessage(event.data);
        if (parsed?.kind === "binary") this.drawBarsFromArrayBuffer(parsed.value);
      };
    } catch (e) {
      console.error("WS connect failed:", e);
    }
  }

  // public knobs used by the panel
  setGain(v: number) { this.visualGain = Math.max(0.1, Math.min(5, v)); }
  setTheme(name: "Purple"|"Neon"|"Sunset") {
    const t = this.uniforms.uTint.value;
    if (name === "Neon")       t.set(0.5, 1.2, 1.2);
    else if (name === "Sunset")t.set(1.2, 0.8, 0.4);
    else                       t.set(0.9, 0.5, 1.2);
  }
  setSmoothing(v: number) {
    this.smoothing = Math.min(0.99, Math.max(0, v));
    if (this.analyser) this.analyser.smoothingTimeConstant = this.smoothing;
  }
  setFftSize(size: 256|512|1024|2048|4096|8192) {
    this.fftSize = size;
    if (this.analyser) {
      this.analyser.fftSize = size;
      this.fft = new Uint8Array(this.analyser.frequencyBinCount);
    }
  }

  // start audio from UI
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

      if (!this.analyser) this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;
      // @ts-expect-error narrow type ok
      sourceNode.connect(this.analyser);
      this.fft = new Uint8Array(this.analyser.frequencyBinCount);

      this.renderStatus("");
      console.log("Audio processing started:", mode);
    } catch (err) {
      console.error("Audio capture failed:", err);
      this.renderStatus(String((err as Error)?.message || err));
    }
  }

  private computeBands(): { bass:number; mid:number; high:number } {
    if (!this.fft) return { bass:0, mid:0, high:0 };
    const sr = this.audioCtx?.sampleRate || 44100;
    const ny = sr / 2;
    const binHz = ny / this.fft.length;
    const range = (lo:number, hi:number) => {
      const i0 = Math.max(0, Math.floor(lo / binHz));
      const i1 = Math.min(this.fft.length-1, Math.ceil(hi / binHz));
      let acc = 0, n = 0;
      for (let i = i0; i <= i1; i++) { acc += this.fft[i]; n++; }
      const avg = n ? acc / n : 0;
      return Math.min(1, (avg / 255) * this.visualGain);
    };
    return { bass: range(20, 140), mid: range(140, 2000), high: range(2000, 8000) };
  }

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
      const avg = acc / binSize;
      const barH = (avg / 255) * h * 0.9;
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
