(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))r(e);new MutationObserver(e=>{for(const a of e)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&r(i)}).observe(document,{childList:!0,subtree:!0});function s(e){const a={};return e.integrity&&(a.integrity=e.integrity),e.referrerPolicy&&(a.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?a.credentials="include":e.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function r(e){if(e.ep)return;e.ep=!0;const a=s(e);fetch(e.href,a)}})();const M=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function k(h,t,s){const r=h.createShader(t);if(h.shaderSource(r,s),h.compileShader(r),!h.getShaderParameter(r,h.COMPILE_STATUS)){const e=h.getShaderInfoLog(r)||"compile error";throw new Error(e)}return r}function X(h,t,s){const r=h.createProgram(),e=k(h,h.VERTEX_SHADER,t),a=k(h,h.FRAGMENT_SHADER,s);if(h.attachShader(r,e),h.attachShader(r,a),h.linkProgram(r),!h.getProgramParameter(r,h.LINK_STATUS)){const i=h.getProgramInfoLog(r)||"link error";throw new Error(i)}return r}class ie{constructor(t,s={}){var r,e,a;if(this.opts=s,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.env=0,this.envAttack=.52,this.envRelease=.1,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=64,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.peak=[0,0,0,0],this.agcGain=1,this.agcTarget=.5,this.agcSpeedUp=.12,this.agcSpeedDown=.03,this.impact=0,this.specTex=null,this.waveTex=null,this.specBins=128,this.waveBins=512,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.serverUniforms={},this.serverTextures=[],this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.88,this.sceneA=null,this.sceneB=null,this.texSceneA=null,this.texSceneB=null,this.morphProg=null,this.scenes=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield","wow","server"],this.sceneIdx=0,this.sceneTimer=0,this.sceneMinMs=15e3,this.sceneMaxMs=32e3,this.transitioning=!1,this.transStart=0,this.transDur=1900,this.frames=0,this.lastFPS=performance.now(),this.loop=()=>{var f,m,l;const i=this.gl,o=performance.now();this.frames++,o-this.lastFPS>=1e3&&((m=(f=this.opts).onFps)==null||m.call(f,this.frames),this.frames=0,this.lastFPS=o);let u=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const c=this.freq.length,p=new Float32Array(c);for(let n=0;n<c;n++)p[n]=this.freq[n]/255;let v=0;for(let n=0;n<c;n++)v+=p[n]*p[n];let d=Math.sqrt(v/c);const T=this.agcTarget/Math.max(1e-4,d),P=T>1?this.agcSpeedUp:this.agcSpeedDown;this.agcGain+=(T-this.agcGain)*P,d=Math.min(3,d*this.agcGain),d>this.env?this.env+=(d-this.env)*this.envAttack:this.env+=(d-this.env)*this.envRelease,u=this.env;let S=0;if(this.lastMag)for(let n=0;n<c;n++){const x=p[n]*this.agcGain-this.lastMag[n];x>0&&(S+=x)}this.lastMag=p,this.fluxRing.length<this.fluxSize?this.fluxRing.push(S):(this.fluxRing[this.fluxIdx]=S,this.fluxIdx=(this.fluxIdx+1)%this.fluxSize);const y=this.fluxRing.reduce((n,x)=>n+x,0)/Math.max(1,this.fluxRing.length),N=S>y*1.22&&this.beatCooldown<=0;this.beat=Math.max(0,this.beat-.1),N&&(this.beat=1,this.beatCooldown=6),this.beatCooldown>0&&this.beatCooldown--;const G=((l=this.audioCtx)==null?void 0:l.sampleRate)||48e3,V=G/2,W=V/c,g=n=>Math.max(0,Math.min(c-1,Math.round(n/W))),w=(n,x)=>{let E=0;const B=Math.min(n,x),_=Math.max(n,x),L=Math.max(1,_-B);for(let R=B;R<_;R++)E+=p[R];return E/L*this.agcGain},O=g(25),q=g(120),I=g(160),D=g(260),H=g(4500),Y=g(12e3),$=g(450),z=g(2200),K=g(60),j=g(250),J=g(9e3),Q=g(18e3);this.kick=w(O,q),this.snare=w(I,D),this.hat=w(H,Y),this.bands[0]=w(K,j),this.bands[1]=w(I,D),this.bands[2]=w($,z),this.bands[3]=w(J,Q);for(let n=0;n<4;n++)this.peak[n]=Math.max(this.peak[n]*.9,this.bands[n]);const Z=Math.max(0,S-y*1.05),ee=Math.min(3,Z/(y*.4+1e-4))+this.kick*.8+this.snare*.4;this.impact=this.impact*.75+Math.min(2.5,ee)*.25;const b=new Uint8Array(this.specBins*4);for(let n=0;n<this.specBins;n++){const x=n/c,E=(n+1)/this.specBins*c;let B=0,_=0;for(let R=Math.floor(x);R<Math.floor(E);R++)B+=this.freq[Math.min(R,c-1)],_++;const L=Math.min(255,Math.round(B/Math.max(1,_)));b[n*4]=L,b[n*4+1]=L,b[n*4+2]=L,b[n*4+3]=255}i.bindTexture(i.TEXTURE_2D,this.specTex),i.texSubImage2D(i.TEXTURE_2D,0,0,0,this.specBins,1,i.RGBA,i.UNSIGNED_BYTE,b);const U=new Uint8Array(this.waveBins*4);for(let n=0;n<this.waveBins;n++){const x=Math.floor(n/this.waveBins*this.wave.length),E=this.wave[x];U[n*4]=E,U[n*4+1]=E,U[n*4+2]=E,U[n*4+3]=255}i.bindTexture(i.TEXTURE_2D,this.waveTex),i.texSubImage2D(i.TEXTURE_2D,0,0,0,this.waveBins,1,i.RGBA,i.UNSIGNED_BYTE,U),this.sceneTimer+=16;const te=this.sceneTimer>this.sceneMinMs+Math.random()*(this.sceneMaxMs-this.sceneMinMs),se=y<.012&&u<.09;!this.transitioning&&(te||se&&this.sceneTimer>9e3)&&this.nextScene()}this.transitioning?this.renderMorph(o):this.renderScene(o),this.anim=requestAnimationFrame(this.loop)},this.canvas=t,this.gl=t.getContext("webgl")||t.getContext("webgl2"),!this.gl){(r=this.canvas.getContext("2d"))==null||r.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),(a=(e=this.opts).onStatus)==null||a.call(e,"Ready. M next • 1–9 classic • 0 starfield • 5 WOW • V WOW/Server • N server shader")}safeLink(t,s){try{return X(this.gl,M,s)}catch(r){return console.error(`[Shader:${t}]`,(r==null?void 0:r.message)||r),null}}initGL(){const t=this.gl;this.quad=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),t.STATIC_DRAW);const s=(i,o)=>{const u=t.createTexture();return t.bindTexture(t.TEXTURE_2D,u),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,i,o,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),u},r=i=>{const o=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,o),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,i,0),t.bindFramebuffer(t.FRAMEBUFFER,null),o},e=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));this.texA=s(e,a),this.fbA=r(this.texA),this.texB=s(e,a),this.fbB=r(this.texB),this.texSceneA=s(e,a),this.sceneA=r(this.texSceneA),this.texSceneB=s(e,a),this.sceneB=r(this.texSceneB),this.sceneProg.barsPro=this.safeLink("barsPro",ae),this.sceneProg.centerBars=this.safeLink("centerBars",re),this.sceneProg.circleSpectrum=this.safeLink("circleSpectrum",oe),this.sceneProg.waveformLine=this.safeLink("waveformLine",ne),this.sceneProg.radialRings=this.safeLink("radialRings",ce),this.sceneProg.oscDual=this.safeLink("oscDual",ue),this.sceneProg.sunburst=this.safeLink("sunburst",le),this.sceneProg.lissajous=this.safeLink("lissajous",he),this.sceneProg.tunnel=this.safeLink("tunnel",fe),this.sceneProg.particles=this.safeLink("particles",me),this.sceneProg.starfield=this.safeLink("starfield",ve),this.wowProg=this.safeLink("wow",de),this.morphProg=this.safeLink("morph",pe);for(const i of Object.values({...this.sceneProg,wow:this.wowProg,morph:this.morphProg})){if(!i)continue;t.useProgram(i);const o=t.getAttribLocation(i,"aPos");o!==-1&&(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0))}this.streamTex=t.createTexture(),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT),window.addEventListener("resize",()=>this.resize()),window.addEventListener("keydown",i=>this.onKey(i)),this.resize()}resize(){const t=this.gl,s=Math.max(1,Math.round(window.devicePixelRatio||1)),r=this.canvas.clientWidth||window.innerWidth,e=this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==r*s||this.canvas.height!==e*s)&&(this.canvas.width=r*s,this.canvas.height=e*s),t.viewport(0,0,this.canvas.width,this.canvas.height)}initAudioTextures(){const t=this.gl,s=r=>{const e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,r,1,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e};this.specTex=s(this.specBins),this.waveTex=s(this.waveBins)}initWS(){var s;const t=location.protocol==="https:"?"wss:":"ws:";(s=this.ws)==null||s.close(),this.ws=new WebSocket(`${t}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var r;(r=this.ws)==null||r.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=r=>{typeof r.data!="string"&&this.onStreamFrame(r.data)}}onStreamFrame(t){const s=this.gl,r=new DataView(t,0,24);if(!String.fromCharCode(...new Uint8Array(t.slice(0,8))).startsWith("FRAMEv1"))return;const a=r.getUint32(8,!0),i=r.getUint32(12,!0);if(r.getUint32(16,!0)!==4)return;const u=new Uint8Array(t,24);this.streamW=a,this.streamH=i,s.activeTexture(s.TEXTURE0+this.streamUnit),s.bindTexture(s.TEXTURE_2D,this.streamTex),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,a,i,0,s.RGBA,s.UNSIGNED_BYTE,u),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.REPEAT),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var t;this.anim&&cancelAnimationFrame(this.anim),(t=this.ws)==null||t.close()}async startScreenShare(){var e;const t=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!t.getAudioTracks().length)throw t.getTracks().forEach(a=>a.stop()),new Error("No audio shared");(e=this.audioCtx)==null||e.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=4096,this.audioCtx.createMediaStreamSource(t).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=t;const r=t.getVideoTracks()[0];r&&(r.onended=()=>this.stopScreenShare())}stopScreenShare(){var t,s;(t=this.stream)==null||t.getTracks().forEach(r=>r.stop()),this.stream=null,this.freq=null,this.wave=null,(s=this.audioCtx)==null||s.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(t){t&&this.stopScreenShare()}toggleWow(){this.scenes[this.sceneIdx]==="wow"?this.sceneIdx=this.scenes.indexOf("server"):this.sceneIdx=this.scenes.indexOf("wow"),this.beginTransition(!0)}async loadServerShaderPublic(){var t,s;await this.loadServerShader("composite"),(s=(t=this.opts).onStatus)==null||s.call(t,"Server shader refreshed")}onKey(t){const s=t.key.toLowerCase();s==="v"&&this.toggleWow(),s==="n"&&this.loadServerShaderPublic(),s==="m"&&this.nextScene();const r=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield"];if("0123456789".includes(s)){const e=s==="0"?r.indexOf("starfield"):parseInt(s,10)-1;r[e]&&(this.sceneIdx=this.scenes.indexOf(r[e]),this.beginTransition(!0))}}async loadServerShader(t){const s=new URLSearchParams;t&&s.set("type",t),s.set("ts",Date.now().toString());const r="/api/shader/next?"+s.toString(),e=await fetch(r,{cache:"no-store"});if(!e.ok)throw new Error("HTTP "+e.status);const a=await e.json(),i=this.gl;try{const o=X(i,M,a.code);this.serverProg=o,this.serverUniforms={},this.serverTextures=[],i.useProgram(o);for(const l of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes","uImpact"])this.serverUniforms[l]=i.getUniformLocation(o,l);let u=0;if(a.textures)for(const l of a.textures){const c=i.createTexture();await new Promise((v,d)=>{const T=new Image;T.onload=()=>{i.activeTexture(i.TEXTURE0+u),i.bindTexture(i.TEXTURE_2D,c),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,T),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT),v()},T.onerror=()=>d(new Error("tex")),T.src=l.dataUrl});const p=i.getUniformLocation(o,l.name);p&&i.uniform1i(p,u),this.serverTextures.push({name:l.name,tex:c,unit:u,meta:l}),u++,l.gridCols&&l.gridRows&&(this.serverUniforms.uAtlasGrid&&i.uniform2f(this.serverUniforms.uAtlasGrid,l.gridCols,l.gridRows),this.serverUniforms.uAtlasFrames&&i.uniform1f(this.serverUniforms.uAtlasFrames,l.frames??l.gridCols*l.gridRows),this.serverUniforms.uAtlasFPS&&i.uniform1f(this.serverUniforms.uAtlasFPS,l.fps??24))}const f=i.getUniformLocation(o,"uStreamTex");f&&i.uniform1i(f,this.streamUnit);const m=this.serverUniforms.uStreamRes;m&&i.uniform2f(m,this.streamW,this.streamH)}catch(o){console.error("[ServerShader] compile/link failed:",o)}}renderScene(t){const s=this.gl;s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT);const r=t/1e3,e=this.scenes[this.sceneIdx];e==="wow"?this.drawWOW(r,this.env):e==="server"?this.drawServer(r,this.env):this.drawClassic(e,r,this.env)}beginTransition(t=!1){this.transitioning=!0,this.transStart=performance.now(),t&&(this.sceneTimer=0);const s=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,s,this.scenes[this.sceneIdx])}nextScene(){const t=this.sceneIdx;this.sceneIdx=(this.sceneIdx+1)%this.scenes.length;const s=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,s,this.scenes[t]),this.renderSceneTo(this.texSceneB,this.sceneB,s,this.scenes[this.sceneIdx]),this.beginTransition(!0)}renderSceneTo(t,s,r,e){const a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,s),a.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),a.clearColor(0,0,0,1),a.clear(a.COLOR_BUFFER_BIT);const i=r/1e3;e==="wow"?this.drawWOW(i,this.env,!0):e==="server"?this.drawServer(i,this.env,!0):this.drawClassic(e,i,this.env,!0)}renderMorph(t){const s=this.gl;if(!this.morphProg){this.transitioning=!1;return}const r=Math.min(1,(t-this.transStart)/this.transDur);s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.useProgram(this.morphProg);const e=i=>s.getUniformLocation(this.morphProg,i);s.activeTexture(s.TEXTURE0+0),s.bindTexture(s.TEXTURE_2D,this.texSceneA),s.uniform1i(e("uFrom"),0),s.activeTexture(s.TEXTURE0+1),s.bindTexture(s.TEXTURE_2D,this.texSceneB),s.uniform1i(e("uTo"),1),s.uniform1f(e("uProgress"),r),s.uniform2f(e("uRes"),this.canvas.width,this.canvas.height),s.uniform1f(e("uBeat"),this.beat),s.uniform3f(e("uBands"),this.peak[0],this.peak[2],this.peak[3]),s.uniform1f(e("uImpact"),Math.min(2,this.impact));const a=s.getAttribLocation(this.morphProg,"aPos");s.bindBuffer(s.ARRAY_BUFFER,this.quad),s.enableVertexAttribArray(a),s.vertexAttribPointer(a,2,s.FLOAT,!1,0,0),s.drawArrays(s.TRIANGLES,0,6),r>=1&&(this.transitioning=!1)}drawClassic(t,s,r,e=!1){const a=this.gl,i=this.sceneProg[t];if(!i)return;a.useProgram(i);const o=(f,m,l)=>{const c=a.getUniformLocation(i,f);c&&a[`uniform${l}`](c,...Array.isArray(m)?m:[m])};a.activeTexture(a.TEXTURE0+6),a.bindTexture(a.TEXTURE_2D,this.specTex),o("uSpecTex",6,"1i"),o("uSpecN",this.specBins,"1f"),a.activeTexture(a.TEXTURE0+8),a.bindTexture(a.TEXTURE_2D,this.waveTex),o("uWaveTex",8,"1i"),o("uWaveN",this.waveBins,"1f"),o("uTime",s,"1f"),o("uRes",[this.canvas.width,this.canvas.height],"2f"),o("uLevel",r,"1f"),o("uBeat",this.beat,"1f"),o("uKick",this.peak[0]*1.35,"1f"),o("uSnare",this.snare,"1f"),o("uHat",this.peak[3],"1f"),o("uLow",this.peak[0],"1f"),o("uMid",this.peak[2],"1f"),o("uAir",this.peak[3],"1f"),o("uImpact",Math.min(2,this.impact),"1f");const u=a.getAttribLocation(i,"aPos");a.bindBuffer(a.ARRAY_BUFFER,this.quad),a.enableVertexAttribArray(u),a.vertexAttribPointer(u,2,a.FLOAT,!1,0,0),a.drawArrays(a.TRIANGLES,0,6)}drawWOW(t,s,r=!1){const e=this.gl;if(!this.wowProg)return;r||e.bindFramebuffer(e.FRAMEBUFFER,this.fbA);const a=Math.max(2,Math.floor(this.canvas.width/2)),i=Math.max(2,Math.floor(this.canvas.height/2));e.viewport(0,0,a,i),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.wowProg);const o=f=>e.getUniformLocation(this.wowProg,f);e.uniform1f(o("uTime"),t),e.uniform2f(o("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(o("uDecay"),this.decay),e.uniform1f(o("uEnv"),s),e.uniform1f(o("uBeat"),this.beat),e.uniform1f(o("uKick"),this.peak[0]*1.35),e.uniform1f(o("uSnare"),this.snare),e.uniform1f(o("uHat"),this.peak[3]),e.uniform1f(o("uLow"),this.peak[0]),e.uniform1f(o("uMid"),this.peak[2]),e.uniform1f(o("uAir"),this.peak[3]),e.activeTexture(e.TEXTURE0+7),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(o("uFeedback"),7),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.uniform1i(o("uStreamTex"),this.streamUnit);const u=e.getAttribLocation(this.wowProg,"aPos");if(e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),!r){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height);const f=this.morphProg;if(!f)return;e.useProgram(f);const m=v=>e.getUniformLocation(f,v);e.activeTexture(e.TEXTURE0+0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(m("uFrom"),0),e.activeTexture(e.TEXTURE0+1),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(m("uTo"),1),e.uniform1f(m("uProgress"),0),e.uniform2f(m("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(m("uBeat"),this.beat),e.uniform3f(m("uBands"),this.peak[0],this.peak[2],this.peak[3]),e.uniform1f(m("uImpact"),Math.min(2,this.impact));const l=e.getAttribLocation(f,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6);const c=this.texA;this.texA=this.texB,this.texB=c;const p=this.fbA;this.fbA=this.fbB,this.fbB=p}}drawServer(t,s,r=!1){const e=this.gl,a=this.serverProg;if(!a){this.drawClassic("barsPro",t,s);return}e.useProgram(a);const i=(v,d,T)=>{const P=e.getUniformLocation(a,v);P&&e[`uniform${T}`](P,...Array.isArray(d)?d:[d])};i("uTime",t,"1f"),i("uRes",[this.canvas.width,this.canvas.height],"2f"),i("uLevel",s,"1f");const o=e.getUniformLocation(a,"uBands");o&&e.uniform1fv(o,new Float32Array(this.bands.map(v=>Math.min(1,v*1.6))));const u=e.getUniformLocation(a,"uPulse");u&&e.uniform1f(u,Math.min(1,this.env*1.8));const f=e.getUniformLocation(a,"uBeat");f&&e.uniform1f(f,Math.min(1,this.beat*2));const m=e.getUniformLocation(a,"uImpact");m&&e.uniform1f(m,Math.min(2,this.impact));for(const v of this.serverTextures)e.activeTexture(e.TEXTURE0+v.unit),e.bindTexture(e.TEXTURE_2D,v.tex);e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex);const l=e.getUniformLocation(a,"uStreamTex");l&&e.uniform1i(l,this.streamUnit);const c=this.serverTextures.find(v=>v.meta&&v.meta.gridCols&&v.meta.gridRows);if(c!=null&&c.meta){const v=c.meta.frames??c.meta.gridCols*c.meta.gridRows,d=c.meta.fps??24,T=Math.floor(t*d)%Math.max(1,v);this.serverUniforms.uAtlasGrid&&e.uniform2f(this.serverUniforms.uAtlasGrid,c.meta.gridCols,c.meta.gridRows),this.serverUniforms.uAtlasFrames&&e.uniform1f(this.serverUniforms.uAtlasFrames,v),this.serverUniforms.uAtlasFPS&&e.uniform1f(this.serverUniforms.uAtlasFPS,d),this.serverUniforms.uFrame&&e.uniform1f(this.serverUniforms.uFrame,T)}const p=e.getAttribLocation(a,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(p),e.vertexAttribPointer(p,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}}const C=`
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
`,A=`
uniform sampler2D uSpecTex; uniform float uSpecN;
float specSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uSpecN);
  float u = (i + 0.5) / uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
`,F=`
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`,ae=`
precision mediump float; varying vec2 vUV;
${A}
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
`,re=`
precision mediump float; varying vec2 vUV;
${A}
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
`,oe=`
precision mediump float; varying vec2 vUV;
${A}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p=vUV*2.0-1.0; float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/(6.28318);
  float s = specSample(fract(idx));
  float ring = smoothstep(0.02, 0.0, abs(r - (0.25+0.35*s+0.25*uLow)) - 0.01 - 0.02*uImpact);
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.8), s);
  col *= ring*(0.6+1.8*uMid+0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,ne=`
precision mediump float; varying vec2 vUV;
${F}
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
`,ce=`
precision mediump float; varying vec2 vUV;
${A}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
${C}
void main(){
  vec2 p = vUV*2.0-1.0; float r=length(p)+1e-4; float a=atan(p.y,p.x);
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
`,ue=`
precision mediump float; varying vec2 vUV;
${F}
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
`,le=`
precision mediump float; varying vec2 vUV;
${A}
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
`,he=`
precision mediump float; varying vec2 vUV;
${F}
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
`,fe=`
precision mediump float; varying vec2 vUV;
${A}
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
`,me=`
precision mediump float; varying vec2 vUV;
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
${C}
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
`,ve=`
precision mediump float; varying vec2 vUV;
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
void main(){
  vec2 uv=vUV*2.0-1.0; float d=length(uv);
  float speed = 0.8 + 3.5*uLow + 1.4*uImpact;
  vec3 col=vec3(0.0);
  for(int i=0;i<24;i++){
    float f=float(i);
    vec2 p = fract(uv*0.5 + vec2(hash(vec2(f,1.7)),hash(vec2(2.3,f))) + uTime*speed*0.02);
    float star = pow(1.0 - length(p-0.5)*2.0, 6.0);
    col += vec3(star)*(0.3+0.9*uAir);
  }
  col *= 1.0 - d*0.2;
  col += uBeat*vec3(0.5,0.4,1.0)*0.25;
  gl_FragColor=vec4(col,1.0);
}
`,de=`
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
`,pe=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3  uBands; // low, mid, air (peak-held)
uniform vec2  uRes;

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

vec2 norm(vec2 v){ float m=max(1e-5, length(v)); return v/m; }

void main(){
  vec2 uv=vUV; vec2 px=1.0/uRes;
  float p = smoothstep(0.0,1.0,uProgress);

  // Edge/gradient fields
  vec2 gA = sobel(uFrom, uv, px);
  vec2 gB = sobel(uTo,   uv, px);

  // Build a blended vector field (features of A → features of B)
  vec2 dirA = norm(gA);
  vec2 dirB = norm(gB);
  float magA = min(1.0, length(gA));
  float magB = min(1.0, length(gB));
  float featA = smoothstep(0.15, 0.6, magA);
  float featB = smoothstep(0.15, 0.6, magB);

  // Audio influence: bass drives displacement, air sharpens paths
  float audioAmp = 0.25 + 1.8*uBands.x + 0.8*uImpact + 0.45*uBeat;

  // Integrate short streamlines (unrolled fixed steps for WebGL1)
  vec2 ua = uv, ub = uv;
  float stepLen = (0.8 + 1.4*uBands.z) * (0.0035 + 0.0045*audioAmp);
  for(int i=0;i<6;i++){
    ua += dirA * stepLen * (1.0-p) * featA;
    ub -= dirB * stepLen * (p)     * featB;
  }

  vec3 colA = texture2D(uFrom, ua).rgb;
  vec3 colB = texture2D(uTo,   ub).rgb;

  // Content-aware mix: carry features from A early and hand off to B near edges of B
  float carryA = featA * (1.0 - p);
  float carryB = featB * p;
  float w = smoothstep(0.0,1.0, p + 0.25*(carryB - carryA)) + 0.15*uBeat;
  w = min(max(w, 0.0), 1.0);

  // Small chroma glow on beats to mask discontinuities
  vec3 glow = vec3(0.08,0.04,0.12) * (uBeat*0.6 + uImpact*0.25);
  vec3 col = mix(colA, colB, w) + glow;

  gl_FragColor = vec4(col,1.0);
}
`;document.addEventListener("DOMContentLoaded",async()=>{const h=document.querySelector("#app");if(!h)return;h.innerHTML=`
    <div class="qs-shell">
      <aside class="qs-panel glass">
        <h1 class="qs-title">QuantumSynth</h1>
        <p class="qs-sub">Neural Edition</p>
        <div class="qs-divider"></div>

        <div class="qs-kv">
          <div id="status" class="qs-status">Ready</div>
          <div id="fps" class="qs-fps">FPS: 0</div>
        </div>

        <div class="qs-actions">
          <button id="btnShare" class="btn btn-primary">Start Screen Sharing</button>
          <button id="btnDemo" class="btn btn-ghost">Demo Mode</button>
        </div>

        <h2 class="qs-h2">Setup</h2>
        <ol class="qs-list">
          <li>Use Chrome or Edge for best results</li>
          <li>When prompted, tick <b>“Share audio”</b></li>
          <li>Select the tab/window you want visualised</li>
          <li>Press <b>N</b> to load next server shader</li>
        </ol>

        <div class="qs-footer">
          built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">https://github.com/simon-hirst</a>
        </div>
      </aside>

      <main class="qs-stage">
        <canvas id="visualizer" class="qs-canvas"></canvas>
      </main>
    </div>
  `;const t=document.getElementById("visualizer"),s=document.getElementById("status"),r=document.getElementById("fps"),e=document.getElementById("btnShare"),a=document.getElementById("btnDemo");if(!t)return;const i=new ie(t,{onStatus:f=>{s.textContent=f},onFps:f=>{r.textContent=`FPS: ${f}`}});await i.start();const o=()=>{e.textContent=i.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),e.addEventListener("click",async()=>{if(i.isSharing()){i.stopScreenShare(),s.textContent="Screen share stopped",o();return}e.disabled=!0,s.textContent='Requesting screen share (enable "Share audio")…';try{await i.startScreenShare(),s.textContent="Screen sharing active"}catch{s.textContent="Permission denied or no audio shared"}finally{e.disabled=!1,o()}});let u=!1;a.addEventListener("click",()=>{u=!u,i.setDemoMode(u),a.textContent=u?"Stop Demo":"Demo Mode",s.textContent=u?"Demo mode active":"Ready"}),document.addEventListener("keydown",f=>{var m;f.key.toLowerCase()==="n"&&((m=i.loadServerShader)==null||m.call(i))})});
