/* QuantumSynth Visualizer (poppy set)
   - Adds Pause/Resume rotation (key P, UI button).
   - Strong music reactiveness; kick/snare/hat/level drive visuals.
   - Seamless, edge-aware morphs between scenes.
   - Dead-frame watchdog to auto-skip bad scenes.
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

/* ===== PUNCHY SCENES ===== */

/* 1) Pro bars (kept), hotter glow */
const FS_BARSPRO = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = specSample(x);
  float H = 0.05 + 1.45*a + 0.7*uLevel + 0.35*uLow + 0.45*uImpact;
  float bar = smoothstep(H, H-0.03-0.03*uAir-0.02*uImpact, uv.y);
  float glow = smoothstep(H+0.05+0.05*uImpact, H, uv.y);
  vec3 base = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.35,0.7), x);
  vec3 col = base*bar + glow*(0.25+1.9*uLevel+0.9*uImpact);
  col += uBeat*vec3(0.9,0.6,1.0)*0.18;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 2) Starburst spokes (spectral energy → spoke length) */
const FS_STARBURST = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p = toAspect(vUV);
  float r = length(p)+1e-5;
  float a = (atan(p.y,p.x)+3.14159)/(6.28318);
  float s = specSample(a);
  float spokes = smoothstep(0.0, 0.9, 1.0 - abs(fract(a*24.0) - 0.5)*2.0);
  float ray = smoothstep(0.3, 0.0, r - (0.15 + 0.55*s + 0.35*uAir + 0.25*uImpact));
  float halo = exp(-r*(6.0 + 12.0*uLow + 5.0*uImpact));
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.9), s);
  col = col*(ray*spokes*(0.5+1.6*uMid+0.6*uImpact) + halo);
  col += uBeat*vec3(0.7,0.5,1.0)*0.25;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 3) Shockwave (kick-driven rings) */
