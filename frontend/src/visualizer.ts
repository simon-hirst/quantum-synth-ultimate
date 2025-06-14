import { QuantumSynthUI } from './ui';

export class QuantumSynth {
    private audioData: Uint8Array | null = null;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | WebGL2RenderingContext | null;
    private program: WebGLProgram | null = null;
    private animationFrameId: number | null = null;
    private ui: QuantumSynthUI;
    private lastFrameTime: number = 0;
    private fps: number = 0;
    private demoMode: boolean = false;
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private audioStream: MediaStream | null = null;

    constructor(canvas: HTMLCanvasElement) {
        console.log('QuantumSynth constructor called');
        this.canvas = canvas;
        this.ui = new QuantumSynthUI();
        
        // Ensure canvas is properly sized
        this.resizeCanvas();
        
        // Try WebGL2 first, then fall back to WebGL1
        try {
            this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!this.gl) {
                console.error('WebGL not supported');
                this.ui.updateStatus('WebGL not supported - Using 2D fallback');
                this.setup2DFallback();
                return;
            }
            console.log('WebGL context created successfully');
            this.setupShaders();
        } catch (error) {
            console.error('QuantumSynth initialization failed:', error);
            this.ui.updateStatus('WebGL initialization failed - Using 2D fallback');
            this.setup2DFallback();
        }

