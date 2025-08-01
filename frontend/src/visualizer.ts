/**
 * QuantumSynth Visualizer — Plasma Orb + Boosted Reactivity
 * - New scene: plasmaOrb (glowing orb with vibrating, audio-reactive edge)
 * - Rotation: plasmaOrb + 9 others (modern + classics)
 * - Strong audio coupling (AGC tweaked, bigger multipliers)
 * - Clean morph transition remains (edge-guided advection)
 * - Keys: M next • 1–0 choose • P pause • S server (one-off preview)
 */

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerTexture = { name:string; dataUrl:string; width:number; height:number; gridCols?:number; gridRows?:number; frames?:number; fps?:number; };
type ServerShader  = { type:string; name:string; code:string; complexity:number; version?:string; uniforms?:{name:string;type:string}[]; textures?:ServerTexture[]; };

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

/* ==== tiny GL helpers ==== */
function compile(gl:GL, type:number, src:string){
  const s=gl.createShader(type)!; gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'compile');
  return s;
}
function link(gl:GL, vsSrc:string, fsSrc:string){
  const p=gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'link');
  return p;
}

/* ================= GLSL blocks ================= */
const PRELUDE = `
precision highp float;
varying vec2 vUV; uniform vec2 uRes;
float sat(float x){ return clamp(x,0.0,1.0); }
vec2  toAspect(vec2 uv){ vec2 p=uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
float vignette(vec2 uv){ vec2 p=toAspect(uv); float d=dot(p,p); return smoothstep(1.15,0.25, d); }
vec3  pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
vec3  nicePal(float t){ return pal(t, vec3(0.5,0.53,0.56), vec3(0.45,0.43,0.48), vec3(1.0,1.0,1.0), vec3(0.0,0.33,0.67)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
vec2  rot(vec2 p, float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c)*p; }
`;

const NOISE = `
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i);
  float b=hash(i+vec2(1.0,0.0));
  float c=hash(i+vec2(0.0,1.0));
  float d=hash(i+vec2(1.0,1.0));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5;
  for(int i=0;i<5;i++){
    v += a*n2(p); p = p*2.02 + vec2(37.1,17.7); a*=0.5;
  }
  return v;
}
`;

const AUDIO_UNI = `
uniform float uTime,uLevel,uBeat,uImpact,uLow,uMid,uAir;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform sampler2D uWaveTex; uniform float uWaveN;
float specAt(float x){
  float xx=sat(x); float i=floor(xx*uSpecN); float u=(i+0.5)/uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
float waveAt(float x){
  float xx=sat(x); float i=floor(xx*uWaveN); float u=(i+0.5)/uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`;

/* ================= Modern scenes (amped) ================= */

/* Plasma ORB — high-reactivity glowing orb with vibrating edge & ripples */
const FS_PLASMA_ORB = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float ring(float d, float w){ return smoothstep(w, 0.0, abs(d)); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv);
  float t=uTime;

  float r=length(p)+1e-5;
  float ang=atan(p.y,p.x);
  float spec = 0.6*specAt(fract((ang+3.14159)/6.28318)) + 0.4*specAt(sat(r));
  float wave = waveAt(fract(0.5*(p.x+1.0)));

  // Domain warp with mid/highs
  float warpAmp = 0.18 + 0.55*uMid + 0.35*uAir;
  vec2 w = p;
  w += warpAmp * vec2(fbm(p*3.2 + vec2(0.0,t*0.7)), fbm(p*3.1 + vec2(t*0.8,0.0)));

  // Orb base radius breathing with bass + impact
  float baseR = 0.48 - 0.06*uLow - 0.03*uImpact;

  // Vibrating edge by spectrum & waveform
  float edgeVibe = 0.06*(spec*1.8 + wave*1.2) + 0.035*uAir;
  float edge = ring(r - (baseR + 0.04*sin(ang*8.0 + t*2.0) + 0.10*fbm(w*2.2)), 0.06 + 0.035*uImpact) *
               (0.9 + 1.6*uLevel + 0.8*uImpact);

  // Beat ripples that travel outward
  float speed = 3.0 + 7.0*uLow + 2.0*uAir;
  float ripple = 0.0;
  for(int i=0;i<3;i++){
    float ph = t*speed - float(i)*0.7 - uBeat*0.6;
    ripple += ring( sin(12.0*r - ph*7.0), 0.10 - 0.03*uImpact );
  }
  ripple *= (0.25 + 1.6*uBeat + 0.9*uImpact);

  // Inner glow and swirling core
  float swirl = fbm(rot(w, t*0.25 + uLow*0.9)*2.0);
  float core = smoothstep(0.75, 0.0, r/baseR) * (0.4 + 2.0*uLevel + 1.0*uLow);

  // Color — tasteful cyan→magenta palette modulated by swirl & spectrum
  vec3 ink = mix(vec3(0.15,1.0,1.1), vec3(1.0,0.55,1.1), sat(0.5 + 0.5*swirl + 0.4*spec));
  vec3 col = vec3(0.02);
  col += ink * (edge*1.1 + ripple*0.8);
  col += vec3(0.15,0.35,0.6) * core;
  col += 0.35*ink * pow(sat(1.0-r/baseR), 3.0) * (0.6 + 1.6*uMid);

  // Soft glow halo
  float halo = exp(-pow(r*2.2, 2.0)) * (0.3 + 1.7*uLow + 0.8*uImpact);
  col += vec3(0.2,0.9,1.1)*halo;

  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

