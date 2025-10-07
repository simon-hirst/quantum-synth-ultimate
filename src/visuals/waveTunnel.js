import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
void main(){
  vec2 p = uv*2.-1.;
  float asp = res.x/res.y;
  p.x*=asp;
  float r = length(p);
  float a = atan(p.y,p.x);
  float ring = fract(r*6. - t*2. - beat*2.);
  float w = .04 + bands.z*.06;
  float line = smoothstep(w,w*.5, abs(ring-.5));
  float f = texture(fft, vec2(fract(a/6.28318),0.)).r;
  vec3 base = mix(vec3(0.02,0.03,0.06), vec3(0.12,0.02,0.2), r);
  vec3 glow = vec3(0.6,0.8,1.)*pow(1.-line,2.)*(.4+.6*f);
  vec3 pulse = vec3(1.,0.2,0.9)*pow(beat,2.)*.7;
  o = vec4(base + glow + pulse, 1);
}
`
export class WaveTunnel extends ShaderVis { constructor(gl){ super(gl,'Waveform Tunnel', fs) } }
