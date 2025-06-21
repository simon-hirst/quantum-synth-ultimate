(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))a(e);new MutationObserver(e=>{for(const s of e)if(s.type==="childList")for(const n of s.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&a(n)}).observe(document,{childList:!0,subtree:!0});function i(e){const s={};return e.integrity&&(s.integrity=e.integrity),e.referrerPolicy&&(s.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?s.credentials="include":e.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function a(e){if(e.ep)return;e.ep=!0;const s=i(e);fetch(e.href,s)}})();class m{constructor(t,i={}){var a,e,s,n;if(this.opts=i,this.gl=null,this.program=null,this.buffer=null,this.animationId=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.stream=null,this.demo=!1,this.uTime=null,this.uRes=null,this.uLevel=null,this.uBands=null,this.lastTick=performance.now(),this.frames=0,this.canvas=t,this.resizeCanvas(),window.addEventListener("resize",()=>this.resizeCanvas()),window.addEventListener("orientationchange",()=>this.resizeCanvas()),this.gl=t.getContext("webgl2")||t.getContext("webgl"),!this.gl){this.paintFallback(),(e=(a=this.opts).onStatus)==null||e.call(a,"WebGL not supported");return}this.initGL(),(n=(s=this.opts).onStatus)==null||n.call(s,"Ready")}start(){const t=i=>{this.render(i),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}async startScreenShare(){var s,n,o,r,l;(n=(s=this.opts).onStatus)==null||n.call(s,"Requesting screen…");const t=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!(t.getAudioTracks().length>0))throw t.getTracks().forEach(c=>c.stop()),new Error("No audio shared");(o=this.audioCtx)==null||o.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=512,this.audioCtx.createMediaStreamSource(t).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.stream=t,this.demo=!1,(l=(r=this.opts).onStatus)==null||l.call(r,"Screen sharing active");const e=t.getVideoTracks()[0];e&&(e.onended=()=>{var c,h;this.stopScreenShare(),(h=(c=this.opts).onStatus)==null||h.call(c,"Screen share ended")})}stopScreenShare(){var t;(t=this.stream)==null||t.getTracks().forEach(i=>i.stop()),this.stream=null,this.freq=null,this.audioCtx&&(this.audioCtx.close().catch(()=>{}),this.audioCtx=null),this.analyser=null}isSharing(){return!!this.stream}setDemoMode(t){this.demo=t,t&&this.stopScreenShare()}resizeCanvas(){var n;const i=(this.canvas.parentElement??document.body).getBoundingClientRect(),a=Math.max(1,Math.floor(i.width)),e=Math.max(1,Math.floor(i.height||0||420)),s=Math.max(1,Math.round(window.devicePixelRatio||1));this.canvas.style.width=`${a}px`,this.canvas.style.height=`${e}px`,(this.canvas.width!==a*s||this.canvas.height!==e*s)&&(this.canvas.width=a*s,this.canvas.height=e*s),(n=this.gl)==null||n.viewport(0,0,this.canvas.width,this.canvas.height)}initGL(){const t=this.gl,i=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),a=`
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `,e=`
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      uniform vec2  uRes;
      uniform float uLevel;
      uniform float uBands[4];

      float sat(float x){ return clamp(x, 0.0, 1.0); }

      void main() {
        vec2 uv = vUV;
        float t = uTime * 0.6;

        // combine bands
        float bass   = uBands[0];
        float mid    = uBands[1];
        float high   = uBands[2];
        float air    = uBands[3];
        float energy = uLevel;

        // warps modulated by energy
        float swirl = sin( (uv.x*12.0 + uv.y*8.0) + t*3.0 + bass*6.0 ) * 0.5 + 0.5;
        float ring  = sin( (length(uv-0.5)*24.0 - t*2.5) + mid*8.0 ) * 0.5 + 0.5;

        vec3 base = vec3(
          sat(0.35 + 0.65*sin(t + swirl + 0.0)),
          sat(0.35 + 0.65*sin(t + ring  + 2.1)),
          sat(0.35 + 0.65*sin(t + swirl + 4.2))
        );

        // intensity & tint react to energy/high band
        float boost = 0.4 + 1.6*energy;
        vec3 tint = mix(vec3(0.10,0.90,0.85), vec3(1.0,0.2,0.6), air);
        vec3 col = base * boost;
        col = mix(col, tint, 0.25*high);

        gl_FragColor = vec4(col, 1.0);
      }
    `,s=this.compile(t.VERTEX_SHADER,a),n=this.compile(t.FRAGMENT_SHADER,e),o=t.createProgram();if(t.attachShader(o,s),t.attachShader(o,n),t.linkProgram(o),!t.getProgramParameter(o,t.LINK_STATUS)){console.error("Program link error:",t.getProgramInfoLog(o)),this.paintFallback();return}this.program=o;const r=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,r),t.bufferData(t.ARRAY_BUFFER,i,t.STATIC_DRAW),this.buffer=r,t.useProgram(this.program);const l=t.getAttribLocation(this.program,"aPos");t.enableVertexAttribArray(l),t.vertexAttribPointer(l,2,t.FLOAT,!1,0,0),this.uTime=t.getUniformLocation(this.program,"uTime"),this.uRes=t.getUniformLocation(this.program,"uRes"),this.uLevel=t.getUniformLocation(this.program,"uLevel"),this.uBands=t.getUniformLocation(this.program,"uBands"),this.resizeCanvas()}render(t){var n,o;const i=this.gl;if(!i||!this.program)return;this.frames++,t-this.lastTick>=1e3&&((o=(n=this.opts).onFps)==null||o.call(n,this.frames),this.frames=0,this.lastTick=t);let e=0,s=[0,0,0,0];if(this.analyser&&this.freq){this.analyser.getByteFrequencyData(this.freq);const r=this.freq.length,l=(c,h)=>{let f=0;for(let u=c;u<h;u++)f+=this.freq[u];return f/((h-c)*255)};s[0]=l(0,r/8|0),s[1]=l(r/8|0,r/4|0),s[2]=l(r/4|0,r/2|0),s[3]=l(r/2|0,r),e=(s[0]+s[1]+s[2]+s[3])/4}else if(this.demo){const r=t/1e3;s=[(Math.sin(r*1.2)+1)/2,(Math.sin(r*1.8+1)+1)/2,(Math.sin(r*2.3+2)+1)/2,(Math.sin(r*2.9+3)+1)/2],e=(s[0]+s[1]+s[2]+s[3])/4}i.clearColor(0,0,0,1),i.clear(i.COLOR_BUFFER_BIT),this.uTime&&i.uniform1f(this.uTime,t/1e3),this.uRes&&i.uniform2f(this.uRes,this.canvas.width,this.canvas.height),this.uLevel&&i.uniform1f(this.uLevel,e),this.uBands&&i.uniform1fv(this.uBands,new Float32Array(s)),i.drawArrays(i.TRIANGLES,0,6)}paintFallback(){const t=this.canvas.getContext("2d");if(!t)return;const i=this.canvas.clientWidth,a=this.canvas.clientHeight;t.fillStyle="#000",t.fillRect(0,0,i,a),t.fillStyle="#9efcff",t.font="14px system-ui, -apple-system, Segoe UI, Roboto",t.fillText("WebGL unavailable — using fallback",16,28)}compile(t,i){const a=this.gl,e=a.createShader(t);if(a.shaderSource(e,i),a.compileShader(e),!a.getShaderParameter(e,a.COMPILE_STATUS)){const s=a.getShaderInfoLog(e);throw a.deleteShader(e),new Error("Shader compile error: "+s)}return e}}document.addEventListener("DOMContentLoaded",()=>{const d=document.querySelector("#app");if(!d)return;d.innerHTML=`
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
        </ol>

        <div class="qs-footer">
          built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">https://github.com/simon-hirst</a>
        </div>
      </aside>

      <main class="qs-stage">
        <canvas id="visualizer" class="qs-canvas"></canvas>
      </main>
    </div>
  `;const t=document.getElementById("visualizer"),i=document.getElementById("status"),a=document.getElementById("fps"),e=document.getElementById("btnShare"),s=document.getElementById("btnDemo");if(!t)return;const n=new m(t,{onStatus:r=>{i.textContent=r},onFps:r=>{a.textContent=`FPS: ${r}`}});n.start(),e.addEventListener("click",async()=>{e.disabled=!0,i.textContent='Requesting screen share (enable "Share audio")…';try{await n.startScreenShare(),i.textContent="Screen sharing active",e.textContent="Stop Screen Sharing",e.disabled=!1,e.onclick=async()=>{if(n.isSharing())n.stopScreenShare(),i.textContent="Screen share stopped",e.textContent="Start Screen Sharing";else{e.disabled=!0,i.textContent="Requesting screen share…";try{await n.startScreenShare(),i.textContent="Screen sharing active",e.textContent="Stop Screen Sharing"}catch{i.textContent="Permission denied or no audio shared"}finally{e.disabled=!1}}}}catch{i.textContent="Permission denied or no audio shared",e.disabled=!1}});let o=!1;s.addEventListener("click",()=>{o=!o,n.setDemoMode(o),s.textContent=o?"Stop Demo":"Demo Mode",i.textContent=o?"Demo mode active":"Ready"})});
