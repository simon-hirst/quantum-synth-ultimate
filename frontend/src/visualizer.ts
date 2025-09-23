type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = {
  onStatus?: (s: string) => void;
  onFps?: (fps: number) => void;
};

type ServerTexture = {
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  gridCols?: number;
  gridRows?: number;
  frames?: number;
  fps?: number;
};
type ServerShader = {
  type: string;
  name: string;
  code: string;
  complexity: number;
  version?: string;
  uniforms?: { name: string; type: string }[];
  textures?: ServerTexture[];
};

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

function compile(gl: GL, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) || "compile");
  return s;
}
function link(gl: GL, vsSrc: string, fsSrc: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || "link");
  return p;
}

const PRELUDE = `
precision highp float;
varying vec2 vUV; uniform vec2 uRes;
float sat(float x){ return clamp(x,0.0,1.0); }
vec2  toAspect(vec2 uv){ vec2 p=uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
float vignette(vec2 uv){ return 1.0; }
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

const FS_BASS_BLOOM = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float softRing(float r, float radius, float width){
  return smoothstep(width, 0.0, abs(r - radius));
}
void main(){
  vec2 uv = vUV;
  vec2 p = toAspect(uv);
  float t = uTime;
  float r = length(p) + 1e-4;
  float ang = atan(p.y, p.x);
  float bass = uLow;
  float treble = uAir;
  float specRad = specAt(sat(r));
  float specAng = specAt(fract((ang + 3.14159) / 6.28318));
  float waveLine = waveAt(fract(0.5 * (ang / 3.14159 + 1.0) + t * 0.05));
  vec2 warp = p;
  warp += 0.25 * vec2(
    fbm(p * 2.5 + vec2(0.0, t * 0.7)),
    fbm(p * 2.3 + vec2(t * 0.6, 0.0))
  ) * (0.6 + 1.3 * bass);
  float bloomRadius = 0.25 + 0.35 * bass + 0.12 * uImpact + 0.08 * waveLine;
  float bloom = softRing(r, bloomRadius, 0.12 - 0.04 * uImpact);
  float inner = exp(-pow(r / (0.32 + 0.18 * bass), 2.2));
  float ripples = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    ripples += softRing(
      r,
      bloomRadius + fi * 0.07 + 0.02 * waveLine,
      0.05 + 0.015 * uMid
    );
  }
  ripples *= 0.18 + 1.6 * uBeat + 0.9 * uImpact;
  float streaks = sin(ang * 10.0 + t * 4.0 + bass * 6.0) * (0.5 + 1.0 * treble);
  vec3 base = nicePal(0.32 + 0.25 * specAng + 0.2 * treble);
  vec3 glow = vec3(0.18, 0.9, 1.1) * (0.4 + 2.1 * bass + 1.1 * uImpact);
  vec3 ink = mix(vec3(0.05, 0.1, 0.2), vec3(0.08, 0.12, 0.25), r);
  vec3 col = ink;
  col += base * (inner * (0.6 + 2.3 * uLevel) + streaks * 0.12);
  col += glow * (bloom * (0.8 + 1.7 * specRad) + ripples);
  col *= vignette(uv);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_QUANTUM_LATTICE = `
