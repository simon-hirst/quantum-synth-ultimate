(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const t of i)if(t.type==="childList")for(const n of t.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function a(i){const t={};return i.integrity&&(t.integrity=i.integrity),i.referrerPolicy&&(t.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?t.credentials="include":i.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function s(i){if(i.ep)return;i.ep=!0;const t=a(i);fetch(i.href,t)}})();class f{constructor(e,a){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.currentVisualization=0,this.visualizationTimer=null,this.visualizationNames=["Quantum Resonance","Neural Particles","Temporal Waveforms"],this.canvas=e,this.ctx=e.getContext("2d"),this.visualizationElement=a,this.setupCanvas()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}initialize(e){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const a=this.audioContext.createMediaStreamSource(e);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,a.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.startVisualizationSwitching(),this.visualize()}catch(a){console.error("Quantum audio initialization failed:",a)}}startVisualizationSwitching(){const e=()=>{this.currentVisualization=(this.currentVisualization+1)%3,this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization],this.visualizationTimer=setTimeout(e,1e4+Math.random()*5e3)};this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization],this.visualizationTimer=setTimeout(e,1e4+Math.random()*5e3)}visualize(){if(!(!this.analyser||!this.dataArray)){switch(this.analyser.getByteFrequencyData(this.dataArray),this.ctx.fillStyle="rgba(5, 8, 17, 0.1)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.currentVisualization){case 0:this.drawQuantumResonance();break;case 1:this.drawNeuralParticles();break;case 2:this.drawTemporalWaveforms();break}this.animationFrame=requestAnimationFrame(()=>this.visualize())}}drawQuantumResonance(){const e=this.canvas.width/4,a=this.canvas.height/4,s=Math.min(e,a)*.8;this.ctx.save(),this.ctx.translate(e,a);for(let t=0;t<this.dataArray.length;t++){const n=this.dataArray[t]/255,o=t*2*Math.PI/this.dataArray.length,r=Math.cos(o)*s,l=Math.sin(o)*s,d=Math.cos(o)*(s+n*s*.5),c=Math.sin(o)*(s+n*s*.5),u=this.ctx.createLinearGradient(r,l,d,c);u.addColorStop(0,`hsl(${t*360/this.dataArray.length}, 100%, 70%)`),u.addColorStop(1,`hsl(${(t*360/this.dataArray.length+60)%360}, 100%, 50%)`),this.ctx.strokeStyle=u,this.ctx.lineWidth=2+n*3,this.ctx.beginPath(),this.ctx.moveTo(r,l),this.ctx.lineTo(d,c),this.ctx.stroke()}const i=this.ctx.createRadialGradient(0,0,0,0,0,s*.2);i.addColorStop(0,"rgba(255, 255, 255, 0.8)"),i.addColorStop(1,"rgba(100, 200, 255, 0.5)"),this.ctx.beginPath(),this.ctx.arc(0,0,s*.2,0,2*Math.PI),this.ctx.fillStyle=i,this.ctx.fill(),this.ctx.restore()}drawNeuralParticles(){const a=this.canvas.width/4,s=this.canvas.height/4;for(let i=0;i<100;i++){const t=this.dataArray[i%this.dataArray.length]/255,n=i*2*Math.PI/100,o=t*150,r=a+Math.cos(n)*o,l=s+Math.sin(n)*o,d=2+t*8,c=this.ctx.createRadialGradient(r,l,0,r,l,d);if(c.addColorStop(0,`hsla(${i*360/100}, 100%, 70%, 0.8)`),c.addColorStop(1,`hsla(${(i*360/100+60)%360}, 100%, 50%, 0.2)`),this.ctx.beginPath(),this.ctx.arc(r,l,d,0,2*Math.PI),this.ctx.fillStyle=c,this.ctx.fill(),i>0&&t>.3){const u=this.dataArray[(i-1)%this.dataArray.length]/255,p=(i-1)*2*Math.PI/100,m=u*150,v=a+Math.cos(p)*m,y=s+Math.sin(p)*m;this.ctx.beginPath(),this.ctx.moveTo(v,y),this.ctx.lineTo(r,l),this.ctx.strokeStyle=`hsla(${i*360/100}, 100%, 60%, ${.2+t*.6})`,this.ctx.lineWidth=1,this.ctx.stroke()}}}drawTemporalWaveforms(){const e=this.canvas.height/4,a=this.canvas.width/2,s=this.canvas.height/2,i=this.ctx.createLinearGradient(0,0,a,0);i.addColorStop(0,"rgba(0, 20, 40, 0.3)"),i.addColorStop(1,"rgba(0, 40, 80, 0.3)"),this.ctx.fillStyle=i,this.ctx.fillRect(0,e-s/2,a,s),this.ctx.beginPath(),this.ctx.moveTo(0,e);for(let o=0;o<this.dataArray.length;o++){const r=this.dataArray[o]/255,l=o/this.dataArray.length*a,d=e-(r-.5)*s;o===0?this.ctx.moveTo(l,d):this.ctx.lineTo(l,d)}const t=this.ctx.createLinearGradient(0,0,a,0);t.addColorStop(0,"#00f3ff"),t.addColorStop(.5,"#ff00d6"),t.addColorStop(1,"#00ff9d"),this.ctx.strokeStyle=t,this.ctx.lineWidth=3,this.ctx.stroke(),this.ctx.lineTo(a,e),this.ctx.lineTo(0,e),this.ctx.closePath();const n=this.ctx.createLinearGradient(0,0,a,0);n.addColorStop(0,"rgba(0, 243, 255, 0.2)"),n.addColorStop(.5,"rgba(255, 0, 214, 0.2)"),n.addColorStop(1,"rgba(0, 255, 157, 0.2)"),this.ctx.fillStyle=n,this.ctx.fill()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.visualizationTimer&&clearTimeout(this.visualizationTimer),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Neural Edition...");const h=document.querySelector("#app");h.innerHTML=`
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth <span class="neural-edition">Neural Edition</span></h1>
        <p class="quantum-subtitle">Real-time audio visualization with quantum-inspired algorithms</p>
      </div>
      
      <div class="quantum-content">
        <div class="quantum-card">
          <div class="card-header">
            <h2>Quantum Capture Setup</h2>
            <div class="pulse-dot"></div>
          </div>
          
          <div class="card-body">
            <div class="instructions">
              <div class="instruction-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Initiate Quantum Capture</h3>
                  <p>Click the button below to begin screen sharing</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Select Entire Screen</h3>
                  <p>Choose your complete display for optimal results</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio Resonance</h3>
                  <p>Check "Share audio" to capture sound frequencies</p>
                </div>
              </div>
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">⚡</span>
              Initiate Quantum Capture
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹️</span>
              Terminate Connection
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Quantum Resonance Visualization</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Active Mode:</span>
            <span id="currentVisualization">Quantum Resonance</span>
          </div>
          <canvas id="visualizer"></canvas>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>Powered by Quantum Audio Processing • v1.0.0</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const e=document.getElementById("visualizer"),a=document.getElementById("currentVisualization"),s=new f(e,a);let i=null;const t=document.getElementById("startButton"),n=document.getElementById("stopButton"),o=document.querySelector(".status-dot"),r=document.querySelector(".status-text");t.addEventListener("click",l),n.addEventListener("click",d);function l(){t.disabled=!0,t.innerHTML='<span class="btn-icon">⏳</span> Initializing...',o.classList.add("pending"),r.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(c=>{console.log("Quantum capture established"),i=c,t.style.display="none",n.style.display="block",o.classList.remove("pending"),o.classList.add("active"),r.textContent="Active",s.initialize(c);const u=c.getVideoTracks()[0];u&&(u.onended=d)}).catch(c=>{console.error("Quantum capture failed:",c),t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Retry Quantum Capture',o.classList.remove("pending"),r.textContent="Error"}):(alert("Quantum capture not supported in this browser"),t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Initiate Quantum Capture',r.textContent="Unsupported")}function d(){i&&(i.getTracks().forEach(c=>c.stop()),i=null),s.stop(),n.style.display="none",t.style.display="block",t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Initiate Quantum Capture',o.classList.remove("active"),r.textContent="Standby"}});
