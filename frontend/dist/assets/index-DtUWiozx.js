(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))o(i);new MutationObserver(i=>{for(const t of i)if(t.type==="childList")for(const e of t.addedNodes)e.tagName==="LINK"&&e.rel==="modulepreload"&&o(e)}).observe(document,{childList:!0,subtree:!0});function s(i){const t={};return i.integrity&&(t.integrity=i.integrity),i.referrerPolicy&&(t.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?t.credentials="include":i.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function o(i){if(i.ep)return;i.ep=!0;const t=s(i);fetch(i.href,t)}})();class y{constructor(a,s){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.currentVisualization=0,this.nextVisualization=0,this.visualizationTimer=null,this.transitionProgress=0,this.isTransitioning=!1,this.visualizationNames=["Quantum Resonance","Neural Particles","Temporal Waveforms"],this.visualizationParams={},this.lastUpdate=0,this.canvas=a,this.ctx=a.getContext("2d"),this.visualizationElement=s,this.setupCanvas(),this.initializeVisualizationParams()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}initializeVisualizationParams(){this.visualizationParams={quantum:{rotation:0,particleSize:2,waveHeight:150},neural:{particleCount:100,connectionThreshold:.3,maxDistance:150},temporal:{waveWidth:1,waveHeight:200,fillOpacity:.2}}}initialize(a){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const s=this.audioContext.createMediaStreamSource(a);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,s.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.lastUpdate=Date.now(),this.startVisualizationSwitching(),this.visualize()}catch(s){console.error("Quantum audio initialization failed:",s)}}startVisualizationSwitching(){const a=()=>{this.nextVisualization=Math.floor(Math.random()*3),this.isTransitioning=!0,this.transitionProgress=0,this.visualizationElement.textContent=`${this.visualizationNames[this.currentVisualization]} → ${this.visualizationNames[this.nextVisualization]}`,setTimeout(()=>{this.currentVisualization=this.nextVisualization,this.isTransitioning=!1,this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization]},3e3),this.visualizationTimer=setTimeout(a,2e4+Math.random()*1e4)};this.visualizationElement.textContent=this.visualizationNames[this.currentVisualization],this.visualizationTimer=setTimeout(a,2e4+Math.random()*1e4)}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const a=Date.now(),s=(a-this.lastUpdate)/1e3;this.lastUpdate=a,this.updateVisualizationParams(s),this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.isTransitioning?(this.transitionProgress+=s/3,this.transitionProgress>1&&(this.transitionProgress=1),this.drawMorphingVisualization(this.transitionProgress)):this.drawVisualization(this.currentVisualization),this.animationFrame=requestAnimationFrame(()=>this.visualize())}updateVisualizationParams(a){this.visualizationParams.quantum.rotation+=a*.5,this.visualizationParams.quantum.particleSize=2+this.getAverageAmplitude()*6,this.visualizationParams.quantum.waveHeight=150+this.getAverageAmplitude()*100,this.visualizationParams.neural.particleCount=80+Math.floor(this.getAverageAmplitude()*40),this.visualizationParams.neural.connectionThreshold=.2+this.getAverageAmplitude()*.3,this.visualizationParams.temporal.waveHeight=200+this.getAverageAmplitude()*150,this.visualizationParams.temporal.fillOpacity=.1+this.getAverageAmplitude()*.3}getAverageAmplitude(){if(!this.dataArray)return 0;let a=0;for(let s=0;s<this.dataArray.length;s++)a+=this.dataArray[s];return a/(this.dataArray.length*255)}drawMorphingVisualization(a){const s=this.canvas.width/4,o=this.canvas.height/4;this.ctx.save();const i=.9+.2*Math.sin(a*Math.PI),t=a*Math.PI;this.ctx.translate(s,o),this.ctx.scale(i,i),this.ctx.rotate(t),this.ctx.translate(-s,-o),this.drawHybridVisualization(a),this.ctx.restore()}drawHybridVisualization(a){const s=this.canvas.width/4,o=this.canvas.height/4,i=Math.min(s,o)*.8,t=150;for(let e=0;e<t;e++){const n=this.dataArray[e%this.dataArray.length]/255,r=e*2*Math.PI/t;let c,h;if(a<.5){const d=s+Math.cos(r)*i,m=o+Math.sin(r)*i,p=s+Math.cos(r)*(n*i*.7),g=o+Math.sin(r)*(n*i*.7);c=d+(p-d)*(a*2),h=m+(g-m)*(a*2)}else{const d=s+Math.cos(r)*(n*i*.7),m=o+Math.sin(r)*(n*i*.7),p=e/t*(this.canvas.width/2),g=o-(n-.5)*this.visualizationParams.temporal.waveHeight;c=d+(p-d)*((a-.5)*2),h=m+(g-m)*((a-.5)*2)}const l=2+n*8,u=(e*360/t+Date.now()/40)%360;this.ctx.beginPath(),this.ctx.arc(c,h,l,0,2*Math.PI),this.ctx.fillStyle=`hsla(${u}, 80%, 65%, ${.7-a*.5})`,this.ctx.fill()}}drawVisualization(a){switch(a){case 0:this.drawQuantumResonance();break;case 1:this.drawNeuralParticles();break;case 2:this.drawTemporalWaveforms();break}}drawQuantumResonance(){const a=this.canvas.width/4,s=this.canvas.height/4,o=Math.min(a,s)*.8;this.ctx.save(),this.ctx.translate(a,s),this.ctx.rotate(this.visualizationParams.quantum.rotation);for(let t=0;t<this.dataArray.length;t++){const e=this.dataArray[t]/255,n=t*2*Math.PI/this.dataArray.length,r=Math.cos(n)*o,c=Math.sin(n)*o,h=Math.cos(n)*(o+e*this.visualizationParams.quantum.waveHeight*.5),l=Math.sin(n)*(o+e*this.visualizationParams.quantum.waveHeight*.5),u=(t*360/this.dataArray.length+Date.now()/50)%360;this.ctx.strokeStyle=`hsl(${u}, 80%, 65%)`,this.ctx.lineWidth=this.visualizationParams.quantum.particleSize+e*3,this.ctx.beginPath(),this.ctx.moveTo(r,c),this.ctx.lineTo(h,l),this.ctx.stroke()}const i=this.ctx.createRadialGradient(0,0,0,0,0,o*.2);i.addColorStop(0,"rgba(255, 255, 255, 0.9)"),i.addColorStop(1,"rgba(120, 150, 255, 0.5)"),this.ctx.beginPath(),this.ctx.arc(0,0,o*.2,0,2*Math.PI),this.ctx.fillStyle=i,this.ctx.fill(),this.ctx.restore()}drawNeuralParticles(){const a=this.visualizationParams.neural.particleCount,s=this.canvas.width/4,o=this.canvas.height/4,i=[];for(let t=0;t<a;t++){const e=this.dataArray[t%this.dataArray.length]/255,n=t*2*Math.PI/a,r=e*this.visualizationParams.neural.maxDistance,c=s+Math.cos(n)*r,h=o+Math.sin(n)*r,l=2+e*8,u=(t*360/a+Date.now()/40)%360;i.push({x:c,y:h,size:l,hue:u}),this.ctx.beginPath(),this.ctx.arc(c,h,l,0,2*Math.PI),this.ctx.fillStyle=`hsla(${u}, 80%, 65%, 0.9)`,this.ctx.fill()}for(let t=0;t<i.length;t++)for(let e=t+1;e<i.length;e++){const n=i[t].x-i[e].x,r=i[t].y-i[e].y,c=Math.sqrt(n*n+r*r);c<this.visualizationParams.neural.maxDistance*this.visualizationParams.neural.connectionThreshold&&(this.ctx.beginPath(),this.ctx.moveTo(i[t].x,i[t].y),this.ctx.lineTo(i[e].x,i[e].y),this.ctx.strokeStyle=`hsla(${i[t].hue}, 70%, 60%, ${.3-c/(this.visualizationParams.neural.maxDistance*2)})`,this.ctx.lineWidth=1,this.ctx.stroke())}}drawTemporalWaveforms(){const a=this.canvas.height/4,s=this.canvas.width/2,o=this.visualizationParams.temporal.waveHeight,i=this.ctx.createLinearGradient(0,0,s,0);i.addColorStop(0,"rgba(15, 20, 30, 0.4)"),i.addColorStop(1,"rgba(20, 25, 35, 0.4)"),this.ctx.fillStyle=i,this.ctx.fillRect(0,a-o/2,s,o),this.ctx.beginPath();for(let r=0;r<this.dataArray.length;r++){const c=this.dataArray[r]/255,h=r/this.dataArray.length*s,l=a-(c-.5)*o;r===0?this.ctx.moveTo(h,l):this.ctx.lineTo(h,l)}const t=Date.now()/100,e=this.ctx.createLinearGradient(0,0,s,0);e.addColorStop(0,`hsl(${t%360}, 70%, 65%)`),e.addColorStop(.5,`hsl(${(t+120)%360}, 70%, 65%)`),e.addColorStop(1,`hsl(${(t+240)%360}, 70%, 65%)`),this.ctx.strokeStyle=e,this.ctx.lineWidth=3,this.ctx.stroke(),this.ctx.lineTo(s,a),this.ctx.lineTo(0,a),this.ctx.closePath();const n=this.ctx.createLinearGradient(0,0,s,0);n.addColorStop(0,`hsla(${t%360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`),n.addColorStop(.5,`hsla(${(t+120)%360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`),n.addColorStop(1,`hsla(${(t+240)%360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`),this.ctx.fillStyle=n,this.ctx.fill()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.visualizationTimer&&clearTimeout(this.visualizationTimer),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Neural Edition...");const v=document.querySelector("#app");v.innerHTML=`
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth</h1>
        <p class="quantum-subtitle">Infinite audio-reactive visualizations</p>
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
            <p>Visualizations will automatically morph every 20-30 seconds</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth v1.2.0 - Infinite Visualization Engine</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const a=document.getElementById("visualizer"),s=document.getElementById("currentVisualization"),o=new y(a,s);let i=null;const t=document.getElementById("startButton"),e=document.getElementById("stopButton"),n=document.querySelector(".status-dot"),r=document.querySelector(".status-text");t.addEventListener("click",c),e.addEventListener("click",h);function c(){t.disabled=!0,t.innerHTML='<span class="btn-icon">⏳</span> Initializing...',n.classList.add("pending"),r.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(l=>{console.log("Screen sharing started"),i=l,t.style.display="none",e.style.display="block",n.classList.remove("pending"),n.classList.add("active"),r.textContent="Active",o.initialize(l);const u=l.getVideoTracks()[0];u&&(u.onended=h)}).catch(l=>{console.error("Error starting screen share:",l),t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Try Again',n.classList.remove("pending"),r.textContent="Error"}):(alert("Screen sharing not supported in this browser"),t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',r.textContent="Unsupported")}function h(){i&&(i.getTracks().forEach(l=>l.stop()),i=null),o.stop(),e.style.display="none",t.style.display="block",t.disabled=!1,t.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',n.classList.remove("active"),r.textContent="Standby"}});
