(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))s(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerPolicy&&(r.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?r.credentials="include":e.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(e){if(e.ep)return;e.ep=!0;const r=i(e);fetch(e.href,r)}})();const F=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function M(h,t,i){const s=h.createShader(t);if(h.shaderSource(s,i),h.compileShader(s),!h.getShaderParameter(s,h.COMPILE_STATUS)){const e=h.getShaderInfoLog(s)||"compile error";throw new Error(e)}return s}function P(h,t,i){const s=h.createProgram(),e=M(h,h.VERTEX_SHADER,t),r=M(h,h.FRAGMENT_SHADER,i);if(h.attachShader(s,e),h.attachShader(s,r),h.linkProgram(s),!h.getProgramParameter(s,h.LINK_STATUS)){const a=h.getProgramInfoLog(s)||"link error";throw new Error(a)}return s}class te{constructor(t,i={}){var s,e,r;if(this.opts=i,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.env=0,this.envAttack=.52,this.envRelease=.1,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=64,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.peak=[0,0,0,0],this.agcGain=1,this.agcTarget=.5,this.agcSpeedUp=.12,this.agcSpeedDown=.03,this.impact=0,this.specTex=null,this.waveTex=null,this.specBins=128,this.waveBins=512,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.serverUniforms={},this.serverTextures=[],this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.88,this.sceneA=null,this.sceneB=null,this.texSceneA=null,this.texSceneB=null,this.transProg=null,this.scenes=["barsPro","radialRings","oscDual","sunburst","lissajous","tunnel","particles","wow","server"],this.sceneIdx=0,this.sceneTimer=0,this.sceneMinMs=15e3,this.sceneMaxMs=32e3,this.transitioning=!1,this.transStart=0,this.transDur=1900,this.transType=0,this.frames=0,this.lastFPS=performance.now(),this.loop=()=>{var f,v,u;const a=this.gl,o=performance.now();this.frames++,o-this.lastFPS>=1e3&&((v=(f=this.opts).onFps)==null||v.call(f,this.frames),this.frames=0,this.lastFPS=o);let c=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const l=this.freq.length,T=new Float32Array(l);for(let n=0;n<l;n++)T[n]=this.freq[n]/255;let m=0;for(let n=0;n<l;n++)m+=T[n]*T[n];let d=Math.sqrt(m/l);const x=this.agcTarget/Math.max(1e-4,d),_=x>1?this.agcSpeedUp:this.agcSpeedDown;this.agcGain+=(x-this.agcGain)*_,d=Math.min(3,d*this.agcGain),d>this.env?this.env+=(d-this.env)*this.envAttack:this.env+=(d-this.env)*this.envRelease,c=this.env;let w=0;if(this.lastMag)for(let n=0;n<l;n++){const g=T[n]*this.agcGain-this.lastMag[n];g>0&&(w+=g)}this.lastMag=T,this.fluxRing.length<this.fluxSize?this.fluxRing.push(w):(this.fluxRing[this.fluxIdx]=w,this.fluxIdx=(this.fluxIdx+1)%this.fluxSize);const D=this.fluxRing.reduce((n,g)=>n+g,0)/Math.max(1,this.fluxRing.length),X=w>D*1.22&&this.beatCooldown<=0;this.beat=Math.max(0,this.beat-.1),X&&(this.beat=1,this.beatCooldown=6),this.beatCooldown>0&&this.beatCooldown--;const C=((u=this.audioCtx)==null?void 0:u.sampleRate)||48e3,N=C/2,W=N/l,p=n=>Math.max(0,Math.min(l-1,Math.round(n/W))),R=(n,g)=>{let E=0;const U=Math.min(n,g),B=Math.max(n,g),y=Math.max(1,B-U);for(let b=U;b<B;b++)E+=T[b];return E/y*this.agcGain},G=p(25),q=p(120),L=p(160),I=p(260),O=p(4500),V=p(12e3),H=p(450),z=p(2200),Y=p(60),K=p(250),$=p(9e3),j=p(18e3);this.kick=R(G,q),this.snare=R(L,I),this.hat=R(O,V),this.bands[0]=R(Y,K),this.bands[1]=R(L,I),this.bands[2]=R(H,z),this.bands[3]=R($,j);for(let n=0;n<4;n++)this.peak[n]=Math.max(this.peak[n]*.9,this.bands[n]);const J=Math.max(0,w-D*1.05),Q=Math.min(3,J/(D*.4+1e-4))+this.kick*.8+this.snare*.4;this.impact=this.impact*.75+Math.min(2.5,Q)*.25;const A=new Uint8Array(this.specBins*4);for(let n=0;n<this.specBins;n++){const g=n/l,E=(n+1)/this.specBins*l;let U=0,B=0;for(let b=Math.floor(g);b<Math.floor(E);b++)U+=this.freq[Math.min(b,l-1)],B++;const y=Math.min(255,Math.round(U/Math.max(1,B)));A[n*4]=y,A[n*4+1]=y,A[n*4+2]=y,A[n*4+3]=255}a.bindTexture(a.TEXTURE_2D,this.specTex),a.texSubImage2D(a.TEXTURE_2D,0,0,0,this.specBins,1,a.RGBA,a.UNSIGNED_BYTE,A);const S=new Uint8Array(this.waveBins*4);for(let n=0;n<this.waveBins;n++){const g=Math.floor(n/this.waveBins*this.wave.length),E=this.wave[g];S[n*4]=E,S[n*4+1]=E,S[n*4+2]=E,S[n*4+3]=255}a.bindTexture(a.TEXTURE_2D,this.waveTex),a.texSubImage2D(a.TEXTURE_2D,0,0,0,this.waveBins,1,a.RGBA,a.UNSIGNED_BYTE,S),this.sceneTimer+=16;const Z=this.sceneTimer>this.sceneMinMs+Math.random()*(this.sceneMaxMs-this.sceneMinMs),ee=D<.012&&c<.09;!this.transitioning&&(Z||ee&&this.sceneTimer>9e3)&&this.nextScene()}this.transitioning?this.renderTransition(o,c):this.renderScene(o,c),this.anim=requestAnimationFrame(this.loop)},this.canvas=t,this.gl=t.getContext("webgl")||t.getContext("webgl2"),!this.gl){(s=this.canvas.getContext("2d"))==null||s.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),(r=(e=this.opts).onStatus)==null||r.call(e,"Ready. M: next • 1–7 classic • 5 WOW • V WOW/Server • N server shader")}safeLink(t,i){try{return P(this.gl,F,i)}catch(s){console.error(`[Shader:${t}]`,(s==null?void 0:s.message)||s,i);const e=`
        precision mediump float; varying vec2 vUV;
        void main(){ gl_FragColor = vec4(vUV, 0.0, 1.0); }
      `;try{return P(this.gl,F,e)}catch{return null}}}initGL(){const t=this.gl;this.quad=t.createBuffer(),t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),t.STATIC_DRAW);const i=(a,o)=>{const c=t.createTexture();return t.bindTexture(t.TEXTURE_2D,c),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,a,o,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),c},s=a=>{const o=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,o),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,a,0),t.bindFramebuffer(t.FRAMEBUFFER,null),o},e=Math.max(2,Math.floor(this.canvas.width/2)),r=Math.max(2,Math.floor(this.canvas.height/2));this.texA=i(e,r),this.fbA=s(this.texA),this.texB=i(e,r),this.fbB=s(this.texB),this.texSceneA=i(e,r),this.sceneA=s(this.texSceneA),this.texSceneB=i(e,r),this.sceneB=s(this.texSceneB),this.sceneProg.barsPro=this.safeLink("barsPro",se),this.sceneProg.radialRings=this.safeLink("radialRings",ie),this.sceneProg.oscDual=this.safeLink("oscDual",ae),this.sceneProg.sunburst=this.safeLink("sunburst",re),this.sceneProg.lissajous=this.safeLink("lissajous",oe),this.sceneProg.tunnel=this.safeLink("tunnel",ne),this.sceneProg.particles=this.safeLink("particles",ue),this.wowProg=this.safeLink("wow",ce),this.transProg=this.safeLink("transition",le);for(const a of Object.values({...this.sceneProg,wow:this.wowProg,trans:this.transProg})){if(!a)continue;t.useProgram(a);const o=t.getAttribLocation(a,"aPos");o!==-1&&(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0))}this.streamTex=t.createTexture(),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT),window.addEventListener("resize",()=>this.resize()),window.addEventListener("keydown",a=>this.onKey(a)),this.resize()}resize(){const t=this.gl,i=Math.max(1,Math.round(window.devicePixelRatio||1)),s=this.canvas.clientWidth||window.innerWidth,e=this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==s*i||this.canvas.height!==e*i)&&(this.canvas.width=s*i,this.canvas.height=e*i),t.viewport(0,0,this.canvas.width,this.canvas.height)}initAudioTextures(){const t=this.gl,i=s=>{const e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,s,1,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e};this.specTex=i(this.specBins),this.waveTex=i(this.waveBins)}initWS(){var i;const t=location.protocol==="https:"?"wss:":"ws:";(i=this.ws)==null||i.close(),this.ws=new WebSocket(`${t}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var s;(s=this.ws)==null||s.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=s=>{typeof s.data!="string"&&this.onStreamFrame(s.data)}}onStreamFrame(t){const i=this.gl,s=new DataView(t,0,24);if(!String.fromCharCode(...new Uint8Array(t.slice(0,8))).startsWith("FRAMEv1"))return;const r=s.getUint32(8,!0),a=s.getUint32(12,!0);if(s.getUint32(16,!0)!==4)return;const c=new Uint8Array(t,24);this.streamW=r,this.streamH=a,i.activeTexture(i.TEXTURE0+this.streamUnit),i.bindTexture(i.TEXTURE_2D,this.streamTex),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,r,a,0,i.RGBA,i.UNSIGNED_BYTE,c),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var t;this.anim&&cancelAnimationFrame(this.anim),(t=this.ws)==null||t.close()}async startScreenShare(){var e;const t=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!t.getAudioTracks().length)throw t.getTracks().forEach(r=>r.stop()),new Error("No audio shared");(e=this.audioCtx)==null||e.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=4096,this.audioCtx.createMediaStreamSource(t).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=t;const s=t.getVideoTracks()[0];s&&(s.onended=()=>this.stopScreenShare())}stopScreenShare(){var t,i;(t=this.stream)==null||t.getTracks().forEach(s=>s.stop()),this.stream=null,this.freq=null,this.wave=null,(i=this.audioCtx)==null||i.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(t){t&&this.stopScreenShare()}toggleWow(){this.scenes[this.sceneIdx]==="wow"?this.sceneIdx=this.scenes.indexOf("server"):this.sceneIdx=this.scenes.indexOf("wow"),this.beginTransition()}async loadServerShaderPublic(){var t,i;await this.loadServerShader("composite"),(i=(t=this.opts).onStatus)==null||i.call(t,"Server shader refreshed")}onKey(t){const i=t.key.toLowerCase();i==="v"&&this.toggleWow(),i==="n"&&this.loadServerShaderPublic(),i==="m"&&this.nextScene();const s=["barsPro","radialRings","oscDual","sunburst","lissajous","tunnel","particles"];if("1234567".includes(i)){const e=parseInt(i,10)-1;s[e]&&(this.sceneIdx=this.scenes.indexOf(s[e]),this.beginTransition())}}async loadServerShader(t){const i=new URLSearchParams;t&&i.set("type",t),i.set("ts",Date.now().toString());const s="/api/shader/next?"+i.toString(),e=await fetch(s,{cache:"no-store"});if(!e.ok)throw new Error("HTTP "+e.status);const r=await e.json(),a=this.gl;try{const o=P(a,F,r.code);this.serverProg=o,this.serverUniforms={},this.serverTextures=[],a.useProgram(o);for(const u of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes","uImpact"])this.serverUniforms[u]=a.getUniformLocation(o,u);let c=0;if(r.textures)for(const u of r.textures){const l=a.createTexture();await new Promise((m,d)=>{const x=new Image;x.onload=()=>{a.activeTexture(a.TEXTURE0+c),a.bindTexture(a.TEXTURE_2D,l),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,x),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.REPEAT),m()},x.onerror=()=>d(new Error("tex")),x.src=u.dataUrl});const T=a.getUniformLocation(o,u.name);T&&a.uniform1i(T,c),this.serverTextures.push({name:u.name,tex:l,unit:c,meta:u}),c++,u.gridCols&&u.gridRows&&(this.serverUniforms.uAtlasGrid&&a.uniform2f(this.serverUniforms.uAtlasGrid,u.gridCols,u.gridRows),this.serverUniforms.uAtlasFrames&&a.uniform1f(this.serverUniforms.uAtlasFrames,u.frames??u.gridCols*u.gridRows),this.serverUniforms.uAtlasFPS&&a.uniform1f(this.serverUniforms.uAtlasFPS,u.fps??24))}const f=a.getUniformLocation(o,"uStreamTex");f&&a.uniform1i(f,this.streamUnit);const v=this.serverUniforms.uStreamRes;v&&a.uniform2f(v,this.streamW,this.streamH)}catch(o){console.error("[ServerShader] compile/link failed:",o)}}renderScene(t,i){const s=this.gl;s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT);const e=this.scenes[this.sceneIdx];e==="wow"?this.drawWOW(t/1e3,i):e==="server"?this.drawServer(t/1e3,i):this.drawClassic(e,t/1e3,i)}beginTransition(){this.transitioning=!0,this.transStart=performance.now(),this.transType=(this.transType+1)%6,this.sceneTimer=0;const t=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,t,this.scenes[this.sceneIdx])}nextScene(){const t=this.sceneIdx;this.sceneIdx=(this.sceneIdx+1)%this.scenes.length;const i=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,i,this.scenes[t]),this.renderSceneTo(this.texSceneB,this.sceneB,i,this.scenes[this.sceneIdx]),this.transitioning=!0,this.transStart=i,this.transType=(this.transType+1)%6,this.sceneTimer=0}renderSceneTo(t,i,s,e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,i),r.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT),e==="wow"?this.drawWOW(s/1e3,this.env,!0):e==="server"?this.drawServer(s/1e3,this.env,!0):this.drawClassic(e,s/1e3,this.env,!0)}renderTransition(t,i){const s=this.gl,e=Math.min(1,(t-this.transStart)/this.transDur);if(s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),!this.transProg)return;s.useProgram(this.transProg);const r=o=>s.getUniformLocation(this.transProg,o);s.activeTexture(s.TEXTURE0+0),s.bindTexture(s.TEXTURE_2D,this.texSceneA),s.uniform1i(r("uFrom"),0),s.activeTexture(s.TEXTURE0+1),s.bindTexture(s.TEXTURE_2D,this.texSceneB),s.uniform1i(r("uTo"),1),s.uniform1f(r("uProgress"),e),s.uniform1f(r("uType"),this.transType),s.uniform2f(r("uRes"),this.canvas.width,this.canvas.height),s.uniform1f(r("uBeat"),this.beat),s.uniform3f(r("uBands"),this.peak[0],this.peak[2],this.peak[3]),s.uniform1f(r("uImpact"),Math.min(2,this.impact));const a=s.getAttribLocation(this.transProg,"aPos");s.bindBuffer(s.ARRAY_BUFFER,this.quad),s.enableVertexAttribArray(a),s.vertexAttribPointer(a,2,s.FLOAT,!1,0,0),s.drawArrays(s.TRIANGLES,0,6),e>=1&&(this.transitioning=!1)}drawClassic(t,i,s,e=!1){const r=this.gl,a=this.sceneProg[t];if(!a)return;r.useProgram(a);const o=(f,v,u)=>{const l=r.getUniformLocation(a,f);l&&r[`uniform${u}`](l,...Array.isArray(v)?v:[v])};r.activeTexture(r.TEXTURE0+6),r.bindTexture(r.TEXTURE_2D,this.specTex),o("uSpecTex",6,"1i"),o("uSpecN",this.specBins,"1f"),r.activeTexture(r.TEXTURE0+8),r.bindTexture(r.TEXTURE_2D,this.waveTex),o("uWaveTex",8,"1i"),o("uWaveN",this.waveBins,"1f"),r.activeTexture(r.TEXTURE0+this.streamUnit),r.bindTexture(r.TEXTURE_2D,this.streamTex),o("uStreamTex",this.streamUnit,"1i"),o("uTime",i,"1f"),o("uRes",[this.canvas.width,this.canvas.height],"2f"),o("uLevel",s,"1f"),o("uBeat",this.beat,"1f"),o("uKick",this.peak[0]*1.35,"1f"),o("uSnare",this.snare,"1f"),o("uHat",this.peak[3],"1f"),o("uLow",this.peak[0],"1f"),o("uMid",this.peak[2],"1f"),o("uAir",this.peak[3],"1f"),o("uImpact",Math.min(2,this.impact),"1f");const c=r.getAttribLocation(a,"aPos");r.bindBuffer(r.ARRAY_BUFFER,this.quad),r.enableVertexAttribArray(c),r.vertexAttribPointer(c,2,r.FLOAT,!1,0,0),r.drawArrays(r.TRIANGLES,0,6)}drawWOW(t,i,s=!1){const e=this.gl;if(!this.wowProg)return;s||e.bindFramebuffer(e.FRAMEBUFFER,this.fbA);const r=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));e.viewport(0,0,r,a),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.wowProg);const o=f=>e.getUniformLocation(this.wowProg,f);e.uniform1f(o("uTime"),t),e.uniform2f(o("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(o("uDecay"),this.decay),e.uniform1f(o("uEnv"),i),e.uniform1f(o("uBeat"),this.beat),e.uniform1f(o("uKick"),this.peak[0]*1.35),e.uniform1f(o("uSnare"),this.snare),e.uniform1f(o("uHat"),this.peak[3]),e.uniform1f(o("uLow"),this.peak[0]),e.uniform1f(o("uMid"),this.peak[2]),e.uniform1f(o("uAir"),this.peak[3]),e.activeTexture(e.TEXTURE0+7),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(o("uFeedback"),7),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.uniform1i(o("uStreamTex"),this.streamUnit);const c=e.getAttribLocation(this.wowProg,"aPos");if(e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(c),e.vertexAttribPointer(c,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),!s){if(e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.transProg){e.useProgram(this.transProg);const u=T=>e.getUniformLocation(this.transProg,T);e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(u("uFrom"),0),e.activeTexture(e.TEXTURE1),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(u("uTo"),1),e.uniform1f(u("uProgress"),0),e.uniform1f(u("uType"),0),e.uniform2f(u("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(u("uBeat"),this.beat),e.uniform3f(u("uBands"),this.peak[0],this.peak[2],this.peak[3]),e.uniform1f(u("uImpact"),Math.min(2,this.impact));const l=e.getAttribLocation(this.transProg,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(l),e.vertexAttribPointer(l,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}const f=this.texA;this.texA=this.texB,this.texB=f;const v=this.fbA;this.fbA=this.fbB,this.fbB=v}}drawServer(t,i,s=!1){const e=this.gl,r=this.serverProg;if(!r){this.drawClassic("barsPro",t,i);return}e.useProgram(r);const a=(m,d,x)=>{const _=e.getUniformLocation(r,m);_&&e[`uniform${x}`](_,...Array.isArray(d)?d:[d])};a("uTime",t,"1f"),a("uRes",[this.canvas.width,this.canvas.height],"2f"),a("uLevel",i,"1f");const o=e.getUniformLocation(r,"uBands");o&&e.uniform1fv(o,new Float32Array(this.bands.map(m=>Math.min(1,m*1.6))));const c=e.getUniformLocation(r,"uPulse");c&&e.uniform1f(c,Math.min(1,this.env*1.8));const f=e.getUniformLocation(r,"uBeat");f&&e.uniform1f(f,Math.min(1,this.beat*2));const v=e.getUniformLocation(r,"uImpact");v&&e.uniform1f(v,Math.min(2,this.impact));for(const m of this.serverTextures)e.activeTexture(e.TEXTURE0+m.unit),e.bindTexture(e.TEXTURE_2D,m.tex);e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex);const u=e.getUniformLocation(r,"uStreamTex");u&&e.uniform1i(u,this.streamUnit);const l=this.serverTextures.find(m=>m.meta&&m.meta.gridCols&&m.meta.gridRows);if(l!=null&&l.meta){const m=l.meta.frames??l.meta.gridCols*l.meta.gridRows,d=l.meta.fps??24,x=Math.floor(t*d)%Math.max(1,m);this.serverUniforms.uAtlasGrid&&e.uniform2f(this.serverUniforms.uAtlasGrid,l.meta.gridCols,l.meta.gridRows),this.serverUniforms.uAtlasFrames&&e.uniform1f(this.serverUniforms.uAtlasFrames,m),this.serverUniforms.uAtlasFPS&&e.uniform1f(this.serverUniforms.uAtlasFPS,d),this.serverUniforms.uFrame&&e.uniform1f(this.serverUniforms.uFrame,x)}const T=e.getAttribLocation(r,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(T),e.vertexAttribPointer(T,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}}const k=`
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
`,se=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
float spec(float x){ float i=floor(clamp(x,0.999)*uSpecN); float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = spec(x);
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
`,ie=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
${k}
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 p = vUV*2.0-1.0; float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/6.28318 * uSpecN;
  float s = spec(floor(idx));
  float k = 10.0 + 36.0*uAir + 10.0*uImpact;
  float phase = uTime*0.7 + uLow*2.4 + 0.4*uImpact;
  float rings = smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.24) * (0.4+1.8*s+0.7*uImpact);
  float bloom = exp(-r*12.0) * (0.6+1.6*uLow+0.6*uImpact);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02);
  col += uBeat*0.13;
  gl_FragColor = vec4(col,1.0);
}
`,ae=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uWaveTex; uniform float uWaveN;
uniform float uTime,uBeat,uMid,uImpact;
float wave(float x){ float i=floor(clamp(x,0.999)*uWaveN); float u=(i+0.5)/uWaveN; return texture2D(uWaveTex, vec2(u,0.5)).r; }
void main(){
  float y = 1.0 - wave(vUV.x);
  float x = wave(vUV.y);
  float thickness = 0.011 + 0.012*uImpact;
  float lineY = smoothstep(thickness, 0.0, abs(vUV.y - y)-0.001);
  float lineX = smoothstep(thickness, 0.0, abs(vUV.x - x)-0.001);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, abs(vUV.y - y)) + smoothstep(0.06+0.04*uImpact, 0.0, abs(vUV.x - x));
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * (lineY + lineX) + glow*0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col, 1.0);
}
`,re=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uHat,uMid,uImpact;
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 p=vUV*2.0-1.0; float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 10.0 + floor(uHat*14.0) + 4.0*uImpact;
  float rays = abs(sin(a*seg + uTime*2.0))*pow(1.0-r,0.4);
  float idx = fract((a+3.14159)/6.28318)*uSpecN;
  float s = spec(floor(idx));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), s);
  col *= 0.35 + 2.5 * rays * (0.3 + 1.6*s + 0.7*uMid + 0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,oe=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uWaveTex; uniform float uWaveN;
uniform float uTime,uBeat,uAir,uImpact;
float wave(float x){ float i=floor(clamp(x,0.999)*uWaveN); float u=(i+0.5)/uWaveN; return texture2D(uWaveTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV*2.0-1.0;
  float a=wave(fract((uv.x+1.0)*0.5));
  float b=wave(fract((uv.y+1.0)*0.5));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`,ne=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uKick,uSnare,uHat,uLow,uMid,uAir,uBeat,uImpact;
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV*2.0-1.0; float r=length(uv); float a=atan(uv.y,uv.x);
  float s = spec(fract((a+3.14159)/6.28318)*uSpecN);
  float z = 1.2/(r+0.12 + 0.25*exp(-r*6.0)*(0.6+1.8*uKick+0.8*uImpact));
  float stripes = sin( (z*8.0 + uTime*2.2) + a*4.0 + (uHat+0.5*uImpact)*10.0 )*0.5+0.5;
  vec3 col = mix(vec3(0.1,0.5,1.2), vec3(1.0,0.4,0.8), stripes);
  col *= (0.3 + 1.0*z) * (0.6 + 1.5*s + 0.8*uAir + 0.5*uImpact);
  col += uBeat*vec3(0.7,0.5,1.0)*0.28;
  gl_FragColor = vec4(col,1.0);
}
`,ue=`
precision mediump float; varying vec2 vUV;
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
${k}
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
`,ce=`
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
`,le=`
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
  `;const t=document.getElementById("visualizer"),i=document.getElementById("status"),s=document.getElementById("fps"),e=document.getElementById("btnShare"),r=document.getElementById("btnDemo");if(!t)return;const a=new te(t,{onStatus:f=>{i.textContent=f},onFps:f=>{s.textContent=`FPS: ${f}`}});await a.start();const o=()=>{e.textContent=a.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),e.addEventListener("click",async()=>{if(a.isSharing()){a.stopScreenShare(),i.textContent="Screen share stopped",o();return}e.disabled=!0,i.textContent='Requesting screen share (enable "Share audio")…';try{await a.startScreenShare(),i.textContent="Screen sharing active"}catch{i.textContent="Permission denied or no audio shared"}finally{e.disabled=!1,o()}});let c=!1;r.addEventListener("click",()=>{c=!c,a.setDemoMode(c),r.textContent=c?"Stop Demo":"Demo Mode",i.textContent=c?"Demo mode active":"Ready"}),document.addEventListener("keydown",f=>{var v;f.key.toLowerCase()==="n"&&((v=a.loadServerShader)==null||v.call(a))})});
