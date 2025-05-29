(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))e(i);new MutationObserver(i=>{for(const t of i)if(t.type==="childList")for(const n of t.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&e(n)}).observe(document,{childList:!0,subtree:!0});function a(i){const t={};return i.integrity&&(t.integrity=i.integrity),i.referrerPolicy&&(t.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?t.credentials="include":i.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function e(i){if(i.ep)return;i.ep=!0;const t=a(i);fetch(i.href,t)}})();class x{constructor(s,a){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.currentVisualization=0,this.nextVisualization=0,this.visualizationTimer=null,this.transitionProgress=0,this.isTransitioning=!1,this.visualizationNames=["Quantum Resonance","Neural Particles","Temporal Waveforms"],this.canvas=s,this.ctx=s.getContext("2d"),this.visualizationElement=a,this.setupCanvas()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}initialize(s){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const a=this.audioContext.createMediaStreamSource(s);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,a.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.startVisualizationSwitching(),this.visualize()}catch(a){console.error("Quantum audio initialization failed:",a)}}startVisualizationSwitching(){const s=()=>{this.nextVisualization=(this.currentVisualization+1+Math.floor(Math.random()*2))%3,this.isTransitioning=!0,this.transitionProgress=0,this.visualizationElement.textContent=`${this.visualizationNames[this.currentVisualization]} → ${this.visualizationNames[this.nextVisualization]}`,setTimeout(()=>{this.currentVisualization=this.nextVisualization,this.isTransitioning=!1,this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization]},2e3),this.visualizationTimer=setTimeout(s,15e3+Math.random()*5e3)};this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization],this.visualizationTimer=setTimeout(s,15e3+Math.random()*5e3)}visualize(){!this.analyser||!this.dataArray||(this.analyser.getByteFrequencyData(this.dataArray),this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.isTransitioning?(this.transitionProgress+=.02,this.transitionProgress>1&&(this.transitionProgress=1),this.ctx.globalAlpha=1-this.transitionProgress,this.drawVisualization(this.currentVisualization),this.ctx.globalAlpha=this.transitionProgress,this.drawVisualization(this.nextVisualization),this.ctx.globalAlpha=1):this.drawVisualization(this.currentVisualization),this.animationFrame=requestAnimationFrame(()=>this.visualize()))}drawVisualization(s){switch(s){case 0:this.drawQuantumResonance();break;case 1:this.drawNeuralParticles();break;case 2:this.drawTemporalWaveforms();break}}drawQuantumResonance(){const s=this.canvas.width/4,a=this.canvas.height/4,e=Math.min(s,a)*.8;this.ctx.save(),this.ctx.translate(s,a);for(let t=0;t<this.dataArray.length;t++){const n=this.dataArray[t]/255,r=t*2*Math.PI/this.dataArray.length,o=Math.cos(r)*e,l=Math.sin(r)*e,h=Math.cos(r)*(e+n*e*.5),c=Math.sin(r)*(e+n*e*.5),d=(t*360/this.dataArray.length+Date.now()/50)%360,u=this.ctx.createLinearGradient(o,l,h,c);u.addColorStop(0,`hsl(${d}, 80%, 65%)`),u.addColorStop(1,`hsl(${(d+40)%360}, 80%, 45%)`),this.ctx.strokeStyle=u,this.ctx.lineWidth=2+n*3,this.ctx.beginPath(),this.ctx.moveTo(o,l),this.ctx.lineTo(h,c),this.ctx.stroke()}const i=this.ctx.createRadialGradient(0,0,0,0,0,e*.2);i.addColorStop(0,"rgba(255, 255, 255, 0.9)"),i.addColorStop(1,"rgba(120, 150, 255, 0.5)"),this.ctx.beginPath(),this.ctx.arc(0,0,e*.2,0,2*Math.PI),this.ctx.fillStyle=i,this.ctx.fill(),this.ctx.restore()}drawNeuralParticles(){const a=this.canvas.width/4,e=this.canvas.height/4;for(let i=0;i<100;i++){const t=this.dataArray[i%this.dataArray.length]/255,n=i*2*Math.PI/100,r=t*150,o=a+Math.cos(n)*r,l=e+Math.sin(n)*r,h=2+t*8,c=(i*360/100+Date.now()/40)%360,d=this.ctx.createRadialGradient(o,l,0,o,l,h);if(d.addColorStop(0,`hsla(${c}, 80%, 70%, 0.9)`),d.addColorStop(1,`hsla(${(c+30)%360}, 80%, 50%, 0.2)`),this.ctx.beginPath(),this.ctx.arc(o,l,h,0,2*Math.PI),this.ctx.fillStyle=d,this.ctx.fill(),i>0&&t>.3){const u=this.dataArray[(i-1)%this.dataArray.length]/255,v=(i-1)*2*Math.PI/100,m=u*150,g=a+Math.cos(v)*m,y=e+Math.sin(v)*m;this.ctx.beginPath(),this.ctx.moveTo(g,y),this.ctx.lineTo(o,l),this.ctx.strokeStyle=`hsla(${c}, 70%, 60%, ${.2+t*.6})`,this.ctx.lineWidth=1,this.ctx.stroke()}}}drawTemporalWaveforms(){const s=this.canvas.height/4,a=this.canvas.width/2,e=this.canvas.height/2,i=this.ctx.createLinearGradient(0,0,a,0);i.addColorStop(0,"rgba(15, 20, 30, 0.4)"),i.addColorStop(1,"rgba(20, 25, 35, 0.4)"),this.ctx.fillStyle=i,this.ctx.fillRect(0,s-e/2,a,e),this.ctx.beginPath(),this.ctx.moveTo(0,s);for(let o=0;o<this.dataArray.length;o++){const l=this.dataArray[o]/255,h=o/this.dataArray.length*a,c=s-(l-.5)*e;o===0?this.ctx.moveTo(h,c):this.ctx.lineTo(h,c)}const t=Date.now()/100,n=this.ctx.createLinearGradient(0,0,a,0);n.addColorStop(0,`hsl(${t%360}, 70%, 65%)`),n.addColorStop(.5,`hsl(${(t+120)%360}, 70%, 65%)`),n.addColorStop(1,`hsl(${(t+240)%360}, 70%, 65%)`),this.ctx.strokeStyle=n,this.ctx.lineWidth=3,this.ctx.stroke(),this.ctx.lineTo(a,s),this.ctx.lineTo(0,s),this.ctx.closePath();const r=this.ctx.createLinearGradient(0,0,a,0);r.addColorStop(0,`hsla(${t%360}, 70%, 65%, 0.2)`),r.addColorStop(.5,`hsla(${(t+120)%360}, 70%, 65%, 0.2)`),r.addColorStop(1,`hsla(${(t+240)%360}, 70%, 65%, 0.2)`),this.ctx.fillStyle=r,this.ctx.fill()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.visualizationTimer&&clearTimeout(this.visualizationTimer),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Neural Edition...");const p=document.querySelector("#app");p.innerHTML=`
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth</h1>
        <p class="quantum-subtitle">Advanced audio-reactive visualizations</p>
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
                  <p>Share your entire screen or just the window with your music player</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio</h3>
                  <p>Check "Share audio" to capture sound for visualization</p>
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
            <p>Visualizations will automatically transition every 15-20 seconds</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth v1.1.0</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const s=document.getElementById("visualizer"),a=document.getElementById("currentVisualization"),e=new x(s,a);let i=null;const t=document.getElementById("startButton"),n=document.getElementById("stopButton"),r=document.querySelector(".status-dot"),o=document.querySelector(".status-text");t.addEventListener("click",l),n.addEventListener("click",h);function l(){t.disabled=!0,t.innerHTML='<span class="btn-icon">⏳</span> Initializing...',r.classList.add("pending"),o.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(c=>{console.log("Screen sharing started"),i=c,t.style.display="none",n.style.display="block",r.classList.remove("pending"),r.classList.add("active"),o.textContent="Active",e.initialize(c);const d=c.getVideoTracks()[0];d&&(d.onended=h)}).catch(c=>{console.error("Error starting screen share:",c),t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Try Again',r.classList.remove("pending"),o.textContent="Error"}):(alert("Screen sharing not supported in this browser"),t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',o.textContent="Unsupported")}function h(){i&&(i.getTracks().forEach(c=>c.stop()),i=null),e.stop(),n.style.display="none",t.style.display="block",t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',r.classList.remove("active"),o.textContent="Standby"}});
