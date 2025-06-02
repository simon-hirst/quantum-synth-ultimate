(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))n(i);new MutationObserver(i=>{for(const s of i)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function e(i){const s={};return i.integrity&&(s.integrity=i.integrity),i.referrerPolicy&&(s.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?s.credentials="include":i.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(i){if(i.ep)return;i.ep=!0;const s=e(i);fetch(i.href,s)}})();class C{constructor(t,e){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.lastUpdate=0,this.ws=null,this.currentShader="",this.nextShader="",this.transitionProgress=0,this.isTransitioning=!1,this.pipContainer=null,this.isPipMode=!1,this.canvas=t,this.ctx=t.getContext("2d"),this.visualizationElement=e,this.setupCanvas(),this.createPipContainer(),this.connectToBackend()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}createPipContainer(){this.pipContainer=document.createElement("div"),this.pipContainer.className="pip-container hidden",this.pipContainer.innerHTML=`
      <div class="pip-header">
        <span>QuantumSynth Visualization</span>
        <div class="pip-controls">
          <button class="pip-btn" id="pipClose">✕</button>
        </div>
      </div>
      <div class="pip-content">
        <canvas id="pipCanvas"></canvas>
      </div>
    `,document.body.appendChild(this.pipContainer),document.getElementById("pipClose").addEventListener("click",()=>this.togglePipMode())}togglePipMode(){if(this.isPipMode=!this.isPipMode,this.isPipMode){const t=document.getElementById("pipCanvas"),e=this.canvas;t.width=e.width,t.height=e.height;const n=t.getContext("2d");this.canvas=t,this.ctx=n,this.pipContainer.classList.remove("hidden")}else{const t=document.getElementById("visualizer"),e=this.canvas;t.width=e.width,t.height=e.height;const n=t.getContext("2d");this.canvas=t,this.ctx=n,this.pipContainer.classList.add("hidden")}}connectToBackend(){try{this.ws=new WebSocket("wss://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/ws"),this.ws.onopen=()=>{console.log("Connected to visualization server"),this.requestNewShader()},this.ws.onmessage=t=>{try{const e=JSON.parse(t.data);e.type==="shader"?(this.nextShader=e.code,this.startTransition()):e.type==="visualization"&&(this.visualizationElement.textContent=e.name)}catch(e){console.error("Error parsing shader data:",e)}},this.ws.onerror=t=>{console.error("WebSocket error:",t)},this.ws.onclose=()=>{console.log("Disconnected from visualization server")}}catch(t){console.error("Failed to connect to backend:",t)}}requestNewShader(){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify({type:"request_shader"}))}startTransition(){this.isTransitioning=!0,this.transitionProgress=0;const t=3e3,e=Date.now(),n=()=>{const i=Date.now()-e;this.transitionProgress=i/t,this.transitionProgress>=1?(this.transitionProgress=1,this.currentShader=this.nextShader,this.isTransitioning=!1,this.requestNewShader()):requestAnimationFrame(n)};n()}initialize(t){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const e=this.audioContext.createMediaStreamSource(t);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,e.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.lastUpdate=Date.now(),this.visualize()}catch(e){console.error("Quantum audio initialization failed:",e)}}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const t=Date.now();(t-this.lastUpdate)/1e3,this.lastUpdate=t,this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.isTransitioning?this.drawTransitionVisualization():this.currentShader?this.drawShaderVisualization():this.drawFallbackVisualization(),this.animationFrame=requestAnimationFrame(()=>this.visualize())}drawTransitionVisualization(){const t=this.canvas.width/4,e=this.canvas.height/4,n=Date.now()/1e3;this.ctx.save(),this.ctx.translate(t,e);const i=.9+.2*Math.sin(this.transitionProgress*Math.PI),s=this.transitionProgress*Math.PI*2;this.ctx.scale(i,i),this.ctx.rotate(s);for(let a=0;a<this.dataArray.length;a++){const o=this.dataArray[a]/255,c=a*2*Math.PI/this.dataArray.length,l=o*150,d=Math.cos(c)*l,h=Math.sin(c)*l,r=2+o*8,u=(a*360/this.dataArray.length+n*50)%360,p=.7-this.transitionProgress*.5;this.ctx.beginPath(),this.ctx.arc(d,h,r,0,2*Math.PI),this.ctx.fillStyle=`hsla(${u}, 80%, 65%, ${p})`,this.ctx.fill()}this.ctx.restore()}drawShaderVisualization(){const t=this.canvas.width/4,e=this.canvas.height/4,n=Date.now()/1e3;for(let i=0;i<this.dataArray.length;i++){const s=this.dataArray[i]/255,a=i*2*Math.PI/this.dataArray.length,o=s*200,c=Math.cos(a*3+n)*o,l=Math.sin(a*2+n)*o,d=t+c,h=e+l,r=3+s*10,u=(i*360/this.dataArray.length+n*60)%360,p=80+s*20,g=50+s*30;if(this.ctx.beginPath(),this.ctx.arc(d,h,r,0,2*Math.PI),this.ctx.fillStyle=`hsl(${u}, ${p}%, ${g}%)`,this.ctx.fill(),i>0&&s>.3){const f=this.dataArray[(i-1)%this.dataArray.length]/255,m=(i-1)*2*Math.PI/this.dataArray.length,y=f*200,x=Math.cos(m*3+n)*y,S=Math.sin(m*2+n)*y,b=t+x,w=e+S;this.ctx.beginPath(),this.ctx.moveTo(b,w),this.ctx.lineTo(d,h),this.ctx.strokeStyle=`hsla(${u}, ${p}%, ${g}%, ${.3+s*.4})`,this.ctx.lineWidth=1,this.ctx.stroke()}}}drawFallbackVisualization(){const t=this.canvas.width/4,e=this.canvas.height/4,n=Math.min(t,e)*.8,i=Date.now()/1e3;this.ctx.save(),this.ctx.translate(t,e),this.ctx.rotate(i*.5);for(let s=0;s<this.dataArray.length;s++){const a=this.dataArray[s]/255,o=s*2*Math.PI/this.dataArray.length,c=Math.cos(o)*n,l=Math.sin(o)*n,d=Math.cos(o)*(n+a*n*.7),h=Math.sin(o)*(n+a*n*.7),r=(s*360/this.dataArray.length+i*50)%360;this.ctx.strokeStyle=`hsl(${r}, 80%, 65%)`,this.ctx.lineWidth=2+a*5,this.ctx.beginPath(),this.ctx.moveTo(c,l),this.ctx.lineTo(d,h),this.ctx.stroke()}this.ctx.restore()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.audioContext&&this.audioContext.close(),this.ws&&this.ws.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Infinite Edition...");const v=document.querySelector("#app");v.innerHTML=`
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth Infinite</h1>
        <p class="quantum-subtitle">AI-Generated Infinite Visualizations</p>
      </div>
      
      <div class="quantum-content">
        <div class="quantum-card">
          <div class="card-header">
            <h2>Setup</h2>
          </div>
          
          <div class="card-body">
            <div class="instructions">
              <div class="instruction-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Start Capture</h3>
                  <p>Click the button below to begin screen sharing</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Select Source</h3>
                  <p>Share your entire screen or just your music player window</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio</h3>
                  <p>Check "Share audio" to capture sound for visualization</p>
                </div>
              </div>

              <div class="instruction-step">
                <div class="step-number">💡</div>
                <div class="step-content">
                  <h3>Pro Tip</h3>
                  <p>After sharing, click "Hide" on the share dialog to remove it from your screen</p>
                </div>
              </div>

              <div class="drm-warning">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <h3>DRM Notice</h3>
                  <p>Some players like Spotify won't work due to DRM protection. You must share your entire screen for these applications.</p>
                </div>
              </div>
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">▶</span>
              Start Screen Sharing
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹</span>
              Stop Sharing
            </button>

            <button id="pipButton" class="quantum-btn" style="display: none; margin-top: 10px;">
              <span class="btn-icon">🔲</span>
              Toggle Picture-in-Picture
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Live Generation</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Visualization:</span>
            <span id="currentVisualization">Connecting to AI...</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Infinite AI-generated visualizations streaming live</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth Infinite v2.1.0 - Endless AI Generation</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const t=document.getElementById("visualizer"),e=document.getElementById("currentVisualization"),n=new C(t,e);let i=null;const s=document.getElementById("startButton"),a=document.getElementById("stopButton"),o=document.getElementById("pipButton"),c=document.querySelector(".status-dot"),l=document.querySelector(".status-text");s.addEventListener("click",d),a.addEventListener("click",h),o.addEventListener("click",()=>n.togglePipMode());function d(){s.disabled=!0,s.innerHTML='<span class="btn-icon">⏳</span> Initializing...',c.classList.add("pending"),l.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(r=>{console.log("Screen sharing started"),i=r,s.style.display="none",a.style.display="block",o.style.display="block",c.classList.remove("pending"),c.classList.add("active"),l.textContent="Active",n.initialize(r);const u=r.getVideoTracks()[0];u&&(u.onended=h)}).catch(r=>{console.error("Error starting screen share:",r),s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Try Again',c.classList.remove("pending"),l.textContent="Error"}):(alert("Screen sharing not supported in this browser"),s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',l.textContent="Unsupported")}function h(){i&&(i.getTracks().forEach(r=>r.stop()),i=null),n.stop(),a.style.display="none",o.style.display="none",s.style.display="block",s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',c.classList.remove("active"),l.textContent="Standby"}});
