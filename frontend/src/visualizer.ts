/* QuantumSynth Visualizer — stable, multi-scene, seamless morphs
   - Removes bland gradient fallback
   - Classic scenes + WOW + (optional) server shader
   - Dead-frame watchdog (skip scene if it renders ~black for ~45 frames)
   - Container/DPR aware; fills container
*/
type GL = WebGLRenderingContext | WebGL2RenderingContext;

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

const PRELUDE = `
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
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

/* ---------- Classic scenes (snappy & music-reactive) ---------- */
const FS_BARSPRO = `
${PRELUDE}${SPEC_HELP}
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
  col += g*vec3(0.7,0.9,1.0) + uBeat*vec3(0.9,0.6,1.0)*0.18;
  gl_FragColor = vec4(col*val,1.0);
}
`;
const FS_CENTERBARS = `
${PRELUDE}${SPEC_HELP}
uniform float uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = abs(uv.x-0.5)*2.0;
  float a = specSample(pow(1.0-x,0.7));
  float h = 0.04 + 1.5*a + 0.6*uLevel + 0.3*uLow + 0.35*uImpact;
  float line = smoothstep(h, h-0.02-0.02*uAir, uv.y);
  float glow = smoothstep(h+0.03+0.03*uImpact, h, uv.y);
  vec3 col = mix(vec3(0.2,0.9,1.0), vec3(1.0,0.4,0.7), a);
  col = col*line + vec3(glow)*(0.35+1.7*uLevel+0.8*uImpact) + uBeat*0.2;
  gl_FragColor = vec4(col, 1.0);
}
`;
const FS_CIRCLESPEC = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/(6.28318);
  float s = specSample(fract(idx));
  float ring = smoothstep(0.02, 0.0, abs(r - (0.25+0.35*s+0.25*uLow)) - 0.01 - 0.02*uImpact);
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.8), s);
  col *= ring*(0.6+1.8*uMid+0.6*uImpact) + uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`;
const FS_WAVEFORMLINE = `
${PRELUDE}${WAVE_HELP}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thickness = 0.009 + 0.012*uImpact;
  float line = smoothstep(thickness, 0.0, d);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.18 + uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`;
const FS_RADIALRINGS = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p = toAspect(vUV); float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float k = 10.0 + 36.0*uAir + 10.0*uImpact;
  float phase = uTime*0.7 + uLow*2.4 + 0.4*uImpact;
  float rings = smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.24) * (0.4+1.8*s+0.7*uImpact);
  float bloom = exp(-r*12.0) * (0.6+1.6*uLow+0.6*uImpact);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02) + uBeat*vec3(0.7,0.5,1.0)*0.13;
  gl_FragColor = vec4(col,1.0);
}
`;
const FS_LISSAJOUS = `
${PRELUDE}${WAVE_HELP}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveSample(fract((vUV.x)));
  float b=waveSample(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b) + uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`;
const FS_TUNNEL = `
${PRELUDE}${SPEC_HELP}
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
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact) + uBeat*0.22;
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

/* ---------- WOW feedback (kept lightweight) ---------- */
const FS_WOW = `
${PRELUDE}
uniform sampler2D uFeedback;
uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=toAspect(uv); float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); vec2 p=vec2(cos(a),sin(a))*r; return p*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2)*(0.5+1.2*uEnv);
  vec3 prev=texture2D(uFeedback, uv + (uv-0.5)*0.01*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base, 0.6+0.35*uEnv) + uBeat*vec3(0.9,0.6,1.0)*0.15;
  float vg=1.0-dot((toAspect(vUV)),(toAspect(vUV)))*0.7; col*=qclamp(vg,0.25,1.0);
  gl_FragColor=vec4(col,1.0);
}
`;

/* ---------- Seamless morph (edge-aware) ---------- */
const FS_MORPH = `
${PRELUDE}
uniform sampler2D uFrom, uTo; uniform float uProgress, uBeat, uImpact; uniform vec3 uBands;
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
  vec2 dirA = norm2(gA), dirB = norm2(gB);
  float magA = min(1.0, length(gA)), magB=min(1.0, length(gB));
  float featA = smoothstep(0.15, 0.6, magA), featB = smoothstep(0.15, 0.6, magB);
  float audioAmp = 0.25 + 1.8*uBands.x + 0.8*uImpact + 0.45*uBeat;
  vec2 ua = uv, ub = uv;
  float stepLen = (0.8 + 1.4*uBands.z) * (0.0035 + 0.0045*audioAmp);
  for(int i=0;i<6;i++){ ua += dirA*stepLen*(1.0-p)*featA; ub -= dirB*stepLen*(p)*featB; }
  vec3 colA = texture2D(uFrom, ua).rgb;
  vec3 colB = texture2D(uTo,   ub).rgb;
  float w = smoothstep(0.0,1.0, p + 0.25*(featB - featA)) + 0.12*uBeat;
  gl_FragColor = vec4(mix(colA,colB, min(max(w,0.0),1.0)),1.0);
}
`;