const FS_SHOCKWAVE = `
${PRELUDE}
uniform float uTime,uKick,uImpact,uLow,uAir,uBeat;
void main(){
  vec2 p = toAspect(vUV); float r=length(p);
  float t = uTime*0.7 + uKick*2.0 + uImpact*0.7;
  float k = 8.0 + 16.0*uKick + 8.0*uImpact;
  float ring = smoothstep(0.02+0.02*uImpact, 0.0, abs(fract(r*k - t)-0.5)-0.28);
  float glow = exp(-r*(7.0 + 9.0*uLow + 4.0*uImpact));
  vec3 col = mix(vec3(0.15,0.9,1.0), vec3(1.0,0.4,0.8), r);
  col = col*(ring*(0.6+1.9*uKick+0.8*uImpact) + glow);
  col += uBeat*0.18;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 4) Neon Voronoi edges (audio-warped) */
const FS_NEONVORONOI = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
vec2 rand2(vec2 p){ float n=hash(p); return vec2(n, hash(p+19.19)); }
float voronoi(vec2 x){
  vec2 n=floor(x), f=fract(x);
  float md=8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j));
    vec2 o=rand2(n+g)-0.5;
    o += 0.35*vec2(sin(uTime*0.8+o.x*6.0), cos(uTime*0.7+o.y*6.0))*(0.4+1.1*uAir+0.6*uImpact);
    vec2 r=g+o-f; md=min(md, dot(r,r));
  }
  return sqrt(md);
}
void main(){
  vec2 p = toAspect(vUV)*2.2;
  float d = voronoi(p*(1.0+0.3*uMid));
  float edge = smoothstep(0.06, 0.0, d);
  float glow = smoothstep(0.18, 0.0, d);
  vec3 base = mix(vec3(0.1,0.9,1.0), vec3(1.0,0.35,0.9), qclamp(d*2.0,0.0,1.0));
  vec3 col = base*edge + vec3(glow)*(0.2+1.5*uLow+0.7*uImpact) + uBeat*0.15;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 5) City bars (3D-ish equalizer) */
const FS_CITYBARS = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uLevel,uLow,uMid,uAir,uImpact,uBeat;
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv);
  float lane = floor( uv.x*48.0 ) / 48.0;
  float a = specSample(pow(lane,0.8));
  float H = 0.08 + 1.9*a + 0.5*uLevel + 0.35*uImpact;
  float perspective = (1.0 - abs(p.y))*0.6 + 0.4;
  float h = H*perspective;
  float body = step(uv.y, h);
  float cap = smoothstep(h, h-0.02-0.03*uAir-0.02*uImpact, uv.y);
  vec3 col = mix(vec3(0.1,0.9,1.0), vec3(1.0,0.4,0.75), lane);
  col = col*(body*0.9 + cap) + uBeat*vec3(0.8,0.6,1.0)*0.14;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 6) Particles burst (beat explosions) */
const FS_PARTICLESBURST = `
${PRELUDE}${SPEC_HELP}${WAVE_HELP}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float hash21(vec2 p){ return fract(sin(dot(p, vec2(27.1, 91.7)))*43758.5453); }
void main(){
  vec2 p=toAspect(vUV);
  float energy = clamp(uLow*1.2 + uMid*0.9 + uAir*0.8 + uImpact*1.6 + uBeat*1.2, 0.0, 1.0);
  float scale = mix(10.0, 28.0, energy);
  vec2 gp = p*scale + vec2(uTime*(0.20+0.30*uAir), uTime*(0.17+0.25*uImpact));
  vec2 cell = floor(gp);
  vec2 f = fract(gp)-0.5;
  float rnd = hash21(cell);
  float ph = rnd*6.2831 + uTime*(0.5 + 2.0*uBeat + 1.4*uImpact);
  float d = length(f + 0.25*vec2(cos(ph), sin(ph)));
  float dotGlow = smoothstep(0.16 + 0.25*(1.0 - clamp(uLow,0.0,1.0)), 0.0, d);
  float pulse = (0.35+0.65*uBeat) + 1.3*uImpact + 0.8*uLow;
  vec3 base = mix(vec3(0.15,0.95,1.0), vec3(1.0,0.5,0.95), rnd);
  vec3 col = base * dotGlow * (0.35 + 2.3*pulse);
  float vig = exp(-dot(p,p)*(1.2 + 3.0*(uLow+uMid)));
  col *= vig;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 7) Flowfield neon (audio-bent) */
const FS_FLOWNEON = `
${PRELUDE}${SPEC_HELP}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float hash(vec2 p){ return fract(1e4*sin(dot(p,vec2(17.13,39.19)))); }
vec2 flow(vec2 p){
  float ang = sin(p.y*2.0 + uTime*0.8) + cos(p.x*2.0 - uTime*0.9);
  ang += 2.2*specSample(fract((p.x+p.y)*0.25))*(0.5+uAir);
  return vec2(cos(ang), sin(ang));
}
void main(){
  vec2 p = toAspect(vUV)*1.4;
  vec3 col=vec3(0.0);
  vec2 q=p;
  for(int i=0;i<40;i++){
    vec2 d = flow(q)*(0.008 + 0.004*uAir + 0.003*uImpact);
    q += d;
    float t = float(i)/40.0;
    col += mix(vec3(0.15,0.9,1.0), vec3(1.0,0.4,0.85), t)*0.02;
  }
  float halo = exp(-dot(p,p)*(4.0+8.0*uLow+3.0*uImpact));
  col += halo + uBeat*0.18;
  gl_FragColor = vec4(col,1.0);
}
`;

/* 8) Waveform line (upgraded) */
const FS_WAVEFORMLINE = `
${PRELUDE}${WAVE_HELP}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thick = 0.010 + 0.015*uImpact;
  float line = smoothstep(thick, 0.0, d);
  float glow = smoothstep(0.07+0.05*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.22 + uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`;

/* ===== Seamless morph (edge-aware) ===== */
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

/* ===== Visualizer class ===== */
export class Visualizer {
  private rotatePausedUntil:number = 0;
  private lastModeAt:number = performance.now();
  private canvas: HTMLCanvasElement;
  private gl: GL;
  private quad: WebGLBuffer;

