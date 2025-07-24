/**
 * QuantumSynth Visualizer — compile-safe build
 * - Aspect-correct, container-scaled
 * - Classic scenes + WOW feedback + optional server shader
 * - Audio-reactive via AnalyserNode (screen-share mic/desktop)
 * - WS stream (/ws) for uStreamTex frames if backend provides them
 */
import { httpBase, wsUrl } from './backend-config';

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerTexture = { name:string; dataUrl:string; width:number; height:number; gridCols?:number; gridRows?:number; frames?:number; fps?:number; };
type ServerShader  = { type:string; name:string; code:string; complexity:number; version?:string; uniforms?:{name:string;type:string}[]; textures?:ServerTexture[]; };

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

// Minimal compiler/linker
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

// Shared GLSL helpers (aspect + safe clamp)
const PRELUDE = `
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x / max(1.0, uRes.y); return p; }
float aspect(){ return uRes.x / max(1.0, uRes.y); }
`;

const SPEC_HELP = `
uniform sampler2D uSpecTex; uniform float uSpecN;
float specSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uSpecN);
  float u = (i + 0.5) / uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
`;
const WAVE_HELP = `
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`;

// ===== Scenes (subset kept) =====
const FS_BARSPRO = `
${PRELUDE}
${SPEC_HELP}
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = specSample(x);
  float H = 0.05 + 1.35*a + 0.65*uLevel + 0.25*uLow + 0.35*uImpact;
  float body = step(uv.y, H);
  float cap = smoothstep(H, H-0.03-0.04*uAir-0.03*uImpact, uv.y);
  float val = max(body, 1.2*cap);
  float shade = 0.35 + 0.65*pow(1.0-abs(uv.x*2.0-1.0), 0.5);
  vec3 col = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,0.6), x) * shade;
  float g = smoothstep(H+0.02, H, uv.y) * (0.6+1.7*uLevel+0.7*uImpact);
  col += g*vec3(0.7,0.9,1.0);
  col += uBeat*vec3(1.0,0.7,1.0)*0.45;
  gl_FragColor = vec4(col*val,1.0);
}
`;