/* ---------- Visualizer class ---------- */
export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL;
  private quad: WebGLBuffer;

  // audio
  private ctx: AudioContext|null=null; private analyser: AnalyserNode|null=null;
  private freq: Uint8Array|null=null; private wave: Uint8Array|null=null; private stream: MediaStream|null=null;
  private specTex: WebGLTexture; private waveTex: WebGLTexture; private specBins=128; private waveBins=512;

  // scenes
  private progs: Record<string, WebGLProgram|null> = {};
  private scenes = ['barsPro','centerBars','circleSpectrum','waveformLine','radialRings','lissajous','tunnel','particles','starfield','wow'] as const;
  private idx=0;

  // morph buffers
  private fbA: WebGLFramebuffer; private fbB: WebGLFramebuffer;
  private texA: WebGLTexture;     private texB: WebGLTexture;
  private morphProg: WebGLProgram;

  // timing
  private anim?: number; private lastFPS=performance.now(); private frames=0;
  private sceneStart=performance.now(); private minMs=16000; private maxMs=30000;
  private transitioning=false; private transStart=0; private transDur=1600;

  // watchdog
  private deadFrames=0;

  constructor(canvas: HTMLCanvasElement){
    this.canvas=canvas;
    const gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if(!gl){ throw new Error('WebGL unsupported'); }
    this.gl=gl;

    // geometry
    const q=gl.createBuffer()!; this.quad=q; gl.bindBuffer(gl.ARRAY_BUFFER,q);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    // render targets (half-res)
    this.texA=this.mkTex(2,2); this.fbA=this.mkFB(this.texA);
    this.texB=this.mkTex(2,2); this.fbB=this.mkFB(this.texB);

    // audio textures
    this.specTex=this.mkAudioTex(this.specBins); this.waveTex=this.mkAudioTex(this.waveBins);

    // compile scenes
    const sources: Record<string,string> = {
      barsPro:FS_BARSPRO, centerBars:FS_CENTERBARS, circleSpectrum:FS_CIRCLESPEC,
      waveformLine:FS_WAVEFORMLINE, radialRings:FS_RADIALRINGS, lissajous:FS_LISSAJOUS,
      tunnel:FS_TUNNEL, particles:FS_PARTICLES, starfield:FS_STARFIELD, wow:FS_WOW
    };
    for(const [k,src] of Object.entries(sources)){
      try{ const p=this.link(VS,src); this.progs[k]=p; const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }
      catch(e){ console.error('[Shader fail]',k,e); this.progs[k]=null; }
    }
    this.morphProg=this.link(VS,FS_MORPH); { const loc=gl.getAttribLocation(this.morphProg,'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }

    // sizing
    new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement || document.body);
    this.resize();

    // keys
    window.addEventListener('keydown',(e)=>{
      const k=e.key.toLowerCase();
      if(k==='m') this.nextScene();
      const list=['barsPro','centerBars','circleSpectrum','waveformLine','radialRings','lissajous','tunnel','particles','starfield','wow'];
      if('0123456789'.includes(k)){
        const idx=(k==='0')?list.indexOf('starfield'):parseInt(k,10)-1;
        if(list[idx]){ this.idx=this.scenes.indexOf(list[idx] as any); this.beginTransition(true); }
      }
    });
  }

  private mkTex(w:number,h:number){ const gl=this.gl; const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }
  private mkFB(t:WebGLTexture){ const gl=this.gl; const f=gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); return f; }
  private mkAudioTex(w:number){ const gl=this.gl; const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; }

  private compile(type:number,src:string){ const gl=this.gl; const s=gl.createShader(type)!; gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'compile'); return s; }
  private link(vs:string, fs:string){ const gl=this.gl; const p=gl.createProgram()!; gl.attachShader(p,this.compile(gl.VERTEX_SHADER,vs)); gl.attachShader(p,this.compile(gl.FRAGMENT_SHADER,fs)); gl.linkProgram(p); if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'link'); return p; }

  private resize(){
    const gl=this.gl, dpr=Math.max(1,Math.round(devicePixelRatio||1));
    const el=this.canvas.parentElement as HTMLElement || document.body as any;
    const w=(el.clientWidth||window.innerWidth), h=(el.clientHeight||window.innerHeight);
    const W=w*dpr, H=h*dpr;
    if(this.canvas.width!==W || this.canvas.height!==H){
      this.canvas.width=W; this.canvas.height=H; this.canvas.style.width=w+"px"; this.canvas.style.height=h+"px";
      gl.viewport(0,0,W,H);
      const hw=Math.max(2,Math.floor(W/2)), hh=Math.max(2,Math.floor(H/2));
      const re=(tex:WebGLTexture,fb:WebGLFramebuffer)=>{ gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,hw,hh,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.bindFramebuffer(gl.FRAMEBUFFER,fb); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); };
      re(this.texA,this.fbA); re(this.texB,this.fbB);
    }
  }

  /* --------- public API --------- */
  async startScreenShare(){
    const s = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false}});
    if(!s.getAudioTracks().length){ s.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.ctx?.close().catch(()=>{});
    this.ctx=new (window.AudioContext||(window as any).webkitAudioContext)();
    this.analyser = this.ctx.createAnalyser(); this.analyser.fftSize=4096;
    const src=this.ctx.createMediaStreamSource(s); src.connect(this.analyser);
    this.freq=new Uint8Array(this.analyser.frequencyBinCount);
    this.wave=new Uint8Array(this.analyser.fftSize);
    this.stream=s;
    s.getVideoTracks()[0].onended=()=>this.stopScreenShare();
    if(!this.anim) this.loop();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; this.wave=null; this.ctx?.close().catch(()=>{}); this.ctx=null; this.analyser=null; }
  setDemoMode(v:boolean){ if(v) this.stopScreenShare(); if(!this.anim) this.loop(); }

  /* --------- main loop --------- */
  private loop=()=>{
    const gl=this.gl; const now=performance.now(); const t=now/1000;
    // FPS
    this.frames++; if(now-this.lastFPS>=1000){ this.lastFPS=now; this.frames=0; }
    // Audio
    let level=0, low=0, mid=0, air=0, beat=0, impact=0, kick=0, snare=0, hat=0;
    if(this.analyser && this.freq && this.wave){
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);
      const N=this.freq.length; let sum=0;
      for(let i=0;i<N;i++){ const v=this.freq[i]/255; sum+=v*v; if(i<N*0.2) low+=v; else if(i<N*0.7) mid+=v; else air+=v; }
      low/=Math.max(1,N*0.2); mid/=Math.max(1,N*0.5); air/=Math.max(1,N*0.3);
      level=Math.min(1, Math.sqrt(sum/N)*2.2);
      beat = (low>0.55?1:0)*0.4 + (mid>0.5?0.2:0);
      impact = Math.max(0, low*1.2 + mid*0.6 + air*0.4 - 0.6);
      kick=low; snare=mid; hat=air;

      // upload spec
      const sBins=this.specBins, tmp=new Uint8Array(sBins*4);
      for(let i=0;i<sBins;i++){ const srcIdx=Math.floor(i*N/sBins); const v=this.freq[srcIdx]; tmp[i*4]=tmp[i*4+1]=tmp[i*4+2]=v; tmp[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,sBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp);
      // upload wave
      const wBins=this.waveBins, tmp2=new Uint8Array(wBins*4), M=this.wave.length;
      for(let i=0;i<wBins;i++){ const idx=Math.floor(i*M/wBins); const v=this.wave[idx]; tmp2[i*4]=tmp2[i*4+1]=tmp2[i*4+2]=v; tmp2[i*4+3]=255; }
      gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,wBins,1,0,gl.RGBA,gl.UNSIGNED_BYTE,tmp2);
    }

    // Scene timing
    const elapsed = now - this.sceneStart;
    const scene = this.scenes[this.idx];
    if(!this.transitioning && elapsed > (this.minMs + Math.random()*(this.maxMs-this.minMs))){
      this.nextScene();
    }

    // Render current (or morph)
    if(this.transitioning){
      const p=Math.min(1,(now-this.transStart)/this.transDur);
      gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
      gl.useProgram(this.morphProg);
      const u=(n:string)=>gl.getUniformLocation(this.morphProg,n);
      gl.activeTexture(gl.TEXTURE0+0); gl.bindTexture(gl.TEXTURE_2D,this.texA); gl.uniform1i(u('uFrom')!,0);
      gl.activeTexture(gl.TEXTURE0+1); gl.bindTexture(gl.TEXTURE_2D,this.texB); gl.uniform1i(u('uTo')!,1);
      gl.uniform1f(u('uProgress')!,p);
      gl.uniform2f(u('uRes')!,this.canvas.width,this.canvas.height);
      gl.uniform1f(u('uBeat')!,beat); gl.uniform1f(u('uImpact')!,impact); gl.uniform3f(u('uBands')!,low,mid,air);
      const a=gl.getAttribLocation(this.morphProg,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,6);
      if(p>=1){ this.transitioning=false; this.sceneStart=performance.now(); this.deadFrames=0; }
    } else {
      this.drawToScreen(scene, t, {level,low,mid,air,beat,impact,kick,snare,hat});
      // Dead-frame watchdog: if pixel ~black repeatedly → skip scene
      const px=new Uint8Array(4); this.gl.readPixels(0,0,1,1,this.gl.RGBA,this.gl.UNSIGNED_BYTE,px);
      const lum=(px[0]+px[1]+px[2])/3;
      if(lum<2){ this.deadFrames++; } else { this.deadFrames=0; }
      if(this.deadFrames>45){ console.warn('[watchdog] scene dead → skipping', scene); this.nextScene(); }
    }

    this.anim=requestAnimationFrame(this.loop);
  }

  private drawToScreen(which:string, t:number, a:any){
    const gl=this.gl; const p=this.progs[which]; if(!p){ return; }
    gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p!,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D,this.specTex); set('uSpecTex',6,'1i'); set('uSpecN',128,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D,this.waveTex); set('uWaveTex',8,'1i'); set('uWaveN',512,'1f');
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',a.level,'1f'); set('uBeat',a.beat,'1f'); set('uLow',a.low,'1f'); set('uMid',a.mid,'1f'); set('uAir',a.air,'1f');
    set('uImpact',a.impact,'1f'); set('uKick',a.kick,'1f'); set('uSnare',a.snare,'1f'); set('uHat',a.hat,'1f');
    if(which==='wow'){
      gl.activeTexture(gl.TEXTURE0+9); gl.bindTexture(gl.TEXTURE_2D,this.texB); const u=gl.getUniformLocation(p,'uFeedback'); if(u) gl.uniform1i(u,9);
      const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
      gl.bindFramebuffer(gl.FRAMEBUFFER,this.fbA); gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES,0,6);
      // blit A → screen using morph program (no morph, p=0)
      gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
      const mp=this.morphProg; const uu=(n:string)=>gl.getUniformLocation(mp,n);
      gl.useProgram(mp);
      gl.activeTexture(gl.TEXTURE0+0); gl.bindTexture(gl.TEXTURE_2D,this.texA); gl.uniform1i(uu('uFrom')!,0);
      gl.activeTexture(gl.TEXTURE0+1); gl.bindTexture(gl.TEXTURE_2D,this.texA); gl.uniform1i(uu('uTo')!,1);
      gl.uniform1f(uu('uProgress')!,0.0); gl.uniform2f(uu('uRes')!,this.canvas.width,this.canvas.height);
      gl.uniform1f(uu('uBeat')!,a.beat); gl.uniform1f(uu('uImpact')!,a.impact); gl.uniform3f(uu('uBands')!,a.low,a.mid,a.air);
      const la=gl.getAttribLocation(mp,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,6);
      // swap ping-pong
      const tTex=this.texA; this.texA=this.texB; this.texB=tTex;
      const tFB=this.fbA; this.fbA=this.fbB; this.fbB=tFB;
    } else {
      const loc=gl.getAttribLocation(p!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
  }

  private beginTransition(reset=false){
    this.transitioning=true; this.transStart=performance.now();
    if(reset) this.sceneStart=performance.now();
    // bake both scenes to RTs
    const now=performance.now(), t=now/1000;
    const prev=this.scenes[this.idx];
    const nextIdx=(this.idx+1)%this.scenes.length, next=this.scenes[nextIdx];
    this.renderTo(this.texA,this.fbA,prev,t);
    this.renderTo(this.texB,this.fbB,next,t);
    this.idx=nextIdx;
  }
  private nextScene(){ this.beginTransition(true); }

  private renderTo(tex:WebGLTexture, fb:WebGLFramebuffer, which:string, t:number){
    const gl=this.gl; const p=this.progs[which]; if(!p) return;
    const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb); gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p!,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D,this.specTex); set('uSpecTex',6,'1i'); set('uSpecN',128,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D,this.waveTex); set('uWaveTex',8,'1i'); set('uWaveN',512,'1f');
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    const loc=gl.getAttribLocation(p!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
}