  // audio
  private ctx: AudioContext|null=null; private analyser: AnalyserNode|null=null;
  private freq: Uint8Array|null=null; private wave: Uint8Array|null=null; private stream: MediaStream|null=null;
  private specTex: WebGLTexture; private waveTex: WebGLTexture; private specBins=128; private waveBins=512;

  // scenes
  private progs: Record<string, WebGLProgram|null> = {};
  private scenes = ['barsPro','starburst','shockwave','neonVoronoi','cityBars','particlesBurst','flowfieldNeon','waveformLine'] as const;
  private idx=0;

  // morph buffers
  private fbA: WebGLFramebuffer; private fbB: WebGLFramebuffer;
  private texA: WebGLTexture;     private texB: WebGLTexture;
  private morphProg: WebGLProgram;

  // timing
  private anim?: number; private lastFPS=performance.now(); private frames=0;
  private sceneStart=performance.now(); private minMs=50000; private maxMs=90000;
  
  private rotateAt = performance.now();private transitioning=false; private transStart=0; private transDur=1500;
  private rotatePaused=false;

  // watchdog
  private deadFrames=0;

  private pickRotateDelay(){ return this.minMs + Math.random()*(this.maxMs - this.minMs); }

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
      barsPro:FS_BARSPRO, starburst:FS_STARBURST, shockwave:FS_SHOCKWAVE,
      neonVoronoi:FS_NEONVORONOI, cityBars:FS_CITYBARS, particlesBurst:FS_PARTICLESBURST,
      flowfieldNeon:FS_FLOWNEON, waveformLine:FS_WAVEFORMLINE
    };
    for(const [k,src] of Object.entries(sources)){
      try{ const p=this.link(VS,src); this.progs[k]=p; const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }
      catch(e){ console.error('[Shader fail]',k,e); this.progs[k]=null; }
    }
    this.morphProg=this.link(VS,FS_MORPH); { const loc=gl.getAttribLocation(this.morphProg,'aPos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }

    // sizing
    new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement || document.body);
    this.resize();

    
    // schedule first auto-rotation
    this.rotateAt = performance.now() + this.pickRotateDelay();
// keys
    window.addEventListener('keydown',(e)=>{
      const k=e.key.toLowerCase();
      if(k==='m') this.nextScene();
      if(k==='p'){ this.togglePause(); }
      const list=this.scenes as readonly string[];
      if('1234567890'.includes(k)){
        let idx = (k==='0') ? list.length-1 : parseInt(k,10)-1;
        idx = Math.max(0, Math.min(list.length-1, idx));
        if(list[idx]){ this.idx=idx; this.beginTransition(true); }
      }
    });
  }

  /* public controls */
  isPaused(){ return this.rotatePaused; }
  togglePause(){ this.rotatePaused=!(this.rotatePaused || (performance.now() < this.rotatePausedUntil)); if(!this.anim) this.loop(); }

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

  /* screen share / demo */
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

  /* main loop */
  private loop=()=>{
    const gl=this.gl; const now=performance.now(); const t=now/1000;

    // Audio metrics
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

    // rotation timing
    const elapsed = now - this.sceneStart;
    const scene = this.scenes[this.idx];
    if(!this.transitioning && !(this.rotatePaused || (performance.now() < this.rotatePausedUntil)) && now >= this.rotateAt){
      this.nextScene();
    }

    // Render / morph
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
      if(p>=1){ this.transitioning=false; this.sceneStart=performance.now(); this.deadFrames=0; 
      this.rotateAt = performance.now() + this.pickRotateDelay(); 
/* inlined now (decl removed) */
      this.holdUntil = performance.now() + 20000;
      this.rotateAt = performance.now() + this.pickRotateDelay(); 
/* inlined now (decl removed) */
      this.lastModeAt = performance.now();
      this.rotatePausedUntil = performance.now() + 25000;
      this.rotateAt = performance.now() + this.pickRotateDelay(); }
    } else {
      this.drawToScreen(scene, t, {level,low,mid,air,beat,impact,kick,snare,hat});
      // Dead-frame watchdog
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
    const loc=gl.getAttribLocation(p!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
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