${PRELUDE}${NOISE}${AUDIO_UNI}
vec2 warpGrid(vec2 p, float t, float bass, float treble){
  vec2 w = p;
  w += 0.22 * vec2(
    fbm(p * (3.1 + 1.4 * treble) + vec2(t * 0.6, -t * 0.45)),
    fbm(p.yx * (2.8 + 1.0 * bass) + vec2(-t * 0.5, t * 0.55))
  );
  return w;
}
void main(){
  vec2 uv = vUV;
  vec2 p = toAspect(uv);
  float t = uTime * 0.7;
  float bass = uLow;
  float mid = uMid;
  float treble = uAir;
  vec2 grid = warpGrid(p, t, bass, treble) * (3.2 + 1.4 * mid);
  vec2 cell = fract(grid) - 0.5;
  vec2 id = floor(grid);
  float cross = (1.0 - smoothstep(0.08, 0.42, abs(cell.x))) + (1.0 - smoothstep(0.08, 0.42, abs(cell.y)));
  float frame = smoothstep(0.22, 0.52, max(abs(cell.x), abs(cell.y)));
  float core = exp(-dot(cell, cell) * (32.0 + 18.0 * treble));
  float gate = (1.0 - smoothstep(0.0, 0.28, abs(cell.x + cell.y))) * (1.0 - smoothstep(0.0, 0.28, abs(cell.x - cell.y)));
  float idHash = hash(id);
  float ripple = sin(t * (1.6 + bass * 2.1) + idHash * 6.28318);
  float spec = specAt(fract(idHash + t * 0.09));
  float wave = waveAt(fract(0.5 * (atan(p.y, p.x) / 3.14159 + 1.0) + t * 0.11));
  vec3 tintA = pal(fract(idHash + bass * 0.25), vec3(0.25,0.28,0.35), vec3(0.35,0.4,0.5), vec3(1.0,1.0,1.0), vec3(0.1,0.33,0.66));
  vec3 tintB = pal(fract(idHash + 0.47), vec3(0.12,0.18,0.4), vec3(0.45,0.38,0.55), vec3(0.9,0.9,1.1), vec3(0.2,0.11,0.6));
  vec3 lattice = mix(tintA, tintB, smoothstep(-0.2, 0.6, ripple + spec));
  float glow = frame * (0.3 + 1.8 * uImpact + 1.2 * spec);
  float sparks = cross * (0.1 + 0.9 * treble) + core * (0.2 + 2.0 * wave) + gate * (0.2 + 0.8 * treble);
  vec3 base = vec3(0.02,0.03,0.06) + vec3(0.08,0.12,0.16) * fbm(p * 4.0 + vec2(t * 0.3, -t * 0.25));
  vec3 col = base;
  col += lattice * (glow * (0.4 + 1.6 * uLevel) + sparks);
  col += vec3(0.25,0.6,1.2) * core * (0.3 + 1.5 * uBeat + 1.1 * uImpact);
  col = mix(col, col.bgr, 0.2 + 0.3 * treble);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_WAVE_TUNNEL = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float softPulse(float d, float center, float width){
  float x = (d - center) / max(0.001, width);
  return exp(-x * x);
}
void main(){
  vec2 uv = vUV;
  vec2 p = toAspect(uv);
  float t = uTime * 0.75;
  float bass = uLow;
  float mid = uMid;
  float treble = uAir;
  float radius = length(p) + 1e-4;
  float angle = atan(p.y, p.x);
  vec2 swirl = rot(p, 0.25 * sin(t * 0.7 + bass * 1.5));
  float wave = waveAt(fract(0.5 * (angle / 3.14159 + 1.0) + t * 0.12));
  float spec = specAt(fract(radius + t * 0.08));
  float ridges = fbm(swirl * (3.5 + 2.5 * bass) + vec2(t * 0.5, -t * 0.45));
  float aurora = fbm(vec2(angle * (4.0 + 2.0 * treble), radius * (3.5 + 1.5 * mid)) + vec2(t * 1.1, -t * 0.9));
  float rings = 0.0;
  for(int i=0;i<5;i++){
    float fi = float(i);
    float target = 0.18 + 0.16 * fi + 0.06 * bass;
    float width = 0.08 + 0.04 * mid;
    float arc = softPulse(radius, target, width);
    float motion = sin(angle * (3.0 + fi) + t * (1.6 + 0.4 * fi) + bass * 3.0);
    rings += arc * (0.4 + 0.6 * motion);
  }
  float bloom = exp(-pow(radius * (1.2 + 0.8 * bass), 1.4));
  float beam = smoothstep(0.0, 1.0, sin(angle * (6.0 + 3.0 * treble) + t * (2.5 + 1.5 * mid) + wave * 4.0));
  float pulse = smoothstep(-0.2, 1.0, sin(t * 6.0 + uImpact * 3.5));
  vec3 base = nicePal(0.28 + 0.35 * ridges + 0.22 * aurora + 0.12 * wave);
  vec3 glow = mix(vec3(0.18, 0.55, 1.1), vec3(1.1, 0.5, 0.9), spec);
  vec3 accent = mix(vec3(0.08, 0.35, 0.9), vec3(1.0, 0.8, 0.3), treble);
  vec3 col = base * (0.3 + 1.2 * aurora + 0.8 * ridges + 0.6 * bloom);
  col += glow * (0.25 + 2.0 * bloom + 1.6 * rings + 1.0 * beam);
  col += accent * (0.2 + 1.5 * rings + 1.2 * pulse + 0.9 * uBeat);
  col += vec3(0.02, 0.05, 0.09) * exp(-radius * (2.5 + 3.0 * uLevel));
  col *= vignette(uv);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_SOLAR_SPIRAL = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float flare(vec2 p, float radius, float falloff){
  float r = length(p);
  float x = r / max(0.0001, radius);
  return exp(-pow(x, falloff));
}
void main(){
  vec2 uv = vUV;
  vec2 p = toAspect(uv);
  float t = uTime * 0.8;
  float bass = uLow;
  float mid = uMid;
  float treble = uAir;
  float angle = atan(p.y, p.x);
  float radius = length(p) + 1e-4;
  float swirl = angle * (2.0 + 0.6 * treble) - radius * (6.0 + 2.5 * mid) + t * (1.8 + 0.8 * bass);
  float burst = cos(radius * (18.0 + 10.0 * bass) - t * (3.0 + 0.7 * treble));
  float wave = waveAt(fract(0.5 * (angle / 3.14159 + 1.0) + t * 0.12));
  float spec = specAt(fract(radius * 0.5 + t * 0.05));
  float corona = flare(p, 0.3 + 0.18 * bass + 0.12 * uImpact, 2.2);
  float halo = flare(p, 0.85 + 0.28 * bass, 1.6);
  float beamRaw = abs(sin(angle * (8.0 + 4.0 * treble) + t * (3.6 + 1.1 * mid) + wave * 3.0));
  float beam = pow(beamRaw, 3.2 - 1.5 * treble);
  float rings = 0.0;
  for(int i=0;i<6;i++){
    float fi = float(i);
    float target = 0.18 + fi * (0.12 + 0.03 * bass);
    float width = 0.04 + 0.02 * treble;
    float ring = exp(-pow((radius - target) / max(0.0001, width), 2.0));
    rings += ring * (0.25 + 0.5 * sin(t * (1.0 + 0.5 * fi) + fi) + 0.6 * uBeat);
  }
  vec3 fire = pal(fract(swirl * 0.1 + 0.6 + bass * 0.3), vec3(0.35,0.23,0.16), vec3(0.55,0.35,0.24), vec3(1.0,0.75,0.45), vec3(0.2,0.12,0.05));
  vec3 plasma = pal(fract(burst * 0.25 + 0.2 + treble * 0.4), vec3(0.12,0.2,0.32), vec3(0.45,0.55,0.9), vec3(0.9,0.85,1.0), vec3(0.4,0.1,0.6));
  vec3 base = vec3(0.01,0.01,0.015) + vec3(0.04,0.05,0.07) * fbm(p * 2.5 + vec2(t * 0.2, -t * 0.18));
  vec3 col = base;
  col += fire * (corona * (0.6 + 1.8 * uLevel) + rings * (0.4 + 1.2 * uImpact));
  col += plasma * (halo * (0.2 + 1.1 * treble + 0.9 * spec) + beam * (0.2 + 1.0 * wave));
  col += vec3(0.9,0.6,0.18) * corona * (0.25 + 1.6 * bass + 1.1 * wave);
  col += vec3(0.18,0.4,1.1) * halo * (0.2 + 0.9 * treble + 0.8 * spec);
  col = mix(col, vec3(length(col)), 0.08 + 0.2 * treble);
  col *= vignette(uv);
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_HOLOGRAPHIC_MIST = `
${PRELUDE}${NOISE}${AUDIO_UNI}
vec3 mist(vec2 p, float t, float scale, vec3 tint, float sway){
  float n = fbm(p * scale + vec2(t * 0.3, -t * 0.27));
  float warp = fbm((p + vec2(sway, -sway)) * (scale * 1.6) + vec2(-t * 0.45, t * 0.41));
  float ribbon = smoothstep(0.15, 0.8, n + warp * 0.5);
  float fringe = abs(sin((p.x + p.y) * (6.0 + scale) + t * 2.0));
  return tint * ribbon * (0.4 + 0.6 * fringe);
}
void main(){
  vec2 uv = vUV;
  vec2 p = toAspect(uv);
  float t = uTime * 0.6;
  float bass = uLow;
  float mid = uMid;
  float treble = uAir;
  float depth = fbm(p * 2.2 + vec2(t * 0.25, -t * 0.2));
  vec2 swirl = rot(p, 0.4 * sin(t * 0.5 + bass * 1.5));
  vec2 drift = swirl + vec2(0.3 * sin(t * 0.3 + depth), 0.25 * cos(t * 0.27 + depth));
  float wave = waveAt(fract(uv.x * 0.6 + t * 0.08));
  float spec = specAt(fract(uv.y * 0.4 + t * 0.11));
  vec3 col = vec3(0.01,0.02,0.03);
  vec3 layerA = mist(drift * (1.6 + 0.8 * mid), t, 2.2 + 1.3 * treble, vec3(0.1,0.4,1.0), wave);
  vec3 layerB = mist((p + drift * 0.6) * (1.1 + 0.5 * bass), t + 3.1, 1.5 + 0.7 * bass, vec3(0.6,0.2,0.9), spec);
  vec3 layerC = mist((p * 0.8 + vec2(0.0, depth)) * (2.5 + 1.0 * treble), t - 2.0, 3.0, vec3(0.2,0.9,0.8), wave + spec);
  float shards = 0.0;
  for(int i=0;i<12;i++){
    float fi = float(i);
    vec2 dir = normalize(vec2(cos(fi * 0.52), sin(fi * 0.52)));
    float stripe = abs(dot(p, dir));
    float blink = sin(t * (2.0 + 0.2 * fi) + fi * 1.7 + bass * 3.0);
    shards += exp(-stripe * stripe * (8.0 + 6.0 * treble)) * (0.3 + 0.5 * blink);
  }
  float beams = shards * (0.2 + 1.4 * uImpact + 0.8 * uBeat);
  col += layerA * (0.35 + 1.6 * uLevel);
  col += layerB * (0.25 + 0.9 * treble + 0.6 * spec);
  col += layerC * (0.2 + 0.8 * bass + 0.7 * wave);
  col += vec3(0.15,0.35,1.2) * beams;
  col += vec3(0.05,0.1,0.2) * fbm(p * 8.0 + vec2(t * 1.1, -t * 1.2));
  col = mix(col, vec3(length(col)), 0.12 + 0.25 * treble);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_MORPH = `
${PRELUDE}
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3 uBands;
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

const MIN_MODE_HOLD_MS = 15000;
const MODE_JITTER_MS = 16000;

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;

  private quad: WebGLBuffer | null = null;

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private wave: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  private level = 0;
  private beat = 0;
  private impact = 0;
  private low = 0;
  private mid = 0;
  private air = 0;
  private agc = 0.7;

  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 192;
  private waveBins = 512;

  private serverProg: WebGLProgram | null = null;

  private progs: Record<string, WebGLProgram | null> = {};
  private morphProg: WebGLProgram | null = null;

  private texFrom: WebGLTexture | null = null;
  private fbFrom: WebGLFramebuffer | null = null;
  private texTo: WebGLTexture | null = null;
  private fbTo: WebGLFramebuffer | null = null;

  private scenes = [
    "bassBloom",
    "quantumLattice",
    "waveTunnel",
    "solarSpiral",
    "holographicMist",
  ] as const;
  private sceneIdx = 0;
  private nextSwitchAt = 0;
  private rotatePaused = false;

  private transitioning = false;
  private transStart = 0;
  private transDur = 1600;
  private nextIdx = 0;

  private anim: number | undefined;
  private frames = 0;
  private lastFPS = performance.now();

  constructor(
    canvas: HTMLCanvasElement,
    private opts: VizOpts = {},
  ) {
    this.canvas = canvas;
    this.gl =
      (canvas.getContext("webgl") as GL) || (canvas.getContext("webgl2") as GL);
    if (!this.gl) {
      this.canvas.getContext("2d")?.fillText("WebGL not supported", 10, 20);
      return;
    }

    this.initGL();
    this.initAudioTextures();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(
      this.canvas.parentElement || document.body,
    );

    this.opts.onStatus?.(
      "Ready. M next • 1–0 choose • P pause • S server (one-off)",
    );
    window.addEventListener("keydown", (e) => this.onKey(e));
  }

  isPaused() {
    return this.rotatePaused;
  }
  togglePause() {
    this.rotatePaused = !this.rotatePaused;
    if (!this.anim) this.loop();
  }

  async start() {
    this.loop();
    this.loadServerShader().catch(() => {});
  }
  stop() {
    if (this.anim) cancelAnimationFrame(this.anim);
  }

  async startScreenShare() {
    const s = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: { echoCancellation: false, noiseSuppression: false },
    } as any);
    if (!s.getAudioTracks().length) {
      s.getTracks().forEach((t) => t.stop());
      throw new Error("No audio shared");
    }
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 4096;
    const src = this.audioCtx.createMediaStreamSource(s);
    src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.wave = new Uint8Array(this.analyser.fftSize);
    this.stream = s;
    const v = s.getVideoTracks()[0];
    if (v) v.onended = () => this.stopScreenShare();
  }
  stopScreenShare() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.freq = null;
    this.wave = null;
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
  }
  isSharing() {
    return !!this.stream;
  }
  setDemoMode(v: boolean) {
    if (v) this.stopScreenShare();
  }

  private initGL() {
    const gl = this.gl!;
    const quad = gl.createBuffer()!;
    this.quad = quad;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );

    const sources: Record<string, string> = {
      bassBloom: FS_BASS_BLOOM,
      quantumLattice: FS_QUANTUM_LATTICE,
      waveTunnel: FS_WAVE_TUNNEL,
      solarSpiral: FS_SOLAR_SPIRAL,
      holographicMist: FS_HOLOGRAPHIC_MIST,
    };
    for (const [k, src] of Object.entries(sources)) {
      try {
        const p = link(gl, VS, src);
        this.progs[k] = p;
      } catch (e) {
        console.error("[Shader fail]", k, e);
        this.progs[k] = null;
      }
    }
    this.morphProg = link(gl, VS, FS_MORPH);

    this.texFrom = this.mkTex(2, 2);
    this.fbFrom = this.mkFB(this.texFrom!);
    this.texTo = this.mkTex(2, 2);
    this.fbTo = this.mkFB(this.texTo!);

    this.bumpSwitchTimer();
  }

  private mkTex(w: number, h: number) {
    const gl = this.gl!;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  private mkFB(t: WebGLTexture) {
    const gl = this.gl!;
    const f = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t,
      0,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  }

  private initAudioTextures() {
    const gl = this.gl!;
    const mk = (w: number) => {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        w,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    this.specTex = mk(this.specBins);
    this.waveTex = mk(this.waveBins);
  }

  private resize() {
    const gl = this.gl!;
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const container = this.canvas.parentElement || document.body;
    const w = (container as HTMLElement).clientWidth || window.innerWidth;
    const h = (container as HTMLElement).clientHeight || window.innerHeight;
    const W = w * dpr,
      H = h * dpr;
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
      this.canvas.style.width = w + "px";
      this.canvas.style.height = h + "px";
      gl.viewport(0, 0, W, H);

      const hw = Math.max(2, Math.floor(W / 2)),
        hh = Math.max(2, Math.floor(H / 2));
      const upd = (t: WebGLTexture | null, f: WebGLFramebuffer | null) => {
        if (!t || !f) return;
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          hw,
          hh,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          null,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, f);
        gl.framebufferTexture2D(
          gl.FRAMEBUFFER,
          gl.COLOR_ATTACHMENT0,
          gl.TEXTURE_2D,
          t,
          0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      };
      upd(this.texFrom, this.fbFrom);
      upd(this.texTo, this.fbTo);
    }
  }

  private onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if (k === "m") this.nextScene();
    if (k === "p") this.togglePause();
    if (k === "s") this.previewServer();
    if ("0123456789".includes(k)) {
      const map = [...this.scenes];
      const idx = k === "0" ? map.length - 1 : parseInt(k, 10) - 1;
      if (map[idx]) this.beginTransition(idx);
    }
  }

  private bumpSwitchTimer() {
    const now = performance.now();
    this.nextSwitchAt = now + MIN_MODE_HOLD_MS + Math.random() * MODE_JITTER_MS;
  }
  private nextScene() {
    const idx = (this.sceneIdx + 1) % this.scenes.length;
    this.beginTransition(idx);
  }
  private beginTransition(next: number) {
    if (next === this.sceneIdx) return;
    this.nextIdx = next;

    const now = performance.now() / 1000;
    this.renderSceneTo(
      this.texFrom!,
      this.fbFrom!,
      now,
      this.scenes[this.sceneIdx] as string,
    );
    this.renderSceneTo(
      this.texTo!,
      this.fbTo!,
      now,
      this.scenes[next] as string,
    );
    this.transitioning = true;
    this.transStart = performance.now();
    this.bumpSwitchTimer();
  }

  private loop = () => {
    const gl = this.gl!;
    const now = performance.now();
    this.frames++;
    if (now - this.lastFPS >= 1000) {
      this.opts.onFps?.(this.frames);
      this.frames = 0;
      this.lastFPS = now;
    }

    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);
      const N = this.freq.length;
      let sum = 0;
      let low = 0,
        mid = 0,
        air = 0;
      for (let i = 0; i < N; i++) {
        const v = this.freq[i] / 255;
        sum += v * v;
        if (i < N * 0.2) low += v;
        else if (i < N * 0.7) mid += v;
        else air += v;
      }
      low /= Math.max(1, N * 0.2);
      mid /= Math.max(1, N * 0.5);
      air /= Math.max(1, N * 0.3);
      const rawLevel = Math.sqrt(sum / N);
      const target = 0.6;
      const e = target - rawLevel;
      this.agc += e * 0.1;
      this.agc = Math.max(0.35, Math.min(2.6, this.agc));
      const level = Math.min(1, rawLevel * this.agc * 2.75);
      this.low = low;
      this.mid = mid;
      this.air = air;
      this.level = level;
      this.impact = Math.max(0, low * 1.7 + mid * 1.0 + air * 0.55 - 0.48);
      this.beat = (low > 0.5 ? 0.7 : 0.0) + (mid > 0.65 ? 0.25 : 0.0);

      const sBins = this.specBins,
        tmp = new Uint8Array(sBins * 4);
      const M = this.wave.length;
      for (let i = 0; i < sBins; i++) {
        const src = Math.floor((i * N) / sBins);
        const v = this.freq[src];
        tmp[i * 4] = tmp[i * 4 + 1] = tmp[i * 4 + 2] = v;
        tmp[i * 4 + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE0 + 6);
      gl.bindTexture(gl.TEXTURE_2D, this.specTex!);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        sBins,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        tmp,
      );
      const wBins = this.waveBins,
        tmp2 = new Uint8Array(wBins * 4);
      for (let i = 0; i < wBins; i++) {
        const idx = Math.floor((i * M) / wBins);
        const v = this.wave[idx];
        tmp2[i * 4] = tmp2[i * 4 + 1] = tmp2[i * 4 + 2] = v;
        tmp2[i * 4 + 3] = 255;
      }
      gl.activeTexture(gl.TEXTURE0 + 8);
      gl.bindTexture(gl.TEXTURE_2D, this.waveTex!);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        wBins,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        tmp2,
      );
    }

    if (!this.rotatePaused && !this.transitioning && now >= this.nextSwitchAt)
      this.nextScene();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    const t = now / 1000;

    if (this.transitioning) {
      this.renderMorph();
    } else if (this.sceneIdx === (9999 as any)) {
      this.drawServer(t);
    } else {
      const name = this.scenes[this.sceneIdx] as string;
      this.drawScene(name, t);
    }

    this.anim = requestAnimationFrame(this.loop);
  };

  private renderSceneTo(
    tex: WebGLTexture,
    fb: WebGLFramebuffer,
    now: number,
    kind: string,
  ) {
    const gl = this.gl!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const w = Math.max(2, Math.floor(this.canvas.width / 2)),
      h = Math.max(2, Math.floor(this.canvas.height / 2));
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const p = this.progs[kind];
    if (!p) return;
    gl.useProgram(p);
    const set = (n: string, v: any, kind: "1f" | "2f" | "1i") => {
      const u = gl.getUniformLocation(p, n);
      if (!u) return;
      (gl as any)[`uniform${kind}`](u, ...(Array.isArray(v) ? v : [v]));
    };
    gl.activeTexture(gl.TEXTURE0 + 6);
    gl.bindTexture(gl.TEXTURE_2D, this.specTex!);
    set("uSpecTex", 6, "1i");
    set("uSpecN", this.specBins, "1f");
    gl.activeTexture(gl.TEXTURE0 + 8);
    gl.bindTexture(gl.TEXTURE_2D, this.waveTex!);
    set("uWaveTex", 8, "1i");
    set("uWaveN", this.waveBins, "1f");
    set("uTime", now, "1f");
    set("uRes", [this.canvas.width, this.canvas.height], "2f");
    set("uLevel", this.level, "1f");
    set("uBeat", this.beat, "1f");
    set("uImpact", this.impact, "1f");
    set("uLow", this.low, "1f");
    set("uMid", this.mid, "1f");
    set("uAir", this.air, "1f");
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad!);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private renderMorph() {
    const gl = this.gl!;
    if (!this.morphProg) {
      this.transitioning = false;
      this.sceneIdx = this.nextIdx;
      return;
    }
    const p = Math.min(
      1,
      (performance.now() - this.transStart) / this.transDur,
    );
    gl.useProgram(this.morphProg);
    const u = (n: string) => gl.getUniformLocation(this.morphProg!, n);
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, this.texFrom!);
    gl.uniform1i(u("uFrom")!, 0);
    gl.activeTexture(gl.TEXTURE0 + 1);
    gl.bindTexture(gl.TEXTURE_2D, this.texTo!);
    gl.uniform1i(u("uTo")!, 1);
    gl.uniform1f(u("uProgress")!, p);
    gl.uniform2f(u("uRes")!, this.canvas.width, this.canvas.height);
    gl.uniform1f(u("uBeat")!, this.beat);
    gl.uniform3f(u("uBands")!, this.low, this.mid, this.air);
    gl.uniform1f(u("uImpact")!, Math.min(2.0, this.impact));
    const a = gl.getAttribLocation(this.morphProg!, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad!);
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (p >= 1) {
      this.transitioning = false;
      this.sceneIdx = this.nextIdx;
    }
  }

  private drawScene(which: string, t: number) {
    const gl = this.gl!;
    const p = this.progs[which];
    if (!p) return;
    gl.useProgram(p);
    const set = (n: string, v: any, kind: "1f" | "2f" | "1i") => {
      const u = gl.getUniformLocation(p, n);
      if (!u) return;
      (gl as any)[`uniform${kind}`](u, ...(Array.isArray(v) ? v : [v]));
    };
    gl.activeTexture(gl.TEXTURE0 + 6);
    gl.bindTexture(gl.TEXTURE_2D, this.specTex!);
    set("uSpecTex", 6, "1i");
    set("uSpecN", this.specBins, "1f");
    gl.activeTexture(gl.TEXTURE0 + 8);
    gl.bindTexture(gl.TEXTURE_2D, this.waveTex!);
    set("uWaveTex", 8, "1i");
    set("uWaveN", this.waveBins, "1f");
    set("uTime", t, "1f");
    set("uRes", [this.canvas.width, this.canvas.height], "2f");
    set("uLevel", this.level, "1f");
    set("uBeat", this.beat, "1f");
    set("uImpact", this.impact, "1f");
    set("uLow", this.low, "1f");
    set("uMid", this.mid, "1f");
    set("uAir", this.air, "1f");
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad!);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  private async loadServerShader() {
    try {
      const url = `/api/shader/next?ts=${Date.now()}`;
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok) return;
      const s = (await r.json()) as ServerShader;
      const gl = this.gl!;
      this.serverProg = link(gl, VS, s.code);
    } catch (err) {
      console.warn("[ServerShader]", err);
    }
  }
  private previewServer() {
    if (this.serverProg) {
      this.sceneIdx = 9999 as any;
      this.opts.onStatus?.("Server shader preview (press M or 1–0 to return)");
    } else {
      this.opts.onStatus?.("No server shader available");
    }
  }
  private drawServer(t: number) {
    const gl = this.gl!;
    const p = this.serverProg;
    if (!p) {
      this.drawScene("bassBloom", t);
      return;
    }
    gl.useProgram(p);
    const set = (n: string, v: any, kind: "1f" | "2f" | "1i") => {
      const u = gl.getUniformLocation(p, n);
      if (!u) return;
      (gl as any)[`uniform${kind}`](u, ...(Array.isArray(v) ? v : [v]));
    };
    set("uTime", t, "1f");
    set("uRes", [this.canvas.width, this.canvas.height], "2f");
    set("uLevel", this.level, "1f");
    set("uBeat", this.beat, "1f");
    set("uImpact", this.impact, "1f");
    set("uLow", this.low, "1f");
    set("uMid", this.mid, "1f");
    set("uAir", this.air, "1f");
    const loc = gl.getAttribLocation(p, "aPos");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad!);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
}
