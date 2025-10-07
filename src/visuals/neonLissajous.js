import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
float line(vec2 p, vec2 a, vec2 b, float w){
  vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa - ba*h)-w;
}
void main(){
  vec2 p = (uv*2.-1.)*vec2(res.x/res.y,1.);
  float a = 3.+floor(bands.x*5.);
  float b = 2.+floor(bands.y*5.);
  vec2 q = vec2(sin(a*t + 3.14*bands.z), sin(b*t));
  float d = length(p-q);
  float trail = exp(-10.*d) + exp(-30.*abs(d-0.1));
  float grid = .2*exp(-10.*abs(sin(p.x*6.)*sin(p.y*6.)));
  vec3 col = vec3(0.02,0.03,0.06) + vec3(1.,0.3,1.)*trail + vec3(0.2,0.8,1.)*grid + vec3(1.)*pow(beat,2.)*.5;
  o = vec4(col,1);
}
`
export class NeonLissajous extends ShaderVis { constructor(gl){ super(gl,'Neon Lissajous', fs) } }
