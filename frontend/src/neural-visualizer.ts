import * as THREE from 'three';

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
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
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

  private async connectToAIBackend() {
    try {
      this.ws = new WebSocket('ws://localhost:8080/ws');
      
      this.ws.onopen = () => {
        console.log('Connected to AI Visual Processor');
        this.startAudioProcessing();
      };

      this.ws.onmessage = (event) => {
        this.handleAIMessage(JSON.parse(event.data));
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to AI backend:', error);
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
          channelCount: 2
        }
      });

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.processAudio();

    } catch (error) {
      console.error('Audio capture failed:', error);
    }
  }

  private processAudio() {
    if (!this.analyser || !this.ws) return;

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    
    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);
      
      // Send audio data to AI backend
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const audioData = {
          fft: Array.from(data),
          timestamp: Date.now(),
          sessionId: Math.random().toString(36).substr(2, 9)
        };
        this.ws.send(JSON.stringify(audioData));
      }
      
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }

  private handleAIMessage(universe: any) {
    console.log('AI Generated Universe:', universe);
    this.createVisualUniverse(universe);
  }

  private createVisualUniverse(universe: any) {
    // Remove existing particles
    if (this.particles) {
      this.scene.remove(this.particles);
    }

    // Create new particle system based on AI generation
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(universe.particleCount * 3);
    const colors = new Float32Array(universe.particleCount * 3);

    for (let i = 0; i < universe.particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 100;

      // Assign colors based on AI-generated palette
      const colorIndex = Math.floor(Math.random() * universe.colorPalette.length);
      const color = new THREE.Color(universe.colorPalette[colorIndex]);
      colors[i] = color.r;
      colors[i + 1] = color.g;
      colors[i + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      sizeAttenuation: true
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
