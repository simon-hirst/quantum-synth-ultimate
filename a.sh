#!/bin/bash

cd quantum-synth-ultimate

# ADD BASIC WEBGL VISUALIZATION
cat > frontend/src/visualizer.ts << 'EOF'
export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private particleBuffer: WebGLBuffer;
  private shaderProgram: WebGLProgram;
  private audioData: Uint8Array = new Uint8Array(256);

  constructor(canvasId: string = 'glCanvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.gl = this.canvas.getContext('webgl2')!;
    this.initWebGL();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private initWebGL() {
    // Set clear color to black
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Create simple shader program
    const vsSource = `
      #version 300 es
      in vec2 aPosition;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        gl_PointSize = 3.0;
      }
    `;

    const fsSource = `
      #version 300 es
      precision highp float;
      out vec4 fragColor;
      void main() {
        fragColor = vec4(0.0, 0.8, 1.0, 1.0);
      }
    `;

    this.shaderProgram = this.createProgram(vsSource, fsSource);
    this.particleBuffer = this.createParticleBuffer();
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram {
    const program = this.gl.createProgram()!;
    const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER);
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    return program;
  }

  private compileShader(source: string, type: number): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    return shader;
  }

  private createParticleBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    
    // Initial particle positions
    const particles = new Float32Array(1000 * 2);
    for (let i = 0; i < 1000; i++) {
      particles[i * 2] = (Math.random() - 0.5) * 2;
      particles[i * 2 + 1] = (Math.random() - 0.5) * 2;
    }
    
    this.gl.bufferData(this.gl.ARRAY_BUFFER, particles, this.gl.DYNAMIC_DRAW);
    return buffer;
  }

  update(audioData: Uint8Array) {
    this.audioData = audioData;
    this.render();
  }

  private render() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.shaderProgram);
    
    // Update particles based on audio data
    this.updateParticles();
    
    // Draw particles
    const positionAttr = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
    this.gl.enableVertexAttribArray(positionAttr);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.vertexAttribPointer(positionAttr, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.POINTS, 0, 1000);
  }

  private updateParticles() {
    if (this.audioData.length === 0) return;

    const particles = new Float32Array(1000 * 2);
    for (let i = 0; i < 1000; i++) {
      const audioIndex = i % this.audioData.length;
      const intensity = this.audioData[audioIndex] / 255.0;
      
      particles[i * 2] = (Math.random() - 0.5) * 2;
      particles[i * 2 + 1] = (Math.random() - 0.5) * 2 * intensity;
    }
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, particles, this.gl.DYNAMIC_DRAW);
  }

  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.render();
  }
}
EOF

# UPDATE MAIN.TS WITH REAL VISUALIZATION
cat > frontend/src/main.ts << 'EOF'
import { Visualizer } from './visualizer.js';

class QuantumSynth {
  private visualizer: Visualizer;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    this.visualizer = new Visualizer();
  }

  async init() {
    try {
      await this.initAudio();
      console.log("Quantum Synth initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  private async initAudio() {
    // Get screen capture with audio
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        sampleRate: 44100,
        channelCount: 2
      }
    });

    // Setup audio context and analyser
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    // Start processing audio
    this.processAudio();
  }

  private processAudio() {
    const data = new Uint8Array(this.analyser!.frequencyBinCount);
    
    const processFrame = () => {
      this.analyser!.getByteFrequencyData(data);
      this.visualizer.update(data);
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  const synth = new QuantumSynth();
  synth.init();
});
EOF

# ADD VITE CONFIG FOR DEV SERVER
cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true
  }
})
EOF

# UPDATE PACKAGE.JSON WITH BUILD TOOLS
cat > frontend/package.json << 'EOF'
{
  "name": "quantum-synth-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0",
    "@types/webgl2": "^0.0.10"
  }
}
EOF

# INSTALL DEPENDENCIES
cd frontend
npm install
cd ..

# COMMIT WITH TIMESTAMP
git add .
GIT_AUTHOR_DATE="2025-03-04T14:39:55" GIT_COMMITTER_DATE="2025-03-04T14:39:55" \
git commit -m "feat: add basic WebGL audio visualization with particle system"