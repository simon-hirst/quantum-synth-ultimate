export class QuantumSynth {
    private audioData: Uint8Array | null = null;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | WebGL2RenderingContext | null;
    private program: WebGLProgram | null = null;
    private animationFrameId: number | null = null;
    private ws: WebSocket | null = null;

    constructor(canvas: HTMLCanvasElement) {
        console.log('QuantumSynth constructor called');
        this.canvas = canvas;
        
        // Ensure canvas is properly sized
        this.resizeCanvas();
        
        // Try WebGL2 first, then fall back to WebGL1
        try {
            this.gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!this.gl) {
                console.error('WebGL not supported');
                this.setup2DFallback();
                return;
            }
            console.log('WebGL context created successfully');
            this.setupShaders();
        } catch (error) {
            console.error('QuantumSynth initialization failed:', error);
            this.setup2DFallback();
        }
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
        
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
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
        this.setupEventListeners();
        this.connectToBackend();
        this.startRenderLoop();
    }

    private setupEventListeners() {
        console.log("Setting up event listeners");
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private connectToBackend() {
        const backendUrl = import.meta.env.VITE_AI_BACKEND_URL || 'wss://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/ws';
        
        try {
            this.ws = new WebSocket(backendUrl);
            
            this.ws.onopen = () => {
                console.log('Connected to AI backend');
                // Send a test message to request audio data
                this.ws?.send(JSON.stringify({ type: 'request_audio', sessionId: 'test-session' }));
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.fft) {
                        this.updateAudioData(new Uint8Array(data.fft));
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                // Simulate audio data for testing
                this.simulateAudioData();
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket connection closed');
            };
        } catch (error) {
            console.error('Failed to connect to backend:', error);
            // Simulate audio data for testing
            this.simulateAudioData();
        }
    }

    private simulateAudioData() {
        // Create simulated audio data for testing
        const simulatedData = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            simulatedData[i] = Math.floor(Math.random() * 128 + 128 * Math.sin(i / 10));
        }
        this.updateAudioData(simulatedData);
    }

    private startRenderLoop() {
        const render = () => {
            this.render();
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
            void main() {
                gl_Position = aVertexPosition;
                gl_PointSize = 5.0;
            }
        `;
        
        // Fragment shader
        const fsSource = `
            precision mediump float;
            uniform vec2 uResolution;
            uniform float uTime;
            void main() {
                vec2 uv = gl_FragCoord.xy / uResolution;
                vec3 color = vec3(uv.x, uv.y, 0.5 + 0.5 * sin(uTime));
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
        
        // Set resolution uniform
        const resolutionUniformLocation = this.gl.getUniformLocation(this.program, 'uResolution');
        this.gl.uniform2f(resolutionUniformLocation, this.canvas.width, this.canvas.height);
        
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
            ctx.fillStyle = '#4ecdc4';
            
            for (let i = 0; i < this.audioData.length; i++) {
                const barHeight = (this.audioData[i] / 255) * this.canvas.height / 2;
                ctx.fillRect(i * barWidth, this.canvas.height - barHeight, barWidth - 1, barHeight);
            }
        } else {
            // Draw waiting message
            ctx.fillStyle = '#fff';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Waiting for audio data...', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    disconnect() {
        this.stopRenderLoop();
        if (this.ws) {
            this.ws.close();
        }
    }
}
