/**
 * QuantumSynth Visualizer — Beauty pass
 * Clean rotation (5 scenes), strong music reactivity, tasteful palettes.
 * - Scenes: auroraFlow, liquidSpectrum, neonParticles, ribbonWaves, glassCells
 * - Server shader still viewable via key "S" (not part of rotation)
 */
import { httpBase, wsUrl } from './backend-config';

type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerShader  = { type:string; name:string; code:string; complexity:number; version?:string; };

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

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
precision mediump float;
varying vec2 vUV; uniform vec2 uRes;
float sat(float x){ return clamp(x,0.0,1.0); }
vec2  toAspect(vec2 uv){ vec2 p=uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
float vignette(vec2 uv){ vec2 p=toAspect(uv); float d=dot(p,p); return smoothstep(1.1,0.25, d); }
vec3  pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){ return a + b*cos(6.28318*(c*t+d)); }
vec3  nicePal(float t){ return pal(t, vec3(0.55,0.55,0.58), vec3(0.45,0.43,0.48), vec3(1.0,1.0,1.0), vec3(0.0,0.33,0.67)); }
float hash12(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
vec2  rot(vec2 p, float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c)*p; }
`;

const NOISE = `
float n2(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash12(i);
  float b=hash12(i+vec2(1.0,0.0));
  float c=hash12(i+vec2(0.0,1.0));
  float d=hash12(i+vec2(1.0,1.0));
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

/* ================= New scenes ================= */

/* 1) Aurora curtains — soft, elegant, bass/air driven */
const FS_AURORA = `
${PRELUDE}${NOISE}${AUDIO_UNI}
void main(){
  vec2 p = toAspect(vUV);
  float t = uTime*0.25 + uLow*0.9;
  vec2 q = p;
  q.x += 0.35*fbm(p*1.4 + vec2(0.0,t*1.2));
  q.y += 0.20*fbm(p*1.8 + vec2(t*0.7,0.0));
  float bands = 0.55 + 0.45*sin(4.0*q.y + 3.5*q.x + t*3.0 + uAir*5.0);
  float drift  = fbm(q*2.0 + vec2(t*0.6,-t*0.45));
  vec3 col = mix(vec3(0.06,0.10,0.14), vec3(0.02,0.03,0.05), 1.0);
  float glow = pow(sat(bands*0.5 + drift*0.6), 3.0);
  float tone = 0.15 + 0.55*glow + 0.25*uAir + 0.20*uLow;
  vec3 tint = mix(vec3(0.15,0.8,1.0), vec3(1.0,0.4,0.9), sat(uAir*1.2));
  col += nicePal(tone)*0.25 + tint*glow*(0.8+1.2*uLevel);
  col *= vignette(vUV);
  gl_FragColor = vec4(col,1.0);
}
`;

/* 2) Liquid spectrum — clean topo-fluid contours, musical swells */
const FS_LIQUID = `
${PRELUDE}${NOISE}${AUDIO_UNI}
float ridge(float x, float w){ return smoothstep(w, 0.0, abs(x)); }
void main(){
  vec2 p = toAspect(vUV);
  float t = uTime;
  vec2 w = p*1.2;
  w += 0.35*vec2(fbm(p*1.5 + vec2(0.0,t*0.7)), fbm(p*1.6 + vec2(t*0.6,0.0)));
  float f = fbm(w*2.0 + rot(p, 0.3*t + uLow*0.8));
  float lines = 0.0;
  float scale = 6.0 + 10.0*uMid + 4.0*uLow;
  for(int i=0;i<4;i++){
    float s = float(i)*0.65 + 0.9;
    float r = ridge(fract(f*scale*s) - 0.5, 0.18 - 0.05*uImpact);
    lines += r;
  }
  lines /= 4.0;
  float hue = f*0.7 + 0.15*uAir;
  vec3 base = nicePal(hue);
  vec3 col  = base*0.25 + mix(vec3(0.1,0.9,1.0), vec3(1.0,0.5,0.9), uAir)*lines*(0.7+1.3*uLevel);
  col = mix(col, vec3(0.02), 0.15);
  col *= vignette(vUV);
  gl_FragColor = vec4(col, 1.0);
}
`;

/* 3) Neon particles — bokeh bursts with beat-pumped size/alpha */
const FS_NEON_PARTICLES = `
${PRELUDE}${AUDIO_UNI}
float softDisc(vec2 p, float r, float blur){ return smoothstep(blur, 0.0, length(p)-r); }
void main(){
  vec2 uv = vUV;
  vec2 p  = toAspect(uv);
  float t = uTime;
  vec3 col = vec3(0.0);
  for(int i=0;i<70;i++){
    float fi = float(i);
    float a = fract(sin(fi*12.345)*43758.5453);
    float b = fract(sin((fi+3.14)*54.321)*12345.6789);
    float speed = 0.15 + 1.3*uLow + 0.6*uAir;
    vec2 center = vec2(a*2.0-1.0, b*2.0-1.0);
    center = rot(center, t*(0.15 + 0.45*b));
    center += 0.25*vec2(sin(t*speed*(0.4+a*0.8)), cos(t*speed*(0.6+b*0.6)));
    float size = mix(0.02, 0.11 + 0.08*uBeat, a)*(0.5+0.8*uLow);
    float d = softDisc(p-center, size, 0.05 + 0.05*uImpact);
    vec3  tint = mix(vec3(0.1,0.85,1.0), vec3(1.0,0.5,0.9), b);
    col += (d*d)*tint*(0.45 + 1.6*uLevel);
  }
  col *= vignette(uv);
  gl_FragColor=vec4(col,1.0);
}
`;

/* 4) Ribbon waves — glossy ribbons locked to waveform */
const FS_RIBBONS = `
${PRELUDE}${AUDIO_UNI}
float linstep(float a,float b,float x){ return clamp((x-a)/(b-a), 0.0, 1.0); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv);
  float t=uTime*0.8;
  float stripes=0.0;
  for(int i=0;i<8;i++){
    float fi=float(i);
    float wv = waveAt(fract(uv.x*0.7 + fi*0.07 + t*0.05));
    float y  = (wv*2.0-1.0)*0.45 + 0.35*sin(t*0.6 + fi*0.7);
    float d  = abs(p.y - y);
    float thick = 0.03 + 0.06*linstep(0.4,1.0,uImpact) + 0.02*uBeat;
    float line = smoothstep(thick, 0.0, d);
    stripes += line * (1.0 - fi/8.0);
  }
  stripes /= 8.0;
  vec3 col = mix(vec3(0.05,0.07,0.1), vec3(0.02,0.03,0.05), 1.0);
  vec3 ink = mix(vec3(0.15,0.9,1.0), vec3(1.0,0.5,0.9), sat(uAir*1.2));
  col += ink * stripes * (0.7+1.3*uLevel);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

/* 5) Glass cells — elegant moving cells with spec-contour glow */
const FS_GLASS_CELLS = `
${PRELUDE}${NOISE}${AUDIO_UNI}
vec2 voronoi(vec2 p){
  vec2 n=floor(p), f=fract(p);
  vec2 mg, mr;
  float md = 8.0;
  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 g=vec2(float(i),float(j));
      vec2 o=vec2(hash12(n+g), hash12(n+g+1.7));
      o = 0.5 + 0.5*sin(6.2831*o + uTime*vec2(0.2,0.17));
      vec2 r=g+o-f;
      float d=dot(r,r);
      if(d<md){ md=d; mr=r; mg=g; }
    }
  }
  return vec2(sqrt(md), mr.x+mr.y);
}
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv)*1.4;
  p += 0.25*vec2(fbm(p*1.2 + uTime*0.2), fbm(p*1.4 - uTime*0.17));
  vec2 v = voronoi(p + uLow*0.8);
  float edge = smoothstep(0.09 - 0.03*uImpact, 0.0, v.x);
  float glow = smoothstep(0.28, 0.0, v.x) * (0.3+1.6*uMid);
  float hue = v.y*0.07 + 0.1*uAir;
  vec3 base = nicePal(hue);
  vec3 col  = base*0.20 + vec3(edge)*0.85 + glow*vec3(0.2,0.9,1.1);
  col *= vignette(uv);
  gl_FragColor = vec4(col,1.0);
}
`;

/* ================= Visualizer class ================= */

const MIN_MODE_HOLD_MS = 16000;
const MODE_JITTER_MS   = 14000;

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
  private agc=0.5;

  // audio textures
  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 192;
  private waveBins = 512;

  // optional stream from backend
  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null; private streamUnit=5;

  // programs
  private progs: Record<string, WebGLProgram | null> = {};
  private serverProg: WebGLProgram | null = null;

  // rotation
  private scenes = ['auroraFlow','liquidSpectrum','neonParticles','ribbonWaves','glassCells'] as const;
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

    this.opts.onStatus?.('Ready. M next • 1–5 choose • P pause • S server (not in rotation)');

    window.addEventListener('keydown',(e)=>{
      const k=e.key.toLowerCase();
      if(k==='m') this.nextScene();
      if(k==='p') this.togglePause();
      if(k==='s') this.sceneIdx = 9999 as any; // server display sentinel
      if('12345'.includes(k)){ const idx=parseInt(k,10)-1; if(this.scenes[idx]) this.sceneIdx=idx; this.bumpSwitchTimer(); }
    });
  }

  /* public controls */
  isPaused(){ return this.rotatePaused; }
  togglePause(){ this.rotatePaused=!this.rotatePaused; if(!this.anim) this.loop(); }

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

  private initGL(){
    const gl=this.gl!;
    const quad = gl.createBuffer()!; this.quad=quad; gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    const sources: Record<string,string> = {
      auroraFlow:FS_AURORA,
      liquidSpectrum:FS_LIQUID,
      neonParticles:FS_NEON_PARTICLES,
      ribbonWaves:FS_RIBBONS,
      glassCells:FS_GLASS_CELLS,
    };
    for(const [k,src] of Object.entries(sources)){
      try{ this.progs[k]=link(gl,VS,src); } catch(e){ console.error('[Shader fail]',k,e); this.progs[k]=null; }
    }

    this.streamTex = this.mkTex(2,2);
    this.bumpSwitchTimer();
  }

  private mkTex(w:number,h:number){ const gl=this.gl!; const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }

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
      this.ws.onmessage=(ev)=>{ if(typeof ev.data==='string')return; const buf = ev.data as ArrayBuffer; const dv=new DataView(buf,0,24); const ch=dv.getUint32(16,true); if(ch!==4)return; const w=dv.getUint32(8,true), h=dv.getUint32(12,true); const px=new Uint8Array(buf,24); const gl=this.gl!; gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,px); };
    }catch(e){ console.warn('WS init failed', e); }
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
    }
  }

  private nextScene(){ this.sceneIdx = (this.sceneIdx + 1) % this.scenes.length; this.bumpSwitchTimer(); }
  private bumpSwitchTimer(){ const now=performance.now(); this.nextSwitchAt = now + MIN_MODE_HOLD_MS + Math.random() * MODE_JITTER_MS; }

  private loop = () => {
    const gl=this.gl!;
    const now=performance.now(); this.frames++; if(now-this.lastFPS>=1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastFPS=now; }

    // Audio analysis with light AGC
    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);
      const N=this.freq.length; let sum=0; let low=0, mid=0, air=0;
      for(let i=0;i<N;i++){ const v=this.freq[i]/255; sum+=v*v; if(i<N*0.2) low+=v; else if(i<N*0.7) mid+=v; else air+=v; }
      low/=Math.max(1,N*0.2); mid/=Math.max(1,N*0.5); air/=Math.max(1,N*0.3);
      const rawLevel=Math.sqrt(sum/N);
      const target=0.5; const e=target - rawLevel; this.agc += e*0.07; this.agc = Math.max(0.4, Math.min(2.0, this.agc));
      const level = Math.min(1, rawLevel*this.agc*2.3);
      this.low = low; this.mid = mid; this.air = air; this.level = level;
      this.impact = Math.max(0, low*1.3 + mid*0.7 + air*0.4 - 0.55);
      this.beat = (low>0.55?1:0)*0.6 + (mid>0.6?0.2:0);

      // Upload spec/wave textures
      const sBins=this.specBins, tmp=new Uint8Array(sBins*4); const M=this.wave.length;
      for(let i=0;i<sBins;i++){ const src=Math.floor(i*N/sBins); const v=this.freq[src]; tmp[i*4]=tmp[i*4+1]=tmp[i*4+2]=v; tmp[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,sBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp);
      const wBins=this.waveBins, tmp2=new Uint8Array(wBins*4);
      for(let i=0;i<wBins;i++){ const idx=Math.floor(i*M/wBins); const v=this.wave[idx]; tmp2[i*4]=tmp2[i*4+1]=tmp2[i*4+2]=v; tmp2[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,wBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp2);
    }

    if(!this.rotatePaused && now >= this.nextSwitchAt && this.sceneIdx !== 9999 as any) this.nextScene();

    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.canvas.width,this.canvas.height);

    const t=now/1000;
    if (this.sceneIdx === (9999 as any)) this.drawServer(t);
    else this.drawScene(this.scenes[this.sceneIdx] as string, t);

    this.anim=requestAnimationFrame(this.loop);
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

  private async loadServerShader(type?:string){
    const params=new URLSearchParams(); if(type) params.set('type',type); params.set('ts',Date.now().toString());
    const base = httpBase();
    const url = `${base}/api/shader/next?${params.toString()}`;
    const r=await fetch(url,{cache:'no-store'}); if(!r.ok) return;
    const s = (await r.json()) as ServerShader;
    try{ this.serverProg = link(this.gl!, VS, s.code); }catch(err){ console.error('[ServerShader] compile/link failed:', err); }
  }

  private drawServer(t:number){
    const gl=this.gl!; const p=this.serverProg; if(!p){ this.drawScene('auroraFlow',t); return; }
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',this.level,'1f'); set('uBeat',this.beat,'1f'); set('uImpact',this.impact,'1f');
    set('uLow',this.low,'1f'); set('uMid',this.mid,'1f'); set('uAir',this.air,'1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad!); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
