import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
vec2 kale(vec2 p){
  float a = atan(p.y,p.x);
  float r = length(p);
  float s = 6.;
  a = abs(mod(a, 6.28318/s)*s - 3.14159);
  return vec2(cos(a), sin(a))*r;
}
void main(){
  vec2 p = (uv*2.-1.)*vec2(res.x/res.y,1.);
  p = kale(p);
  float n = sin(p.x*6.+t)+cos(p.y*6.-t);
  float f = texture(fft, vec2(fract(n*.1+.5),0.)).r;
  float glow = smoothstep(.3,1.2, n + f*2. + beat);
  vec3 col = mix(vec3(.02,.04,.07), vec3(.9,.2,.8), glow)*(.6+.8*bands.y) + vec3(0.1,0.6,1.)*bands.x*.5;
  o = vec4(col,1);
}
`
export class KaleidoBloom extends ShaderVis { constructor(gl){ super(gl,'Kaleido Bloom', fs) } }
