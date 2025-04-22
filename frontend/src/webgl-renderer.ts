export class WebGLRenderer {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram | null = null;

    constructor(private canvas: HTMLCanvasElement) {
        this.gl = canvas.getContext('webgl2')!;
    }

    initShaders(vertexShaderSource: string, fragmentShaderSource: string) {
        const gl = this.gl;
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        gl.useProgram(this.program);
    }

    setUniform1fv(name: string, data: number[]) {
        const gl = this.gl;
        const location = gl.getUniformLocation(this.program!, name);
        gl.uniform1fv(location, new Float32Array(data));
    }

    render() {
        const gl = this.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.LINE_STRIP, 0, 256);
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            throw new Error('Shader compilation failed');
        }
        return shader;
    }
}