/* Existing modern + classics, tuned a touch hotter */

const FS_AURORA = `
${PRELUDE}${NOISE}${AUDIO_UNI}
void main(){
  vec2 p = toAspect(vUV);
  float t = uTime*0.35 + uLow*1.3;
  vec2 q = p;
  q.x += 0.45*fbm(p*1.6 + vec2(0.0,t*1.7));
  q.y += 0.28*fbm(p*2.0 + vec2(t*0.8,0.0));
  float bands = 0.55 + 0.45*sin(5.2*q.y + 3.9*q.x + t*3.7 + uAir*7.0 + uBeat*3.0);
  float drift  = fbm(q*2.2 + vec2(t*0.7,-t*0.55));
  float glow = pow(sat(bands*0.55 + drift*0.7), 3.0);
  float tone = 0.2 + 0.6*glow + 0.35*uAir + 0.25*uLow;
  vec3 tint = mix(vec3(0.15,0.9,1.0), vec3(1.0,0.5,1.0), sat(uAir*1.4));
  vec3 col = nicePal(tone)*0.22 + tint*glow*(0.9+1.8*uLevel+0.5*uImpact);
  col *= vignette(vUV);
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_LIQUID = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float ridge(float x, float w){ return smoothstep(w, 0.0, abs(x)); }
void main(){
  vec2 p = toAspect(vUV);
  float t = uTime;
  vec2 w = p*1.4;
  w += 0.42*vec2(fbm(p*1.8 + vec2(0.0,t*0.9)), fbm(p*1.9 + vec2(t*0.8,0.0)));
  float f = fbm(w*2.3 + rot(p, 0.35*t + uLow*1.0));
  float lines = 0.0;
  float scale = 7.0 + 12.0*uMid + 5.0*uLow + 4.0*uBeat;
  for(int i=0;i<5;i++){
    float s = 0.9 + float(i)*0.55;
    float r = ridge(fract(f*scale*s) - 0.5, 0.16 - 0.06*uImpact);
    lines += r;
  }
  lines /= 5.0;
  vec3 base = nicePal(f*0.75 + 0.2*uAir);
  vec3 col  = base*0.25 + mix(vec3(0.1,1.0,1.0), vec3(1.0,0.55,1.1), uAir)*lines*(0.9+1.7*uLevel+0.6*uImpact);
  col = mix(col, vec3(0.02), 0.12);
  col *= vignette(vUV);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_NEON_PARTICLES = `
