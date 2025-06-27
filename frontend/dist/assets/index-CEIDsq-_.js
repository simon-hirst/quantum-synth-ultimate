(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const a of t)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function s(t){const a={};return t.integrity&&(a.integrity=t.integrity),t.referrerPolicy&&(a.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?a.credentials="include":t.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(t){if(t.ep)return;t.ep=!0;const a=s(t);fetch(t.href,a)}})();const b=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function L(f,e,s){const i=f.createShader(e);if(f.shaderSource(i,s),f.compileShader(i),!f.getShaderParameter(i,f.COMPILE_STATUS))throw new Error(f.getShaderInfoLog(i)||"compile");return i}function w(f,e,s){const i=f.createProgram();if(f.attachShader(i,L(f,f.VERTEX_SHADER,e)),f.attachShader(i,L(f,f.FRAGMENT_SHADER,s)),f.linkProgram(i),!f.getProgramParameter(i,f.LINK_STATUS))throw new Error(f.getProgramInfoLog(i)||"link");return i}class K{constructor(e,s={}){var i,t,a;if(this.opts=s,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.env=0,this.envAttack=.28,this.envRelease=.06,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=43,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.specTex=null,this.waveTex=null,this.specBins=64,this.waveBins=256,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.serverUniforms={},this.serverTextures=[],this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.82,this.sceneA=null,this.sceneB=null,this.texSceneA=null,this.texSceneB=null,this.transProg=null,this.scenes=["bars","radial","osc","sunburst","wow","server"],this.sceneIdx=0,this.sceneTimer=0,this.sceneMinMs=25e3,this.sceneMaxMs=42e3,this.transitioning=!1,this.transStart=0,this.transDur=2200,this.transType=0,this.frames=0,this.lastFPS=performance.now(),this.loop=()=>{var l,c,T;const r=this.gl,n=performance.now();this.frames++,n-this.lastFPS>=1e3&&((c=(l=this.opts).onFps)==null||c.call(l,this.frames),this.frames=0,this.lastFPS=n);let h=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const u=this.freq.length,v=new Float32Array(u);for(let o=0;o<u;o++)v[o]=this.freq[o]/255;let m=0;for(let o=0;o<u;o++)m+=v[o]*v[o];const d=Math.sqrt(m/u);d>this.env?this.env+=(d-this.env)*this.envAttack:this.env+=(d-this.env)*this.envRelease,h=this.env;let g=0;if(this.lastMag)for(let o=0;o<u;o++){const x=v[o]-this.lastMag[o];x>0&&(g+=x)}this.lastMag=v,this.fluxRing.length<this.fluxSize?this.fluxRing.push(g):(this.fluxRing[this.fluxIdx]=g,this.fluxIdx=(this.fluxIdx+1)%this.fluxSize);const S=this.fluxRing.reduce((o,x)=>o+x,0)/Math.max(1,this.fluxRing.length),M=g>S*1.35&&this.beatCooldown<=0;this.beat=Math.max(0,this.beat-.12),M&&(this.beat=1,this.beatCooldown=8),this.beatCooldown>0&&this.beatCooldown--;const X=((T=this.audioCtx)==null?void 0:T.sampleRate)||48e3,I=X/2,C=I/u,E=o=>Math.max(0,Math.min(u-1,Math.round(o/C))),R=(o,x)=>{let A=0;const U=Math.min(o,x),_=Math.max(o,x),F=Math.max(1,_-U);for(let p=U;p<_;p++)A+=v[p];return A/F},N=E(20),k=E(120),B=E(150),D=E(250),W=E(5e3),G=E(12e3),q=E(500),O=E(2e3),H=E(80),V=E(250),Y=E(8e3),z=E(16e3);this.kick=R(N,k),this.snare=R(B,D),this.hat=R(W,G),this.bands[0]=R(H,V),this.bands[1]=R(B,D),this.bands[2]=R(q,O),this.bands[3]=R(Y,z);const P=new Uint8Array(this.specBins*4);for(let o=0;o<this.specBins;o++){const x=o/u,A=(o+1)/this.specBins*u;let U=0,_=0;for(let p=Math.floor(x);p<Math.floor(A);p++)U+=this.freq[Math.min(p,u-1)],_++;const F=Math.min(255,Math.round(U/Math.max(1,_)));P[o*4]=F,P[o*4+3]=255}r.bindTexture(r.TEXTURE_2D,this.specTex),r.texSubImage2D(r.TEXTURE_2D,0,0,0,this.specBins,1,r.RGBA,r.UNSIGNED_BYTE,P);const y=new Uint8Array(this.waveBins*4);for(let o=0;o<this.waveBins;o++){const x=Math.floor(o/this.waveBins*this.wave.length),A=this.wave[x];y[o*4]=A,y[o*4+3]=255}if(r.bindTexture(r.TEXTURE_2D,this.waveTex),r.texSubImage2D(r.TEXTURE_2D,0,0,0,this.waveBins,1,r.RGBA,r.UNSIGNED_BYTE,y),this.sceneTimer+=16,!this.transitioning){const o=S<.02&&h<.12;(this.sceneTimer>this.sceneMinMs+Math.random()*(this.sceneMaxMs-this.sceneMinMs)||o&&this.sceneTimer>12e3)&&this.nextScene()}}this.transitioning?this.renderTransition(n,h):this.renderScene(n,h),this.anim=requestAnimationFrame(this.loop)},this.canvas=e,this.gl=e.getContext("webgl")||e.getContext("webgl2"),!this.gl){(i=this.canvas.getContext("2d"))==null||i.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),(a=(t=this.opts).onStatus)==null||a.call(t,"Ready. V toggles WOW vs Server; M cycles scenes; 1-5 pick a scene; N fetches new server shader")}initGL(){const e=this.gl;this.quad=e.createBuffer(),e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e.STATIC_DRAW);const s=(r,n)=>{const h=e.createTexture();return e.bindTexture(e.TEXTURE_2D,h),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,r,n,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),h},i=r=>{const n=e.createFramebuffer();return e.bindFramebuffer(e.FRAMEBUFFER,n),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,r,0),e.bindFramebuffer(e.FRAMEBUFFER,null),n},t=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));this.texA=s(t,a),this.fbA=i(this.texA),this.texB=s(t,a),this.fbB=i(this.texB),this.texSceneA=s(t,a),this.sceneA=i(this.texSceneA),this.texSceneB=s(t,a),this.sceneB=i(this.texSceneB),this.sceneProg.bars=w(e,b,$),this.sceneProg.radial=w(e,b,j),this.sceneProg.osc=w(e,b,J),this.sceneProg.sunburst=w(e,b,Q),this.wowProg=w(e,b,Z),this.transProg=w(e,b,ee);for(const r of[this.sceneProg.bars,this.sceneProg.radial,this.sceneProg.osc,this.sceneProg.sunburst,this.wowProg,this.transProg]){if(!r)continue;e.useProgram(r);const n=e.getAttribLocation(r,"aPos");n!==-1&&(e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,0,0))}this.streamTex=e.createTexture(),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),window.addEventListener("resize",()=>this.resize()),window.addEventListener("keydown",r=>this.onKey(r)),this.resize()}resize(){const e=this.gl,s=Math.max(1,Math.round(window.devicePixelRatio||1)),i=this.canvas.clientWidth||window.innerWidth,t=this.canvas.clientHeight||window.innerHeight;(this.canvas.width!==i*s||this.canvas.height!==t*s)&&(this.canvas.width=i*s,this.canvas.height=t*s),e.viewport(0,0,this.canvas.width,this.canvas.height)}initAudioTextures(){const e=this.gl,s=i=>{const t=e.createTexture();return e.bindTexture(e.TEXTURE_2D,t),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,i,1,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),t};this.specTex=s(this.specBins),this.waveTex=s(this.waveBins)}initWS(){var s;const e=location.protocol==="https:"?"wss:":"ws:";(s=this.ws)==null||s.close(),this.ws=new WebSocket(`${e}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var i;(i=this.ws)==null||i.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=i=>{typeof i.data!="string"&&this.onStreamFrame(i.data)}}onStreamFrame(e){const s=this.gl,i=new DataView(e,0,24);if(!String.fromCharCode(...new Uint8Array(e.slice(0,8))).startsWith("FRAMEv1"))return;const a=i.getUint32(8,!0),r=i.getUint32(12,!0);if(i.getUint32(16,!0)!==4)return;const h=new Uint8Array(e,24);this.streamW=a,this.streamH=r,s.activeTexture(s.TEXTURE0+this.streamUnit),s.bindTexture(s.TEXTURE_2D,this.streamTex),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,a,r,0,s.RGBA,s.UNSIGNED_BYTE,h),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.REPEAT),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var e;this.anim&&cancelAnimationFrame(this.anim),(e=this.ws)==null||e.close()}async startScreenShare(){var t;const e=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!e.getAudioTracks().length)throw e.getTracks().forEach(a=>a.stop()),new Error("No audio shared");(t=this.audioCtx)==null||t.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=2048,this.audioCtx.createMediaStreamSource(e).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=e;const i=e.getVideoTracks()[0];i&&(i.onended=()=>this.stopScreenShare())}stopScreenShare(){var e,s;(e=this.stream)==null||e.getTracks().forEach(i=>i.stop()),this.stream=null,this.freq=null,this.wave=null,(s=this.audioCtx)==null||s.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(e){e&&this.stopScreenShare()}toggleWow(){this.scenes[this.sceneIdx]==="wow"?this.sceneIdx=this.scenes.indexOf("server"):this.sceneIdx=this.scenes.indexOf("wow"),this.beginTransition()}async loadServerShaderPublic(){var e,s;await this.loadServerShader("composite"),(s=(e=this.opts).onStatus)==null||s.call(e,"Server shader refreshed")}onKey(e){const s=e.key.toLowerCase();if(s==="v"&&this.toggleWow(),s==="n"&&this.loadServerShaderPublic(),s==="m"&&this.nextScene(),"12345".includes(s)){const i=["bars","radial","osc","sunburst","wow"],t=i.indexOf(s==="1"?"bars":s==="2"?"radial":s==="3"?"osc":s==="4"?"sunburst":"wow");t>=0&&(this.sceneIdx=this.scenes.indexOf(i[t]),this.beginTransition())}}async loadServerShader(e){const s=new URLSearchParams;e&&s.set("type",e),s.set("ts",Date.now().toString());const i="/api/shader/next?"+s.toString(),t=await fetch(i,{cache:"no-store"});if(!t.ok)throw new Error("HTTP "+t.status);const a=await t.json(),r=this.gl;this.serverProg=w(r,b,a.code),this.serverUniforms={},this.serverTextures=[],r.useProgram(this.serverProg);for(const c of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes"])this.serverUniforms[c]=r.getUniformLocation(this.serverProg,c);let n=0;if(a.textures)for(const c of a.textures){const T=r.createTexture();await new Promise((v,m)=>{const d=new Image;d.onload=()=>{r.activeTexture(r.TEXTURE0+n),r.bindTexture(r.TEXTURE_2D,T),r.texImage2D(r.TEXTURE_2D,0,r.RGBA,r.RGBA,r.UNSIGNED_BYTE,d),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MIN_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_MAG_FILTER,r.LINEAR),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_S,r.REPEAT),r.texParameteri(r.TEXTURE_2D,r.TEXTURE_WRAP_T,r.REPEAT),v()},d.onerror=()=>m(new Error("tex")),d.src=c.dataUrl});const u=r.getUniformLocation(this.serverProg,c.name);u&&r.uniform1i(u,n),this.serverTextures.push({name:c.name,tex:T,unit:n,meta:c}),n++,c.gridCols&&c.gridRows&&(this.serverUniforms.uAtlasGrid&&r.uniform2f(this.serverUniforms.uAtlasGrid,c.gridCols,c.gridRows),this.serverUniforms.uAtlasFrames&&r.uniform1f(this.serverUniforms.uAtlasFrames,c.frames??c.gridCols*c.gridRows),this.serverUniforms.uAtlasFPS&&r.uniform1f(this.serverUniforms.uAtlasFPS,c.fps??24))}const h=r.getUniformLocation(this.serverProg,"uStreamTex");h&&r.uniform1i(h,this.streamUnit);const l=this.serverUniforms.uStreamRes;l&&r.uniform2f(l,this.streamW,this.streamH)}renderScene(e,s){const i=this.gl;i.bindFramebuffer(i.FRAMEBUFFER,null),i.viewport(0,0,this.canvas.width,this.canvas.height),i.clearColor(0,0,0,1),i.clear(i.COLOR_BUFFER_BIT);const t=this.scenes[this.sceneIdx];t==="wow"?this.drawWOW(e/1e3,s):t==="server"?this.drawServer(e/1e3,s):this.drawClassic(t,e/1e3,s)}beginTransition(){this.transitioning=!0,this.transStart=performance.now(),this.transType=(this.transType+1)%3,this.sceneTimer=0,this.renderSceneTo(this.texSceneA,this.fbSceneForCurrent(),performance.now(),this.scenes[this.sceneIdx])}nextScene(){const e=this.sceneIdx;this.sceneIdx=(this.sceneIdx+1)%this.scenes.length;const s=performance.now();this.renderSceneTo(this.texSceneA,this.fbSceneForCurrent(),s,this.scenes[e]),this.renderSceneTo(this.texSceneB,this.fbSceneForNext(),s,this.scenes[this.sceneIdx]),this.transitioning=!0,this.transStart=s,this.transType=(this.transType+1)%3,this.sceneTimer=0}fbSceneForCurrent(){return this.sceneA}fbSceneForNext(){return this.sceneB}renderSceneTo(e,s,i,t){const a=this.gl;a.bindFramebuffer(a.FRAMEBUFFER,s),a.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),a.clearColor(0,0,0,1),a.clear(a.COLOR_BUFFER_BIT),t==="wow"?this.drawWOW(i/1e3,this.env,!0):t==="server"?this.drawServer(i/1e3,this.env,!0):this.drawClassic(t,i/1e3,this.env,!0)}renderTransition(e,s){const i=this.gl,t=Math.min(1,(e-this.transStart)/this.transDur);i.bindFramebuffer(i.FRAMEBUFFER,null),i.viewport(0,0,this.canvas.width,this.canvas.height),i.useProgram(this.transProg);const a=l=>i.getUniformLocation(this.transProg,l),r=0,n=1;i.activeTexture(i.TEXTURE0+r),i.bindTexture(i.TEXTURE_2D,this.texSceneA),i.uniform1i(a("uFrom"),r),i.activeTexture(i.TEXTURE0+n),i.bindTexture(i.TEXTURE_2D,this.texSceneB),i.uniform1i(a("uTo"),n),i.uniform1f(a("uProgress"),t),i.uniform1f(a("uType"),this.transType),i.uniform2f(a("uRes"),this.canvas.width,this.canvas.height);const h=i.getAttribLocation(this.transProg,"aPos");i.bindBuffer(i.ARRAY_BUFFER,this.quad),i.enableVertexAttribArray(h),i.vertexAttribPointer(h,2,i.FLOAT,!1,0,0),i.drawArrays(i.TRIANGLES,0,6),t>=1&&(this.transitioning=!1)}drawClassic(e,s,i,t=!1){const a=this.gl,r=this.sceneProg[e];a.useProgram(r);const n=(l,c,T)=>{const u=a.getUniformLocation(r,l);u&&a[`uniform${T}`](u,...Array.isArray(c)?c:[c])};a.activeTexture(a.TEXTURE0+6),a.bindTexture(a.TEXTURE_2D,this.specTex),n("uSpecTex",6,"1i"),n("uSpecN",this.specBins,"1f"),a.activeTexture(a.TEXTURE0+8),a.bindTexture(a.TEXTURE_2D,this.waveTex),n("uWaveTex",8,"1i"),n("uWaveN",this.waveBins,"1f"),a.activeTexture(a.TEXTURE0+this.streamUnit),a.bindTexture(a.TEXTURE_2D,this.streamTex),n("uStreamTex",this.streamUnit,"1i"),n("uTime",s,"1f"),n("uRes",[this.canvas.width,this.canvas.height],"2f"),n("uLevel",i,"1f"),n("uBeat",this.beat,"1f"),n("uKick",this.kick,"1f"),n("uSnare",this.snare,"1f"),n("uHat",this.hat,"1f"),n("uLow",this.bands[0],"1f"),n("uMid",this.bands[2],"1f"),n("uAir",this.bands[3],"1f");const h=a.getAttribLocation(r,"aPos");a.bindBuffer(a.ARRAY_BUFFER,this.quad),a.enableVertexAttribArray(h),a.vertexAttribPointer(h,2,a.FLOAT,!1,0,0),a.drawArrays(a.TRIANGLES,0,6)}drawWOW(e,s,i=!1){const t=this.gl;i||t.bindFramebuffer(t.FRAMEBUFFER,this.fbA);const a=Math.max(2,Math.floor(this.canvas.width/2)),r=Math.max(2,Math.floor(this.canvas.height/2));t.viewport(0,0,a,r),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this.wowProg);const n=l=>t.getUniformLocation(this.wowProg,l);t.uniform1f(n("uTime"),e),t.uniform2f(n("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(n("uDecay"),this.decay),t.uniform1f(n("uEnv"),s),t.uniform1f(n("uBeat"),this.beat),t.uniform1f(n("uKick"),this.kick),t.uniform1f(n("uSnare"),this.snare),t.uniform1f(n("uHat"),this.hat),t.uniform1f(n("uLow"),this.bands[0]),t.uniform1f(n("uMid"),this.bands[2]),t.uniform1f(n("uAir"),this.bands[3]),t.activeTexture(t.TEXTURE0+7),t.bindTexture(t.TEXTURE_2D,this.texB),t.uniform1i(n("uFeedback"),7),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.uniform1i(n("uStreamTex"),this.streamUnit);const h=t.getAttribLocation(this.wowProg,"aPos");if(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(h),t.vertexAttribPointer(h,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6),!i){t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height),t.useProgram(this.sceneProg.bars),t.useProgram(this.transProg);const l=v=>t.getUniformLocation(this.transProg,v);t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(l("uFrom"),0),t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(l("uTo"),1),t.uniform1f(l("uProgress"),0),t.uniform1f(l("uType"),0),t.uniform2f(l("uRes"),this.canvas.width,this.canvas.height);const c=t.getAttribLocation(this.transProg,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(c),t.vertexAttribPointer(c,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6);const T=this.texA;this.texA=this.texB,this.texB=T;const u=this.fbA;this.fbA=this.fbB,this.fbB=u}}drawServer(e,s,i=!1){const t=this.gl,a=this.serverProg;if(!a){this.drawClassic("bars",e,s);return}t.useProgram(a);const r=(m,d,g)=>{const S=t.getUniformLocation(a,m);S&&t[`uniform${g}`](S,...Array.isArray(d)?d:[d])};r("uTime",e,"1f"),r("uRes",[this.canvas.width,this.canvas.height],"2f"),r("uLevel",s,"1f");const n=new Float32Array(this.bands),h=t.getUniformLocation(a,"uBands");h&&t.uniform1fv(h,n);const l=t.getUniformLocation(a,"uPulse");l&&t.uniform1f(l,Math.max(0,this.env-.5)*2);const c=t.getUniformLocation(a,"uBeat");c&&t.uniform1f(c,this.beat);for(const m of this.serverTextures)t.activeTexture(t.TEXTURE0+m.unit),t.bindTexture(t.TEXTURE_2D,m.tex);t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex);const T=t.getUniformLocation(a,"uStreamTex");T&&t.uniform1i(T,this.streamUnit);const u=this.serverTextures.find(m=>m.meta&&m.meta.gridCols&&m.meta.gridRows);if(u!=null&&u.meta){const m=u.meta.frames??u.meta.gridCols*u.meta.gridRows,d=u.meta.fps??24,g=Math.floor(e*d)%Math.max(1,m);this.serverUniforms.uAtlasGrid&&t.uniform2f(this.serverUniforms.uAtlasGrid,u.meta.gridCols,u.meta.gridRows),this.serverUniforms.uAtlasFrames&&t.uniform1f(this.serverUniforms.uAtlasFrames,m),this.serverUniforms.uAtlasFPS&&t.uniform1f(this.serverUniforms.uAtlasFPS,d),this.serverUniforms.uFrame&&t.uniform1f(this.serverUniforms.uFrame,g)}const v=t.getAttribLocation(a,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(v),t.vertexAttribPointer(v,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}const $=`
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
`,j=`
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
`,J=`
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
`,Q=`
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
`,Z=`
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
`,ee=`
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
  `;const e=document.getElementById("visualizer"),s=document.getElementById("status"),i=document.getElementById("fps"),t=document.getElementById("btnShare"),a=document.getElementById("btnDemo");if(!e)return;const r=new K(e,{onStatus:l=>{s.textContent=l},onFps:l=>{i.textContent=`FPS: ${l}`}});await r.start();const n=()=>{t.textContent=r.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};n(),t.addEventListener("click",async()=>{if(r.isSharing()){r.stopScreenShare(),s.textContent="Screen share stopped",n();return}t.disabled=!0,s.textContent='Requesting screen share (enable "Share audio")…';try{await r.startScreenShare(),s.textContent="Screen sharing active"}catch{s.textContent="Permission denied or no audio shared"}finally{t.disabled=!1,n()}});let h=!1;a.addEventListener("click",()=>{h=!h,r.setDemoMode(h),a.textContent=h?"Stop Demo":"Demo Mode",s.textContent=h?"Demo mode active":"Ready"}),document.addEventListener("keydown",l=>{var c;l.key.toLowerCase()==="n"&&((c=r.loadServerShader)==null||c.call(r))})});
