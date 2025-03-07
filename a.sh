#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/frontend

# ADD DEBUGGING TO VISUALIZER
cat > src/visualizer.ts << 'EOF'
export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext | null;
  private particleBuffer: WebGLBuffer | null = null;
  private shaderProgram: WebGLProgram | null = null;
  private audioData: Uint8Array = new Uint8Array(256);

  constructor(canvasId: string = 'glCanvas') {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      console.error('Canvas element not found!');
      return;
    }

    this.gl = this.canvas.getContext('webgl2');
    if (!this.gl) {
      console.error('WebGL2 not supported!');
      return;
    }

    console.log('WebGL2 context initialized successfully');
    this.initWebGL();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private initWebGL() {
    if (!this.gl) return;

    // Set clear color to black
    this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
    
    // Create simple shader program
    const vsSource = `
      #version 300 es
      in vec2 aPosition;
      uniform float uIntensity;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        gl_PointSize = 5.0 + uIntensity * 20.0;
      }
    `;

    const fsSource = `
      #version 300 es
      precision highp float;
      out vec4 fragColor;
      uniform vec3 uColor;
      void main() {
        fragColor = vec4(uColor, 1.0);
      }
    `;

    this.shaderProgram = this.createProgram(vsSource, fsSource);
    this.particleBuffer = this.createParticleBuffer();
    console.log('WebGL initialization complete');
  }

  private createProgram(vsSource: string, fsSource: string): WebGLProgram | null {
    if (!this.gl) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    const vertexShader = this.compileShader(vsSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fsSource, this.gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }
    
    return program;
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      return null;
    }
    
    return shader;
  }

  private createParticleBuffer(): WebGLBuffer | null {
    if (!this.gl) return null;

    const buffer = this.gl.createBuffer();
    if (!buffer) return null;

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
    if (!this.gl || !this.shaderProgram || !this.particleBuffer) {
      console.log('WebGL not ready for rendering');
      return;
    }

    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.useProgram(this.shaderProgram);
    
    // Update particles based on audio data
    this.updateParticles();
    
    // Set uniforms for color and intensity
    const intensityLoc = this.gl.getUniformLocation(this.shaderProgram, 'uIntensity');
    const colorLoc = this.gl.getUniformLocation(this.shaderProgram, 'uColor');
    
    const avgIntensity = this.audioData.length > 0 ? 
      this.audioData.reduce((a, b) => a + b) / this.audioData.length / 255 : 0;
    
    this.gl.uniform1f(intensityLoc, avgIntensity);
    this.gl.uniform3f(colorLoc, 0.0, 0.8, 1.0); // Cyan color
    
    // Draw particles
    const positionAttr = this.gl.getAttribLocation(this.shaderProgram, 'aPosition');
    this.gl.enableVertexAttribArray(positionAttr);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.vertexAttribPointer(positionAttr, 2, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.POINTS, 0, 1000);
  }

  private updateParticles() {
    if (!this.gl || !this.particleBuffer || this.audioData.length === 0) return;

    const particles = new Float32Array(1000 * 2);
    for (let i = 0; i < 1000; i++) {
      const audioIndex = i % this.audioData.length;
      const intensity = this.audioData[audioIndex] / 255.0;
      
      // Make particles move more dramatically with audio
      particles[i * 2] = (Math.random() - 0.5) * 2;
      particles[i * 2 + 1] = (Math.random() - 0.5) * 2 * intensity;
    }
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, particles, this.gl.DYNAMIC_DRAW);
  }

  private resize() {
    if (!this.canvas || !this.gl) return;
    
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.render();
  }
}
EOF

# UPDATE MAIN.TS WITH BETTER DEBUGGING
cat > src/main.ts << 'EOF'
import { Visualizer } from './visualizer.js';

class QuantumSynth {
  private visualizer: Visualizer;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.visualizer = new Visualizer();
    console.log('QuantumSynth constructor called');
  }

  async init() {
    try {
      console.log('Initializing audio...');
      await this.initAudio();
      console.log("Quantum Synth initialized successfully!");
    } catch (error) {
      console.error("Failed to initialize:", error);
    }
  }

  private async initAudio() {
    try {
      console.log('Requesting screen capture with audio...');
      
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

      console.log('Screen capture granted, setting up audio...');

      // Setup audio context and analyser
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      
      // Listen for audio track events
      const audioTracks = stream.getAudioTracks();
      console.log('Audio tracks:', audioTracks.length);
      
      if (audioTracks.length > 0) {
        audioTracks[0].addEventListener('ended', () => {
          console.log('Audio track ended');
          this.isPlaying = false;
        });
      }
      
      // Start processing audio
      this.isPlaying = true;
      this.processAudio();
      
    } catch (error) {
      console.error('Audio initialization failed:', error);
      throw error;
    }
  }

  private processAudio() {
    if (!this.analyser) {
      console.log('No analyser available');
      return;
    }

    const data = new Uint8Array(this.analyser.frequencyBinCount);
    
    const processFrame = () => {
      if (!this.isPlaying) {
        console.log('Audio processing stopped');
        return;
      }

      this.analyser!.getByteFrequencyData(data);
      
      // Log some audio data for debugging
      if (Math.random() < 0.01) { // Only log occasionally
        console.log('Audio data sample:', data.slice(0, 5));
      }
      
      this.visualizer.update(data);
      requestAnimationFrame(processFrame);
    };
    
    processFrame();
  }
}

// Initialize when page loads
console.log('Document loaded, initializing QuantumSynth...');
document.addEventListener('DOMContentLoaded', () => {
  const synth = new QuantumSynth();
  synth.init();
});
EOF

# COMMIT THE FIXES
cd ..
git add .
GIT_AUTHOR_DATE="2025-03-07T11:04:22" GIT_COMMITTER_DATE="2025-03-07T11:04:22" \
git commit -m "fix: add WebGL error handling and audio debugging"