        // Setup event listeners for UI
        this.setupEventListeners();
    }

    private setupEventListeners() {
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('demoMode', () => this.toggleDemoMode());
        window.addEventListener('startScreenshare', () => this.startScreenSharing());
    }

    private async startScreenSharing() {
        this.ui.setScreenshareButtonEnabled(false);
        this.ui.updateStatus('Requesting screen sharing...');
        this.ui.updateConnectionStatus(false, 'Status: Requesting permissions');

        try {
            // Request screen sharing with audio
            this.audioStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });

            this.ui.updateStatus('Screen sharing active');
            this.ui.updateConnectionStatus(true, 'Status: Screen sharing active');
            this.ui.showNotification('Screen sharing started successfully');

            // Setup audio analysis
            this.setupAudioAnalysis();

            // Handle when the user stops sharing
            this.audioStream.getVideoTracks()[0].onended = () => {
                this.ui.updateStatus('Screen sharing ended');
                this.ui.updateConnectionStatus(false, 'Status: Sharing ended');
                this.ui.setScreenshareButtonEnabled(true);
                this.ui.showNotification('Screen sharing ended');
                this.cleanupAudio();
            };

        } catch (error) {
            console.error('Screen sharing failed:', error);
            this.ui.updateStatus('Screen sharing failed');
            this.ui.updateConnectionStatus(false, 'Status: Permission denied');
            this.ui.setScreenshareButtonEnabled(true);
            this.ui.showNotification('Screen sharing failed or was cancelled', 5000);
            
            // Fall back to demo mode
            this.demoMode = true;
            this.simulateAudioData();
        }
    }

    private setupAudioAnalysis() {
        if (!this.audioStream) return;

        try {
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            source.connect(this.analyser);
            
            // Start processing audio
            this.processAudio();
            
        } catch (error) {
            console.error('Audio analysis setup failed:', error);
            this.ui.updateConnectionStatus(false, 'Status: Audio processing failed');
            this.demoMode = true;
            this.simulateAudioData();
        }
    }

    private processAudio() {
        if (!this.analyser) return;

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        
        const process = () => {
            this.analyser!.getByteFrequencyData(dataArray);
            this.updateAudioData(dataArray);
            requestAnimationFrame(process);
        };
        
        process();
    }

    private cleanupAudio() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.analyser = null;
        this.audioStream = null;
    }

    private toggleDemoMode() {
        this.demoMode = !this.demoMode;
        this.ui.showNotification(this.demoMode ? 'Demo mode activated' : 'Demo mode deactivated');
        
        if (this.demoMode) {
            this.ui.updateStatus('Demo mode active');
            this.ui.updateConnectionStatus(true, 'Status: Demo mode');
            this.simulateAudioData();
        } else {
            this.ui.updateStatus('Ready to start screen sharing');
            this.ui.updateConnectionStatus(false, 'Status: Waiting for user action');
        }
    }

    
    private resizeCanvas() {
        const container = this.canvas.parentElement ?? document.body;
        const rect = container.getBoundingClientRect();

        const cssWidth  = Math.max(1, Math.floor(rect.width));
        const cssHeight = Math.max(1, Math.floor((rect.height || 0) || 400));
        const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));

        // CSS size (CSS pixels)
        this.canvas.style.width  = `${cssWidth}px`;
        this.canvas.style.height = `${cssHeight}px`;

        // Backing store size (device pixels)
        this.canvas.width  = cssWidth * dpr;
        this.canvas.height = cssHeight * dpr;

        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

    private setup2DFallback() {
        console.log('Setting up 2D fallback renderer');
        // Simple 2D rendering fallback
        const ctx = this.canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = '#0f0';
            ctx.font = '16px Arial';
            ctx.fillText('WebGL not available - Using 2D fallback', 20, 40);
        }
    }

    initialize() {
        console.log("QuantumSynth initialized");
        this.startRenderLoop();
        this.ui.updateStatus('Ready to start screen sharing');
    }

    private simulateAudioData() {
        // Clear any existing interval
        if (this.demoMode) {
            const time = performance.now() / 1000;
            
            const simulatedData = new Uint8Array(256);
            for (let i = 0; i < 256; i++) {
                const value = Math.sin(time * 2 + i / 10) * 0.5 + 0.5;
                simulatedData[i] = Math.floor(value * 255);
            }
            
            this.updateAudioData(simulatedData);
        }
    }

    private startRenderLoop() {
        let lastTime = performance.now();
        let frameCount = 0;
        
        const render = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            this.render();
            
            // Calculate FPS
            frameCount++;
            if (deltaTime >= 1000) {
                this.fps = frameCount;
                this.ui.updateFPS(this.fps);
                frameCount = 0;
                lastTime = currentTime;
            }
            
            // If in demo mode, simulate audio data each frame
            if (this.demoMode) {
                this.simulateAudioData();
            }
            
            this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    }

    private stopRenderLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    private setupShaders() {
        if (!this.gl) return;
        
        console.log('Setting up shaders');
        
        // Vertex shader
        const vsSource = `
            attribute vec4 aVertexPosition;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = aVertexPosition;
                vTexCoord = aVertexPosition.xy * 0.5 + 0.5;
                gl_PointSize = 3.0;
            }
        `;
        
        // Fragment shader
        const fsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform float uTime;
            
            void main() {
                // Create a dynamic visualization based on time
                vec2 uv = vTexCoord;
                float time = uTime * 0.5;
                
                // Create moving waves
                float wave1 = sin(uv.x * 10.0 + time) * 0.1;
                float wave2 = cos(uv.y * 8.0 + time * 1.3) * 0.1;
                
                // Combine waves
                vec3 color = vec3(
                    abs(sin(time + uv.x * 2.0)) * 0.8,
                    abs(cos(time + uv.y * 2.0)) * 0.6,
                    abs(sin(time * 1.5 + uv.x * 3.0)) * 0.7
                );
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // Create shaders
        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fsSource);
        
        if (!vertexShader || !fragmentShader) {
            console.error('Failed to create shaders');
            return;
        }
        
        // Create program
        this.program = this.gl.createProgram();
        if (!this.program) {
            console.error('Failed to create program');
            return;
        }
        
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Failed to link program:', this.gl.getProgramInfoLog(this.program));
            return;
        }
        
        // Set up vertex buffer
        const vertices = new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0, 1.0,
            1.0, 1.0
        ]);
        
        const vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
        
        const positionAttributeLocation = this.gl.getAttribLocation(this.program, 'aVertexPosition');
        this.gl.vertexAttribPointer(positionAttributeLocation, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(positionAttributeLocation);
        
        console.log('Shaders compiled successfully');
    }

    private createShader(type: number, source: string): WebGLShader | null {
        if (!this.gl) return null;
        
        const shader = this.gl.createShader(type);
        if (!shader) return null;
        
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }

    updateAudioData(data: Uint8Array) {
        this.audioData = data;
    }

    render() {
        if (!this.gl || !this.program) {
            this.render2DFallback();
            return;
        }
        
        // Clear the canvas
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        
        // Use our program
        this.gl.useProgram(this.program);
        
        // Set time uniform
        const timeUniformLocation = this.gl.getUniformLocation(this.program, 'uTime');
        this.gl.uniform1f(timeUniformLocation, performance.now() / 1000);
        
        // Draw
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    private render2DFallback() {
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.audioData) {
            // Draw audio visualization
            const barWidth = this.canvas.width / this.audioData.length;
            
            for (let i = 0; i < this.audioData.length; i++) {
                const value = this.audioData[i] / 255;
                const barHeight = value * this.canvas.height / 2;
                
                // Create colorful bars
                const hue = (i / this.audioData.length) * 360;
                ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
                ctx.fillRect(i * barWidth, this.canvas.height - barHeight, barWidth - 1, barHeight);
            }
        } else {
            // Draw waiting message
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Start screen sharing to begin visualization', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    disconnect() {
        this.stopRenderLoop();
        this.cleanupAudio();
    }
}