const FS_CENTERBARS = `
${PRELUDE}
${SPEC_HELP}
uniform float uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = abs(uv.x-0.5)*2.0;
  float a = specSample(pow(1.0-x,0.7));
  float h = 0.04 + 1.5*a + 0.6*uLevel + 0.3*uLow + 0.35*uImpact;
  float line = smoothstep(h, h-0.02-0.02*uAir, uv.y);
  float glow = smoothstep(h+0.03+0.03*uImpact, h, uv.y);
  vec3 col = mix(vec3(0.2,0.9,1.0), vec3(1.0,0.4,0.7), a);
  col = col*line + vec3(glow)*(0.35+1.7*uLevel+0.8*uImpact);
  col += uBeat*0.25;
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_CIRCLESPEC = `
${PRELUDE}
${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/(6.28318);
  float s = specSample(fract(idx));
  float ring = smoothstep(0.02, 0.0, abs(r - (0.25+0.35*s+0.25*uLow)) - 0.01 - 0.02*uImpact);
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.8), s);
  col *= ring*(0.6+1.8*uMid+0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_WAVEFORMLINE = `
${PRELUDE}
${WAVE_HELP}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thickness = 0.009 + 0.012*uImpact;
  float line = smoothstep(thickness, 0.0, d);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_RADIALRINGS = `
${PRELUDE}
${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main(){
  vec2 p = toAspect(vUV); float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float k = 10.0 + 36.0*uAir + 10.0*uImpact;
  float phase = uTime*0.7 + uLow*2.4 + 0.4*uImpact;
  float rings = smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.24) * (0.4+1.8*s+0.7*uImpact);
  float bloom = exp(-r*12.0) * (0.6+1.6*uLow+0.6*uImpact);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02);
  col += uBeat*0.13;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_OSCDUAL = `
${PRELUDE}
${WAVE_HELP}
uniform float uTime,uBeat,uMid,uImpact;
void main(){
  vec2 uv=vUV;
  float y = 1.0 - waveSample(uv.x);
  float x = waveSample(uv.y);
  float thickness = 0.011 + 0.012*uImpact;
  float lineY = smoothstep(thickness, 0.0, abs(uv.y - y)-0.001);
  float lineX = smoothstep(thickness, 0.0, abs(uv.x - x)-0.001);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, abs(uv.y - y)) + smoothstep(0.06+0.04*uImpact, 0.0, abs(uv.x - x));
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), uv.x);
  col = col * (lineY + lineX) + glow*0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col, 1.0);
}
`;

const FS_SUNBURST = `
${PRELUDE}
${SPEC_HELP}
uniform float uTime,uBeat,uHat,uMid,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 10.0 + floor(uHat*14.0) + 4.0*uImpact;
  float rays = abs(sin(a*seg + uTime*2.0))*pow(1.0-r,0.4);
  float s = specSample(fract((a+3.14159)/6.28318));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), s);
  col *= 0.35 + 2.5 * rays * (0.3 + 1.6*s + 0.7*uMid + 0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_LISSAJOUS = `
${PRELUDE}
${WAVE_HELP}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveSample(fract((vUV.x)));
  float b=waveSample(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`;

const FS_TUNNEL = `
${PRELUDE}
${SPEC_HELP}
uniform float uTime,uKick,uSnare,uHat,uLow,uMid,uAir,uBeat,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p); float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float z = 1.2/(r+0.12 + 0.25*exp(-r*6.0)*(0.6+1.8*uKick+0.8*uImpact));
  float stripes = sin( (z*8.0 + uTime*2.2) + a*4.0 + (uHat+0.5*uImpact)*10.0 )*0.5+0.5;
  vec3 col = mix(vec3(0.1,0.5,1.2), vec3(1.0,0.4,0.8), stripes);
  col *= (0.3 + 1.0*z) * (0.6 + 1.5*s + 0.8*uAir + 0.5*uImpact);
  col += uBeat*vec3(0.7,0.5,1.0)*0.28;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_PARTICLES = `
${PRELUDE}
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
float n21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main(){
  vec2 uv=vUV; vec2 p=toAspect(vUV);
  float d = length(p);
  float field = smooth2D(p*3.0 + uTime*vec2(0.4,-0.3)) + 0.5*smooth2D(p*6.0 - uTime*vec2(0.2,0.5));
  float dots = step(0.78 + 0.1*uAir - 0.1*uImpact, fract(field*10.0 + uTime*1.3));
  float glow = exp(-d*(6.2+9.0*uLow+4.0*uImpact));
  vec3 col = mix(vec3(0.2,0.8,1.0), vec3(1.0,0.5,0.8), field);
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact);
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`;

const FS_STARFIELD = `
${PRELUDE}
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(vUV); float d=length(p);
  float speed = 0.8 + 3.5*uLow + 1.4*uImpact;
  vec3 col=vec3(0.0);
  for(int i=0;i<24;i++){
    float f=float(i);
    vec2 q = fract(uv*0.5 + vec2(hash(vec2(f,1.7)),hash(vec2(2.3,f))) + uTime*speed*0.02);
    float star = pow(1.0 - length(q-0.5)*2.0, 6.0);
    col += vec3(star)*(0.3+0.9*uAir);
  }
  col *= 1.0 - d*0.2;
  col += uBeat*vec3(0.5,0.4,1.0)*0.25;
  gl_FragColor=vec4(col,1.0);
}
`;

// WOW feedback
const FS_WOW = `
${PRELUDE}
uniform sampler2D uFeedback, uStreamTex;
uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=toAspect(uv); float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); vec2 p=vec2(cos(a),sin(a))*r; return p*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  vec2 c=toAspect(uv)-vec2(0.0); float r=length(toAspect(uv));
  float bassWarp=0.48*uKick+0.20*uSnare; uv+=((uv-0.5)*2.0)*(bassWarp*r)*0.5;
  float angle=(uMid*0.85+0.2)*sin(t*0.42)+r*(0.45+0.25*uLow);
  mat2 R=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec3 stream=texture2D(uStreamTex,(R*(uv-0.5)+0.5)+vec2(t*0.02,-t*0.015)).rgb;
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2);
  vec3 prev=texture2D(uFeedback, uv + (uv-0.5)*0.012*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base*0.8+stream*0.4, 0.55+0.45*uEnv);
  col += uBeat*vec3(0.9,0.6,1.0);
  float vg=1.0-dot((toAspect(vUV)),(toAspect(vUV)))*0.7; col*=qclamp(vg,0.25,1.0);
  gl_FragColor=vec4(col,1.0);
}
`;

// Simple morph (kept for future, used as straight blit here)
const FS_MORPH = `
${PRELUDE}
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3  uBands;
void main(){
  vec2 uv=vUV;
  float p = clamp(uProgress,0.0,1.0);
  vec3 A = texture2D(uFrom, uv).rgb;
  vec3 B = texture2D(uTo,   uv).rgb;
  vec3 col = mix(A,B,p);
  gl_FragColor = vec4(col,1.0);
}
`;

const MIN_MODE_HOLD_MS = 15000;
const MODE_JITTER_MS   = 17000;

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

  private beat=0; private kick=0; private snare=0; private hat=0;
  private peak=[0,0,0,0]; private impact=0; private level=0;

  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 128;
  private waveBins = 512;

  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null; private streamUnit=5; private streamW=1; private streamH=1;

  private sceneProg: Record<string, WebGLProgram | null> = { };
  private serverProg: WebGLProgram | null = null;

  private wowProg: WebGLProgram | null = null;
  private fbA: WebGLFramebuffer | null = null; private fbB: WebGLFramebuffer | null = null;
  private texA: WebGLTexture | null = null;     private texB: WebGLTexture | null = null;
  private decay=0.88;

  private scenes = ['barsPro','centerBars','circleSpectrum','waveformLine','radialRings','oscDual','sunburst','lissajous','tunnel','particles','starfield','wow','server'] as const;
  private sceneIdx = 0;
  private nextSwitchAt = 0;
  private rotatePaused = false;

  private anim:number|undefined; private frames=0; private lastFPS=performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if (!this.gl) { this.canvas.getContext('2d')?.fillText('WebGL not supported', 10, 20); return; }

    this.initGL();
    this.initAudioTextures();
    this.initWS();
    this.resize();
    new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement || document.body);
    this.opts.onStatus?.('Ready. M next • 1–9 classic • 0 starfield • 5 WOW • V WOW/Server • N server shader');

    window.addEventListener('keydown',(e)=>{
      const k=e.key.toLowerCase();
      if(k==='m') this.nextScene();
      if(k==='v') this.toggleWow();
      if(k==='n') this.loadServerShader('composite').then(()=>this.opts.onStatus?.('Server shader refreshed')).catch(()=>{});
      if('1234567890'.includes(k)){
        const map=['barsPro','centerBars','circleSpectrum','waveformLine','radialRings','oscDual','sunburst','lissajous','tunnel','particles','starfield'];
        const idx=(k==='0')?map.indexOf('starfield'):parseInt(k,10)-1;
        if(map[idx]){ this.sceneIdx = this.scenes.indexOf(map[idx] as any); }
      }
    });
  }

  /* public controls */
  isPaused(){ return this.rotatePaused; }
  togglePause(){ this.rotatePaused=!this.rotatePaused; }

  async start(){ await this.loadServerShader('composite').catch(()=>{}); this.loop(); }
  stop(){ if(this.anim) cancelAnimationFrame(this.anim); this.ws?.close(); }

  async startScreenShare(){
    const s = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false}});
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

  toggleWow(){
    const cur = this.scenes[this.sceneIdx];
    this.sceneIdx = this.scenes.indexOf(cur === 'wow' ? 'server' : 'wow');
  }

  private initGL(){
    const gl=this.gl!;
    // quad
    const quad = gl.createBuffer()!; this.quad=quad; gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    // feedback ping-pong
    this.texA=this.mkTex(2,2); this.fbA=this.mkFB(this.texA);
    this.texB=this.mkTex(2,2); this.fbB=this.mkFB(this.texB);

    // compile scenes we actually have
    const sources: Record<string,string> = {
      barsPro:FS_BARSPRO,
      centerBars:FS_CENTERBARS,
      circleSpectrum:FS_CIRCLESPEC,
      waveformLine:FS_WAVEFORMLINE,
      radialRings:FS_RADIALRINGS,
      oscDual:FS_OSCDUAL,
      sunburst:FS_SUNBURST,
      lissajous:FS_LISSAJOUS,
      tunnel:FS_TUNNEL,
      particles:FS_PARTICLES,
      starfield:FS_STARFIELD,
    };
    for(const [k,src] of Object.entries(sources)){
      try{ const p=link(gl,VS,src); this.sceneProg[k]=p; } catch(e){ console.error('[Shader fail]',k,e); this.sceneProg[k]=null; }
    }
    try{ this.wowProg = link(gl,VS,FS_WOW); } catch(e){ console.error('[WOW fail]',e); this.wowProg=null; }

    // stream texture
    this.streamTex = this.mkTex(2,2);

    // schedule first auto-rotation
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

  private initWS(){
    try{
      this.ws?.close();
      const url = wsUrl('/ws');
      this.ws = new WebSocket(url);
      this.ws.binaryType='arraybuffer';
      this.ws.onopen=()=>{ this.ws?.send(JSON.stringify({type:'subscribe',field:'waves',w:256,h:256,fps:24})); };
      this.ws.onmessage=(ev)=>{ if(typeof ev.data==='string')return; this.onStreamFrame(ev.data as ArrayBuffer); };
    }catch(e){ console.warn('WS init failed', e); }
  }

  private onStreamFrame(buf:ArrayBuffer){
    const gl=this.gl!; const dv=new DataView(buf,0,24);
    const magic=String.fromCharCode(...new Uint8Array(buf.slice(0,8))); if(!magic.startsWith('FRAMEv1')) return;
    const w=dv.getUint32(8,true), h=dv.getUint32(12,true), ch=dv.getUint32(16,true); if(ch!==4) return;
    const px=new Uint8Array(buf,24);
    this.streamW=w; this.streamH=h;
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.streamTex!);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,px);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
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
      // resize feedback
      const hw=Math.max(2, Math.floor(W/2)), hh=Math.max(2, Math.floor(H/2));
      const reinit=(t:WebGLTexture|null, fb:WebGLFramebuffer|null)=>{ if(!t||!fb)return; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,hw,hh,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.bindFramebuffer(gl.FRAMEBUFFER,fb); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); };
      reinit(this.texA,this.fbA); reinit(this.texB,this.fbB);
    }
  }

  private nextScene(){
    this.sceneIdx = (this.sceneIdx + 1) % this.scenes.length;
    this.bumpSwitchTimer();
  }

  private bumpSwitchTimer(){
    const now=performance.now();
    this.nextSwitchAt = now + MIN_MODE_HOLD_MS + Math.random() * MODE_JITTER_MS;
  }

  private loop = () => {
    const gl=this.gl!;
    const now=performance.now(); this.frames++; if(now-this.lastFPS>=1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastFPS=now; }

    // audio analysis
    let low=0, mid=0, air=0; let level=0;
    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);
      const N=this.freq.length; let sum=0;
      for(let i=0;i<N;i++){
        const v=this.freq[i]/255; sum+=v*v;
        if(i<N*0.2) low+=v; else if(i<N*0.7) mid+=v; else air+=v;
      }
      low/=Math.max(1,N*0.2); mid/=Math.max(1,N*0.5); air/=Math.max(1,N*0.3);
      level=Math.min(1, Math.sqrt(sum/N)*2.2);
      this.beat = (low>0.55?1:0)*0.4 + (mid>0.5?0.2:0);
      this.impact = Math.max(0, low*1.2 + mid*0.6 + air*0.4 - 0.6);
      this.kick=low; this.snare=mid; this.hat=air;

      // upload spec
      const sBins=this.specBins, tmp=new Uint8Array(sBins*4);
      for(let i=0;i<sBins;i++){ const srcIdx=Math.floor(i*N/sBins); const v=this.freq[srcIdx]; tmp[i*4]=tmp[i*4+1]=tmp[i*4+2]=v; tmp[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,sBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp);
      // upload wave
      const wBins=this.waveBins, tmp2=new Uint8Array(wBins*4), M=this.wave.length;
      for(let i=0;i<wBins;i++){ const idx=Math.floor(i*M/wBins); const v=this.wave[idx]; tmp2[i*4]=tmp2[i*4+1]=tmp2[i*4+2]=v; tmp2[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,wBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp2);
    }
    this.level = level;

    // auto-rotate
    if(!this.rotatePaused && now >= this.nextSwitchAt) this.nextScene();

    // draw
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);

    const t=now/1000;
    const scene=this.scenes[this.sceneIdx];
    if(scene==='wow') this.drawWOW(t);
    else if(scene==='server') this.drawServer(t);
    else this.drawClassic(scene as any, t);

    this.anim=requestAnimationFrame(this.loop);
  }

  private drawClassic(which:string, t:number){
    const gl=this.gl!; const p=this.sceneProg[which]; if(!p) return;
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'3f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); set('uSpecTex',6,'1i'); set('uSpecN',this.specBins,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); set('uWaveTex',8,'1i'); set('uWaveN',this.waveBins,'1f');
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f');
    set('uKick',this.kick,'1f'); set('uSnare',this.snare,'1f'); set('uHat',this.hat,'1f');
    set('uLow',this.kick,'1f'); set('uMid',this.snare,'1f'); set('uAir',this.hat,'1f');
    set('uImpact', Math.min(2.0,this.impact), '1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  private drawWOW(t:number){
    const gl=this.gl!; if (!this.wowProg) return;
    const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
    // write into A using B as feedback
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA); gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.wowProg);
    const U=(n:string)=>gl.getUniformLocation(this.wowProg!,n);
    gl.uniform1f(U('uTime')!, t);
    gl.uniform2f(U('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(U('uDecay')!, this.decay);
    gl.uniform1f(U('uEnv')!, this.level);
    gl.uniform1f(U('uBeat')!, this.beat);
    gl.uniform1f(U('uKick')!, this.kick);
    gl.uniform1f(U('uSnare')!, this.snare);
    gl.uniform1f(U('uHat')!, this.hat);
    gl.uniform1f(U('uLow')!, this.kick);
    gl.uniform1f(U('uMid')!, this.snare);
    gl.uniform1f(U('uAir')!, this.hat);
    gl.activeTexture(gl.TEXTURE0+7); gl.bindTexture(gl.TEXTURE_2D,this.texB!); gl.uniform1i(U('uFeedback')!,7);
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); gl.uniform1i(U('uStreamTex')!, this.streamUnit);
    const loc=gl.getAttribLocation(this.wowProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);

    // blit to screen using A, then swap A/B
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
    const blit = this.sceneProg['waveformLine'] || link(gl, VS, FS_MORPH); // reuse simple program to draw a full-screen quad
    gl.useProgram(blit);
    const u=(n:string)=>gl.getUniformLocation(blit!,n);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texA!); if(u('uFrom')) gl.uniform1i(u('uFrom')!,0);
    const a=gl.getAttribLocation(blit!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);

    const tTex=this.texA; this.texA=this.texB; this.texB=tTex;
    const tFB=this.fbA; this.fbA=this.fbB; this.fbB=tFB;
  }

  private async loadServerShader(type?:string){
    const params=new URLSearchParams(); if(type) params.set('type',type); params.set('ts',Date.now().toString());
    const base = httpBase();
    const url = `${base}/api/shader/next?${params.toString()}`;
    const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const s = (await r.json()) as ServerShader;
    const gl=this.gl!;
    try{
      const p = link(gl, VS, s.code);
      this.serverProg = p;
      gl.useProgram(p);
      // minimal known uniforms
      const uni = (n:string)=>gl.getUniformLocation(p,n);
      const uS=uni('uStreamTex'); if(uS) gl.uniform1i(uS,this.streamUnit);
    }catch(err){ console.error('[ServerShader] compile/link failed:', err); }
  }

  private drawServer(t:number){
    const gl=this.gl!; const p=this.serverProg; if(!p){ this.drawClassic('barsPro',t); return; }
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f');
    set('uLow',this.kick,'1f'); set('uMid',this.snare,'1f'); set('uAir',this.hat,'1f');
    set('uImpact', Math.min(2.0,this.impact), '1f');
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D,this.streamTex!);
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
