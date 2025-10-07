import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
float ring(float r, float w, float s){ return smoothstep(w,w*.5,abs(r-s)); }
void main(){
  vec2 c = uv*2.-1.;
  float a = atan(c.y,c.x);
  float r = length(c);
  float q = (a+3.14159265)/(6.2831853);
  float f = texture(fft, vec2(q,0.)).r;
  float n = 12.;
  float id = floor(q*n)/n;
  float bar = pow(texture(fft, vec2(id,0.)).r, .75);
  float radius = .25 + .6*bar + .06*sin(t*2. + id*20.) + .05*beat;
  float glow = .02/abs(r-radius);
  vec3 col = mix(vec3(.15,.2,.5), vec3(.9,.2,.8), id);
  col += vec3(.2,.9,1.)*pow(bands.z,2.)*0.2;
  float mask = smoothstep(.01, .0, abs(r-radius)-.01);
  float flare = pow(max(0.,1.-abs(r-radius)*16.), 2.)*0.6;
  float spin = .5+.5*sin(t*0.4 + id*12.);
  o = vec4(col*(glow*0.5 + flare + mask*spin), 1.0);
}
`
export class SpectrumRings extends ShaderVis { constructor(gl){ super(gl,'Spectrum Rings', fs) } }
