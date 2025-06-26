(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))e(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&e(r)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function e(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();class N{constructor(t,s={}){var e,a;if(this.opts=s,this.gl=null,this.program=null,this.u={},this.textures=[],this.wow=!0,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.copyProg=null,this.wowProg=null,this.posBuf=null,this.decay=.82,this.wowUniforms={},this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.audioCtx=null,this.analyser=null,this.freq=null,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=43,this.env=0,this.envAttack=.28,this.envRelease=.06,this.lastEnergy=0,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.stream=null,this.demo=!1,this.anim=null,this.frames=0,this.lastTick=performance.now(),this.canvas=t,this.resizeCanvas(),window.addEventListener("resize",()=>this.resizeCanvas()),window.addEventListener("orientationchange",()=>this.resizeCanvas()),this.gl=t.getContext("webgl")||t.getContext("webgl2"),!this.gl){this.paintFallback(),(a=(e=this.opts).onStatus)==null||a.call(e,"WebGL not supported");return}this.initGLCommon(),this.initDefaultStreamTexture()}initGLCommon(){const t=this.gl,s=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,e),t.bufferData(t.ARRAY_BUFFER,s,t.STATIC_DRAW),this.posBuf=e;const a=`
      attribute vec2 aPos; varying vec2 vUV;
      void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
    `,i=`
      precision mediump float; varying vec2 vUV; uniform sampler2D uTex;
      void main(){ gl_FragColor = texture2D(uTex, vUV); }
    `;this.copyProg=this.link(a,i),t.useProgram(this.copyProg);const r=t.getAttribLocation(this.copyProg,"aPos");t.enableVertexAttribArray(r),t.vertexAttribPointer(r,2,t.FLOAT,!1,0,0);const o=`
      precision mediump float;
      varying vec2 vUV;
      uniform sampler2D uFeedback;
      uniform sampler2D uStreamTex;
      uniform vec2  uRes;
      uniform float uTime;
      uniform float uDecay;
      uniform float uEnv;     // smoothed RMS 0..1
      uniform float uBeat;    // 0..1 impulse
      uniform float uKick;    // 0..1
      uniform float uSnare;   // 0..1
      uniform float uHat;     // 0..1
      uniform float uLow;     // bands[0]
      uniform float uMid;     // bands[2]
      uniform float uAir;     // bands[3]

      // palette
      vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67) + t)); }

      vec2 kaleido(vec2 uv, float seg){
        uv = uv*2.0 - 1.0;
        float a = atan(uv.y, uv.x);
        float r = length(uv);
        float m = 6.2831/seg;
        a = mod(a, m);
        a = abs(a - 0.5*m);
        uv = vec2(cos(a), sin(a))*r;
        return uv*0.5 + 0.5;
      }

      void main(){
        vec2 res = uRes;
        vec2 uv = vUV;
        float t = uTime;

        // hats increase kaleido segments
        float seg = 5.0 + floor(uHat*7.0);
        uv = kaleido(uv, seg);

        // radial bass warp
        vec2 c = uv - 0.5;
        float r = length(c);
        float bassWarp = 0.35*uKick + 0.12*uSnare;
        uv += c * (bassWarp * r);

        // swirl drift with mids
        float angle = (uMid*0.8 + 0.2)*sin(t*0.4) + r*(0.3 + 0.25*uLow);
        vec2 sw = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * (uv-0.5) + 0.5;
        vec3 stream = texture2D(uStreamTex, sw + vec2(t*0.02, -t*0.015)).rgb;

        // base pattern (bands animate frequency)
        float f1 = 16.0 + 9.0*uLow;
        float f2 = 22.0 + 12.0*uAir;
        float w = sin((uv.x+uv.y)*f1 + t*3.0 + uSnare*8.0)*0.5 + 0.5;
        float v = cos((uv.x-uv.y)*f2 - t*2.2 + uHat*12.0)*0.5 + 0.5;
        vec3 base = pal(w*0.7 + v*0.3 + t*0.05 + uMid*0.2);

        // previous frame (trail)
        vec3 prev = texture2D(uFeedback, uv + c*0.01*uEnv).rgb * uDecay;

        // composite with stream color
        vec3 col = mix(base, stream, 0.35 + 0.25*uAir);
        col = mix(prev, col, 0.55 + 0.4*(uEnv));

        // beat flash & chroma-ish tint
        col += uBeat * vec3(0.75, 0.5, 0.9);

        // vignette
        float vg = 1.0 - dot(c,c)*0.9;
        col *= clamp(vg, 0.25, 1.1);

        gl_FragColor = vec4(col,1.0);
      }
    `;this.wowProg=this.link(a,o),this.ensureFBOs()}link(t,s){const e=this.gl,a=e.createShader(e.VERTEX_SHADER);if(e.shaderSource(a,t),e.compileShader(a),!e.getShaderParameter(a,e.COMPILE_STATUS))throw new Error("VS: "+e.getShaderInfoLog(a));const i=e.createShader(e.FRAGMENT_SHADER);if(e.shaderSource(i,s),e.compileShader(i),!e.getShaderParameter(i,e.COMPILE_STATUS))throw new Error("FS: "+e.getShaderInfoLog(i));const r=e.createProgram();if(e.attachShader(r,a),e.attachShader(r,i),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS))throw new Error("LINK: "+e.getProgramInfoLog(r));return r}ensureFBOs(){const t=this.gl;if(!t)return;const s=Math.max(2,Math.floor(this.canvas.width/2)),e=Math.max(2,Math.floor(this.canvas.height/2)),a=()=>{const o=t.createTexture();return t.bindTexture(t.TEXTURE_2D,o),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,s,e,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),o},i=o=>{const n=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,n),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,o,0),t.bindFramebuffer(t.FRAMEBUFFER,null),n},r=!this.texA||!this.texB||t.getTexParameter(t.TEXTURE_2D,t.TEXTURE_WIDTH)!==s||t.getTexParameter(t.TEXTURE_2D,t.TEXTURE_HEIGHT)!==e;(!this.texA||!this.texB||r)&&(this.texA=a(),this.fbA=i(this.texA),this.texB=a(),this.fbB=i(this.texB))}initDefaultStreamTexture(){const t=this.gl;this.streamTex=t.createTexture(),this.streamW=1,this.streamH=1,t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex);const s=new Uint8Array([0,0,0,255]);t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,s),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.connectStream(),this.loop()}stop(){var t;this.anim&&cancelAnimationFrame(this.anim),this.anim=null,(t=this.ws)==null||t.close()}async loadServerShader(t){var i,r,o,n;const s=this.gl;if(!s)return;const e=new URLSearchParams;t&&e.set("type",t),e.set("ts",Date.now().toString());const a="/api/shader/next?"+e.toString();try{const h=await fetch(a,{cache:"no-store"});if(!h.ok)throw new Error("HTTP "+h.status);const c=await h.json(),f=this.link(`
        attribute vec2 aPos; varying vec2 vUV;
        void main(){ vUV=aPos*0.5+0.5; gl_Position=vec4(aPos,0.0,1.0); }`,c.code);this.program=f,this.u={},this.textures=[],this.useProgram(f);for(const l of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes"])this.u[l]=s.getUniformLocation(f,l);let E=0;if(c.textures)for(const l of c.textures){const x=s.createTexture();await this.uploadTexture(x,l.dataUrl,E,!0),this.textures.push({name:l.name,tex:x,unit:E,meta:l});const R=s.getUniformLocation(f,l.name);R&&s.uniform1i(R,E),l.gridCols&&l.gridRows&&(this.u.uAtlasGrid&&s.uniform2f(this.u.uAtlasGrid,l.gridCols,l.gridRows),this.u.uAtlasFrames&&s.uniform1f(this.u.uAtlasFrames,l.frames??l.gridCols*l.gridRows),this.u.uAtlasFPS&&s.uniform1f(this.u.uAtlasFPS,l.fps??24)),E++}const g=s.getUniformLocation(f,"uStreamTex");g&&s.uniform1i(g,this.streamUnit),this.u.uStreamRes&&s.uniform2f(this.u.uStreamRes,this.streamW,this.streamH),(r=(i=this.opts).onStatus)==null||r.call(i,`Loaded: ${c.name}`)}catch{(n=(o=this.opts).onStatus)==null||n.call(o,"Server shader failed; using WOW mode"),this.wow=!0}}useProgram(t){const s=this.gl;s.useProgram(t);const e=s.getAttribLocation(t,"aPos");e!==-1&&(s.bindBuffer(s.ARRAY_BUFFER,this.posBuf),s.enableVertexAttribArray(e),s.vertexAttribPointer(e,2,s.FLOAT,!1,0,0))}async uploadTexture(t,s,e,a){const i=this.gl;await new Promise((r,o)=>{const n=new Image;n.onload=()=>{i.activeTexture(i.TEXTURE0+e),i.bindTexture(i.TEXTURE_2D,t),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,0),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,i.RGBA,i.UNSIGNED_BYTE,n),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR);const h=a?i.REPEAT:i.CLAMP_TO_EDGE;i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,h),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,h),r()},n.onerror=()=>o(new Error("texture load failed")),n.src=s})}async startScreenShare(){var a;const t=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!t.getAudioTracks().length)throw t.getTracks().forEach(i=>i.stop()),new Error("No audio shared");(a=this.audioCtx)==null||a.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=1024,this.audioCtx.createMediaStreamSource(t).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.lastMag=new Float32Array(this.analyser.frequencyBinCount),this.stream=t;const e=t.getVideoTracks()[0];e&&(e.onended=()=>this.stopScreenShare())}stopScreenShare(){var t;(t=this.stream)==null||t.getTracks().forEach(s=>s.stop()),this.stream=null,this.freq=null,this.audioCtx&&(this.audioCtx.close().catch(()=>{}),this.audioCtx=null),this.analyser=null}isSharing(){return!!this.stream}setDemoMode(t){this.demo=t,t&&this.stopScreenShare()}connectStream(){var s;const t=location.protocol==="https:"?"wss:":"ws:";(s=this.ws)==null||s.close(),this.ws=new WebSocket(`${t}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var e;(e=this.ws)==null||e.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=e=>{typeof e.data!="string"&&this.onStreamFrame(e.data)}}onStreamFrame(t){const s=this.gl;if(!s)return;const e=new DataView(t,0,24);if(!String.fromCharCode(...new Uint8Array(t.slice(0,8))).startsWith("FRAMEv1"))return;const i=e.getUint32(8,!0),r=e.getUint32(12,!0);if(e.getUint32(16,!0)!==4)return;const n=new Uint8Array(t,24);if(!this.streamTex||this.streamW!==i||this.streamH!==r){this.streamTex=s.createTexture(),this.streamW=i,this.streamH=r;const h=this.program?s.getUniformLocation(this.program,"uStreamTex"):null;h&&s.uniform1i(h,this.streamUnit)}s.activeTexture(s.TEXTURE0+this.streamUnit),s.bindTexture(s.TEXTURE_2D,this.streamTex),s.pixelStorei(s.UNPACK_FLIP_Y_WEBGL,0),n.length===i*r*4&&s.texImage2D(s.TEXTURE_2D,0,s.RGBA,i,r,0,s.RGBA,s.UNSIGNED_BYTE,n),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.REPEAT),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.REPEAT)}loop(){const t=s=>{this.render(s),this.anim=requestAnimationFrame(t)};this.anim=requestAnimationFrame(t)}render(t){var i,r,o;if(!this.gl)return;this.frames++,t-this.lastTick>=1e3&&((r=(i=this.opts).onFps)==null||r.call(i,this.frames),this.frames=0,this.lastTick=t);let a=0;if(this.analyser&&this.freq){this.analyser.getByteFrequencyData(this.freq);const n=this.freq.length,h=new Float32Array(n);for(let u=0;u<n;u++)h[u]=this.freq[u]/255;let c=0;if(this.lastMag)for(let u=0;u<n;u++){const T=h[u]-this.lastMag[u];T>0&&(c+=T)}this.lastMag=h,this.fluxRing.length<this.fluxSize?this.fluxRing.push(c):(this.fluxRing[this.fluxIdx]=c,this.fluxIdx=(this.fluxIdx+1)%this.fluxSize);const f=this.fluxRing.reduce((u,T)=>u+T,0)/Math.max(1,this.fluxRing.length),E=c>f*1.35&&this.beatCooldown<=0;this.beat=Math.max(0,this.beat-.12),E&&(this.beat=1,this.beatCooldown=8),this.beatCooldown>0&&this.beatCooldown--;let g=0;for(let u=0;u<n;u++)g+=h[u]*h[u];const l=Math.sqrt(g/n);l>this.env?this.env+=(l-this.env)*this.envAttack:this.env+=(l-this.env)*this.envRelease,a=this.env;const _=(((o=this.audioCtx)==null?void 0:o.sampleRate)||48e3)/2/n,m=u=>Math.max(0,Math.min(n-1,Math.round(u/_))),P=m(20),y=m(120),w=m(150),S=m(250),F=m(5e3),L=m(12e3),D=m(500),B=m(2e3),M=m(80),C=m(250),X=m(8e3),I=m(16e3),d=(u,T)=>{let b=0;const A=Math.min(u,T),U=Math.max(u,T),k=Math.max(1,U-A);for(let p=A;p<U;p++)b+=h[p];return b/k};this.kick=d(P,y),this.snare=d(w,S),this.hat=d(F,L),this.bands[0]=d(M,C),this.bands[1]=d(w,S),this.bands[2]=d(D,B),this.bands[3]=d(X,I)}else if(this.demo){const n=t/1e3;a=.5+.5*Math.sin(n*.8),this.kick=(Math.sin(n*2)+1)/2,this.snare=(Math.sin(n*3.1+1)+1)/2,this.hat=(Math.sin(n*9+2)+1)/2,this.bands=[this.kick*.8,this.snare*.6,.5,this.hat*.7],this.beat=Math.max(0,this.beat-.08),Math.sin(n*2.5)>.99&&(this.beat=1)}this.wow?this.renderWOW(t/1e3,a):this.renderServer(t/1e3,a)}renderServer(t,s){const e=this.gl;if(!this.program){this.wow=!0;return}e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),this.useProgram(this.program),this.u.uTime&&e.uniform1f(this.u.uTime,t),this.u.uRes&&e.uniform2f(this.u.uRes,this.canvas.width,this.canvas.height),this.u.uLevel&&e.uniform1f(this.u.uLevel,s),this.u.uBands&&e.uniform1fv(this.u.uBands,new Float32Array(this.bands)),this.u.uPulse&&e.uniform1f(this.u.uPulse,Math.max(0,this.env-.5)*2),this.u.uBeat&&e.uniform1f(this.u.uBeat,this.beat);for(const i of this.textures)e.activeTexture(e.TEXTURE0+i.unit),e.bindTexture(e.TEXTURE_2D,i.tex);e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex);const a=this.textures.find(i=>i.meta&&i.meta.gridCols&&i.meta.gridRows);if(a!=null&&a.meta){const i=a.meta.frames??a.meta.gridCols*a.meta.gridRows,r=a.meta.fps??24,o=Math.floor(t*r)%Math.max(1,i);this.u.uAtlasGrid&&e.uniform2f(this.u.uAtlasGrid,a.meta.gridCols,a.meta.gridRows),this.u.uAtlasFrames&&e.uniform1f(this.u.uAtlasFrames,i),this.u.uAtlasFPS&&e.uniform1f(this.u.uAtlasFPS,r),this.u.uFrame&&e.uniform1f(this.u.uFrame,o)}e.drawArrays(e.TRIANGLES,0,6)}renderWOW(t,s){const e=this.gl;this.ensureFBOs(),e.bindFramebuffer(e.FRAMEBUFFER,this.fbA),e.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),this.useProgram(this.wowProg);const a=o=>e.getUniformLocation(this.wowProg,o);e.uniform1f(a("uTime"),t),e.uniform2f(a("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(a("uDecay"),this.decay),e.uniform1f(a("uEnv"),s),e.uniform1f(a("uBeat"),this.beat),e.uniform1f(a("uKick"),this.kick),e.uniform1f(a("uSnare"),this.snare),e.uniform1f(a("uHat"),this.hat),e.uniform1f(a("uLow"),this.bands[0]),e.uniform1f(a("uMid"),this.bands[2]),e.uniform1f(a("uAir"),this.bands[3]),e.activeTexture(e.TEXTURE0+7),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(a("uFeedback"),7),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.uniform1i(e.getUniformLocation(this.wowProg,"uStreamTex"),this.streamUnit),e.drawArrays(e.TRIANGLES,0,6),e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),this.useProgram(this.copyProg),e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(e.getUniformLocation(this.copyProg,"uTex"),0),e.drawArrays(e.TRIANGLES,0,6);const i=this.texA;this.texA=this.texB,this.texB=i;const r=this.fbA;this.fbA=this.fbB,this.fbB=r}paintFallback(){const t=this.canvas.getContext("2d");if(!t)return;const s=this.canvas.clientWidth,e=this.canvas.clientHeight,a=t.createLinearGradient(0,0,s,e);a.addColorStop(0,"#0b1020"),a.addColorStop(1,"#000"),t.fillStyle=a,t.fillRect(0,0,s,e),t.fillStyle="#9efcff",t.font="14px system-ui,-apple-system,Segoe UI,Roboto",t.fillText("WebGL unavailable — using fallback",16,28)}resizeCanvas(){var r;const s=(this.canvas.parentElement??document.body).getBoundingClientRect(),e=Math.max(1,Math.floor(s.width)),a=Math.max(1,Math.floor(s.height||0||420)),i=Math.max(1,Math.round(window.devicePixelRatio||1));this.canvas.style.width=`${e}px`,this.canvas.style.height=`${a}px`,(this.canvas.width!==e*i||this.canvas.height!==a*i)&&(this.canvas.width=e*i,this.canvas.height=a*i),(r=this.gl)==null||r.viewport(0,0,this.canvas.width,this.canvas.height),this.ensureFBOs()}setDemoMode(t){this.demo=t,t&&this.stopScreenShare()}isSharing(){return!!this.stream}toggleWow(){var t,s;this.wow=!this.wow,(s=(t=this.opts).onStatus)==null||s.call(t,this.wow?"WOW mode (local)":"Server shader mode")}async loadServerShaderPublic(){await this.loadServerShader("composite")}}document.addEventListener("DOMContentLoaded",async()=>{const v=document.querySelector("#app");if(!v)return;v.innerHTML=`
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
  `;const t=document.getElementById("visualizer"),s=document.getElementById("status"),e=document.getElementById("fps"),a=document.getElementById("btnShare"),i=document.getElementById("btnDemo");if(!t)return;const r=new N(t,{onStatus:h=>{s.textContent=h},onFps:h=>{e.textContent=`FPS: ${h}`}});await r.start();const o=()=>{a.textContent=r.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),a.addEventListener("click",async()=>{if(r.isSharing()){r.stopScreenShare(),s.textContent="Screen share stopped",o();return}a.disabled=!0,s.textContent='Requesting screen share (enable "Share audio")…';try{await r.startScreenShare(),s.textContent="Screen sharing active"}catch{s.textContent="Permission denied or no audio shared"}finally{a.disabled=!1,o()}});let n=!1;i.addEventListener("click",()=>{n=!n,r.setDemoMode(n),i.textContent=n?"Stop Demo":"Demo Mode",s.textContent=n?"Demo mode active":"Ready"}),document.addEventListener("keydown",h=>{var c;h.key.toLowerCase()==="n"&&((c=r.loadServerShader)==null||c.call(r))})});
