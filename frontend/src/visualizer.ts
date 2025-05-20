export class QuantumSynth {
    private renderer: any;
    private audioData: Uint8Array | null = null;
    private canvas: HTMLCanvasElement;
    private gl: WebGLRenderingContext | WebGL2RenderingContext | null;

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
    }

    private setupEventListeners() {
        console.log("Setting up event listeners");
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    private setupShaders() {
        if (!this.gl) return;
        
        console.log('Setting up shaders');
        const vertexShader = `
            attribute vec2 aPosition;
            varying float vAmplitude;
            uniform float uAmplitude[256];
            void main() {
                float amplitude = uAmplitude[int(aPosition.x * 255.0)];
                vAmplitude = amplitude;
                gl_Position = vec4(aPosition.x * 2.0 - 1.0, aPosition.y * amplitude, 0.0, 1.0);       
                gl_PointSize = 2.0;
            }
        `;

        const fragmentShader = `
            precision mediump float;
            varying float vAmplitude;
            void main() {
                vec3 color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.5, 0.2), vAmplitude);
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // Simple shader compilation
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER)!;
        this.gl.shaderSource(vs, vertexShader);
        this.gl.compileShader(vs);

        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER)!;
        this.gl.shaderSource(fs, fragmentShader);
        this.gl.compileShader(fs);

        const program = this.gl.createProgram()!;
        this.gl.attachShader(program, vs);
        this.gl.attachShader(program, fs);
        this.gl.linkProgram(program);
        this.gl.useProgram(program);

        console.log('Shaders compiled successfully');
    }

    updateAudioData(data: Uint8Array) {
        console.log('Audio data received:', data.length, 'samples');
        this.audioData = data;
    }

    render() {
        if (this.audioData && this.gl) {
            console.log('Rendering audio visualization');
            // Add rendering logic here
        } else if (this.audioData) {
            // 2D fallback rendering
            const ctx = this.canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Simple audio visualization
                const barWidth = this.canvas.width / this.audioData.length;
                ctx.fillStyle = '#4ecdc4';
                
                for (let i = 0; i < this.audioData.length; i++) {
                    const barHeight = (this.audioData[i] / 255) * this.canvas.height / 2;
                    ctx.fillRect(i * barWidth, this.canvas.height - barHeight, barWidth - 1, barHeight);
                }
            }
        }
    }
}
