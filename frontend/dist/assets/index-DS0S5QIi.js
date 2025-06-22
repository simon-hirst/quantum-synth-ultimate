(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const a of t)if(a.type==="childList")for(const r of a.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&i(r)}).observe(document,{childList:!0,subtree:!0});function s(t){const a={};return t.integrity&&(a.integrity=t.integrity),t.referrerPolicy&&(a.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?a.credentials="include":t.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function i(t){if(t.ep)return;t.ep=!0;const a=s(t);fetch(t.href,a)}})();class f{constructor(e,s={}){var i,t;if(this.opts=s,this.gl=null,this.program=null,this.buffer=null,this.vertexShaderSrc=`
    attribute vec2 aPos;
    varying vec2 vUV;
    void main(){
      vUV = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `,this.audioCtx=null,this.analyser=null,this.freq=null,this.stream=null,this.demo=!1,this.u={},this.textures=[],this.anim=null,this.frames=0,this.lastTick=performance.now(),this.canvas=e,this.resizeCanvas(),window.addEventListener("resize",()=>this.resizeCanvas()),window.addEventListener("orientationchange",()=>this.resizeCanvas()),this.gl=e.getContext("webgl2")||e.getContext("webgl"),!this.gl){this.paintFallback(),(t=(i=this.opts).onStatus)==null||t.call(i,"WebGL not supported");return}}async start(){await this.loadServerShader(),this.loop()}stop(){this.anim&&cancelAnimationFrame(this.anim),this.anim=null}async startScreenShare(){var t;const e=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!e.getAudioTracks().length)throw e.getTracks().forEach(a=>a.stop()),new Error("No audio shared");(t=this.audioCtx)==null||t.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=512,this.audioCtx.createMediaStreamSource(e).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.stream=e;const i=e.getVideoTracks()[0];i&&(i.onended=()=>this.stopScreenShare())}stopScreenShare(){var e;(e=this.stream)==null||e.getTracks().forEach(s=>s.stop()),this.stream=null,this.freq=null,this.audioCtx&&(this.audioCtx.close().catch(()=>{}),this.audioCtx=null),this.analyser=null}isSharing(){return!!this.stream}setDemoMode(e){this.demo=e,e&&this.stopScreenShare()}async loadServerShader(){var i,t,a,r,n,o,l,c;(t=(i=this.opts).onStatus)==null||t.call(i,"Fetching shader…");let e;try{e=await fetch("/api/shader/next",{cache:"no-store"})}catch{(r=(a=this.opts).onStatus)==null||r.call(a,"Backend unreachable, using local shader"),await this.buildLocal();return}if(!e.ok){(o=(n=this.opts).onStatus)==null||o.call(n,"Shader fetch failed, using local shader"),await this.buildLocal();return}const s=await e.json();await this.buildFromServer(s),(c=(l=this.opts).onStatus)==null||c.call(l,`Loaded: ${s.name}`)}async buildFromServer(e){const s=this.gl,i=this.compile(s.VERTEX_SHADER,this.vertexShaderSrc),t=this.compile(s.FRAGMENT_SHADER,e.code),a=s.createProgram();if(s.attachShader(a,i),s.attachShader(a,t),s.linkProgram(a),!s.getProgramParameter(a,s.LINK_STATUS)){console.error("Program link error:",s.getProgramInfoLog(a)),await this.buildLocal();return}this.program=a,this.u={};const r=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),n=s.createBuffer();s.bindBuffer(s.ARRAY_BUFFER,n),s.bufferData(s.ARRAY_BUFFER,r,s.STATIC_DRAW),this.buffer=n,s.useProgram(this.program);const o=s.getAttribLocation(this.program,"aPos");s.enableVertexAttribArray(o),s.vertexAttribPointer(o,2,s.FLOAT,!1,0,0);const l=["uTime","uRes","uLevel","uBands"];for(const c of l)this.u[c]=s.getUniformLocation(this.program,c);if(this.textures=[],Array.isArray(e.textures)&&e.textures.length){let c=0;for(const h of e.textures){const d=s.createTexture();await this.uploadTextureFromDataURL(d,h.dataUrl,c),this.textures.push({name:h.name,tex:d,unit:c});const u=s.getUniformLocation(this.program,h.name);u&&s.uniform1i(u,c),c++}}this.resizeCanvas()}async buildLocal(){const e=this.gl,s=this.compile(e.VERTEX_SHADER,this.vertexShaderSrc),i=this.compile(e.FRAGMENT_SHADER,`
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      uniform vec2  uRes;
      uniform float uLevel;
      uniform float uBands[4];
      void main(){
        vec2 uv = vUV;
        float t = uTime * .6;
        float b = uBands[0]*.5 + uBands[2]*.5;
        vec3 col = vec3(
          .4 + .6*sin(t + (uv.x+uv.y)*18.0 + b*4.0),
          .4 + .6*sin(t + (uv.x-uv.y)*22.0 + b*6.0 + 2.1),
          .4 + .6*sin(t + (uv.y)*20.0 + b*5.0 + 4.2)
        ) * (0.5 + 1.5*uLevel);
        gl_FragColor = vec4(col,1.0);
      }
    `),t=e.createProgram();if(e.attachShader(t,s),e.attachShader(t,i),e.linkProgram(t),!e.getProgramParameter(t,e.LINK_STATUS)){console.error("Link error:",e.getProgramInfoLog(t)),this.paintFallback();return}this.program=t,this.u={uTime:e.getUniformLocation(this.program,"uTime"),uRes:e.getUniformLocation(this.program,"uRes"),uLevel:e.getUniformLocation(this.program,"uLevel"),uBands:e.getUniformLocation(this.program,"uBands")};const a=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),r=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,r),e.bufferData(e.ARRAY_BUFFER,a,e.STATIC_DRAW),this.buffer=r,e.useProgram(this.program);const n=e.getAttribLocation(this.program,"aPos");e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,0,0),this.resizeCanvas()}compile(e,s){const i=this.gl,t=i.createShader(e);if(i.shaderSource(t,s),i.compileShader(t),!i.getShaderParameter(t,i.COMPILE_STATUS)){const a=i.getShaderInfoLog(t);throw i.deleteShader(t),new Error("Shader compile error: "+a)}return t}async uploadTextureFromDataURL(e,s,i){const t=this.gl;await new Promise((a,r)=>{const n=new Image;n.onload=()=>{t.activeTexture(t.TEXTURE0+i),t.bindTexture(t.TEXTURE_2D,e),t.pixelStorei(t.UNPACK_FLIP_Y_WEBGL,0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,t.RGBA,t.UNSIGNED_BYTE,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT),a()},n.onerror=()=>r(new Error("texture load failed")),n.src=s})}loop(){const e=s=>{this.render(s),this.anim=requestAnimationFrame(e)};this.anim=requestAnimationFrame(e)}render(e){var r,n;const s=this.gl;if(!s||!this.program)return;this.frames++,e-this.lastTick>=1e3&&((n=(r=this.opts).onFps)==null||n.call(r,this.frames),this.frames=0,this.lastTick=e);let t=0,a=[0,0,0,0];if(this.analyser&&this.freq){this.analyser.getByteFrequencyData(this.freq);const o=this.freq.length,l=(c,h)=>{let d=0;for(let u=c;u<h;u++)d+=this.freq[u];return d/((h-c)*255)};a[0]=l(0,o/8|0),a[1]=l(o/8|0,o/4|0),a[2]=l(o/4|0,o/2|0),a[3]=l(o/2|0,o),t=(a[0]+a[1]+a[2]+a[3])/4}else if(this.demo){const o=e/1e3;a=[(Math.sin(o*1.2)+1)/2,(Math.sin(o*1.7+1)+1)/2,(Math.sin(o*2.3+2)+1)/2,(Math.sin(o*2.9+3)+1)/2],t=(a[0]+a[1]+a[2]+a[3])/4}s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT),this.u.uTime&&s.uniform1f(this.u.uTime,e/1e3),this.u.uRes&&s.uniform2f(this.u.uRes,this.canvas.width,this.canvas.height),this.u.uLevel&&s.uniform1f(this.u.uLevel,t),this.u.uBands&&s.uniform1fv(this.u.uBands,new Float32Array(a));for(const o of this.textures)s.activeTexture(s.TEXTURE0+o.unit),s.bindTexture(s.TEXTURE_2D,o.tex);s.drawArrays(s.TRIANGLES,0,6)}paintFallback(){const e=this.canvas.getContext("2d");if(!e)return;const s=this.canvas.clientWidth,i=this.canvas.clientHeight,t=e.createLinearGradient(0,0,s,i);t.addColorStop(0,"#0b1020"),t.addColorStop(1,"#000"),e.fillStyle=t,e.fillRect(0,0,s,i),e.fillStyle="#9efcff",e.font="14px system-ui, -apple-system, Segoe UI, Roboto",e.fillText("WebGL unavailable — using fallback",16,28)}resizeCanvas(){var r;const s=(this.canvas.parentElement??document.body).getBoundingClientRect(),i=Math.max(1,Math.floor(s.width)),t=Math.max(1,Math.floor(s.height||0||420)),a=Math.max(1,Math.round(window.devicePixelRatio||1));this.canvas.style.width=`${i}px`,this.canvas.style.height=`${t}px`,(this.canvas.width!==i*a||this.canvas.height!==t*a)&&(this.canvas.width=i*a,this.canvas.height=t*a),(r=this.gl)==null||r.viewport(0,0,this.canvas.width,this.canvas.height)}}document.addEventListener("DOMContentLoaded",async()=>{const m=document.querySelector("#app");if(!m)return;m.innerHTML=`
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
  `;const e=document.getElementById("visualizer"),s=document.getElementById("status"),i=document.getElementById("fps"),t=document.getElementById("btnShare"),a=document.getElementById("btnDemo");if(!e)return;const r=new f(e,{onStatus:l=>{s.textContent=l},onFps:l=>{i.textContent=`FPS: ${l}`}});await r.start();const n=()=>{t.textContent=r.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};n(),t.addEventListener("click",async()=>{if(r.isSharing()){r.stopScreenShare(),s.textContent="Screen share stopped",n();return}t.disabled=!0,s.textContent='Requesting screen share (enable "Share audio")…';try{await r.startScreenShare(),s.textContent="Screen sharing active"}catch{s.textContent="Permission denied or no audio shared"}finally{t.disabled=!1,n()}});let o=!1;a.addEventListener("click",()=>{o=!o,r.setDemoMode(o),a.textContent=o?"Stop Demo":"Demo Mode",s.textContent=o?"Demo mode active":"Ready"}),document.addEventListener("keydown",l=>{var c;l.key.toLowerCase()==="n"&&((c=r.loadServerShader)==null||c.call(r))})});
