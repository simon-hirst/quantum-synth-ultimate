/**
 * Visualizer with classic scenes + morph transitions.
 * Scenes: bars, radial, oscilloscope, sunburst, wow(local), server(composite).
 * Morphs: zoom-swirl, ripple-warp, checker-wipe (non-linear, not a plain fade).
 */
type GL = WebGLRenderingContext | WebGL2RenderingContext;
type VizOpts = { onStatus?: (s: string) => void; onFps?: (fps: number) => void; };

type ServerTexture = { name:string; dataUrl:string; width:number; height:number; gridCols?:number; gridRows?:number; frames?:number; fps?:number; };
type ServerShader  = { type:string; name:string; code:string; complexity:number; version?:string; uniforms?:{name:string;type:string}[]; textures?:ServerTexture[]; };

const VS = `
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;

function compile(gl:GL, type:number, src:string){ const s=gl.createShader(type)!; gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)||'compile'); return s; }
function link(gl:GL, vsSrc:string, fsSrc:string){ const p=gl.createProgram()!; gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vsSrc)); gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fsSrc)); gl.linkProgram(p); if(!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)||'link'); return p; }

export class Visualizer {
  private canvas: HTMLCanvasElement;
  private gl: GL | null = null;

  // quad
  private quad: WebGLBuffer | null = null;

  // audio
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private freq: Uint8Array | null = null;
  private wave: Uint8Array | null = null;
  private stream: MediaStream | null = null;

  // features
  private env=0; private envAttack=0.28; private envRelease=0.06;
  private lastMag: Float32Array | null = null;
  private fluxRing:number[]=[]; private fluxIdx=0; private fluxSize=43;
  private beat=0; private beatCooldown=0;
  private bands=[0,0,0,0]; private kick=0; private snare=0; private hat=0;

  // audio textures (1×N)
  private specTex: WebGLTexture | null = null;
  private waveTex: WebGLTexture | null = null;
  private specBins = 64;  // downsampled bins
  private waveBins = 256; // osc

  // stream texture from backend WS (kept valid)
  private ws: WebSocket | null = null;
  private streamTex: WebGLTexture | null = null; private streamUnit=5; private streamW=1; private streamH=1;

  // scene programs
  private sceneProg: Record<string, WebGLProgram | null> = { };
  private serverProg: WebGLProgram | null = null;
  private serverUniforms: Record<string, WebGLUniformLocation | null> = {};
  private serverTextures: { name:string; tex:WebGLTexture; unit:number; meta?:ServerTexture }[] = [];

  // WOW mode (feedback ping-pong)
  private wowProg: WebGLProgram | null = null;
  private fbA: WebGLFramebuffer | null = null; private fbB: WebGLFramebuffer | null = null;
  private texA: WebGLTexture | null = null;     private texB: WebGLTexture | null = null;
  private decay=0.82;

  // scene FBOs for transition
  private sceneA: WebGLFramebuffer | null = null; private sceneB: WebGLFramebuffer | null = null;
  private texSceneA: WebGLTexture | null = null; private texSceneB: WebGLTexture | null = null;

  // transition program
  private transProg: WebGLProgram | null = null;

  // scene state
  private scenes = ['bars','radial','osc','sunburst','wow','server'] as const;
  private sceneIdx = 0;
  private sceneTimer = 0;
  private sceneMinMs = 25000; // min before autotransition
  private sceneMaxMs = 42000;
  private transitioning = false;
  private transStart = 0; private transDur = 2200; private transType = 0; // rotate types

  // loop/fps
  private anim:number|undefined; private frames=0; private lastFPS=performance.now();

  constructor(canvas: HTMLCanvasElement, private opts: VizOpts = {}) {
    this.canvas = canvas;
    // WebGL1-first for GLSL compat
    this.gl = (canvas.getContext('webgl') as GL) || (canvas.getContext('webgl2') as GL);
    if (!this.gl) { this.canvas.getContext('2d')?.fillText('WebGL not supported', 10, 20); return; }

    this.initGL();
    this.initAudioTextures();
    this.initWS();
    this.opts.onStatus?.('Ready. V toggles WOW vs Server; M cycles scenes; 1-5 pick a scene; N fetches new server shader');
  }

  // ────────────────────────────────── init
  private initGL(){
    const gl=this.gl!;
    // quad
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,-1, 1,1, -1,1]), gl.STATIC_DRAW);

    // allocate feedback ping-pong (for wow & temp render targets)
    const mkTex=(w:number,h:number)=>{ const t=gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE); return t; };
    const mkFB=(t:WebGLTexture)=>{ const f=gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER,f); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t,0); gl.bindFramebuffer(gl.FRAMEBUFFER,null); return f; };

    const w=Math.max(2, Math.floor(this.canvas.width/2)), h=Math.max(2, Math.floor(this.canvas.height/2));
    this.texA=mkTex(w,h); this.fbA=mkFB(this.texA);
    this.texB=mkTex(w,h); this.fbB=mkFB(this.texB);
    this.texSceneA=mkTex(w,h); this.sceneA=mkFB(this.texSceneA);
    this.texSceneB=mkTex(w,h); this.sceneB=mkFB(this.texSceneB);

    // compile scenes
    this.sceneProg['bars']      = link(gl, VS, FS_BARS);
    this.sceneProg['radial']    = link(gl, VS, FS_RADIAL);
    this.sceneProg['osc']       = link(gl, VS, FS_OSC);
    this.sceneProg['sunburst']  = link(gl, VS, FS_SUNBURST);
    this.wowProg                = link(gl, VS, FS_WOW);
    this.transProg              = link(gl, VS, FS_TRANSITION);

    // attrib setup for all progs
    for (const p of [this.sceneProg['bars'], this.sceneProg['radial'], this.sceneProg['osc'], this.sceneProg['sunburst'], this.wowProg, this.transProg]) {
      if (!p) continue;
      gl.useProgram(p);
      const loc=gl.getAttribLocation(p,'aPos'); if(loc!==-1){ gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0); }
    }

    // default stream texture (valid sampler)
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

  // ────────────────────────────────── API
  async start(){ await this.loadServerShader('composite').catch(()=>{}); this.loop(); }
  stop(){ if(this.anim) cancelAnimationFrame(this.anim); this.ws?.close(); }

  async startScreenShare(){
    const s = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false}});
    if(!s.getAudioTracks().length){ s.getTracks().forEach(t=>t.stop()); throw new Error('No audio shared'); }
    this.audioCtx?.close().catch(()=>{});
    this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioCtx.createAnalyser(); this.analyser.fftSize = 2048;
    const src = this.audioCtx.createMediaStreamSource(s); src.connect(this.analyser);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.wave = new Uint8Array(this.analyser.fftSize);
    this.stream = s;
    const v=s.getVideoTracks()[0]; if(v) v.onended=()=>this.stopScreenShare();
  }
  stopScreenShare(){ this.stream?.getTracks().forEach(t=>t.stop()); this.stream=null; this.freq=null; this.wave=null; this.audioCtx?.close().catch(()=>{}); this.audioCtx=null; this.analyser=null; }
  isSharing(){ return !!this.stream; }
  setDemoMode(v:boolean){ if(v) this.stopScreenShare(); } // simple

  toggleWow(){ // toggle between wow and server scene quickly
    if (this.scenes[this.sceneIdx] === 'wow') this.sceneIdx = this.scenes.indexOf('server');
    else this.sceneIdx = this.scenes.indexOf('wow');
    this.beginTransition();
  }
  async loadServerShaderPublic(){ await this.loadServerShader('composite'); this.opts.onStatus?.('Server shader refreshed'); }

  // hotkeys
  private onKey(e:KeyboardEvent){
    const k=e.key.toLowerCase();
    if(k==='v') this.toggleWow();
    if(k==='n') this.loadServerShaderPublic();
    if(k==='m') { this.nextScene(); }
    if('12345'.includes(k)){ const map=['bars','radial','osc','sunburst','wow']; const idx=map.indexOf(k==='1'?'bars':k==='2'?'radial':k==='3'?'osc':k==='4'?'sunburst':'wow'); if(idx>=0){ this.sceneIdx = this.scenes.indexOf(map[idx] as any); this.beginTransition(); } }
  }

  // ────────────────────────────────── server shader
  private async loadServerShader(type?:string){
    const params=new URLSearchParams(); if(type) params.set('type',type); params.set('ts',Date.now().toString());
    const url='/api/shader/next?'+params.toString();
    const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw new Error('HTTP '+r.status);
    const s = (await r.json()) as ServerShader;
    const gl=this.gl!;
    this.serverProg = link(gl, VS, s.code);
    this.serverUniforms = {};
    this.serverTextures = [];
    gl.useProgram(this.serverProg);
    // likely uniforms
    for (const name of ['uTime','uRes','uLevel','uBands','uPulse','uBeat','uBlendFlow','uBlendRD','uBlendStream','uFrame','uAtlasGrid','uAtlasFrames','uAtlasFPS','uStreamRes']) {
      this.serverUniforms[name] = gl.getUniformLocation(this.serverProg, name);
    }
    // textures
    let unit=0;
    if (s.textures) for (const t of s.textures) {
      const tex=gl.createTexture()!;
      await new Promise<void>((res,rej)=>{ const img=new Image(); img.onload=()=>{ gl.activeTexture(gl.TEXTURE0+unit); gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT); res(); }; img.onerror=()=>rej(new Error('tex')); img.src=t.dataUrl; });
      const u=gl.getUniformLocation(this.serverProg,t.name); if(u) gl.uniform1i(u,unit);
      this.serverTextures.push({name:t.name, tex, unit, meta:t}); unit++;
      if (t.gridCols && t.gridRows) {
        this.serverUniforms['uAtlasGrid']   && gl.uniform2f(this.serverUniforms['uAtlasGrid']!, t.gridCols, t.gridRows);
        this.serverUniforms['uAtlasFrames'] && gl.uniform1f(this.serverUniforms['uAtlasFrames']!, t.frames ?? (t.gridCols*t.gridRows));
        this.serverUniforms['uAtlasFPS']    && gl.uniform1f(this.serverUniforms['uAtlasFPS']!, t.fps ?? 24);
      }
    }
    // bind stream sampler
    const uS=gl.getUniformLocation(this.serverProg,'uStreamTex'); if(uS) gl.uniform1i(uS,this.streamUnit);
    const uSR=this.serverUniforms['uStreamRes']; if(uSR) gl.uniform2f(uSR,this.streamW,this.streamH);
  }

  // ────────────────────────────────── loop
  private loop=()=>{
    const gl=this.gl!;
    // FPS
    const now=performance.now(); this.frames++; if(now-this.lastFPS>=1000){ this.opts.onFps?.(this.frames); this.frames=0; this.lastFPS=now; }

    // Audio analysis
    let level=0;
    if (this.analyser && this.freq && this.wave) {
      this.analyser.getByteFrequencyData(this.freq);
      this.analyser.getByteTimeDomainData(this.wave);

      const N=this.freq.length; const mag=new Float32Array(N);
      for (let i=0;i<N;i++) mag[i]=this.freq[i]/255;

      // RMS env
      let sum=0; for (let i=0;i<N;i++) sum += mag[i]*mag[i];
      const rms=Math.sqrt(sum/N); if(rms>this.env) this.env+= (rms-this.env)*this.envAttack; else this.env+= (rms-this.env)*this.envRelease; level=this.env;

      // spectral flux
      let flux=0; if(this.lastMag){ for(let i=0;i<N;i++){ const d=mag[i]-this.lastMag[i]; if(d>0) flux+=d; } } this.lastMag=mag;
      if(this.fluxRing.length<this.fluxSize) this.fluxRing.push(flux); else { this.fluxRing[this.fluxIdx]=flux; this.fluxIdx=(this.fluxIdx+1)%this.fluxSize; }
      const mean=this.fluxRing.reduce((a,b)=>a+b,0)/Math.max(1,this.fluxRing.length);
      const trigger=flux>mean*1.35 && this.beatCooldown<=0; this.beat=Math.max(0,this.beat-0.12); if(trigger){ this.beat=1.0; this.beatCooldown=8; } if(this.beatCooldown>0) this.beatCooldown--;

      // bands & classic regions
      const sr=this.audioCtx?.sampleRate||48000, ny=sr/2, hzPerBin=ny/N; const bin=(hz:number)=>Math.max(0,Math.min(N-1,Math.round(hz/hzPerBin)));
      const band=(a:number,b:number)=>{ let s=0; const A=Math.min(a,b),B=Math.max(a,b); const L=Math.max(1,B-A); for(let i=A;i<B;i++) s+=mag[i]; return s/L; };
      const kickLo=bin(20),kickHi=bin(120),snLo=bin(150),snHi=bin(250),hatLo=bin(5000),hatHi=bin(12000),midLo=bin(500),midHi=bin(2000),lowLo=bin(80),lowHi=bin(250),airLo=bin(8000),airHi=bin(16000);
      this.kick=band(kickLo,kickHi); this.snare=band(snLo,snHi); this.hat=band(hatLo,hatHi);
      this.bands[0]=band(lowLo,lowHi); this.bands[1]=band(snLo,snHi); this.bands[2]=band(midLo,midHi); this.bands[3]=band(airLo,airHi);

      // update audio textures
      // spectrum downsample → specBins
      const tmp = new Uint8Array(this.specBins*4); for(let i=0;i<this.specBins;i++){ const a=i/N, b=(i+1)/this.specBins*N; let s=0,c=0; for(let j=Math.floor(a); j<Math.floor(b); j++){ s+=this.freq[Math.min(j,N-1)]; c++; } const v=Math.min(255, Math.round((s/Math.max(1,c)))); tmp[i*4]=v; tmp[i*4+3]=255; }
      gl.bindTexture(gl.TEXTURE_2D, this.specTex!); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.specBins,1,gl.RGBA,gl.UNSIGNED_BYTE,tmp);
      // waveform → waveBins (resample)
      const tw = new Uint8Array(this.waveBins*4); for(let i=0;i<this.waveBins;i++){ const idx=Math.floor(i/this.waveBins*this.wave.length); const v=this.wave[idx]; tw[i*4]=v; tw[i*4+3]=255; } gl.bindTexture(gl.TEXTURE_2D,this.waveTex!); gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,this.waveBins,1,gl.RGBA,gl.UNSIGNED_BYTE,tw);

      // auto scene switch based on time & low activity (keeps it fresh)
      this.sceneTimer += 16;
      if (!this.transitioning) {
        const lowEnergy = mean < 0.02 && level < 0.12;
        const due = this.sceneTimer > (this.sceneMinMs + Math.random()*(this.sceneMaxMs - this.sceneMinMs));
        if (due || (lowEnergy && this.sceneTimer>12000)) this.nextScene();
      }
    }

    // render
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
    this.transitioning = true; this.transStart = performance.now(); this.transType = (this.transType+1)%3; this.sceneTimer=0;
    // render both scenes into offscreen tex
    this.renderSceneTo(this.texSceneA!, this.fbSceneForCurrent(), performance.now(), this.scenes[this.sceneIdx]); // current (after idx changed externally we want previous? keep as current snapshot)
  }

  private nextScene(){
    const prevIdx = this.sceneIdx;
    this.sceneIdx = (this.sceneIdx + 1) % this.scenes.length;
    // render prev into A, next into B, then start transition
    const now=performance.now();
    this.renderSceneTo(this.texSceneA!, this.fbSceneForCurrent(), now, this.scenes[prevIdx]);
    this.renderSceneTo(this.texSceneB!, this.fbSceneForNext(), now, this.scenes[this.sceneIdx]);
    this.transitioning = true; this.transStart = now; this.transType = (this.transType+1)%3; this.sceneTimer=0;
  }

  private fbSceneForCurrent(){ return this.sceneA!; }
  private fbSceneForNext(){ return this.sceneB!; }

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
    gl.useProgram(this.transProg!);
    const loc=(n:string)=>gl.getUniformLocation(this.transProg!, n);
    const a=0, b=1; // use tex units 0 & 1 temp
    gl.activeTexture(gl.TEXTURE0 + a); gl.bindTexture(gl.TEXTURE_2D, this.texSceneA!); gl.uniform1i(loc('uFrom')!, a);
    gl.activeTexture(gl.TEXTURE0 + b); gl.bindTexture(gl.TEXTURE_2D, this.texSceneB!); gl.uniform1i(loc('uTo')!, b);
    gl.uniform1f(loc('uProgress')!, p);
    gl.uniform1f(loc('uType')!, this.transType);
    gl.uniform2f(loc('uRes')!, this.canvas.width, this.canvas.height);
    // draw quad
    const attrib=gl.getAttribLocation(this.transProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(attrib); gl.vertexAttribPointer(attrib,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (p>=1) { this.transitioning=false; }
  }

  // ────────────────────────────────── draw scenes
  private drawClassic(which:'bars'|'radial'|'osc'|'sunburst', t:number, level:number, offscreen=false){
    const gl=this.gl!; const p=this.sceneProg[which]!; gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    // bind audio textures
    gl.activeTexture(gl.TEXTURE0+6); gl.bindTexture(gl.TEXTURE_2D, this.specTex!); set('uSpecTex',6,'1i'); set('uSpecN',this.specBins,'1f');
    gl.activeTexture(gl.TEXTURE0+8); gl.bindTexture(gl.TEXTURE_2D, this.waveTex!); set('uWaveTex',8,'1i'); set('uWaveN',this.waveBins,'1f');
    // stream for some subtle color variation
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); set('uStreamTex', this.streamUnit,'1i');

    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',level,'1f'); set('uBeat',this.beat,'1f');
    set('uKick',this.kick,'1f'); set('uSnare',this.snare,'1f'); set('uHat',this.hat,'1f');
    set('uLow',this.bands[0],'1f'); set('uMid',this.bands[2],'1f'); set('uAir',this.bands[3],'1f');

    const loc=gl.getAttribLocation(p,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);
  }

  private drawWOW(t:number, level:number, toFBO=false){
    const gl=this.gl!;
    // pass1 → fbA (feedback texB as input)
    if (!toFBO) gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA);
    const w=Math.max(2,Math.floor(this.canvas.width/2)), h=Math.max(2,Math.floor(this.canvas.height/2));
    gl.viewport(0,0,w,h); gl.clearColor(0,0,0,1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.wowProg!);
    const U=(n:string)=>gl.getUniformLocation(this.wowProg!,n);
    gl.uniform1f(U('uTime')!, t);
    gl.uniform2f(U('uRes')!, this.canvas.width, this.canvas.height);
    gl.uniform1f(U('uDecay')!, this.decay);
    gl.uniform1f(U('uEnv')!, level);
    gl.uniform1f(U('uBeat')!, this.beat);
    gl.uniform1f(U('uKick')!, this.kick);
    gl.uniform1f(U('uSnare')!, this.snare);
    gl.uniform1f(U('uHat')!, this.hat);
    gl.uniform1f(U('uLow')!, this.bands[0]);
    gl.uniform1f(U('uMid')!, this.bands[2]);
    gl.uniform1f(U('uAir')!, this.bands[3]);
    // feedback sampler (7)
    gl.activeTexture(gl.TEXTURE0+7); gl.bindTexture(gl.TEXTURE_2D,this.texB!); gl.uniform1i(U('uFeedback')!,7);
    // stream sampler
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D, this.streamTex!); gl.uniform1i(U('uStreamTex')!, this.streamUnit);
    const loc=gl.getAttribLocation(this.wowProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    gl.drawArrays(gl.TRIANGLES,0,6);

    if (!toFBO){
      // blit fbA → screen
      gl.bindFramebuffer(gl.FRAMEBUFFER,null); gl.viewport(0,0,this.canvas.width,this.canvas.height);
      gl.useProgram( this.sceneProg['bars']! ); // cheap copy via bars VS with simple sampler? We have a dedicated copy in wow FS using uFeedback; simplest: reuse transition shader at p=0 to blit.
      gl.useProgram(this.transProg!);
      const u=(n:string)=>gl.getUniformLocation(this.transProg!,n);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,this.texA!); gl.uniform1i(u('uFrom')!,0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D,this.texA!); gl.uniform1i(u('uTo')!,1);
      gl.uniform1f(u('uProgress')!, 0.0); gl.uniform1f(u('uType')!, 0.0); gl.uniform2f(u('uRes')!, this.canvas.width, this.canvas.height);
      const a=gl.getAttribLocation(this.transProg!,'aPos'); gl.bindBuffer(gl.ARRAY_BUFFER,this.quad); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      gl.drawArrays(gl.TRIANGLES,0,6);
      // swap ping-pong
      const tTex=this.texA; this.texA=this.texB; this.texB=tTex;
      const tFB=this.fbA; this.fbA=this.fbB; this.fbB=tFB;
    }
  }

  private drawServer(t:number, level:number, offscreen=false){
    const gl=this.gl!; const p=this.serverProg; if(!p){ this.drawClassic('bars',t,level); return; }
    gl.useProgram(p);
    const set=(n:string,v:any,kind:'1f'|'2f'|'1i')=>{ const u=gl.getUniformLocation(p,n); if(!u)return; (gl as any)[`uniform${kind}`](u,...(Array.isArray(v)?v:[v])); };
    set('uTime',t,'1f'); set('uRes',[this.canvas.width,this.canvas.height],'2f');
    set('uLevel',level,'1f'); const bands=new Float32Array(this.bands); const uBands=gl.getUniformLocation(p,'uBands'); if(uBands) gl.uniform1fv(uBands,bands);
    const uPulse=gl.getUniformLocation(p,'uPulse'); if(uPulse) gl.uniform1f(uPulse, Math.max(0,this.env-0.5)*2.0);
    const uBeat=gl.getUniformLocation(p,'uBeat'); if(uBeat) gl.uniform1f(uBeat, this.beat);
    // textures
    for(const t of this.serverTextures){ gl.activeTexture(gl.TEXTURE0+t.unit); gl.bindTexture(gl.TEXTURE_2D,t.tex); }
    gl.activeTexture(gl.TEXTURE0 + this.streamUnit); gl.bindTexture(gl.TEXTURE_2D,this.streamTex!); const uS=gl.getUniformLocation(p,'uStreamTex'); if(uS) gl.uniform1i(uS,this.streamUnit);
    // atlas anim
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

/* ========================= Shaders ========================= */

// Classic: vertical bars with rounded caps + mirror + beat flashes
const FS_BARS = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform sampler2D uStreamTex;
uniform float uTime,uLevel,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
uniform vec2 uRes;
float sampleSpec(float x){
  float i = floor(clamp(x,0.0,0.9999)*uSpecN);
  float u = (i+0.5)/uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
float smoothCap(float y, float h){
  float edge = 0.01 + 0.02*clamp(uAir,0.0,1.0);
  return 1.0 - smoothstep(h-edge, h, y);
}
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.7); // pseudo-log
  float a = sampleSpec(x);
  float barH = 0.05 + 0.9 * a;
  float top = 1.0 - barH;
  float body = step(uv.y, barH);
  float cap = smoothCap(uv.y, barH);
  float val = max(body, cap);
  // reflection
  float ry = 1.0-uv.y;
  float ref = step(ry, barH*0.25) * (0.5 - 0.5*ry);
  // color
  vec3 base = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,0.6), x);
  base *= 0.6 + 0.8*a + 0.4*uLevel;
  base += uBeat*vec3(0.8,0.4,0.9);
  vec3 col = base*val + base*0.35*ref;
  gl_FragColor = vec4(col,1.0);
}
`;

