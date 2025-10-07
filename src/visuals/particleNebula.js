import { ShaderVis } from './base.js'
const fs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D fft;
uniform vec2 res;
uniform float t, beat;
uniform vec3 bands;
vec2 hash(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
float noise(vec2 x){ vec2 i=floor(x), f=fract(x); vec2 u=f*f*(3.-2.*f); return mix(mix(dot(hash(i+vec2(0,0)),f-vec2(0,0)),dot(hash(i+vec2(1,0)),f-vec2(1,0)),u.x), mix(dot(hash(i+vec2(0,1)),f-vec2(0,1)),dot(hash(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
float fbm(vec2 x){ float s=0.,a=.5; for(int i=0;i<6;i++){ s+=a*noise(x); x*=2.; a*=.5; } return s; }
void main(){
  vec2 p = (uv*2.-1.)*vec2(res.x/res.y,1.);
  float bass = bands.x;
  float swirl = fbm(p*1.5 + t*.12) + fbm(p*3. + t*.2)*.5;
  float field = fbm(p*2. + vec2(0, t*.1)) + bass*1.2;
  float glow = smoothstep(.6,1.4, field + swirl*0.6 + beat*.8);
  vec3 base = mix(vec3(0.06,0.08,0.12), vec3(0.2,0.02,0.25), fbm(p*1.+t*.05));
  vec3 tint = mix(vec3(0.1,0.6,1.), vec3(1.,0.2,0.8), fbm(p*2.-t*.1));
  vec3 col = base + tint*(glow*1.4 + pow(bands.y,2.)*.4 + beat*.6);
  o = vec4(col,1);
}
`
export class ParticleNebula extends ShaderVis { constructor(gl){ super(gl,'Particle Nebula', fs) } }
