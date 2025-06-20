(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const s of e)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function r(e){const s={};return e.integrity&&(s.integrity=e.integrity),e.referrerPolicy&&(s.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?s.credentials="include":e.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(e){if(e.ep)return;e.ep=!0;const s=r(e);fetch(e.href,s)}})();class h{constructor(t){if(this.gl=null,this.program=null,this.buffer=null,this.animationId=null,this.shaderIndex=0,this.lastSwitch=0,this.canvas=t,this.resizeCanvas(),window.addEventListener("resize",()=>this.resizeCanvas()),window.addEventListener("orientationchange",()=>this.resizeCanvas()),this.gl=t.getContext("webgl2")||t.getContext("webgl"),!this.gl){this.setup2DFallback();return}this.initGL()}start(){if(!this.gl||!this.program)return;const t=r=>{this.render(r),this.animationId=requestAnimationFrame(t)};this.animationId=requestAnimationFrame(t)}stop(){this.animationId&&cancelAnimationFrame(this.animationId),this.animationId=null}resizeCanvas(){const r=(this.canvas.parentElement??document.body).getBoundingClientRect(),i=Math.max(1,Math.floor(r.width)),e=Math.max(1,Math.floor(r.height||0||420)),s=Math.max(1,Math.round(window.devicePixelRatio||1));this.canvas.style.width=`${i}px`,this.canvas.style.height=`${e}px`,(this.canvas.width!==i*s||this.canvas.height!==e*s)&&(this.canvas.width=i*s,this.canvas.height=e*s),this.gl&&this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}initGL(){if(!this.gl)return;const t=this.gl,r=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),i=`
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `,e=[`
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        uniform vec2  uRes;
        void main() {
          vec2 uv = vUV;
          float t = uTime * 0.6;
          float bands = sin(uv.y*24.0 + t*3.0)*0.5 + 0.5;
          float rings = sin(length(uv-0.5)*20.0 - t*2.0)*0.5 + 0.5;
          float glow  = 0.25 / (0.05 + pow(distance(uv, vec2(0.5,0.5)), 1.5));
          vec3 col = mix(vec3(0.08,0.15,0.9), vec3(1.0,0.1,0.6), bands);
          col = mix(col, vec3(0.2,1.0,0.9), rings);
          col += glow * vec3(0.9,0.6,0.2);
          gl_FragColor = vec4(col, 1.0);
        }
      `,`
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        void main() {
          vec2 uv = vUV * 2.0 - 1.0;
          float t = uTime * 0.3;
          float a = atan(uv.y, uv.x);
          float r = length(uv);
          float k = sin(5.0*a + t*2.0) * cos(6.0*r - t*3.0);
          vec3 col = vec3(0.5 + 0.5*sin(t + k + 0.0),
                          0.5 + 0.5*sin(t + k + 2.1),
                          0.5 + 0.5*sin(t + k + 4.2));
          gl_FragColor = vec4(col, 1.0);
        }
      `,`
        precision mediump float;
        varying vec2 vUV;
        uniform float uTime;
        void main() {
          vec2 uv = vUV;
          float t = uTime * 0.8;
          vec2 p = uv - 0.5;
          float d = length(p);
          float wave = sin(30.0*d - t*4.0);
          vec3 col = vec3(
            0.6 + 0.4*sin(t + wave + 0.0),
            0.6 + 0.4*sin(t + wave + 2.0),
            0.6 + 0.4*sin(t + wave + 4.0)
          );
          col *= smoothstep(0.0, 0.7, 0.85 - d);
          gl_FragColor = vec4(col, 1.0);
        }
      `],s=this.createShader(t.VERTEX_SHADER,i),a=this.createShader(t.FRAGMENT_SHADER,e[this.shaderIndex]);if(!s||!a){this.setup2DFallback();return}const n=t.createProgram();if(!n){this.setup2DFallback();return}if(t.attachShader(n,s),t.attachShader(n,a),t.linkProgram(n),!t.getProgramParameter(n,t.LINK_STATUS)){console.error("Program link error:",t.getProgramInfoLog(n)),this.setup2DFallback();return}this.program=n;const l=t.createBuffer();if(!l){this.setup2DFallback();return}t.bindBuffer(t.ARRAY_BUFFER,l),t.bufferData(t.ARRAY_BUFFER,r,t.STATIC_DRAW),this.buffer=l,t.useProgram(this.program);const c=t.getAttribLocation(this.program,"aPos");t.enableVertexAttribArray(c),t.vertexAttribPointer(c,2,t.FLOAT,!1,0,0),this.resizeCanvas(),this.lastSwitch=performance.now()}render(t){if(!this.gl||!this.program)return;const r=this.gl;t-this.lastSwitch>18e3&&(this.shaderIndex=(this.shaderIndex+1)%3,this.initGL()),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT);const i=r.getUniformLocation(this.program,"uTime"),e=r.getUniformLocation(this.program,"uRes");i&&r.uniform1f(i,t/1e3),e&&r.uniform2f(e,this.canvas.width,this.canvas.height),r.drawArrays(r.TRIANGLES,0,6)}setup2DFallback(){const t=this.canvas.getContext("2d");if(!t)return;(()=>{const i=this.canvas.clientWidth,e=this.canvas.clientHeight;t.clearRect(0,0,i,e);const s=t.createLinearGradient(0,0,i,e);s.addColorStop(0,"#0b1020"),s.addColorStop(1,"#000"),t.fillStyle=s,t.fillRect(0,0,i,e),t.fillStyle="#9efcff",t.font="14px system-ui, -apple-system, Segoe UI, Roboto",t.fillText("WebGL unavailable — using fallback",16,28)})()}createShader(t,r){const i=this.gl,e=i.createShader(t);return e?(i.shaderSource(e,r),i.compileShader(e),i.getShaderParameter(e,i.COMPILE_STATUS)?e:(console.error("Shader compile error:",i.getShaderInfoLog(e)),i.deleteShader(e),null)):null}}document.addEventListener("DOMContentLoaded",()=>{const o=document.querySelector("#app");if(!o)return;o.innerHTML=`
    <div class="qs-shell">
      <aside class="qs-panel glass">
        <h1 class="qs-title">QuantumSynth</h1>
        <p class="qs-sub">Neural Edition</p>
        <div class="qs-divider"></div>
        <h2 class="qs-h2">Setup</h2>
        <ol class="qs-list">
          <li>Use Chrome or Edge for best results</li>
          <li>Enable “Share audio” when screen sharing (feature coming soon)</li>
          <li>Allow motion/animation in browser settings</li>
        </ol>
        <div class="qs-footer">
          built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">https://github.com/simon-hirst</a>
        </div>
      </aside>

      <main class="qs-stage">
        <canvas id="visualizer" class="qs-canvas"></canvas>
      </main>
    </div>
  `;const t=document.getElementById("visualizer");if(!t)return;new h(t).start()});
