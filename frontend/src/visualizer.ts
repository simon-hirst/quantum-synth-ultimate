/**
 * QuantumSynth Visualizer — Amped + Morphs (no bad clamp + no gradient fallback)
 * - Stronger audio reactivity, impact driver
 * - Classic scenes + WOW + server shader
 * - Seamless morph transitions
 * - NO fallback gradient; if a shader fails to compile we skip it
 * - All clamp() issues removed (use min/max or helper qclamp)
 */
type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerTexture = { name:string; dataUrl:string; width:number; height:number; gridCols?:number; gridRows?:number; frames?:number; fps?:number; };
type ServerShader  = { type:string; name:string; code:string; complexity:number; version?:string; uniforms?:{name:string;type:string}[]; textures?:ServerTexture[]; };

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

function compile(gl:GL, type:number, src:string){
  const s=gl.createShader(type)!; gl.shaderSource(s,src); gl.compileShader(s);
  if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)){
    const log = (gl.getShaderInfoLog(s)||'compile error');
    throw new Error(log);
  }
  return s;
}
function link(gl:GL, vsSrc:string, fsSrc:string){
  const p=gl.createProgram()!;
  const vs=compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs=compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
  if(!gl.getProgramParameter(p, gl.LINK_STATUS)){
    const log = (gl.getProgramInfoLog(p)||'link error');
    throw new Error(log);
  }
  return p;
}

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

  // reactivity
  private env=0; private envAttack=0.52; private envRelease=0.10;
  private lastMag: Float32Array | null = null;
  private fluxRing:number[]=[]; private fluxIdx=0; private fluxSize=64;
  private beat=0; private beatCooldown=0;
  private bands=[0,0,0,0];
  private kick=0; private snare=0; private hat=0;
  private peak=[0,0,0,0];
  private agcGain=1.0; private agcTarget=0.50; private agcSpeedUp=0.12; private agcSpeedDown=0.03;
  private impact=0;

  // audio textures
  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 128;
  private waveBins = 512;

  // WS stream → texture
  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null; private streamUnit=5; private streamW=1; private streamH=1;

  // programs
  private sceneProg: Record<string, WebGLProgram | null> = { };
  private serverProg: WebGLProgram | null = null;
  private serverUniforms: Record<string, WebGLUniformLocation | null> = {};
  private serverTextures: { name:string; tex:WebGLTexture; unit:number; meta?:ServerTexture }[] = [];

  // WOW feedback
  private wowProg: WebGLProgram | null = null;
  private fbA: WebGLFramebuffer | null = null; private fbB: WebGLFramebuffer | null = null;
  private texA: WebGLTexture | null = null;     private texB: WebGLTexture | null = null;
  private decay=0.88;

  // offscreen A/B for transitions
  private sceneA: WebGLFramebuffer | null = null; private sceneB: WebGLFramebuffer | null = null;
  private texSceneA: WebGLTexture | null = null; private texSceneB: WebGLTexture | null = null;

  // transitions
  private transProg: WebGLProgram | null = null;

  // scene state
  private scenes = ['barsPro','radialRings','oscDual','sunburst','lissajous','tunnel','particles','wow','server'] as const;
  private sceneIdx = 0;
  private sceneTimer = 0;
  private sceneMinMs = 15000;
  private sceneMaxMs = 32000;
  private transitioning = false;
  private transStart = 0; private transDur = 1900; private transType = 0;

  // loop / fps
  private anim:number|undefined; private frames=0; private lastFPS=performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    this.gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if (!this.gl) { this.canvas.getContext('2d')?.fillText('WebGL not supported', 10, 20); return; }

    this.initGL();
    this.initAudioTextures();
    this.initWS();
    this.opts.onStatus?.('Ready. M: next • 1–7 classic • 5 WOW • V WOW/Server • N server shader');
  }

  private safeLink(name:string, fsSrc:string): WebGLProgram | null {
    try { return link(this.gl!, VS, fsSrc); }
    catch (e:any) {
      console.error(`[Shader:${name}]`, e?.message||e);
      return null; // skip broken scene; no ugly gradient fallback
    }
  }

  // ───────────────── init
  private initGL(){
    const gl=this.gl!;
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    const mkTex=(w:number,h:number)=>{ const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    const mkFB=(t:WebGLTexture)=>{ const f=gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); return f; };
    const w=Math.max(2, Math.floor(this.canvas.width/2)), h=Math.max(2, Math.floor(this.canvas.height/2));
    this.texA=mkTex(w,h); this.fbA=mkFB(this.texA);
    this.texB=mkTex(w,h); this.fbB=mkFB(this.texB);
    this.texSceneA=mkTex(w,h); this.sceneA=mkFB(this.texSceneA);
    this.texSceneB=mkTex(w,h); this.sceneB=mkFB(this.texSceneB);

    // compile scenes
    this.sceneProg['barsPro']     = this.safeLink('barsPro',     FS_BARSPRO);
    this.sceneProg['radialRings'] = this.safeLink('radialRings', FS_RADIALRINGS);
    this.sceneProg['oscDual']     = this.safeLink('oscDual',     FS_OSCDUAL);
    this.sceneProg['sunburst']    = this.safeLink('sunburst',    FS_SUNBURST);
    this.sceneProg['lissajous']   = this.safeLink('lissajous',   FS_LISSAJOUS);
    this.sceneProg['tunnel']      = this.safeLink('tunnel',      FS_TUNNEL);
    this.sceneProg['particles']   = this.safeLink('particles',   FS_PARTICLES);
    this.wowProg                  = this.safeLink('wow',         FS_WOW);
    this.transProg                = this.safeLink('transition',  FS_TRANSITION);

    for (const p of Object.values({...this.sceneProg, wow:this.wowProg, trans:this.transProg})) {
      if (!p) continue;
      gl.useProgram(p);
      const loc=gl.getAttribLocation(p,'aPos'); if(loc!==-1){ gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }
    }

    // default stream texture
    this.streamTex = gl.createTexture()!;
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit);
    gl.bindTexture(gl.TEXTURE_2D, this.streamTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);

    window.addEventListener('resize',()=>this.resize());
    window.addEventListener('keydown',(e)=>this.onKey(e));
    this.resize();
  }

  private resize(){
    const gl=this.gl!; const dpr=Math.max(1,Math.round(window.devicePixelRatio||1));
    const w=this.canvas.clientWidth||window.innerWidth, h=this.canvas.clientHeight||window.innerHeight;
    if (this.canvas.width!==w*dpr || this.canvas.height!==h*dpr){ this.canvas.width=w*dpr; this.canvas.height=h*dpr; }
    gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }

  private initAudioTextures(){
    const gl=this.gl!;
    const mk=(w:number)=>{ const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,1,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    this.specTex = mk(this.specBins);
    this.waveTex = mk(this.waveBins);
  }

  private initWS(){
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws?.close(); this.ws=new WebSocket(`${proto}//${location.host}/ws`);
    this.ws.binaryType='arraybuffer';
    this.ws.onopen=()=>{ this.ws?.send(JSON.stringify({type:'subscribe',field:'waves',w:256,h:256,fps:24})); };
    this.ws.onmessage=(ev)=>{ if(typeof ev.data==='string')return; this.onStreamFrame(ev.data as ArrayBuffer); };
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

  // ───────────────── API
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

  toggleWow(){ if (this.scenes[this.sceneIdx] === 'wow') this.sceneIdx = this.scenes.indexOf('server'); else this.sceneIdx = this.scenes.indexOf('wow'); this.beginTransition(); }
  async loadServerShaderPublic(){ await this.loadServerShader('composite'); this.opts.onStatus?.('Server shader refreshed'); }

  private onKey(e:KeyboardEvent){
    const k=e.key.toLowerCase();
    if(k==='v') this.toggleWow();
    if(k==='n') this.loadServerShaderPublic();
    if(k==='m') this.nextScene();
    const map=['barsPro','radialRings','oscDual','sunburst','lissajous','tunnel','particles'];
    if('1234567'.includes(k)){ const idx=parseInt(k,10)-1; if(map[idx]){ this.sceneIdx = this.scenes.indexOf(map[idx] as any); this.beginTransition(); } }
  }

  // ───────────────── server shader
  private async loadServerShader(type?:string){
    const params=new URLSearchParams(); if(type) params.set('type',type); params.set('ts',Date.now().toString());
    const url='/api/shader/next?'+params.toString();
    const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const s = (await r.json()) as ServerShader;
    const gl=this.gl!;
    try{
      const p = link(gl, VS, s.code);
      this.serverProg = p;
      this.serverUniforms = {};
      this.serverTextures = [];
      gl.useProgram(p);
      for (const name of ['uTime','uRes','uLevel','uBands','uPulse','uBeat','uBlendFlow','uBlendRD','uBlendStream','uFrame','uAtlasGrid','uAtlasFrames','uAtlasFPS','uStreamRes','uImpact']) {
        this.serverUniforms[name] = gl.getUniformLocation(p, name);
      }
      let unit=0;
      if (s.textures) for (const t of s.textures) {
        const tex=gl.createTexture()!;
        await new Promise<void>((res,rej)=>{ const img=new Image(); img.onload=()=>{ gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT); res(); }; img.onerror=()=>rej(new Error('tex')); img.src=t.dataUrl; });
        const u=gl.getUniformLocation(p,t.name); if(u) gl.uniform1i(u,unit);
        this.serverTextures.push({name:t.name, tex, unit, meta:t}); unit++;
        if (t.gridCols && t.gridRows) {
          this.serverUniforms['uAtlasGrid']   && gl.uniform2f(this.serverUniforms['uAtlasGrid']!, t.gridCols, t.gridRows);
          this.serverUniforms['uAtlasFrames'] && gl.uniform1f(this.serverUniforms['uAtlasFrames']!, t.frames ?? (t.gridCols*t.gridRows));
          this.serverUniforms['uAtlasFPS']    && gl.uniform1f(this.serverUniforms['uAtlasFPS']!, t.fps ?? 24);
        }
      }
      const uS=gl.getUniformLocation(p,'uStreamTex'); if(uS) gl.uniform1i(uS,this.streamUnit);
      const uSR=this.serverUniforms['uStreamRes']; if(uSR) gl.uniform2f(uSR,this.streamW,this.streamH);
    }catch(err){ console.error('[ServerShader] compile/link failed:', err); }
  }

  // ───────────────── loop
  private loop=()=>{
    const gl=this.gl!;
    const now=performance.now(); this.frames++; if(now-this.lastFPS>=1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastFPS=now; }

    let level=0;
    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);

      const N=this.freq.length; const mag=new Float32Array(N);
      for (let i=0;i<N;i++) mag[i]=this.freq[i]/255;

      // RMS env + AGC
      let sum=0; for (let i=0;i<N;i++) sum+=mag[i]*mag[i];
      let rms=Math.sqrt(sum/N);
      const gainErr = this.agcTarget / Math.max(1e-4, rms);
      const rate = (gainErr>1 ? this.agcSpeedUp : this.agcSpeedDown);
      this.agcGain += (gainErr - this.agcGain) * rate;
      rms = Math.min(3.0, rms * this.agcGain);
      if(rms>this.env) this.env+= (rms-this.env)*this.envAttack; else this.env+= (rms-this.env)*this.envRelease;
      level=this.env;

      // spectral flux & beat
      let flux=0; if(this.lastMag){ for(let i=0;i<N;i++){ const d=(mag[i]*this.agcGain)-this.lastMag[i]; if(d>0) flux+=d; } } this.lastMag=mag;
      if(this.fluxRing.length<this.fluxSize) this.fluxRing.push(flux); else { this.fluxRing[this.fluxIdx]=flux; this.fluxIdx=(this.fluxIdx+1)%this.fluxSize; }
      const mean=this.fluxRing.reduce((a,b)=>a+b,0)/Math.max(1,this.fluxRing.length);
      const trig=flux>mean*1.22 && this.beatCooldown<=0; this.beat=Math.max(0,this.beat-0.10); if(trig){ this.beat=1.0; this.beatCooldown=6; } if(this.beatCooldown>0) this.beatCooldown--;

      // bands
      const sr=this.audioCtx?.sampleRate||48000, ny=sr/2, hzPerBin=ny/N; const bin=(hz:number)=>Math.max(0,Math.min(N-1,Math.round(hz/hzPerBin)));
      const band=(a:number,b:number)=>{ let s=0; const A=Math.min(a,b),B=Math.max(a,b); const L=Math.max(1,B-A); for(let i=A;i<B;i++) s+=mag[i]; return (s/L)*this.agcGain; };
      const kickLo=bin(25),kickHi=bin(120),snLo=bin(160),snHi=bin(260),hatLo=bin(4500),hatHi=bin(12000),midLo=bin(450),midHi=bin(2200),lowLo=bin(60),lowHi=bin(250),airLo=bin(9000),airHi=bin(18000);
      this.kick=band(kickLo,kickHi); this.snare=band(snLo,snHi); this.hat=band(hatLo,hatHi);
      this.bands[0]=band(lowLo,lowHi); this.bands[1]=band(snLo,snHi); this.bands[2]=band(midLo,midHi); this.bands[3]=band(airLo,airHi);

      // peak-hold & impact
      for (let i=0;i<4;i++){ this.peak[i] = Math.max(this.peak[i]*0.90, this.bands[i]); }
      const over = Math.max(0, flux - mean*1.05);
      const impRaw = Math.min(3.0, over/(mean*0.4 + 1e-4)) + this.kick*0.8 + this.snare*0.4;
      this.impact = this.impact*0.75 + Math.min(2.5, impRaw)*0.25;

      // textures
      const tmp = new Uint8Array(this.specBins*4);
      for(let i=0;i<this.specBins;i++){
        const a=i/N, b=(i+1)/this.specBins*N;
        let s=0,c=0; for(let j=Math.floor(a); j<Math.floor(b); j++){ s+=this.freq[Math.min(j,N-1)]; c++; }
        const v=Math.min(255, Math.round((s/Math.max(1,c))));
        tmp[i*4]=v; tmp[i*4+1]=v; tmp[i*4+2]=v; tmp[i*4+3]=255;
      }
      gl.bindTexture(gl.TEXTURE_2D, this.specTex!); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.specBins,1,gl.RGBA,gl.UNSIGNED_BYTE,tmp);

      const tw = new Uint8Array(this.waveBins*4);
      for(let i=0;i<this.waveBins;i++){
        const idx=Math.floor(i/this.waveBins*this.wave.length);
        const v=this.wave[idx]; tw[i*4]=v; tw[i*4+1]=v; tw[i*4+2]=v; tw[i*4+3]=255;
      }
      gl.bindTexture(gl.TEXTURE_2D,this.waveTex!); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.waveBins,1,gl.RGBA,gl.UNSIGNED_BYTE,tw);

      // rotation
      this.sceneTimer += 16;
      const due = this.sceneTimer > (this.sceneMinMs + Math.random()*(this.sceneMaxMs - this.sceneMinMs));
      const lowActivity = mean < 0.012 && level < 0.09;
      if (!this.transitioning && (due || (lowActivity && this.sceneTimer>9000))) this.nextScene();
    }

    if (this.transitioning) this.renderTransition(now, level);
    else this.renderScene(now, level);

    this.anim = requestAnimationFrame(this.loop);
  }

  private renderScene(now:number, level:number){
    const gl=this.gl!; gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    const scene=this.scenes[this.sceneIdx];
    if (scene==='wow') this.drawWOW(now/1000, level);
    else if (scene==='server') this.drawServer(now/1000, level);
    else this.drawClassic(scene, now/1000, level);
  }

  private beginTransition(){
    this.transitioning = true; this.transStart = performance.now(); this.transType = (this.transType+1)%6; this.sceneTimer=0;
    const now=performance.now();
    this.renderSceneTo(this.texSceneA!, this.sceneA!, now, this.scenes[this.sceneIdx]);
  }

  private nextScene(){
    const prevIdx = this.sceneIdx;
    this.sceneIdx = (this.sceneIdx + 1) % this.scenes.length;
    const now=performance.now();
    this.renderSceneTo(this.texSceneA!, this.sceneA!, now, this.scenes[prevIdx]);
    this.renderSceneTo(this.texSceneB!, this.sceneB!, now, this.scenes[this.sceneIdx]);
    this.transitioning = true; this.transStart = now; this.transType = (this.transType+1)%6; this.sceneTimer=0;
  }

  private renderSceneTo(tex:WebGLTexture, fb:WebGLFramebuffer, now:number, kind:string){
    const gl=this.gl!; gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)), Math.max(2,Math.floor(this.canvas.height/2)));
    gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    if (kind==='wow') this.drawWOW(now/1000, this.env, true);
    else if (kind==='server') this.drawServer(now/1000, this.env, true);
    else this.drawClassic(kind as any, now/1000, this.env, true);
  }

  private renderTransition(now:number, level:number){
    const gl=this.gl!; const p = Math.min(1, (now - this.transStart)/this.transDur);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
    if (!this.transProg) return;
    gl.useProgram(this.transProg);
    const loc=(n:string)=>gl.getUniformLocation(this.transProg!, n);
    gl.activeTexture(gl.TEXTURE0 + 0); gl.bindTexture(gl.TEXTURE_2D, this.texSceneA!); gl.uniform1i(loc('uFrom')!, 0);
    gl.activeTexture(gl.TEXTURE0 + 1); gl.bindTexture(gl.TEXTURE_2D, this.texSceneB!); gl.uniform1i(loc('uTo')!,   1);
    gl.uniform1f(loc('uProgress')!, p);
    gl.uniform1f(loc('uType')!, this.transType);
    gl.uniform2f(loc('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(loc('uBeat')!, this.beat);
    gl.uniform3f(loc('uBands')!, this.peak[0], this.peak[2], this.peak[3]);
    gl.uniform1f(loc('uImpact')!, Math.min(2.0, this.impact));
    const a=gl.getAttribLocation(this.transProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (p>=1) { this.transitioning=false; }
  }

  private drawClassic(which:any, t:number, level:number, offscreen=false){
    const gl=this.gl!; const p=this.sceneProg[which]; if(!p) return;
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'3f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); set('uSpecTex',6,'1i'); set('uSpecN',this.specBins,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); set('uWaveTex',8,'1i'); set('uWaveN',this.waveBins,'1f');
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); set('uStreamTex', this.streamUnit,'1i');
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',level,'1f'); set('uBeat',this.beat,'1f');
    set('uKick',this.peak[0]*1.35,'1f'); set('uSnare',this.snare,'1f'); set('uHat',this.peak[3],'1f');
    set('uLow',this.peak[0],'1f'); set('uMid',this.peak[2],'1f'); set('uAir',this.peak[3],'1f');
    set('uImpact', Math.min(2.0,this.impact), '1f');
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  private drawWOW(t:number, level:number, toFBO=false){
    const gl=this.gl!; if (!this.wowProg) return;
    if (!toFBO) gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA);
    const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
    gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.wowProg);
    const U=(n:string)=>gl.getUniformLocation(this.wowProg!,n);
    gl.uniform1f(U('uTime')!, t);
    gl.uniform2f(U('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(U('uDecay')!, this.decay);
    gl.uniform1f(U('uEnv')!, level);
    gl.uniform1f(U('uBeat')!, this.beat);
    gl.uniform1f(U('uKick')!, this.peak[0]*1.35);
    gl.uniform1f(U('uSnare')!, this.snare);
    gl.uniform1f(U('uHat')!, this.peak[3]);
    gl.uniform1f(U('uLow')!, this.peak[0]);
    gl.uniform1f(U('uMid')!, this.peak[2]);
    gl.uniform1f(U('uAir')!, this.peak[3]);
    gl.activeTexture(gl.TEXTURE0+7); gl.bindTexture(gl.TEXTURE_2D,this.texB!); gl.uniform1i(U('uFeedback')!,7);
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); gl.uniform1i(U('uStreamTex')!, this.streamUnit);
    const loc=gl.getAttribLocation(this.wowProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);

    if (!toFBO){
      gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
      if (this.transProg){
        gl.useProgram(this.transProg);
        const u=(n:string)=>gl.getUniformLocation(this.transProg!,n);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.texA!); gl.uniform1i(u('uFrom')!,0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.texA!); gl.uniform1i(u('uTo')!,1);
        gl.uniform1f(u('uProgress')!, 0.0); gl.uniform1f(u('uType')!, 0.0); gl.uniform2f(u('uRes')!, this.canvas.width, this.canvas.height);
        gl.uniform1f(u('uBeat')!, this.beat); gl.uniform3f(u('uBands')!, this.peak[0], this.peak[2], this.peak[3]); gl.uniform1f(u('uImpact')!, Math.min(2.0,this.impact));
        const a=gl.getAttribLocation(this.transProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
        gl.drawArrays(gl.TRIANGLES,0,6);
      }
      const tTex=this.texA; this.texA=this.texB; this.texB=tTex;
      const tFB=this.fbA; this.fbA=this.fbB; this.fbB=tFB;
    }
  }

  private drawServer(t:number, level:number, offscreen=false){
    const gl=this.gl!; const p=this.serverProg; if(!p){ this.drawClassic('barsPro',t,level); return; }
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',level,'1f');
    const uBands=gl.getUniformLocation(p,'uBands'); if(uBands) gl.uniform1fv(uBands,new Float32Array(this.bands.map(b=>Math.min(1,b*1.6))));
    const uPulse=gl.getUniformLocation(p,'uPulse'); if(uPulse) gl.uniform1f(uPulse, Math.min(1, this.env*1.8));
    const uBeat=gl.getUniformLocation(p,'uBeat'); if(uBeat) gl.uniform1f(uBeat, Math.min(1, this.beat*2.0));
    const uImpact=gl.getUniformLocation(p,'uImpact'); if(uImpact) gl.uniform1f(uImpact, Math.min(2.0,this.impact));
    for(const ttex of this.serverTextures){ gl.activeTexture(gl.TEXTURE0+ttex.unit); gl.bindTexture(gl.TEXTURE_2D,ttex.tex); }
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D,this.streamTex!); const uS=gl.getUniformLocation(p,'uStreamTex'); if(uS) gl.uniform1i(uS,this.streamUnit);
    const atlas=this.serverTextures.find(t=>t.meta && t.meta.gridCols && t.meta.gridRows);
    if (atlas?.meta){ const frames=atlas.meta.frames ?? (atlas.meta.gridCols!*atlas.meta.gridRows!); const fps=atlas.meta.fps ?? 24; const frame=Math.floor(t*fps)%Math.max(1,frames);
      this.serverUniforms['uAtlasGrid'] && gl.uniform2f(this.serverUniforms['uAtlasGrid']!, atlas.meta.gridCols!, atlas.meta.gridRows!);
      this.serverUniforms['uAtlasFrames']&& gl.uniform1f(this.serverUniforms['uAtlasFrames']!, frames);
      this.serverUniforms['uAtlasFPS']   && gl.uniform1f(this.serverUniforms['uAtlasFPS']!, fps);
      this.serverUniforms['uFrame']      && gl.uniform1f(this.serverUniforms['uFrame']!, frame);
    }
    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }
}

