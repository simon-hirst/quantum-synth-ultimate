(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))e(n);new MutationObserver(n=>{for(const s of n)if(s.type==="childList")for(const r of s.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&e(r)}).observe(document,{childList:!0,subtree:!0});function i(n){const s={};return n.integrity&&(s.integrity=n.integrity),n.referrerPolicy&&(s.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?s.credentials="include":n.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function e(n){if(n.ep)return;n.ep=!0;const s=i(n);fetch(n.href,s)}})();class d{constructor(){this.container=document.createElement("div"),this.container.style.position="fixed",this.container.style.top="20px",this.container.style.left="20px",this.container.style.zIndex="1000",this.container.style.fontFamily="Arial, sans-serif",this.container.style.color="white",this.container.style.backgroundColor="rgba(0, 0, 0, 0.7)",this.container.style.padding="15px",this.container.style.borderRadius="10px",this.container.style.backdropFilter="blur(10px)",this.container.style.maxWidth="300px",this.statusElement=document.createElement("div"),this.statusElement.innerHTML=`
            <h2 style="margin: 0 0 10px 0;">QuantumSynth Neural Edition</h2>
            <div id="status">Ready to start screen sharing</div>
            <div id="connection">Status: Waiting for user action</div>
            <div id="fps">FPS: 0</div>
            <div style="margin-top: 10px; font-size: 12px; color: #ccc;">
                <p>For best results:</p>
                <ul style="margin: 5px 0; padding-left: 15px;">
                    <li>Share your entire screen</li>
                    <li>Enable "Share audio" option</li>
                    <li>Use Chrome or Edge for best compatibility</li>
                </ul>
            </div>
        `,this.controlsElement=document.createElement("div"),this.controlsElement.style.marginTop="15px",this.controlsElement.innerHTML=`
            <button id="screenshareBtn" style="padding: 10px 16px; margin-right: 10px; background: #4ecdc4; border: none; border-radius: 5px; color: white; cursor: pointer; font-weight: bold;">
                Start Screen Sharing
            </button>
            <button id="demoBtn" style="padding: 8px 16px; background: #ff6b6b; border: none; border-radius: 5px; color: white; cursor: pointer;">
                Demo Mode
            </button>
        `,this.container.appendChild(this.statusElement),this.container.appendChild(this.controlsElement),document.body.appendChild(this.container),this.screenshareBtn=document.getElementById("screenshareBtn"),this.setupEventListeners()}setupEventListeners(){var t;this.screenshareBtn.addEventListener("click",()=>{window.dispatchEvent(new CustomEvent("startScreenshare"))}),(t=document.getElementById("demoBtn"))==null||t.addEventListener("click",()=>{window.dispatchEvent(new CustomEvent("demoMode"))})}updateStatus(t){const i=document.getElementById("status");i&&(i.textContent=t)}updateConnectionStatus(t,i){const e=document.getElementById("connection");e&&(e.textContent=i||`Status: ${t?"Connected":"Disconnected"}`)}updateFPS(t){const i=document.getElementById("fps");i&&(i.textContent=`FPS: ${t.toFixed(1)}`)}showNotification(t,i=3e3){const e=document.createElement("div");e.textContent=t,e.style.position="fixed",e.style.top="80px",e.style.left="50%",e.style.transform="translateX(-50%)",e.style.backgroundColor="rgba(0, 0, 0, 0.8)",e.style.color="white",e.style.padding="10px 20px",e.style.borderRadius="5px",e.style.zIndex="1001",document.body.appendChild(e),setTimeout(()=>{document.body.removeChild(e)},i)}setScreenshareButtonEnabled(t){this.screenshareBtn.disabled=!t,this.screenshareBtn.style.opacity=t?"1":"0.5",this.screenshareBtn.textContent=t?"Start Screen Sharing":"Sharing..."}}class h{constructor(t){if(this.gl=null,this.program=null,this.buffer=null,this.animationId=null,this.canvas=t,this.ui=new d,this.resizeCanvas(),window.addEventListener("resize",()=>this.resizeCanvas()),window.addEventListener("orientationchange",()=>this.resizeCanvas()),this.gl=t.getContext("webgl2")||t.getContext("webgl"),!this.gl){this.setup2DFallback(),this.ui.updateStatus("WebGL not supported - Using 2D fallback");return}if(!this.initGL()){this.setup2DFallback(),this.ui.updateStatus("WebGL init failed - Using 2D fallback");return}this.ui.updateStatus("Ready")}initialize(){this.gl&&this.program&&this.start()}resizeCanvas(){const i=(this.canvas.parentElement??document.body).getBoundingClientRect(),e=Math.max(1,Math.floor(i.width)),n=Math.max(1,Math.floor(i.height||0||400)),s=Math.max(1,Math.round(window.devicePixelRatio||1));this.canvas.style.width=`${e}px`,this.canvas.style.height=`${n}px`,(this.canvas.width!==e*s||this.canvas.height!==n*s)&&(this.canvas.width=e*s,this.canvas.height=n*s),this.gl&&this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}initGL(){const t=this.gl,i=new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e=`
      attribute vec2 aPos;
      varying vec2 vUV;
      void main() {
        vUV = aPos * 0.5 + 0.5;
        gl_Position = vec4(aPos, 0.0, 1.0);
      }
    `,n=`
      precision mediump float;
      varying vec2 vUV;
      uniform float uTime;
      void main() {
        // simple animated color field
        float t = uTime * 0.5;
        vec2 uv = vUV;
        float w1 = sin(uv.x * 10.0 + t);
        float w2 = cos(uv.y *  8.0 + t * 1.3);
        vec3 col = vec3(
          abs(sin(t + uv.x * 2.0)),
          abs(cos(t + uv.y * 2.0)),
          abs(sin(t * 1.5 + uv.x * 3.0))
        ) * 0.85 + 0.15;
        col += 0.08 * vec3(w1, w2, w1*w2);
        gl_FragColor = vec4(col, 1.0);
      }
    `,s=this.createShader(t.VERTEX_SHADER,e),r=this.createShader(t.FRAGMENT_SHADER,n);if(!s||!r)return!1;const o=t.createProgram();if(!o)return!1;if(t.attachShader(o,s),t.attachShader(o,r),t.linkProgram(o),!t.getProgramParameter(o,t.LINK_STATUS))return console.error("Program link error:",t.getProgramInfoLog(o)),!1;this.program=o;const c=t.createBuffer();if(!c)return!1;t.bindBuffer(t.ARRAY_BUFFER,c),t.bufferData(t.ARRAY_BUFFER,i,t.STATIC_DRAW),this.buffer=c,t.useProgram(this.program);const l=t.getAttribLocation(this.program,"aPos");return t.enableVertexAttribArray(l),t.vertexAttribPointer(l,2,t.FLOAT,!1,0,0),this.resizeCanvas(),!0}start(){const t=()=>{if(!this.gl||!this.program)return;const i=this.gl;i.clearColor(0,0,0,1),i.clear(i.COLOR_BUFFER_BIT);const e=i.getUniformLocation(this.program,"uTime");e&&i.uniform1f(e,performance.now()/1e3),i.drawArrays(i.TRIANGLES,0,6),this.animationId=requestAnimationFrame(t)};t()}stop(){this.animationId&&(cancelAnimationFrame(this.animationId),this.animationId=null)}setup2DFallback(){const t=this.canvas.getContext("2d");if(!t)return;(()=>{const e=this.canvas.clientWidth,n=this.canvas.clientHeight;t.clearRect(0,0,e,n),t.fillStyle="#000",t.fillRect(0,0,e,n),t.fillStyle="#0f0",t.font="16px Arial",t.fillText("WebGL not available - Using 2D fallback",20,40)})()}createShader(t,i){const e=this.gl,n=e.createShader(t);return n?(e.shaderSource(n,i),e.compileShader(n),e.getShaderParameter(n,e.COMPILE_STATUS)?n:(console.error("Shader compile error:",e.getShaderInfoLog(n)),e.deleteShader(n),null)):null}disconnect(){this.stop()}}document.addEventListener("DOMContentLoaded",()=>{var e;const a=document.querySelector("#app");if(!a)return;a.innerHTML=`
    <div class="quantum-container">
      <canvas id="visualizer"></canvas>
    </div>
  `;const t=document.getElementById("visualizer");if(!t)return;const i=new h(t);(e=i.initialize)==null||e.call(i)});
