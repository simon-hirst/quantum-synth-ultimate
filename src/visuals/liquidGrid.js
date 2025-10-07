import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
float sdgrid(vec2 p,float s){ vec2 g=abs(fract(p/s-.5)-.5); return min(g.x,g.y)*s; }
void main(){
  vec2 p = (uv*2.-1.);
  float k = .6 + bands.y*.8 + beat*.6;
  p += vec2(sin(p.y*6.+t*2.)*k, cos(p.x*6.-t*2.)*k)*.05;
  float d = sdgrid(p*3., .2 + bands.x*.2);
  float m = smoothstep(.04, .0, d);
  vec3 a = vec3(0.02,0.05,0.08);
  vec3 b = vec3(0.0,0.8,0.9);
  vec3 c = vec3(0.9,0.1,0.8);
  vec3 col = mix(a, b, m) + c*pow(bands.z,1.5)*.2 + vec3(1.)*pow(beat,2.)*.5;
  o = vec4(col,1);
}
`
export class LiquidGrid extends ShaderVis { constructor(gl){ super(gl,'Liquid Grid', fs) } }