// Classic: circular spectrum (radial bars)
const FS_RADIAL = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uLow,uMid,uAir;
vec2 toPolar(vec2 uv){ vec2 p=uv*2.0-1.0; float r=length(p); float a=atan(p.y,p.x); return vec2(a, r); }
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV; vec2 pr = toPolar(uv);
  float angle = (pr.x+3.14159)/6.28318; // 0..1
  float idx = angle * (uSpecN-1.0);
  float a = spec(floor(idx));
  float R = 0.25 + 0.6*a + 0.1*uLow;
  float ring = smoothstep(R, R+0.02, pr.y) - smoothstep(R+0.02, R+0.04, pr.y);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.4,0.6), angle);
  col *= 0.6 + 1.2*a; col += uBeat*0.12;
  gl_FragColor = vec4(col*ring,1.0);
}
`;

// Classic: oscilloscope line (distance to waveform)
const FS_OSC = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uWaveTex; uniform float uWaveN;
uniform float uTime,uBeat;
float wave(float x){
  float i = floor(clamp(x,0.0,0.9999)*uWaveN);
  float u = (i+0.5)/uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r; // 0..1
}
void main(){
  float y = wave(vUV.x);
  float line = smoothstep(0.008, 0.0, abs(vUV.y - (1.0-y)) - 0.001);
  vec3 col = mix(vec3(0.1,0.9,0.9), vec3(0.9,0.4,1.0), vUV.x);
  col += uBeat*0.2;
  gl_FragColor = vec4(col*line, 1.0);
}
`;

