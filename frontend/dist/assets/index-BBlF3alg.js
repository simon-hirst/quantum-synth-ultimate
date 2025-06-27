(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))s(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&s(a)}).observe(document,{childList:!0,subtree:!0});function i(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function s(t){if(t.ep)return;t.ep=!0;const r=i(t);fetch(t.href,r)}})();const p=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function I(f,e,i){const s=f.createShader(e);if(f.shaderSource(s,i),f.compileShader(s),!f.getShaderParameter(s,f.COMPILE_STATUS))throw new Error(f.getShaderInfoLog(s)||"compile");return s}function E(f,e,i){const s=f.createProgram();if(f.attachShader(s,I(f,f.VERTEX_SHADER,e)),f.attachShader(s,I(f,f.FRAGMENT_SHADER,i)),f.linkProgram(s),!f.getProgramParameter(s,f.LINK_STATUS))throw new Error(f.getProgramInfoLog(s)||"link");return s}class Z{constructor(e,i={}){var s,t,r;if(this.opts=i,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.env=0,this.envAttack=.36,this.envRelease=.08,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=48,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.bandPeak=[0,0,0,0],this.agcGain=1,this.agcTarget=.45,this.agcSpeedUp=.08,this.agcSpeedDown=.02,this.specTex=null,this.waveTex=null,this.specBins=96,this.waveBins=512,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.serverUniforms={},this.serverTextures=[],this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.86,this.sceneA=null,this.sceneB=null,this.texSceneA=null,this.texSceneB=null,this.transProg=null,this.scenes=["barsPro","radialRings","oscDual","sunburst","lissajous","tunnel","particles","wow","server"],this.sceneIdx=0,this.sceneTimer=0,this.sceneMinMs=18e3,this.sceneMaxMs=36e3,this.transitioning=!1,this.transStart=0,this.transDur=2e3,this.transType=0,this.frames=0,this.lastFPS=performance.now(),this.loop=()=>{var h,u,v;const a=this.gl,o=performance.now();this.frames++,o-this.lastFPS>=1e3&&((u=(h=this.opts).onFps)==null||u.call(h,this.frames),this.frames=0,this.lastFPS=o);let c=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const m=this.freq.length,l=new Float32Array(m);for(let n=0;n<m;n++)l[n]=this.freq[n]/255;let x=0;for(let n=0;n<m;n++)x+=l[n]*l[n];let d=Math.sqrt(x/m);const A=this.agcTarget/Math.max(1e-4,d),X=A>1?this.agcSpeedUp:this.agcSpeedDown;this.agcGain+=(A-this.agcGain)*X,d=Math.min(2.5,d*this.agcGain),d>this.env?this.env+=(d-this.env)*this.envAttack:this.env+=(d-this.env)*this.envRelease,c=this.env;let _=0;if(this.lastMag)for(let n=0;n<m;n++){const g=l[n]*this.agcGain-this.lastMag[n];g>0&&(_+=g)}this.lastMag=l,this.fluxRing.length<this.fluxSize?this.fluxRing.push(_):(this.fluxRing[this.fluxIdx]=_,this.fluxIdx=(this.fluxIdx+1)%this.fluxSize);const D=this.fluxRing.reduce((n,g)=>n+g,0)/Math.max(1,this.fluxRing.length),C=_>D*1.25&&this.beatCooldown<=0;this.beat=Math.max(0,this.beat-.1),C&&(this.beat=1,this.beatCooldown=7),this.beatCooldown>0&&this.beatCooldown--;const N=((v=this.audioCtx)==null?void 0:v.sampleRate)||48e3,k=N/2,G=k/m,T=n=>Math.max(0,Math.min(m-1,Math.round(n/G))),b=(n,g)=>{let R=0;const P=Math.min(n,g),y=Math.max(n,g),B=Math.max(1,y-P);for(let w=P;w<y;w++)R+=l[w];return R/B*this.agcGain},W=T(25),O=T(120),L=T(160),M=T(260),q=T(4500),V=T(12e3),H=T(450),z=T(2200),Y=T(60),K=T(250),$=T(9e3),j=T(18e3);this.kick=b(W,O),this.snare=b(L,M),this.hat=b(q,V),this.bands[0]=b(Y,K),this.bands[1]=b(L,M),this.bands[2]=b(H,z),this.bands[3]=b($,j);for(let n=0;n<4;n++)this.bandPeak[n]=Math.max(this.bandPeak[n]*.92,this.bands[n]);const S=new Uint8Array(this.specBins*4);for(let n=0;n<this.specBins;n++){const g=n/m,R=(n+1)/this.specBins*m;let P=0,y=0;for(let w=Math.floor(g);w<Math.floor(R);w++)P+=this.freq[Math.min(w,m-1)],y++;const B=Math.min(255,Math.round(P/Math.max(1,y)));S[n*4]=B,S[n*4+1]=B,S[n*4+2]=B,S[n*4+3]=255}a.bindTexture(a.TEXTURE_2D,this.specTex),a.texSubImage2D(a.TEXTURE_2D,0,0,0,this.specBins,1,a.RGBA,a.UNSIGNED_BYTE,S);const U=new Uint8Array(this.waveBins*4);for(let n=0;n<this.waveBins;n++){const g=Math.floor(n/this.waveBins*this.wave.length),R=this.wave[g];U[n*4]=R,U[n*4+1]=R,U[n*4+2]=R,U[n*4+3]=255}a.bindTexture(a.TEXTURE_2D,this.waveTex),a.texSubImage2D(a.TEXTURE_2D,0,0,0,this.waveBins,1,a.RGBA,a.UNSIGNED_BYTE,U),this.sceneTimer+=16;const J=this.sceneTimer>this.sceneMinMs+Math.random()*(this.sceneMaxMs-this.sceneMinMs),Q=D<.015&&c<.1;!this.transitioning&&(J||Q&&this.sceneTimer>1e4)&&this.nextScene()}this.transitioning?this.renderTransition(o,c):this.renderScene(o,c),this.anim=requestAnimationFrame(this.loop)},this.canvas=e,this.gl=e.getContext("webgl")||e.getContext("webgl2"),!this.gl){(s=this.canvas.getContext("2d"))==null||s.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),(r=(t=this.opts).onStatus)==null||r.call(t,"Ready. M next scene • 1-7 pick • V WOW/Server • N next server shader")}initGL(){const e=this.gl;this.quad=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e.STATIC_DRAW);const i=(a,o)=>{const c=e.createTexture();return e.bindTexture(e.TEXTURE_2D,c),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,a,o,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),c},s=a=>{const o=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,o),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,a,0),e.bindFramebuffer(e.FRAMEBUFFER,null),o},t=Math.max(2,Math.floor(this.canvas.width/2)),r=Math.max(2,Math.floor(this.canvas.height/2));this.texA=i(t,r),this.fbA=s(this.texA),this.texB=i(t,r),this.fbB=s(this.texB),this.texSceneA=i(t,r),this.sceneA=s(this.texSceneA),this.texSceneB=i(t,r),this.sceneB=s(this.texSceneB),this.sceneProg.barsPro=E(e,p,ee),this.sceneProg.radialRings=E(e,p,te),this.sceneProg.oscDual=E(e,p,se),this.sceneProg.sunburst=E(e,p,ie),this.sceneProg.lissajous=E(e,p,ae),this.sceneProg.tunnel=E(e,p,re),this.sceneProg.particles=E(e,p,oe),this.wowProg=E(e,p,ne),this.transProg=E(e,p,ue);for(const a of Object.values({...this.sceneProg,wow:this.wowProg,trans:this.transProg})){if(!a)continue;e.useProgram(a);const o=e.getAttribLocation(a,"aPos");o!==-1&&(e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(o),e.vertexAttribPointer(o,2,e.FLOAT,!1,0,0))}this.streamTex=e.createTexture(),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),window.addEventListener("resize",()=>this.resize()),window.addEventListener("keydown",a=>this.onKey(a)),this.resize()}resize(){const e=this.gl,i=Math.max(1,Math.round(window.devicePixelRatio||1)),s=this.canvas.clientWidth||window.innerWidth,t=this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==s*i||this.canvas.height!==t*i)&&(this.canvas.width=s*i,this.canvas.height=t*i),e.viewport(0,0,this.canvas.width,this.canvas.height)}initAudioTextures(){const e=this.gl,i=s=>{const t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,s,1,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),t};this.specTex=i(this.specBins),this.waveTex=i(this.waveBins)}initWS(){var i;const e=location.protocol==="https:"?"wss:":"ws:";(i=this.ws)==null||i.close(),this.ws=new WebSocket(`${e}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var s;(s=this.ws)==null||s.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=s=>{typeof s.data!="string"&&this.onStreamFrame(s.data)}}onStreamFrame(e){const i=this.gl,s=new DataView(e,0,24);if(!String.fromCharCode(...new Uint8Array(e.slice(0,8))).startsWith("FRAMEv1"))return;const r=s.getUint32(8,!0),a=s.getUint32(12,!0);if(s.getUint32(16,!0)!==4)return;const c=new Uint8Array(e,24);this.streamW=r,this.streamH=a,i.activeTexture(i.TEXTURE0+this.streamUnit),i.bindTexture(i.TEXTURE_2D,this.streamTex),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,r,a,0,i.RGBA,i.UNSIGNED_BYTE,c),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.REPEAT),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var e;this.anim&&cancelAnimationFrame(this.anim),(e=this.ws)==null||e.close()}async startScreenShare(){var t;const e=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!e.getAudioTracks().length)throw e.getTracks().forEach(r=>r.stop()),new Error("No audio shared");(t=this.audioCtx)==null||t.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=4096,this.audioCtx.createMediaStreamSource(e).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=e;const s=e.getVideoTracks()[0];s&&(s.onended=()=>this.stopScreenShare())}stopScreenShare(){var e,i;(e=this.stream)==null||e.getTracks().forEach(s=>s.stop()),this.stream=null,this.freq=null,this.wave=null,(i=this.audioCtx)==null||i.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(e){e&&this.stopScreenShare()}toggleWow(){this.scenes[this.sceneIdx]==="wow"?this.sceneIdx=this.scenes.indexOf("server"):this.sceneIdx=this.scenes.indexOf("wow"),this.beginTransition()}async loadServerShaderPublic(){var e,i;await this.loadServerShader("composite"),(i=(e=this.opts).onStatus)==null||i.call(e,"Server shader refreshed")}onKey(e){const i=e.key.toLowerCase();i==="v"&&this.toggleWow(),i==="n"&&this.loadServerShaderPublic(),i==="m"&&this.nextScene();const s=["barsPro","radialRings","oscDual","sunburst","lissajous","tunnel","particles"];if("1234567".includes(i)){const t=parseInt(i,10)-1;s[t]&&(this.sceneIdx=this.scenes.indexOf(s[t]),this.beginTransition())}}async loadServerShader(e){const i=new URLSearchParams;e&&i.set("type",e),i.set("ts",Date.now().toString());const s="/api/shader/next?"+i.toString(),t=await fetch(s,{cache:"no-store"});if(!t.ok)throw new Error("HTTP "+t.status);const r=await t.json(),a=this.gl;this.serverProg=E(a,p,r.code),this.serverUniforms={},this.serverTextures=[],a.useProgram(this.serverProg);for(const u of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes"])this.serverUniforms[u]=a.getUniformLocation(this.serverProg,u);let o=0;if(r.textures)for(const u of r.textures){const v=a.createTexture();await new Promise((l,x)=>{const d=new Image;d.onload=()=>{a.activeTexture(a.TEXTURE0+o),a.bindTexture(a.TEXTURE_2D,v),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,d),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.REPEAT),l()},d.onerror=()=>x(new Error("tex")),d.src=u.dataUrl});const m=a.getUniformLocation(this.serverProg,u.name);m&&a.uniform1i(m,o),this.serverTextures.push({name:u.name,tex:v,unit:o,meta:u}),o++,u.gridCols&&u.gridRows&&(this.serverUniforms.uAtlasGrid&&a.uniform2f(this.serverUniforms.uAtlasGrid,u.gridCols,u.gridRows),this.serverUniforms.uAtlasFrames&&a.uniform1f(this.serverUniforms.uAtlasFrames,u.frames??u.gridCols*u.gridRows),this.serverUniforms.uAtlasFPS&&a.uniform1f(this.serverUniforms.uAtlasFPS,u.fps??24))}const c=a.getUniformLocation(this.serverProg,"uStreamTex");c&&a.uniform1i(c,this.streamUnit);const h=this.serverUniforms.uStreamRes;h&&a.uniform2f(h,this.streamW,this.streamH)}renderScene(e,i){const s=this.gl;s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT);const t=this.scenes[this.sceneIdx];t==="wow"?this.drawWOW(e/1e3,i):t==="server"?this.drawServer(e/1e3,i):this.drawClassic(t,e/1e3,i)}beginTransition(){this.transitioning=!0,this.transStart=performance.now(),this.transType=(this.transType+1)%4,this.sceneTimer=0;const e=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,e,this.scenes[this.sceneIdx])}nextScene(){const e=this.sceneIdx;this.sceneIdx=(this.sceneIdx+1)%this.scenes.length;const i=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,i,this.scenes[e]),this.renderSceneTo(this.texSceneB,this.sceneB,i,this.scenes[this.sceneIdx]),this.transitioning=!0,this.transStart=i,this.transType=(this.transType+1)%4,this.sceneTimer=0}renderSceneTo(e,i,s,t){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,i),r.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT),t==="wow"?this.drawWOW(s/1e3,this.env,!0):t==="server"?this.drawServer(s/1e3,this.env,!0):this.drawClassic(t,s/1e3,this.env,!0)}renderTransition(e,i){const s=this.gl,t=Math.min(1,(e-this.transStart)/this.transDur);s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.useProgram(this.transProg);const r=o=>s.getUniformLocation(this.transProg,o);s.activeTexture(s.TEXTURE0+0),s.bindTexture(s.TEXTURE_2D,this.texSceneA),s.uniform1i(r("uFrom"),0),s.activeTexture(s.TEXTURE0+1),s.bindTexture(s.TEXTURE_2D,this.texSceneB),s.uniform1i(r("uTo"),1),s.uniform1f(r("uProgress"),t),s.uniform1f(r("uType"),this.transType),s.uniform2f(r("uRes"),this.canvas.width,this.canvas.height),s.uniform1f(r("uBeat"),this.beat),s.uniform3f(r("uBands"),this.bandPeak[0],this.bandPeak[2],this.bandPeak[3]);const a=s.getAttribLocation(this.transProg,"aPos");s.bindBuffer(s.ARRAY_BUFFER,this.quad),s.enableVertexAttribArray(a),s.vertexAttribPointer(a,2,s.FLOAT,!1,0,0),s.drawArrays(s.TRIANGLES,0,6),t>=1&&(this.transitioning=!1)}drawClassic(e,i,s,t=!1){const r=this.gl,a=this.sceneProg[e];r.useProgram(a);const o=(h,u,v)=>{const m=r.getUniformLocation(a,h);m&&r[`uniform${v}`](m,...Array.isArray(u)?u:[u])};r.activeTexture(r.TEXTURE0+6),r.bindTexture(r.TEXTURE_2D,this.specTex),o("uSpecTex",6,"1i"),o("uSpecN",this.specBins,"1f"),r.activeTexture(r.TEXTURE0+8),r.bindTexture(r.TEXTURE_2D,this.waveTex),o("uWaveTex",8,"1i"),o("uWaveN",this.waveBins,"1f"),r.activeTexture(r.TEXTURE0+this.streamUnit),r.bindTexture(r.TEXTURE_2D,this.streamTex),o("uStreamTex",this.streamUnit,"1i"),o("uTime",i,"1f"),o("uRes",[this.canvas.width,this.canvas.height],"2f"),o("uLevel",s,"1f"),o("uBeat",this.beat,"1f"),o("uKick",this.bandPeak[0]*1.2,"1f"),o("uSnare",this.snare,"1f"),o("uHat",this.bandPeak[3],"1f"),o("uLow",this.bandPeak[0],"1f"),o("uMid",this.bandPeak[2],"1f"),o("uAir",this.bandPeak[3],"1f");const c=r.getAttribLocation(a,"aPos");r.bindBuffer(r.ARRAY_BUFFER,this.quad),r.enableVertexAttribArray(c),r.vertexAttribPointer(c,2,r.FLOAT,!1,0,0),r.drawArrays(r.TRIANGLES,0,6)}drawWOW(e,i,s=!1){const t=this.gl;s||t.bindFramebuffer(t.FRAMEBUFFER,this.fbA);const r=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));t.viewport(0,0,r,a),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this.wowProg);const o=h=>t.getUniformLocation(this.wowProg,h);t.uniform1f(o("uTime"),e),t.uniform2f(o("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(o("uDecay"),this.decay),t.uniform1f(o("uEnv"),i),t.uniform1f(o("uBeat"),this.beat),t.uniform1f(o("uKick"),this.bandPeak[0]*1.2),t.uniform1f(o("uSnare"),this.snare),t.uniform1f(o("uHat"),this.bandPeak[3]),t.uniform1f(o("uLow"),this.bandPeak[0]),t.uniform1f(o("uMid"),this.bandPeak[2]),t.uniform1f(o("uAir"),this.bandPeak[3]),t.activeTexture(t.TEXTURE0+7),t.bindTexture(t.TEXTURE_2D,this.texB),t.uniform1i(o("uFeedback"),7),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.uniform1i(o("uStreamTex"),this.streamUnit);const c=t.getAttribLocation(this.wowProg,"aPos");if(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(c),t.vertexAttribPointer(c,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6),!s){t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height),t.useProgram(this.transProg);const h=l=>t.getUniformLocation(this.transProg,l);t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uFrom"),0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uTo"),1),t.uniform1f(h("uProgress"),0),t.uniform1f(h("uType"),0),t.uniform2f(h("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(h("uBeat"),this.beat),t.uniform3f(h("uBands"),this.bandPeak[0],this.bandPeak[2],this.bandPeak[3]);const u=t.getAttribLocation(this.transProg,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(u),t.vertexAttribPointer(u,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6);const v=this.texA;this.texA=this.texB,this.texB=v;const m=this.fbA;this.fbA=this.fbB,this.fbB=m}}drawServer(e,i,s=!1){const t=this.gl,r=this.serverProg;if(!r){this.drawClassic("barsPro",e,i);return}t.useProgram(r);const a=(l,x,d)=>{const A=t.getUniformLocation(r,l);A&&t[`uniform${d}`](A,...Array.isArray(x)?x:[x])};a("uTime",e,"1f"),a("uRes",[this.canvas.width,this.canvas.height],"2f"),a("uLevel",i,"1f");const o=t.getUniformLocation(r,"uBands");o&&t.uniform1fv(o,new Float32Array(this.bands.map(l=>Math.min(1,l*1.4))));const c=t.getUniformLocation(r,"uPulse");c&&t.uniform1f(c,Math.min(1,this.env*1.6));const h=t.getUniformLocation(r,"uBeat");h&&t.uniform1f(h,Math.min(1,this.beat*1.8));for(const l of this.serverTextures)t.activeTexture(t.TEXTURE0+l.unit),t.bindTexture(t.TEXTURE_2D,l.tex);t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex);const u=t.getUniformLocation(r,"uStreamTex");u&&t.uniform1i(u,this.streamUnit);const v=this.serverTextures.find(l=>l.meta&&l.meta.gridCols&&l.meta.gridRows);if(v!=null&&v.meta){const l=v.meta.frames??v.meta.gridCols*v.meta.gridRows,x=v.meta.fps??24,d=Math.floor(e*x)%Math.max(1,l);this.serverUniforms.uAtlasGrid&&t.uniform2f(this.serverUniforms.uAtlasGrid,v.meta.gridCols,v.meta.gridRows),this.serverUniforms.uAtlasFrames&&t.uniform1f(this.serverUniforms.uAtlasFrames,l),this.serverUniforms.uAtlasFPS&&t.uniform1f(this.serverUniforms.uAtlasFPS,x),this.serverUniforms.uFrame&&t.uniform1f(this.serverUniforms.uFrame,d)}const m=t.getAttribLocation(r,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(m),t.vertexAttribPointer(m,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}const F=`
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
`,ee=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir;
${F}
float spec(float x){ float i=floor(clamp(x,0.999)*uSpecN); float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = spec(x);
  // exaggerated height with level
  float H = 0.06 + 1.25*a + 0.55*uLevel + 0.20*uLow;
  float body = step(uv.y, H);
  float cap = smoothstep(H, H-0.02-0.03*uAir, uv.y);
  float val = max(body, 1.2*cap);
  // pseudo-3D shading
  float shade = 0.35 + 0.65*pow(1.0-abs(uv.x*2.0-1.0), 0.5);
  vec3 col = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,0.6), x);
  col *= shade;
  // glow
  float g = smoothstep(H+0.02, H, uv.y) * (0.6+1.5*uLevel);
  col += g*vec3(0.7,0.9,1.0);
  col += uBeat*vec3(1.0,0.7,1.0)*0.4;
  gl_FragColor = vec4(col*val,1.0);
}
`,te=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uLow,uMid,uAir;
${F}
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 p = vUV*2.0-1.0; float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/6.28318 * uSpecN;
  float s = spec(floor(idx));
  float rings = 0.0;
  float k = 8.0 + 32.0*uAir;
  float phase = uTime*0.6 + uLow*2.0;
  rings += smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.22) * (0.4+1.6*s);
  // center bloom
  float bloom = exp(-r*12.0) * (0.5+1.4*uLow);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02);
  col += uBeat*0.12;
  gl_FragColor = vec4(col,1.0);
}
`,se=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uWaveTex; uniform float uWaveN;
uniform float uTime,uBeat,uMid;
float wave(float x){ float i=floor(clamp(x,0.999)*uWaveN); float u=(i+0.5)/uWaveN; return texture2D(uWaveTex, vec2(u,0.5)).r; }
void main(){
  float y = 1.0 - wave(vUV.x);
  float x = wave(vUV.y);
  float lineY = smoothstep(0.011, 0.0, abs(vUV.y - y)-0.001);
  float lineX = smoothstep(0.011, 0.0, abs(vUV.x - x)-0.001);
  float glow = smoothstep(0.06, 0.0, abs(vUV.y - y)) + smoothstep(0.06, 0.0, abs(vUV.x - x));
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * (lineY + lineX) + glow*0.15;
  col += uBeat*0.2;
  gl_FragColor = vec4(col, 1.0);
}
`,ie=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uBeat,uHat,uMid;
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 p=vUV*2.0-1.0; float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 10.0 + floor(uHat*14.0);
  float rays = abs(sin(a*seg + uTime*2.0))*pow(1.0-r,0.4);
  float idx = fract((a+3.14159)/6.28318)*uSpecN;
  float s = spec(floor(idx));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), s);
  col *= 0.35 + 2.2 * rays * (0.3 + 1.4*s + 0.6*uMid);
  col += uBeat*0.18;
  gl_FragColor = vec4(col,1.0);
}
`,ae=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uWaveTex; uniform float uWaveN;
uniform float uTime,uBeat,uAir;
float wave(float x){ float i=floor(clamp(x,0.999)*uWaveN); float u=(i+0.5)/uWaveN; return texture2D(uWaveTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV*2.0-1.0;
  float a=wave(fract((uv.x+1.0)*0.5));
  float b=wave(fract((uv.y+1.0)*0.5));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.02, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.15;
  gl_FragColor = vec4(col*line, 1.0);
}
`,re=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uSpecTex; uniform float uSpecN;
uniform float uTime,uKick,uSnare,uHat,uLow,uMid,uAir,uBeat;
${F}
float spec(float i){ float u=(i+0.5)/uSpecN; return texture2D(uSpecTex, vec2(u,0.5)).r; }
void main(){
  vec2 uv=vUV*2.0-1.0; float r=length(uv); float a=atan(uv.y,uv.x);
  float s = spec(fract((a+3.14159)/6.28318)*uSpecN);
  float z = 1.2/(r+0.12 + 0.25*exp(-r*6.0)*(0.5+1.5*uKick));
  float stripes = sin( (z*7.0 + uTime*2.0) + a*4.0 + uHat*10.0 )*0.5+0.5;
  vec3 col = mix(vec3(0.1,0.5,1.2), vec3(1.0,0.4,0.8), stripes);
  col *= (0.3 + 0.9*z) * (0.6 + 1.4*s + 0.6*uAir);
  col += uBeat*vec3(0.6,0.5,0.9)*0.25;
  gl_FragColor = vec4(col,1.0);
}
`,oe=`
precision mediump float; varying vec2 vUV;
uniform float uTime,uLow,uMid,uAir,uBeat;
${F}
void main(){
  vec2 uv=vUV*2.0-1.0;
  float d = length(uv);
  float field = smooth2D(uv*3.0 + uTime*vec2(0.4,-0.3)) + 0.5*smooth2D(uv*6.0 - uTime*vec2(0.2,0.5));
  float dots = step(0.82 + 0.1*uAir, fract(field*10.0 + uTime*1.2));
  float glow = exp(-d*(6.0+8.0*uLow));
  vec3 col = mix(vec3(0.2,0.8,1.0), vec3(1.0,0.5,0.8), field);
  col = col*(0.2+1.6*glow) + vec3(dots)*0.7*(0.4+1.4*uMid);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,ne=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uFeedback, uStreamTex;
uniform vec2  uRes; uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=uv*2.0-1.0; float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); uv=vec2(cos(a),sin(a))*r; return uv*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  vec2 c=uv-0.5; float r=length(c);
  float bassWarp=0.45*uKick+0.18*uSnare; uv+=c*(bassWarp*r);
  float angle=(uMid*0.8+0.2)*sin(t*0.4)+r*(0.4+0.25*uLow);
  mat2 R=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec3 stream=texture2D(uStreamTex,(R*(uv-0.5)+0.5)+vec2(t*0.02,-t*0.015)).rgb;
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2);
  vec3 prev=texture2D(uFeedback, uv + c*0.012*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base*0.8+stream*0.4, 0.55+0.45*uEnv);
  col += uBeat*vec3(0.9,0.6,1.0);
  float vg=1.0-dot(c,c)*0.9; col*=clamp(vg,0.25,1.1);
  gl_FragColor=vec4(col,1.0);
}
`,ue=`
precision mediump float; varying vec2 vUV;
uniform sampler2D uFrom, uTo;
uniform float uProgress, uType, uBeat;
uniform vec3 uBands; // low, mid, air peaks
uniform vec2 uRes;

