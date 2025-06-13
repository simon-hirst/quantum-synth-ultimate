(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))i(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function n(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(t){if(t.ep)return;t.ep=!0;const s=n(t);fetch(t.href,s)}})();class p{constructor(e,n,i,t){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.lastUpdate=0,this.currentVizType="quantum",this.nextVizType="quantum",this.transitionProgress=0,this.isTransitioning=!1,this.pollingInterval=null,this.currentVizName="Quantum Resonance",this.canvas=e;const s=e.getContext("2d");if(!s)throw new Error("Could not get canvas context");this.ctx=s,this.visualizationElement=n,this.statusElement=i,this.statusDot=t,window.addEventListener("resize",()=>{this.setupCanvas()}),this.setupCanvas(),this.startPolling()}setupCanvas(){const e=this.canvas.parentElement;if(!e)return;const n=getComputedStyle(e),i=parseFloat(n.paddingLeft)+parseFloat(n.paddingRight),t=parseFloat(n.paddingTop)+parseFloat(n.paddingBottom),s=e.clientWidth-i,a=e.clientHeight-t-100;this.canvas.width=s,this.canvas.height=a,this.canvas.style.width=`${s}px`,this.canvas.style.height=`${a}px`,console.log(`Canvas size set to: ${s}x${a}`)}async startPolling(){this.pollingInterval=window.setInterval(()=>{this.fetchNewShader()},15e3),this.generateLocalShader()}async fetchNewShader(){const e=["https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next","http://localhost:8080/api/shader/next"];for(const n of e)try{const i=new AbortController,t=setTimeout(()=>i.abort(),5e3),s=await fetch(n,{signal:i.signal});if(clearTimeout(t),s.ok){const a=await s.json();this.nextVizType=a.type||"quantum",this.currentVizName=a.name||"Quantum Resonance",this.statusDot.classList.remove("pending"),this.statusDot.classList.add("active"),this.statusElement.textContent="Active",this.startTransition(),console.log(`Connected to backend via ${n}`);return}}catch(i){console.warn(`Failed to connect to ${n}:`,i);continue}console.error("All backend connections failed, using local fallback"),this.statusDot.classList.remove("active"),this.statusDot.classList.add("pending"),this.statusElement.textContent="Local Mode",this.generateLocalShader()}generateLocalShader(){const e=["quantum","neural","temporal"],n=["Quantum Resonance","Neural Particles","Temporal Waveforms"],i=Math.floor(Math.random()*e.length);this.nextVizType=e[i],this.currentVizName=n[i],this.startTransition()}startTransition(){if(this.isTransitioning)return;this.isTransitioning=!0,this.transitionProgress=0,this.visualizationElement.textContent=`Transitioning to: ${this.currentVizName}`;const e=()=>{this.transitionProgress+=.01,this.transitionProgress>=1?(this.transitionProgress=1,this.currentVizType=this.nextVizType,this.isTransitioning=!1,this.visualizationElement.textContent=this.currentVizName):requestAnimationFrame(e)};e()}initialize(e){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const n=this.audioContext.createMediaStreamSource(e);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=256,n.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.lastUpdate=Date.now(),this.visualize()}catch(n){console.error("Quantum audio initialization failed:",n)}}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const e=Date.now();(e-this.lastUpdate)/1e3,this.lastUpdate=e,this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height),this.drawVisualization(),this.animationFrame=requestAnimationFrame(()=>this.visualize())}drawVisualization(){const e=this.canvas.width/2,n=this.canvas.height/2,i=Date.now()/1e3;switch(this.currentVizType){case"quantum":this.drawQuantumResonance(e,n,i);break;case"neural":this.drawNeuralParticles(e,n,i);break;case"temporal":this.drawTemporalWaveforms(e,n,i);break;default:this.drawQuantumResonance(e,n,i)}}drawQuantumResonance(e,n,i){const t=Math.min(e,n)*.8;this.ctx.save(),this.ctx.translate(e,n),this.ctx.rotate(i*.5);for(let s=0;s<this.dataArray.length;s++){const a=this.dataArray[s]/255,o=s*2*Math.PI/this.dataArray.length,r=Math.cos(o)*t,d=Math.sin(o)*t,l=Math.cos(o)*(t+a*t*.7),c=Math.sin(o)*(t+a*t*.7),h=(s*360/this.dataArray.length+i*50)%360;this.ctx.strokeStyle=`hsl(${h}, 80%, 65%)`,this.ctx.lineWidth=2+a*5,this.ctx.beginPath(),this.ctx.moveTo(r,d),this.ctx.lineTo(l,c),this.ctx.stroke()}this.ctx.restore()}drawNeuralParticles(e,n,i){for(let s=0;s<100;s++){const a=this.dataArray[s%this.dataArray.length]/255,o=s*2*Math.PI/100,r=a*150,d=e+Math.cos(o)*r,l=n+Math.sin(o)*r,c=2+a*8,h=(s*360/100+i*40)%360;this.ctx.beginPath(),this.ctx.arc(d,l,c,0,2*Math.PI),this.ctx.fillStyle=`hsla(${h}, 80%, 65%, 0.9)`,this.ctx.fill()}}drawTemporalWaveforms(e,n,i){const t=this.canvas.width,s=this.canvas.height/2;this.ctx.beginPath();for(let r=0;r<this.dataArray.length;r++){const d=this.dataArray[r]/255,l=r/this.dataArray.length*t,c=n-(d-.5)*s;r===0?this.ctx.moveTo(l,c):this.ctx.lineTo(l,c)}const a=i*10,o=this.ctx.createLinearGradient(0,0,t,0);o.addColorStop(0,`hsl(${a%360}, 70%, 65%)`),o.addColorStop(.5,`hsl(${(a+120)%360}, 70%, 65%)`),o.addColorStop(1,`hsl(${(a+240)%360}, 70%, 65%)`),this.ctx.strokeStyle=o,this.ctx.lineWidth=3,this.ctx.stroke()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.pollingInterval&&clearInterval(this.pollingInterval),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth...");const u=document.querySelector("#app");if(!u)return;u.innerHTML=`
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth</h1>
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
          </div>
        </div>

        <div class="visualization-container">
          <div class="viz-header">
            <h3>Visualization</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Mode:</span>
            <span id="currentVisualization">Quantum Resonance</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Visualizations will automatically transition every 15 seconds</p>
          </div>
        </div>
      </div>

      <div class="quantum-footer">
        <p>QuantumSynth v2.0.0</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const e=document.getElementById("visualizer"),n=document.getElementById("currentVisualization"),i=document.querySelector(".status-dot"),t=document.querySelector(".status-text");if(!e||!n||!i||!t)return;const s=new p(e,n,t,i);let a=null;const o=document.getElementById("startButton"),r=document.getElementById("stopButton");o.addEventListener("click",d),r.addEventListener("click",l);function d(){o.disabled=!0,o.innerHTML='<span class="btn-icon">⏳</span> Initializing...',i.classList.add("pending"),t.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(c=>{console.log("Screen sharing started"),a=c,o.style.display="none",r.style.display="block",i.classList.remove("pending"),i.classList.add("active"),t.textContent="Active",s.initialize(c);const h=c.getVideoTracks()[0];h&&(h.onended=l)}).catch(c=>{console.error("Error starting screen share:",c),o.disabled=!1,o.innerHTML='<span class="btn-icon">▶</span> Try Again',i.classList.remove("pending"),t.textContent="Error"}):(alert("Screen sharing not supported in this browser"),o.disabled=!1,o.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',t.textContent="Unsupported")}function l(){a&&(a.getTracks().forEach(c=>c.stop()),a=null),s.stop(),r.style.display="none",o.style.display="block",o.disabled=!1,o.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',i.classList.remove("active"),t.textContent="Standby"}});