// Classic: sunburst (star lines driven by hats + mids)
const FS_SUNBURST = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uHat,uMid;
uniform vec2 uRes;
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 p = vUV*2.0-1.0; float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 8.0 + floor(uHat*12.0);
  float am = sin(a*seg + uTime*3.0)*0.5+0.5;
  float s = spec(fract((a+3.14159)/6.28318)*uSpecN);
  float line = smoothstep(0.015, 0.0, abs(sin(a*seg))*pow(r, 0.25) - (0.006 + 0.007*uMid));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), am);
  col *= 0.6 + 1.1*s; col += uBeat*0.15;
  gl_FragColor = vec4(col*line,1.0);
}
`;

// WOW (local) — reusing one from previous pass (kaleido + feedback)
const FS_WOW = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uFeedback, uStreamTex;
uniform vec2  uRes; uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=uv*2.0-1.0; float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); uv=vec2(cos(a),sin(a))*r; return uv*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*7.0);
  uv=kaleido(uv,seg);
  vec2 c=uv-0.5; float r=length(c);
  float bassWarp=0.35*uKick+0.12*uSnare; uv+=c*(bassWarp*r);
  float angle=(uMid*0.8+0.2)*sin(t*0.4)+r*(0.3+0.25*uLow);
  mat2 R=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec3 stream=texture2D(uStreamTex,(R*(uv-0.5)+0.5)+vec2(t*0.02,-t*0.015)).rgb;
  float f1=16.0+9.0*uLow, f2=22.0+12.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.0+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.2+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2);
  vec3 prev=texture2D(uFeedback, uv + c*0.01*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base*0.8+stream*0.4, 0.55+0.4*uEnv);
  col += uBeat*vec3(0.75,0.5,0.9);
  float vg=1.0-dot(c,c)*0.9; col*=clamp(vg,0.25,1.1);
  gl_FragColor=vec4(col,1.0);
}
`;