${PRELUDE}${AUDIO_UNI}
float softDisc(vec2 p, float r, float blur){ return smoothstep(blur, 0.0, length(p)-r); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv); float t=uTime;
  vec3 col=vec3(0.0);
  for(int i=0;i<90;i++){
    float fi=float(i);
    float a=fract(sin(fi*12.345)*43758.5453);
    float b=fract(sin((fi+3.14)*54.321)*12345.6789);
    vec2 center=vec2(a*2.0-1.0, b*2.0-1.0);
    float spin=0.12 + 0.6*b + 0.4*uAir;
    center=rot(center, t*spin);
    center+=0.32*vec2(sin(t*(0.7+a*1.4)), cos(t*(0.8+b*1.2)));
    float bass=0.7 + 1.2*uLow + 0.6*uImpact;
    float size=mix(0.018, 0.12 + 0.1*uBeat, a)*bass;
    float d=softDisc(p-center, size, 0.05 + 0.05*uImpact);
    vec3  tint=mix(vec3(0.1,0.9,1.0), vec3(1.0,0.55,1.0), b);
    col += (d*d)*tint*(0.55+2.0*uLevel+0.6*uImpact);
  }
  col *= vignette(uv);
  gl_FragColor=vec4(col,1.0);
}
`;

const FS_RIBBONS = `
${PRELUDE}${AUDIO_UNI}
float linstep(float a,float b,float x){ return clamp((x-a)/(b-a), 0.0, 1.0); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv); float t=uTime*0.9;
  float stripes=0.0; float N=10.0;
  for(int i=0;i<10;i++){
    float fi=float(i);
    float wv = waveAt(fract(uv.x*0.8 + fi*0.08 + t*0.07));
    float y  = (wv*2.0-1.0)*0.52 + 0.38*sin(t*0.7 + fi*0.72 + uLow*0.9);
    float d  = abs(p.y - y);
    float thick = 0.03 + 0.08*linstep(0.35,1.0,uImpact) + 0.03*uBeat;
    float line = smoothstep(thick, 0.0, d);
    stripes += line * (1.0 - fi/N);
  }
  stripes /= N;
  vec3 col = mix(vec3(0.05,0.07,0.1), vec3(0.02,0.03,0.05), 1.0);
  vec3 ink = mix(vec3(0.15,1.0,1.1), vec3(1.0,0.55,1.0), sat(uAir*1.2));
  col += ink * pow(stripes, 1.0) * (0.9+1.9*uLevel+0.6*uImpact);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_GLASS_CELLS = `
${PRELUDE}${NOISE}${AUDIO_UNI}
vec2 voronoi(vec2 p){
  vec2 n=floor(p), f=fract(p);
  vec2 mg, mr; float md=8.0;
  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 g=vec2(float(i),float(j));
      vec2 o=vec2(hash(n+g), hash(n+g+1.7));
      o = 0.5 + 0.5*sin(6.2831*o + uTime*vec2(0.28,0.23));
      vec2 r=g+o-f; float d=dot(r,r);
      if(d<md){ md=d; mr=r; mg=g; }
    }
  }
  return vec2(sqrt(md), mr.x+mr.y);
}
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv)*1.5;
  p += 0.28*vec2(fbm(p*1.3 + uTime*0.25), fbm(p*1.5 - uTime*0.2));
  vec2 v = voronoi(p + uLow*1.0);
  float edge = smoothstep(0.08 - 0.04*uImpact, 0.0, v.x);
  float glow = smoothstep(0.25, 0.0, v.x) * (0.4+1.9*uMid+0.6*uBeat);
  vec3 base = nicePal(v.y*0.07 + 0.12*uAir);
  vec3 col  = base*0.18 + vec3(edge)*0.9 + glow*vec3(0.2,1.0,1.1);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

/* Classics (from previous pass) */
const FS_CLASSIC_BARS = `
${PRELUDE}${AUDIO_UNI}
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.82);
  float a = specAt(x);
  float H = 0.06 + 1.9*a + 0.9*uLevel + 0.35*uLow + 0.55*uImpact;
  float body = step(uv.y, H);
  float cap = smoothstep(H, H-0.04-0.05*uAir-0.035*uImpact, uv.y);
  float shade = 0.35 + 0.65*pow(1.0-abs(uv.x*2.0-1.0), 0.5);
  vec3 col = mix(vec3(0.1,1.0,1.1), vec3(1.0,0.5,1.0), x) * shade;
  float g = smoothstep(H+0.02, H, uv.y) * (0.7+2.0*uLevel+0.9*uImpact);
  col += g*vec3(0.7,1.0,1.1);
  gl_FragColor = vec4(col*max(body, 1.2*cap),1.0);
}
`;

const FS_CLASSIC_CENTERBARS = `
${PRELUDE}${AUDIO_UNI}
void main(){
  vec2 uv=vUV;
  float x = abs(uv.x-0.5)*2.0;
  float a = specAt(pow(1.0-x,0.7));
  float h = 0.05 + 1.8*a + 0.8*uLevel + 0.35*uLow + 0.5*uImpact;
  float line = smoothstep(h, h-0.03-0.03*uAir, uv.y);
  float glow = smoothstep(h+0.04+0.05*uImpact, h, uv.y);
  vec3 col = mix(vec3(0.15,1.0,1.1), vec3(1.0,0.55,1.0), a);
  col = col*line + vec3(glow)*(0.45+1.9*uLevel+0.9*uImpact);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_CLASSIC_WAVE = `
${PRELUDE}${AUDIO_UNI}
void main(){
  float y = 1.0 - waveAt(vUV.x);
  float d = abs(vUV.y - y);
  float thickness = 0.010 + 0.018*uImpact + 0.01*uBeat;
  float line = smoothstep(thickness, 0.0, d);
  float glow = smoothstep(0.08+0.05*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.15,1.0,1.1), vec3(1.0,0.55,1.0), vUV.x);
  col = col * line + glow * 0.28*(0.7+1.6*uLevel);
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_CLASSIC_LISSA = `
${PRELUDE}${AUDIO_UNI}
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveAt(fract((vUV.x)));
  float b=waveAt(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.02+0.012*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.12,1.0,1.1), vec3(1.0,0.55,1.0), a*b);
  col *= (0.9+1.6*uLevel+0.5*uBeat);
  gl_FragColor = vec4(col*line, 1.0);
}
`;

const FS_CLASSIC_STARFIELD = `
${PRELUDE}${AUDIO_UNI}
float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(vUV); float d=length(p);
  float speed = 1.0 + 4.5*uLow + 1.8*uImpact;
  vec3 col=vec3(0.0);
  for(int i=0;i<28;i++){
    float f=float(i);
    vec2 q = fract(uv*0.55 + vec2(h2(vec2(f,1.7)),h2(vec2(2.3,f))) + uTime*speed*0.025);
    float star = pow(1.0 - length(q-0.5)*2.0, 7.0);
    col += vec3(star)*(0.35+1.2*uAir);
  }
  col *= 1.0 - d*0.25;
  gl_FragColor=vec4(col,1.0);
}
`;

/* ================= Morph shader (edge-guided) ================= */
const FS_MORPH = `
${PRELUDE}
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3 uBands; // x:low, y:mid, z:air
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec2 sobel(sampler2D t, vec2 uv, vec2 px){
  float tl=luma(texture2D(t, uv+px*vec2(-1.0,-1.0)).rgb);
  float  l=luma(texture2D(t, uv+px*vec2(-1.0, 0.0)).rgb);
  float bl=luma(texture2D(t, uv+px*vec2(-1.0, 1.0)).rgb);
  float tr=luma(texture2D(t, uv+px*vec2( 1.0,-1.0)).rgb);
  float  r=luma(texture2D(t, uv+px*vec2( 1.0, 0.0)).rgb);
  float br=luma(texture2D(t, uv+px*vec2( 1.0, 1.0)).rgb);
  float  t0=luma(texture2D(t, uv+px*vec2( 0.0,-1.0)).rgb);
  float  b0=luma(texture2D(t, uv+px*vec2( 0.0, 1.0)).rgb);
  vec2 g;
  g.x = (tr + 2.0*r + br) - (tl + 2.0*l + bl);
  g.y = (bl + 2.0*b0 + br) - (tl + 2.0*t0 + tr);
  return g;
}
vec2 norm2(vec2 v){ float m=max(1e-5, length(v)); return v/m; }
void main(){
  vec2 uv=vUV; vec2 px=1.0/uRes;
  float p = smoothstep(0.0,1.0,uProgress);
  vec2 gA = sobel(uFrom, uv, px);
  vec2 gB = sobel(uTo,   uv, px);
  vec2 dirA = norm2(gA);
  vec2 dirB = norm2(gB);
  float magA = min(1.0, length(gA));
  float magB = min(1.0, length(gB));
  float featA = smoothstep(0.12, 0.55, magA);
  float featB = smoothstep(0.12, 0.55, magB);
  float audioAmp = 0.35 + 2.2*uBands.x + 1.2*uImpact + 0.6*uBeat + 0.7*uBands.z;
  vec2 ua = uv, ub = uv;
  float stepLen = (1.0 + 1.6*uBands.y) * (0.004 + 0.006*audioAmp);
  for(int i=0;i<7;i++){ ua += dirA * stepLen * (1.0-p) * featA; ub -= dirB * stepLen * (p) * featB; }
  vec3 colA = texture2D(uFrom, ua).rgb;
  vec3 colB = texture2D(uTo,   ub).rgb;
  float carryA = featA * (1.0 - p);
  float carryB = featB * p;
  float w = smoothstep(0.0,1.0, p + 0.25*(carryB - carryA)) + 0.18*uBeat;
  w = clamp(w, 0.0, 1.0);
  vec3 glow = vec3(0.06,0.04,0.10) * (uBeat*0.7 + uImpact*0.35);
  vec3 col = mix(colA, colB, w) + glow;
  gl_FragColor = vec4(col,1.0);
}
`;

/* ================= Visualizer ================= */

const MIN_MODE_HOLD_MS = 15000;
const MODE_JITTER_MS   = 16000;

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;

  private quad: WebGLBuffer | null = null;

  // audio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private wave: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  // audio metrics
  private level=0; private beat=0; private impact=0; private low=0; private mid=0; private air=0;
  private agc=0.70; // slightly higher target gain

  // audio textures
  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 192;
  private waveBins = 512;

  // server shader (optional preview)
  private serverProg: WebGLProgram | null = null;

  // programs
  private progs: Record<string, WebGLProgram | null> = {};
  private morphProg: WebGLProgram | null = null;

  // morph render targets
  private texFrom: WebGLTexture | null = null; private fbFrom: WebGLFramebuffer | null = null;
  private texTo:   WebGLTexture | null = null; private fbTo:   WebGLFramebuffer | null = null;

  // rotation
  private scenes = [
    'plasmaOrb','auroraFlow','liquidSpectrum','neonParticles','ribbonWaves',
    'glassCells','classicBars','classicCenterBars','classicWave','classicLissajous','classicStarfield'
  ] as const;
  private sceneIdx = 0;
  private nextSwitchAt = 0;
  private rotatePaused = false;

  // transition state
  private transitioning=false; private transStart=0; private transDur=1600; private nextIdx=0;

  private anim:number|undefined; private frames=0; private lastFPS=performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if (!this.gl) { this.canvas.getContext('2d')?.fillText('WebGL not supported', 10, 20); return; }

    this.initGL();
    this.initAudioTextures();
    this.resize();
    new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement || document.body);

    this.opts.onStatus?.('Ready. M next • 1–0 choose • P pause • S server (one-off)');
    window.addEventListener('keydown',(e)=>this.onKey(e));
  }

  /* public controls */
  isPaused(){ return this.rotatePaused; }
  togglePause(){ this.rotatePaused=!this.rotatePaused; if(!this.anim) this.loop(); }

  async start(){ this.loop(); this.loadServerShader().catch(()=>{}); }
  stop(){ if(this.anim) cancelAnimationFrame(this.anim); }

  async startScreenShare(){
    const s = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false}} as any);
    if(!s.getAudioTracks().length){ s.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser(); this.analyser.fftSize = 4096;
    const src = this.audioCtx.createMediaStreamSource(s); src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.wave = new Uint8Array(this.analyser.fftSize);
    this.stream = s;
    const v=s.getVideoTracks()[0]; if(v) v.onended=()=>this.stopScreenShare();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; this.wave=null; this.audioCtx?.close().catch(()=>{}); this.audioCtx=null; this.analyser=null; }
  isSharing(){ return !!this.stream; }
  setDemoMode(v:boolean){ if(v) this.stopScreenShare(); }

  /* ===== init ===== */
  private initGL(){
    const gl=this.gl!;
    const quad = gl.createBuffer()!; this.quad=quad; gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    // compile scenes
    const sources: Record<string,string> = {
      plasmaOrb:FS_PLASMA_ORB,
      auroraFlow:FS_AURORA, liquidSpectrum:FS_LIQUID, neonParticles:FS_NEON_PARTICLES,
      ribbonWaves:FS_RIBBONS, glassCells:FS_GLASS_CELLS,
      classicBars:FS_CLASSIC_BARS, classicCenterBars:FS_CLASSIC_CENTERBARS,
      classicWave:FS_CLASSIC_WAVE, classicLissajous:FS_CLASSIC_LISSA, classicStarfield:FS_CLASSIC_STARFIELD,
    };
    for(const [k,src] of Object.entries(sources)){
      try{ const p=link(gl,VS,src); this.progs[k]=p; } catch(e){ console.error('[Shader fail]',k,e); this.progs[k]=null; }
    }
    this.morphProg = link(gl,VS,FS_MORPH);

    // morph FBOs
    this.texFrom=this.mkTex(2,2); this.fbFrom=this.mkFB(this.texFrom!);
    this.texTo  =this.mkTex(2,2); this.fbTo  =this.mkFB(this.texTo!);

    this.bumpSwitchTimer();
  }

  private mkTex(w:number,h:number){ const gl=this.gl!; const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }
  private mkFB(t:WebGLTexture){ const gl=this.gl!; const f=gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); return f; }

  private initAudioTextures(){
    const gl=this.gl!;
    const mk=(w:number)=>{ const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    this.specTex = mk(this.specBins);
    this.waveTex = mk(this.waveBins);
  }

  private resize(){
    const gl=this.gl!; const dpr=Math.max(1,Math.round(window.devicePixelRatio||1));
    const container=this.canvas.parentElement || document.body;
    const w=(container as HTMLElement).clientWidth || window.innerWidth;
    const h=(container as HTMLElement).clientHeight || window.innerHeight;
    const W=w*dpr, H=h*dpr;
    if (this.canvas.width!==W || this.canvas.height!==H){
      this.canvas.width=W; this.canvas.height=H;
      this.canvas.style.width=w+"px"; this.canvas.style.height=h+"px";
      gl.viewport(0,0,W,H);
      // resize morph FBOs to half-res
      const hw=Math.max(2, Math.floor(W/2)), hh=Math.max(2, Math.floor(H/2));
      const upd=(t:WebGLTexture|null, f:WebGLFramebuffer|null)=>{ if(!t||!f) return; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,hw,hh,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); };
      upd(this.texFrom,this.fbFrom); upd(this.texTo,this.fbTo);
    }
  }

  /* ===== hotkeys ===== */
  private onKey(e:KeyboardEvent){
    const k=e.key.toLowerCase();
    if(k==='m') this.nextScene();
    if(k==='p') this.togglePause();
    if(k==='s') this.previewServer();
    if('0123456789'.includes(k)){
      const map=[...this.scenes];
      const idx=(k==='0')?map.length-1:parseInt(k,10)-1;
      if(map[idx]) this.beginTransition(idx);
    }
  }

  private bumpSwitchTimer(){ const now=performance.now(); this.nextSwitchAt = now + MIN_MODE_HOLD_MS + Math.random() * MODE_JITTER_MS; }
  private nextScene(){ const idx=(this.sceneIdx+1)%this.scenes.length; this.beginTransition(idx); }
  private beginTransition(next:number){
    if(next===this.sceneIdx) return;
    this.nextIdx=next;
    // render current & next to offscreen
    const now=performance.now()/1000;
    this.renderSceneTo(this.texFrom!, this.fbFrom!, now, this.scenes[this.sceneIdx] as string);
    this.renderSceneTo(this.texTo!,   this.fbTo!,   now, this.scenes[next] as string);
    this.transitioning=true; this.transStart=performance.now();
    this.bumpSwitchTimer();
  }

  /* ===== loop ===== */
  private loop = () => {
    const gl=this.gl!;
    const now=performance.now(); this.frames++; if(now-this.lastFPS>=1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastFPS=now; }

    // Audio analysis + AGC (hotter)
    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);
      const N=this.freq.length; let sum=0; let low=0, mid=0, air=0;
      for(let i=0;i<N;i++){ const v=this.freq[i]/255; sum+=v*v; if(i<N*0.2) low+=v; else if(i<N*0.7) mid+=v; else air+=v; }
      low/=Math.max(1,N*0.2); mid/=Math.max(1,N*0.5); air/=Math.max(1,N*0.3);
      const rawLevel=Math.sqrt(sum/N);
      const target=0.6; const e=target - rawLevel; this.agc += e*0.10; this.agc = Math.max(0.35, Math.min(2.6, this.agc));
      const level = Math.min(1, rawLevel*this.agc*2.75);
      this.low = low; this.mid = mid; this.air = air; this.level = level;
      this.impact = Math.max(0, low*1.7 + mid*1.0 + air*0.55 - 0.48);
      this.beat = (low>0.5?0.7:0.0) + (mid>0.65?0.25:0.0);

      // Upload spec/wave textures
      const sBins=this.specBins, tmp=new Uint8Array(sBins*4); const M=this.wave.length;
      for(let i=0;i<sBins;i++){ const src=Math.floor(i*N/sBins); const v=this.freq[src]; tmp[i*4]=tmp[i*4+1]=tmp[i*4+2]=v; tmp[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,sBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp);
      const wBins=this.waveBins, tmp2=new Uint8Array(wBins*4);
      for(let i=0;i<wBins;i++){ const idx=Math.floor(i*M/wBins); const v=this.wave[idx]; tmp2[i*4]=tmp2[i*4+1]=tmp2[i*4+2]=v; tmp2[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,wBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp2);
    }

    if(!this.rotatePaused && !this.transitioning && now >= this.nextSwitchAt) this.nextScene();

    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);

    const t=now/1000;

    if (this.transitioning) {
      this.renderMorph();
    } else if (this.sceneIdx === 9999 as any) {
      this.drawServer(t);
    } else {
      const name=this.scenes[this.sceneIdx] as string;
      this.drawScene(name, t);
    }

    this.anim=requestAnimationFrame(this.loop);
  }

  private renderSceneTo(tex:WebGLTexture, fb:WebGLFramebuffer, now:number, kind:string){
    const gl=this.gl!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
    gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    const p=this.progs[kind]; if(!p) return;
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); set('uSpecTex',6,'1i'); set('uSpecN',this.specBins,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); set('uWaveTex',8,'1i'); set('uWaveN',this.waveBins,'1f');
    set('uTime',now,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f'); set('uImpact',this.impact,'1f');
    set('uLow',this.low,'1f'); set('uMid',this.mid,'1f'); set('uAir',this.air,'1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }

  private renderMorph(){
    const gl=this.gl!; if(!this.morphProg){ this.transitioning=false; this.sceneIdx=this.nextIdx; return; }
    const p = Math.min(1, (performance.now() - this.transStart)/this.transDur);
    gl.useProgram(this.morphProg);
    const u=(n:string)=>gl.getUniformLocation(this.morphProg!,n);
    gl.activeTexture(gl.TEXTURE0 + 0); gl.bindTexture(gl.TEXTURE_2D, this.texFrom!); gl.uniform1i(u('uFrom')!, 0);
    gl.activeTexture(gl.TEXTURE0 + 1); gl.bindTexture(gl.TEXTURE_2D, this.texTo!);   gl.uniform1i(u('uTo')!,   1);
    gl.uniform1f(u('uProgress')!, p);
    gl.uniform2f(u('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(u('uBeat')!, this.beat);
    gl.uniform3f(u('uBands')!, this.low, this.mid, this.air);
    gl.uniform1f(u('uImpact')!, Math.min(2.0,this.impact));
    const a=gl.getAttribLocation(this.morphProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (p>=1){ this.transitioning=false; this.sceneIdx=this.nextIdx; }
  }

  private drawScene(which:string, t:number){
    const gl=this.gl!; const p=this.progs[which]; if(!p) return;
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); set('uSpecTex',6,'1i'); set('uSpecN',this.specBins,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); set('uWaveTex',8,'1i'); set('uWaveN',this.waveBins,'1f');
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f'); set('uImpact',this.impact,'1f');
    set('uLow',this.low,'1f'); set('uMid',this.mid,'1f'); set('uAir',this.air,'1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  /* ===== server shader (one-off preview) ===== */
  private async loadServerShader(){
    try{
      const url = `/api/shader/next?ts=${Date.now()}`;
      const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return;
      const s = (await r.json()) as ServerShader;
      const gl=this.gl!; this.serverProg = link(gl, VS, s.code);
    }catch(err){ console.warn('[ServerShader]', err); }
  }
  private previewServer(){
    if(this.serverProg){
      this.sceneIdx = 9999 as any; // sentinel: drawServer branch
      this.opts.onStatus?.('Server shader preview (press M or 1–0 to return)');
    } else {
      this.opts.onStatus?.('No server shader available');
    }
  }
  private drawServer(t:number){
    const gl=this.gl!; const p=this.serverProg; if(!p){ this.drawScene('plasmaOrb',t); return; }
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f'); set('uImpact',this.impact,'1f');
    set('uLow',this.low,'1f'); set('uMid',this.mid,'1f'); set('uAir',this.air,'1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