float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec2 swirl(vec2 uv, float k){
  vec2 p=uv-0.5; float r=length(p); float a=atan(p.y,p.x)+k*r*r; return 0.5+vec2(cos(a),sin(a))*r;
}

void main(){
  float p = smoothstep(0.0,1.0,uProgress);
  vec2 uv=vUV;
  vec3 A,B;
  if (uType < 0.5) {
    // (0) cross-zoom + swirl
    vec2 ua = (uv-0.5)/(1.0+0.45*p)+0.5;  // zoom out
    vec2 ub = (uv-0.5)*(1.0-0.22*p)+0.5; // zoom in
    ua = swirl(ua, 2.4*p);
    A = texture2D(uFrom, ua).rgb;
    B = texture2D(uTo,   ub).rgb;
    float m = smoothstep(-0.1,1.1,p + 0.18*sin((uv.x+uv.y)*24.0));
    gl_FragColor = vec4(mix(A,B,m),1.0);
  } else if (uType < 1.5) {
    // (1) radial ripple reveal (mid drives ripples)
    vec2 c=uv-0.5; float r=length(c);
    float w = 0.24 + 0.76*p;
    float rip = 0.035 + 0.045*uBands.y;
    float mask = smoothstep(w-rip, w+rip, r + 0.05*sin(22.0*r - p*(10.0+18.0*uBands.y)));
    A=texture2D(uFrom, uv).rgb; B=texture2D(uTo, uv).rgb;
    gl_FragColor = vec4(mix(A,B,mask),1.0);
  } else if (uType < 2.5) {
    // (2) checker spin-wipe (air drives frequency)
    vec2 g = floor(uv*vec2(28.0,16.0));
    float phase = fract((g.x+g.y)*0.07*(1.0+2.0*uBands.z) + p*1.1);
    float m = smoothstep(0.35,0.65,phase);
    vec2 uva = swirl(uv, 1.7*(1.0-p));
    vec2 uvb = swirl(uv, 1.7*p);
    A=texture2D(uFrom, uva).rgb; B=texture2D(uTo, uvb).rgb;
    gl_FragColor = vec4(mix(A,B,m),1.0);
  } else {
    // (3) flow-field luminance warp (bass drives strength)
    // sample small neighborhood to build a pseudo-gradient (flow)
    vec2 px = 1.0 / uRes;
    vec3 ca = texture2D(uFrom, uv).rgb;
    vec3 cb = texture2D(uTo,   uv).rgb;
    float la = luma(ca);
    float lb = luma(cb);
    float gradAx = luma(texture2D(uFrom, uv+vec2(px.x,0.0)).rgb) - luma(texture2D(uFrom, uv-vec2(px.x,0.0)).rgb);
    float gradAy = luma(texture2D(uFrom, uv+vec2(0.0,px.y)).rgb) - luma(texture2D(uFrom, uv-vec2(0.0,px.y)).rgb);
    float gradBx = luma(texture2D(uTo, uv+vec2(px.x,0.0)).rgb) - luma(texture2D(uTo, uv-vec2(px.x,0.0)).rgb);
    float gradBy = luma(texture2D(uTo, uv+vec2(0.0,px.y)).rgb) - luma(texture2D(uTo, uv-vec2(0.0,px.y)).rgb);
    vec2 flowA = vec2(gradAx, gradAy);
    vec2 flowB = vec2(gradBx, gradBy);
    float power = mix(1.0, 2.7, p) * (0.25 + 1.8*uBands.x + 0.6*uBeat);
    vec2 ua = uv - flowA*power*(1.0-p)*0.015;
    vec2 ub = uv + flowB*power*(p)*0.015;
    A = texture2D(uFrom, ua).rgb;
    B = texture2D(uTo,   ub).rgb;
    float mixm = smoothstep(0.0,1.0,p);
    gl_FragColor = vec4(mix(A,B,mixm),1.0);
  }
}
`;document.addEventListener("DOMContentLoaded",async()=>{const f=document.querySelector("#app");if(!f)return;f.innerHTML=`
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
  `;const e=document.getElementById("visualizer"),i=document.getElementById("status"),s=document.getElementById("fps"),t=document.getElementById("btnShare"),r=document.getElementById("btnDemo");if(!e)return;const a=new Z(e,{onStatus:h=>{i.textContent=h},onFps:h=>{s.textContent=`FPS: ${h}`}});await a.start();const o=()=>{t.textContent=a.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),t.addEventListener("click",async()=>{if(a.isSharing()){a.stopScreenShare(),i.textContent="Screen share stopped",o();return}t.disabled=!0,i.textContent='Requesting screen share (enable "Share audio")…';try{await a.startScreenShare(),i.textContent="Screen sharing active"}catch{i.textContent="Permission denied or no audio shared"}finally{t.disabled=!1,o()}});let c=!1;r.addEventListener("click",()=>{c=!c,a.setDemoMode(c),r.textContent=c?"Stop Demo":"Demo Mode",i.textContent=c?"Demo mode active":"Ready"}),document.addEventListener("keydown",h=>{var u;h.key.toLowerCase()==="n"&&((u=a.loadServerShader)==null||u.call(a))})});