// Transition shader: zoom-swirl / ripple-warp / checker-wipe (picks by uType)
const FS_TRANSITION = `
precision mediump float; varying vec2 vUV;
uniform sampler2D uFrom, uTo;
uniform float uProgress, uType;
uniform vec2 uRes;
vec2 swirl(vec2 uv, float k){
  vec2 p=uv-0.5; float r=length(p); float a=atan(p.y,p.x)+k*r*r; return 0.5+vec2(cos(a),sin(a))*r;
}
void main(){
  float p = smoothstep(0.0,1.0,uProgress);
  vec2 uv=vUV;
  vec3 A,B;
  if (uType < 0.5) {
    // cross-zoom + swirl
    vec2 ua = (uv-0.5)/(1.0+0.35*p)+0.5;
    vec2 ub = (uv-0.5)*(1.0-0.25*p)+0.5;
    ua=swirl(ua, 2.0*p);
    B = texture2D(uTo, ub).rgb;
    A = texture2D(uFrom, ua).rgb;
    float m = smoothstep(-0.2,1.2,p + 0.15*sin((uv.x+uv.y)*20.0));
    gl_FragColor = vec4(mix(A,B,m),1.0);
  } else if (uType < 1.5) {
    // radial ripple reveal
    vec2 c=uv-0.5; float r=length(c);
    float w = 0.2 + 0.8*p;
    float mask = smoothstep(w-0.02, w+0.02, r + 0.03*sin(18.0*r - p*12.0));
    A=texture2D(uFrom, uv).rgb; B=texture2D(uTo, uv).rgb;
    gl_FragColor = vec4(mix(A,B,mask),1.0);
  } else {
    // checker spin-wipe
    vec2 g = floor(uv*vec2(24.0,14.0));
    float phase = fract((g.x+g.y)*0.07 + p*1.0);
    float m = smoothstep(0.35,0.65,phase);
    vec2 uva = swirl(uv, 1.5*(1.0-p));
    vec2 uvb = swirl(uv, 1.5*p);
    A=texture2D(uFrom, uva).rgb; B=texture2D(uTo, uvb).rgb;
    gl_FragColor = vec4(mix(A,B,m),1.0);
  }
}
`;