/* ========================= Scene Shaders ========================= */

const NOISE = `
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
`;

// Helpers (remove fragile clamp usage)
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

// Bars — uses SPEC_HELP
const FS_BARSPRO = `
precision mediump float; varying vec2 vUV;
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

// Radial rings — uses SPEC_HELP
const FS_RADIALRINGS = `
precision mediump float; varying vec2 vUV;
${SPEC_HELP}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
${NOISE}
void main(){
  vec2 p = vUV*2.0-1.0; float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/6.28318;
  float s = specSample(fract(idx));
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

// Dual oscilloscope — uses WAVE_HELP
const FS_OSCDUAL = `
precision mediump float; varying vec2 vUV;
${WAVE_HELP}
uniform float uTime,uBeat,uMid,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float x = waveSample(vUV.y);
  float thickness = 0.011 + 0.012*uImpact;
  float lineY = smoothstep(thickness, 0.0, abs(vUV.y - y)-0.001);
  float lineX = smoothstep(thickness, 0.0, abs(vUV.x - x)-0.001);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, abs(vUV.y - y)) + smoothstep(0.06+0.04*uImpact, 0.0, abs(vUV.x - x));
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * (lineY + lineX) + glow*0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col, 1.0);
}
`;

// Sunburst — uses SPEC_HELP
const FS_SUNBURST = `
precision mediump float; varying vec2 vUV;
${SPEC_HELP}
uniform float uTime,uBeat,uHat,uMid,uImpact;
void main(){
  vec2 p=vUV*2.0-1.0; float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 10.0 + floor(uHat*14.0) + 4.0*uImpact;
  float rays = abs(sin(a*seg + uTime*2.0))*pow(1.0-r,0.4);
  float s = specSample(fract((a+3.14159)/6.28318));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), s);
  col *= 0.35 + 2.5 * rays * (0.3 + 1.6*s + 0.7*uMid + 0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`;

// Lissajous — uses WAVE_HELP
const FS_LISSAJOUS = `
precision mediump float; varying vec2 vUV;
${WAVE_HELP}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=vUV*2.0-1.0;
  float a=waveSample(fract((uv.x+1.0)*0.5));
  float b=waveSample(fract((uv.y+1.0)*0.5));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`;

// Tunnel — uses SPEC_HELP
const FS_TUNNEL = `
precision mediump float; varying vec2 vUV;
${SPEC_HELP}
uniform float uTime,uKick,uSnare,uHat,uLow,uMid,uAir,uBeat,uImpact;
void main(){
  vec2 uv=vUV*2.0-1.0; float r=length(uv); float a=atan(uv.y,uv.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float z = 1.2/(r+0.12 + 0.25*exp(-r*6.0)*(0.6+1.8*uKick+0.8*uImpact));
  float stripes = sin( (z*8.0 + uTime*2.2) + a*4.0 + (uHat+0.5*uImpact)*10.0 )*0.5+0.5;
  vec3 col = mix(vec3(0.1,0.5,1.2), vec3(1.0,0.4,0.8), stripes);
  col *= (0.3 + 1.0*z) * (0.6 + 1.5*s + 0.8*uAir + 0.5*uImpact);
  col += uBeat*vec3(0.7,0.5,1.0)*0.28;
  gl_FragColor = vec4(col,1.0);
}
`;

// Particles
const FS_PARTICLES = `
precision mediump float; varying vec2 vUV;
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
${NOISE}
void main(){
  vec2 uv=vUV*2.0-1.0;
  float d = length(uv);
  float field = smooth2D(uv*3.0 + uTime*vec2(0.4,-0.3)) + 0.5*smooth2D(uv*6.0 - uTime*vec2(0.2,0.5));
  float dots = step(0.78 + 0.1*uAir - 0.1*uImpact, fract(field*10.0 + uTime*1.3));
  float glow = exp(-d*(6.2+9.0*uLow+4.0*uImpact));
  vec3 col = mix(vec3(0.2,0.8,1.0), vec3(1.0,0.5,0.8), field);
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact);
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`;

// WOW (uses qclamp helper)
const FS_WOW = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uFeedback, uStreamTex;
uniform vec2  uRes; uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=uv*2.0-1.0; float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); uv=vec2(cos(a),sin(a))*r; return uv*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  vec2 c=uv-0.5; float r=length(c);
  float bassWarp=0.48*uKick+0.20*uSnare; uv+=c*(bassWarp*r);
  float angle=(uMid*0.85+0.2)*sin(t*0.42)+r*(0.45+0.25*uLow);
  mat2 R=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec3 stream=texture2D(uStreamTex,(R*(uv-0.5)+0.5)+vec2(t*0.02,-t*0.015)).rgb;
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2);
  vec3 prev=texture2D(uFeedback, uv + c*0.012*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base*0.8+stream*0.4, 0.55+0.45*uEnv);
  col += uBeat*vec3(0.9,0.6,1.0);
  float vg=1.0-dot(c,c)*0.9; col*=qclamp(vg,0.25,1.0);
  gl_FragColor=vec4(col,1.0);
}
`;

/* ========================= Transition Shader ========================= */
const FS_TRANSITION = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uFrom, uTo;
uniform float uProgress, uType, uBeat, uImpact;
uniform vec3 uBands;
uniform vec2 uRes;

float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec2 swirl(vec2 uv, float k){ vec2 p=uv-0.5; float r=length(p); float a=atan(p.y,p.x)+k*r*r; return 0.5+vec2(cos(a),sin(a))*r; }
vec2 barrel(vec2 uv, float k){ vec2 p=uv-0.5; float r2=dot(p,p); return 0.5 + p*(1.0 + k*r2); }

vec3 chromaBlur(sampler2D t, vec2 uv, vec2 px, float r){
  vec3 c=texture2D(t, uv).rgb;
  for(int i=-2;i<=2;i++){
    float fi=float(i);
    c += texture2D(t, uv + vec2(fi,0.0)*px*r).rgb;
    c += texture2D(t, uv + vec2(0.0,fi)*px*r).rgb;
  }
  return c/9.0;
}

vec3 pixelSortish(sampler2D t, vec2 uv, vec2 dir, float len){
  vec3 best = texture2D(t, uv).rgb; float lb=luma(best);
  for(int i=1;i<=8;i++){
    float f=float(i)/8.0;
    vec3 s = texture2D(t, uv + dir*f*len).rgb;
    float ls=luma(s);
    if(ls>lb){ best=s; lb=ls; }
  }
  return best;
}

void main(){
  float p = smoothstep(0.0,1.0,uProgress);
  vec2 uv=vUV; vec2 px=1.0/uRes;
  vec3 A,B;

  if (uType < 0.5) {
    vec2 ua = (uv-0.5)/(1.0+0.45*p)+0.5;
    vec2 ub = (uv-0.5)*(1.0-0.22*p)+0.5;
    ua = swirl(ua, 2.4*p);
    A = texture2D(uFrom, ua).rgb;
    B = texture2D(uTo,   ub).rgb;
    float m = smoothstep(-0.1,1.1,p + 0.18*sin((uv.x+uv.y)*24.0));
    gl_FragColor = vec4(mix(A,B,m),1.0);

  } else if (uType < 1.5) {
    vec2 c=uv-0.5; float r=length(c);
    float w = 0.22 + 0.78*p;
    float rip = 0.035 + 0.055*uBands.y;
    float mask = smoothstep(w-rip, w+rip, r + 0.05*sin(22.0*r - p*(10.0+18.0*uBands.y)));
    A=texture2D(uFrom, uv).rgb; B=texture2D(uTo, uv).rgb;
    gl_FragColor = vec4(mix(A,B,mask),1.0);

  } else if (uType < 2.5) {
    vec2 g = floor(uv*vec2(28.0,16.0));
    float phase = fract((g.x+g.y)*0.07*(1.0+2.0*uBands.z) + p*1.1);
    float m = smoothstep(0.35,0.65,phase);
    vec2 uva = swirl(uv, 1.7*(1.0-p));
    vec2 uvb = swirl(uv, 1.7*p);
    A=texture2D(uFrom, uva).rgb; B=texture2D(uTo, uvb).rgb;
    gl_FragColor = vec4(mix(A,B,m),1.0);

  } else if (uType < 3.5) {
    vec2 px = 1.0 / uRes;
    vec3 ca = texture2D(uFrom, uv).rgb;
    vec3 cb = texture2D(uTo,   uv).rgb;
    float gradAx = luma(texture2D(uFrom, uv+vec2(px.x,0.0)).rgb) - luma(texture2D(uFrom, uv-vec2(px.x,0.0)).rgb);
    float gradAy = luma(texture2D(uFrom, uv+vec2(0.0,px.y)).rgb) - luma(texture2D(uFrom, uv-vec2(0.0,px.y)).rgb);
    float gradBx = luma(texture2D(uTo, uv+vec2(px.x,0.0)).rgb) - luma(texture2D(uTo, uv-vec2(px.x,0.0)).rgb);
    float gradBy = luma(texture2D(uTo, uv+vec2(0.0,px.y)).rgb) - luma(texture2D(uTo, uv-vec2(0.0,px.y)).rgb);
    vec2 flowA = vec2(gradAx, gradAy);
    vec2 flowB = vec2(gradBx, gradBy);
    float power = mix(1.0, 3.0, p) * (0.25 + 1.9*uBands.x + 0.7*uBeat + 0.4*uImpact);
    vec2 ua = uv - flowA*power*(1.0-p)*0.015;
    vec2 ub = uv + flowB*power*(p)*0.015;
    A = texture2D(uFrom, ua).rgb;
    B = texture2D(uTo,   ub).rgb;
    gl_FragColor = vec4(mix(A,B,p),1.0);

  } else if (uType < 4.5) {
    float kb = (0.25 + 0.9*uBands.x + 0.6*uImpact) * p;
    float ks = (0.8  + 1.6*uBands.z + 1.1*uImpact) * p;
    vec2 ua = barrel(uv,  kb);
    vec2 ub = swirl (uv,  ks);
    A = texture2D(uFrom, ua).rgb;
    B = texture2D(uTo,   ub).rgb;
    float rim = smoothstep(0.0,1.0,p) * smoothstep(0.0,1.0,1.0 - length(uv-0.5));
    float m = qclamp(p + rim*0.25, 0.0, 1.0);
    gl_FragColor = vec4(mix(A,B,m),1.0);

  } else {
    float r = (0.6 + 2.8*uBands.z + 1.8*uImpact) * p;
    vec2 dir = normalize(vec2(0.7,0.3) + (uv-0.5)*2.0);
    vec3 Af = chromaBlur(uFrom, uv, px, r*0.6);
    vec3 Bs = pixelSortish(uTo, uv, dir, 0.20 + 0.35*p);
    float mask = smoothstep(0.25, 0.75, p + 0.15*(luma(Bs)-luma(Af)));
    gl_FragColor = vec4(mix(Af, Bs, mask), 1.0);
  }
}
`;
