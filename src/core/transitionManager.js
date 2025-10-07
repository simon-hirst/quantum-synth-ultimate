import { program, quad } from './utils.js'

const vs = `#version 300 es
layout(location=0) in vec2 p;
out vec2 uv;
void main(){ uv = .5*(p+1.); gl_Position = vec4(p,0,1); }`

const fs = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 o;
uniform sampler2D a;
uniform sampler2D b;
uniform sampler2D fft;
uniform float t;
uniform float mixAmt;
vec2 hash(vec2 x){ x=vec2(dot(x,vec2(127.1,311.7)),dot(x,vec2(269.5,183.3))); return -1.+2.*fract(sin(x)*43758.5453123); }
float noise(vec2 x){ vec2 i=floor(x), f=fract(x); vec2 u=f*f*(3.-2.*f); return mix(mix(dot(hash(i+vec2(0,0)),f-vec2(0,0)),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x), mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
void main(){
  float e = texture(fft, vec2(uv.x,0.)).r;
  float k = mixAmt;
  vec2 d = .04*vec2(noise(uv*4.+t*1.2), noise(uv*3.-t*.7))*(e*2.+.2)*smoothstep(.0,1.,k);
  vec4 A = texture(a, uv + d*(1.-k));
  vec4 B = texture(b, uv - d*k);
  float w = smoothstep(0.,1.,k);
  o = mix(A,B,w);
}`

export class Transition {
  constructor(gl){
    this.gl = gl
    this.p = program(gl, vs, fs)
    this.vao = quad(gl)
    this.mix = 0
    this.active = false
  }
  start(){ this.active = true; this.mix = 0 }
  step(dt){ if(!this.active) return false; this.mix += dt*0.7; if(this.mix>=1){ this.mix=1; this.active=false; } return true }
  draw(texA, texB, fftTex){
    const gl = this.gl
    gl.useProgram(this.p)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texA)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB)
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, fftTex)
    gl.uniform1i(gl.getUniformLocation(this.p,'a'),0)
    gl.uniform1i(gl.getUniformLocation(this.p,'b'),1)
    gl.uniform1i(gl.getUniformLocation(this.p,'fft'),2)
    gl.uniform1f(gl.getUniformLocation(this.p,'t'), performance.now()/1000)
    gl.uniform1f(gl.getUniformLocation(this.p,'mixAmt'), this.mix)
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4)
  }
}
