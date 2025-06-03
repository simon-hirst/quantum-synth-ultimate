(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))e(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const a of i.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&e(a)}).observe(document,{childList:!0,subtree:!0});function n(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function e(s){if(s.ep)return;s.ep=!0;const i=n(s);fetch(s.href,i)}})();class w{constructor(t,n){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.lastUpdate=0,this.currentShader="",this.nextShader="",this.transitionProgress=0,this.isTransitioning=!1,this.pipContainer=null,this.isPipMode=!1,this.pollingInterval=null,this.currentVizName="Connecting to AI...",this.canvas=t,this.ctx=t.getContext("2d"),this.visualizationElement=n,this.setupCanvas(),this.createPipContainer(),this.startPolling()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}createPipContainer(){this.pipContainer=document.createElement("div"),this.pipContainer.className="pip-container hidden",this.pipContainer.innerHTML=`
      <div class="pip-header">
        <span>QuantumSynth Visualization</span>
        <div class="pip-controls">
          <button class="pip-btn" id="pipClose">✕</button>
        </div>
      </div>
      <div class="pip-content">
        <canvas id="pipCanvas"></canvas>
      </div>
    `,document.body.appendChild(this.pipContainer),document.getElementById("pipClose").addEventListener("click",()=>this.togglePipMode())}togglePipMode(){if(this.isPipMode=!this.isPipMode,this.isPipMode){const t=document.getElementById("pipCanvas"),n=this.canvas;t.width=n.width,t.height=n.height;const e=t.getContext("2d");this.canvas=t,this.ctx=e,this.pipContainer.classList.remove("hidden")}else{const t=document.getElementById("visualizer"),n=this.canvas;t.width=n.width,t.height=n.height;const e=t.getContext("2d");this.canvas=t,this.ctx=e,this.pipContainer.classList.add("hidden")}}async startPolling(){this.pollingInterval=window.setInterval(()=>{this.fetchNewShader()},5e3),this.fetchNewShader()}async fetchNewShader(){try{const t=await fetch("https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next");if(t.ok){const n=await t.json();this.nextShader=n.code,this.currentVizName=n.name,this.startTransition()}}catch(t){console.error("Failed to fetch shader:",t),this.generateLocalShader()}}generateLocalShader(){const t=["quantum","neural","temporal"],n=["Quantum Waves","Neural Particles","Temporal Fields"],e=Math.floor(Math.random()*t.length);this.nextShader=t[e],this.currentVizName=n[e],this.startTransition()}startTransition(){if(this.isTransitioning)return;this.isTransitioning=!0,this.transitionProgress=0,this.visualizationElement.textContent=`Transitioning to: ${this.currentVizName}`;const t=3e3,n=Date.now(),e=()=>{const s=Date.now()-n;this.transitionProgress=s/t,this.transitionProgress>=1?(this.transitionProgress=1,this.currentShader=this.nextShader,this.isTransitioning=!1,this.visualizationElement.textContent=this.currentVizName):requestAnimationFrame(e)};e()}initialize(t){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const n=this.audioContext.createMediaStreamSource(t);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,n.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.lastUpdate=Date.now(),this.visualize()}catch(n){console.error("Quantum audio initialization failed:",n)}}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const t=Date.now();(t-this.lastUpdate)/1e3,this.lastUpdate=t,this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.isTransitioning?this.drawTransitionVisualization():this.currentShader?this.drawShaderVisualization():this.drawFallbackVisualization(),this.animationFrame=requestAnimationFrame(()=>this.visualize())}drawTransitionVisualization(){const t=this.canvas.width/4,n=this.canvas.height/4,e=Date.now()/1e3;this.ctx.save(),this.ctx.translate(t,n);const s=.9+.2*Math.sin(this.transitionProgress*Math.PI),i=this.transitionProgress*Math.PI*2;this.ctx.scale(s,s),this.ctx.rotate(i);for(let a=0;a<this.dataArray.length;a++){const o=this.dataArray[a]/255,c=a*2*Math.PI/this.dataArray.length,l=o*150,d=Math.cos(c)*l,h=Math.sin(c)*l,r=2+o*8,u=(a*360/this.dataArray.length+e*50)%360,p=.7-this.transitionProgress*.5;this.ctx.beginPath(),this.ctx.arc(d,h,r,0,2*Math.PI),this.ctx.fillStyle=`hsla(${u}, 80%, 65%, ${p})`,this.ctx.fill()}this.ctx.restore()}drawShaderVisualization(){const t=this.canvas.width/4,n=this.canvas.height/4,e=Date.now()/1e3;for(let s=0;s<this.dataArray.length;s++){const i=this.dataArray[s]/255,a=s*2*Math.PI/this.dataArray.length,o=i*200,c=Math.cos(a*3+e)*o,l=Math.sin(a*2+e)*o,d=t+c,h=n+l,r=3+i*10,u=(s*360/this.dataArray.length+e*60)%360,p=80+i*20,m=50+i*30;if(this.ctx.beginPath(),this.ctx.arc(d,h,r,0,2*Math.PI),this.ctx.fillStyle=`hsl(${u}, ${p}%, ${m}%)`,this.ctx.fill(),s>0&&i>.3){const f=this.dataArray[(s-1)%this.dataArray.length]/255,g=(s-1)*2*Math.PI/this.dataArray.length,y=f*200,x=Math.cos(g*3+e)*y,S=Math.sin(g*2+e)*y,b=t+x,C=n+S;this.ctx.beginPath(),this.ctx.moveTo(b,C),this.ctx.lineTo(d,h),this.ctx.strokeStyle=`hsla(${u}, ${p}%, ${m}%, ${.3+i*.4})`,this.ctx.lineWidth=1,this.ctx.stroke()}}}drawFallbackVisualization(){const t=this.canvas.width/4,n=this.canvas.height/4,e=Math.min(t,n)*.8,s=Date.now()/1e3;this.ctx.save(),this.ctx.translate(t,n),this.ctx.rotate(s*.5);for(let i=0;i<this.dataArray.length;i++){const a=this.dataArray[i]/255,o=i*2*Math.PI/this.dataArray.length,c=Math.cos(o)*e,l=Math.sin(o)*e,d=Math.cos(o)*(e+a*e*.7),h=Math.sin(o)*(e+a*e*.7),r=(i*360/this.dataArray.length+s*50)%360;this.ctx.strokeStyle=`hsl(${r}, 80%, 65%)`,this.ctx.lineWidth=2+a*5,this.ctx.beginPath(),this.ctx.moveTo(c,l),this.ctx.lineTo(d,h),this.ctx.stroke()}this.ctx.restore()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.pollingInterval&&clearInterval(this.pollingInterval),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Infinite Edition...");const v=document.querySelector("#app");v.innerHTML=`
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
        <p>QuantumSynth Infinite v2.2.0 - Endless AI Generation</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const t=document.getElementById("visualizer"),n=document.getElementById("currentVisualization"),e=new w(t,n);let s=null;const i=document.getElementById("startButton"),a=document.getElementById("stopButton"),o=document.getElementById("pipButton"),c=document.querySelector(".status-dot"),l=document.querySelector(".status-text");i.addEventListener("click",d),a.addEventListener("click",h),o.addEventListener("click",()=>e.togglePipMode());function d(){i.disabled=!0,i.innerHTML='<span class="btn-icon">⏳</span> Initializing...',c.classList.add("pending"),l.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(r=>{console.log("Screen sharing started"),s=r,i.style.display="none",a.style.display="block",o.style.display="block",c.classList.remove("pending"),c.classList.add("active"),l.textContent="Active",e.initialize(r);const u=r.getVideoTracks()[0];u&&(u.onended=h)}).catch(r=>{console.error("Error starting screen share:",r),i.disabled=!1,i.innerHTML='<span class="btn-icon">▶</span> Try Again',c.classList.remove("pending"),l.textContent="Error"}):(alert("Screen sharing not supported in this browser"),i.disabled=!1,i.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',l.textContent="Unsupported")}function h(){s&&(s.getTracks().forEach(r=>r.stop()),s=null),e.stop(),a.style.display="none",o.style.display="none",i.style.display="block",i.disabled=!1,i.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',c.classList.remove("active"),l.textContent="Standby"}});
