import { WebGLRenderer } from './webgl-renderer';

export class Visualizer {
    private renderer: WebGLRenderer;
    private audioData: Uint8Array | null = null;

    constructor(canvas: HTMLCanvasElement) {
        this.renderer = new WebGLRenderer(canvas);
        this.setupShaders();
    }

    private setupShaders() {
        const vertexShader = `
            attribute vec2 aPosition;
            varying float vAmplitude;
            uniform float uAmplitude[256];
            void main() {
                float amplitude = uAmplitude[int(aPosition.x * 255.0)];
                vAmplitude = amplitude;
                gl_Position = vec4(aPosition.x * 2.0 - 1.0, aPosition.y * amplitude, 0.0, 1.0);
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

        this.renderer.initShaders(vertexShader, fragmentShader);
    }

    updateAudioData(data: Uint8Array) {
        this.audioData = data;
        this.renderer.setUniform1fv('uAmplitude', Array.from(data).map(x => x / 255.0));
    }

    render() {
        if (this.audioData) {
            this.renderer.render();
        }
    }
}
