import { program, quad } from '../core/utils.js'

const vs = `#version 300 es
layout(location=0) in vec2 p;
out vec2 uv;
void main(){ uv=.5*(p+1.); gl_Position=vec4(p,0,1); }`

export class ShaderVis {
  constructor(gl, name, frag){
    this.gl = gl
    this.name = name
    this.prog = program(gl, vs, frag)
    this.vao = quad(gl)
  }
  draw(fftTex, state, time, res){
    const gl = this.gl
    gl.useProgram(this.prog)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, fftTex)
    gl.uniform1i(gl.getUniformLocation(this.prog,'fft'),0)
    gl.uniform1f(gl.getUniformLocation(this.prog,'t'), time)
    gl.uniform2f(gl.getUniformLocation(this.prog,'res'), res[0], res[1])
    gl.uniform1f(gl.getUniformLocation(this.prog,'beat'), state.beat)
    gl.uniform3f(gl.getUniformLocation(this.prog,'bands'), state.bass, state.mid, state.treble)
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4)
  }
}
