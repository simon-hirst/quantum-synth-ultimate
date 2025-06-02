(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))o(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const a of s.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function e(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function o(t){if(t.ep)return;t.ep=!0;const s=e(t);fetch(t.href,s)}})();class g{constructor(i,e){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.currentVizType="quantum",this.nextVizType="quantum",this.visualizationTimer=null,this.transitionProgress=0,this.isTransitioning=!1,this.vizParams={},this.lastUpdate=0,this.ws=null,this.vizQueue=[],this.currentViz=null,this.canvas=i,this.ctx=i.getContext("2d"),this.visualizationElement=e,this.setupCanvas(),this.connectToBackend()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}connectToBackend(){try{this.ws=new WebSocket("wss://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/ws"),this.ws.onopen=()=>{console.log("Connected to visualization server"),this.requestNewVisualization()},this.ws.onmessage=i=>{try{const e=JSON.parse(i.data);e.type==="visualization"&&(this.vizQueue.push(e),this.currentViz||this.startNextVisualization())}catch(e){console.error("Error parsing visualization data:",e)}},this.ws.onerror=i=>{console.error("WebSocket error:",i),this.generateLocalVisualization()},this.ws.onclose=()=>{console.log("Disconnected from visualization server"),this.generateLocalVisualization()}}catch(i){console.error("Failed to connect to backend, using local generation:",i),this.generateLocalVisualization()}}requestNewVisualization(){this.ws&&this.ws.readyState===WebSocket.OPEN&&this.ws.send(JSON.stringify({type:"request_viz"}))}generateLocalVisualization(){const i=["quantum","neural","temporal"],e={type:i[Math.floor(Math.random()*i.length)],parameters:this.generateRandomParameters(),duration:15+Math.random()*15};this.vizQueue.push(e),this.currentViz||this.startNextVisualization(),setTimeout(()=>this.generateLocalVisualization(),5e3+Math.random()*1e4)}generateRandomParameters(){return{rotation:Math.random()*2,particleSize:2+Math.random()*4,waveHeight:150+Math.random()*150,particleCount:80+Math.random()*80,connectionThreshold:.2+Math.random()*.4,maxDistance:120+Math.random()*100,waveWidth:.5+Math.random()*2,fillOpacity:.1+Math.random()*.3,colorPalette:Math.floor(Math.random()*5),symmetry:Math.floor(Math.random()*3),complexity:.5+Math.random()*.5}}startNextVisualization(){this.vizQueue.length!==0&&(this.currentViz=this.vizQueue.shift(),this.nextVizType=this.currentViz.type,this.vizParams=this.currentViz.parameters,this.isTransitioning=!0,this.transitionProgress=0,this.visualizationElement.textContent=`Generating: ${this.nextVizType} #${Math.floor(Math.random()*1e3)}`,setTimeout(()=>{this.currentVizType=this.nextVizType,this.isTransitioning=!1,this.visualizationElement.textContent=`${this.nextVizType} #${Math.floor(Math.random()*1e3)}`,this.visualizationTimer=setTimeout(()=>{this.startNextVisualization()},this.currentViz.duration*1e3),this.requestNewVisualization()},2e3))}initialize(i){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const e=this.audioContext.createMediaStreamSource(i);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,e.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.lastUpdate=Date.now(),this.visualize()}catch(e){console.error("Quantum audio initialization failed:",e)}}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const i=Date.now(),e=(i-this.lastUpdate)/1e3;this.lastUpdate=i,this.ctx.fillStyle="rgba(10, 12, 18, 0.2)",this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2),this.isTransitioning?(this.transitionProgress+=e/2,this.transitionProgress>1&&(this.transitionProgress=1),this.drawMorphingVisualization(this.transitionProgress)):this.drawVisualization(this.currentVizType),this.animationFrame=requestAnimationFrame(()=>this.visualize())}drawMorphingVisualization(i){const e=this.canvas.width/4,o=this.canvas.height/4,t=.9+.2*Math.sin(i*Math.PI),s=i*Math.PI;this.ctx.save(),this.ctx.translate(e,o),this.ctx.scale(t,t),this.ctx.rotate(s),this.ctx.translate(-e,-o),this.drawHybridVisualization(i),this.ctx.restore()}drawHybridVisualization(i){const e=this.canvas.width/4,o=this.canvas.height/4,t=Math.min(e,o)*.8,s=150;for(let a=0;a<s;a++){const n=this.dataArray[a%this.dataArray.length]/255,r=a*2*Math.PI/s,h=e+Math.cos(r)*t,l=o+Math.sin(r)*t,c=e+Math.cos(r)*(n*t*.7),d=o+Math.sin(r)*(n*t*.7),u=h+(c-h)*i,m=l+(d-l)*i,v=2+n*8,y=(a*360/s+Date.now()/40)%360;this.ctx.beginPath(),this.ctx.arc(u,m,v,0,2*Math.PI),this.ctx.fillStyle=`hsla(${y}, 80%, 65%, ${.7-i*.5})`,this.ctx.fill()}}drawVisualization(i){switch(i){case"quantum":this.drawQuantumResonance();break;case"neural":this.drawNeuralParticles();break;case"temporal":this.drawTemporalWaveforms();break;default:this.drawQuantumResonance()}}drawQuantumResonance(){const i=this.canvas.width/4,e=this.canvas.height/4,o=Math.min(i,e)*.8;this.ctx.save(),this.ctx.translate(i,e),this.ctx.rotate(this.vizParams.rotation||0);for(let s=0;s<this.dataArray.length;s++){const a=this.dataArray[s]/255,n=s*2*Math.PI/this.dataArray.length,r=Math.cos(n)*o,h=Math.sin(n)*o,l=Math.cos(n)*(o+a*(this.vizParams.waveHeight||150)*.5),c=Math.sin(n)*(o+a*(this.vizParams.waveHeight||150)*.5),d=(s*360/this.dataArray.length+Date.now()/50)%360;this.ctx.strokeStyle=`hsl(${d}, 80%, 65%)`,this.ctx.lineWidth=(this.vizParams.particleSize||2)+a*3,this.ctx.beginPath(),this.ctx.moveTo(r,h),this.ctx.lineTo(l,c),this.ctx.stroke()}const t=this.ctx.createRadialGradient(0,0,0,0,0,o*.2);t.addColorStop(0,"rgba(255, 255, 255, 0.9)"),t.addColorStop(1,"rgba(120, 150, 255, 0.5)"),this.ctx.beginPath(),this.ctx.arc(0,0,o*.2,0,2*Math.PI),this.ctx.fillStyle=t,this.ctx.fill(),this.ctx.restore()}drawNeuralParticles(){const i=this.vizParams.particleCount||100,e=this.canvas.width/4,o=this.canvas.height/4,t=[];for(let a=0;a<i;a++){const n=this.dataArray[a%this.dataArray.length]/255,r=a*2*Math.PI/i,h=n*(this.vizParams.maxDistance||150),l=e+Math.cos(r)*h,c=o+Math.sin(r)*h,d=(this.vizParams.particleSize||2)+n*8,u=(a*360/i+Date.now()/40)%360;t.push({x:l,y:c,size:d,hue:u}),this.ctx.beginPath(),this.ctx.arc(l,c,d,0,2*Math.PI),this.ctx.fillStyle=`hsla(${u}, 80%, 65%, 0.9)`,this.ctx.fill()}const s=this.vizParams.connectionThreshold||.3;for(let a=0;a<t.length;a++)for(let n=a+1;n<t.length;n++){const r=t[a].x-t[n].x,h=t[a].y-t[n].y,l=Math.sqrt(r*r+h*h);l<(this.vizParams.maxDistance||150)*s&&(this.ctx.beginPath(),this.ctx.moveTo(t[a].x,t[a].y),this.ctx.lineTo(t[n].x,t[n].y),this.ctx.strokeStyle=`hsla(${t[a].hue}, 70%, 60%, ${.3-l/((this.vizParams.maxDistance||150)*2)})`,this.ctx.lineWidth=1,this.ctx.stroke())}}drawTemporalWaveforms(){const i=this.canvas.height/4,e=this.canvas.width/2,o=this.vizParams.waveHeight||200,t=this.ctx.createLinearGradient(0,0,e,0);t.addColorStop(0,"rgba(15, 20, 30, 0.4)"),t.addColorStop(1,"rgba(20, 25, 35, 0.4)"),this.ctx.fillStyle=t,this.ctx.fillRect(0,i-o/2,e,o),this.ctx.beginPath();for(let r=0;r<this.dataArray.length;r++){const h=this.dataArray[r]/255,l=r/this.dataArray.length*e,c=i-(h-.5)*o;r===0?this.ctx.moveTo(l,c):this.ctx.lineTo(l,c)}const s=Date.now()/100,a=this.ctx.createLinearGradient(0,0,e,0);a.addColorStop(0,`hsl(${s%360}, 70%, 65%)`),a.addColorStop(.5,`hsl(${(s+120)%360}, 70%, 65%)`),a.addColorStop(1,`hsl(${(s+240)%360}, 70%, 65%)`),this.ctx.strokeStyle=a,this.ctx.lineWidth=this.vizParams.waveWidth||3,this.ctx.stroke(),this.ctx.lineTo(e,i),this.ctx.lineTo(0,i),this.ctx.closePath();const n=this.ctx.createLinearGradient(0,0,e,0);n.addColorStop(0,`hsla(${s%360}, 70%, 65%, ${this.vizParams.fillOpacity||.2})`),n.addColorStop(.5,`hsla(${(s+120)%360}, 70%, 65%, ${this.vizParams.fillOpacity||.2})`),n.addColorStop(1,`hsla(${(s+240)%360}, 70%, 65%, ${this.vizParams.fillOpacity||.2})`),this.ctx.fillStyle=n,this.ctx.fill()}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.visualizationTimer&&clearTimeout(this.visualizationTimer),this.audioContext&&this.audioContext.close(),this.ws&&this.ws.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Infinite Edition...");const p=document.querySelector("#app");p.innerHTML=`
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
        <p>QuantumSynth Infinite v2.0.0 - Endless AI Generation</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const i=document.getElementById("visualizer"),e=document.getElementById("currentVisualization"),o=new g(i,e);let t=null;const s=document.getElementById("startButton"),a=document.getElementById("stopButton"),n=document.querySelector(".status-dot"),r=document.querySelector(".status-text");s.addEventListener("click",h),a.addEventListener("click",l);function h(){s.disabled=!0,s.innerHTML='<span class="btn-icon">⏳</span> Initializing...',n.classList.add("pending"),r.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(c=>{console.log("Screen sharing started"),t=c,s.style.display="none",a.style.display="block",n.classList.remove("pending"),n.classList.add("active"),r.textContent="Active",o.initialize(c);const d=c.getVideoTracks()[0];d&&(d.onended=l)}).catch(c=>{console.error("Error starting screen share:",c),s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Try Again',n.classList.remove("pending"),r.textContent="Error"}):(alert("Screen sharing not supported in this browser"),s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',r.textContent="Unsupported")}function l(){t&&(t.getTracks().forEach(c=>c.stop()),t=null),o.stop(),a.style.display="none",s.style.display="block",s.disabled=!1,s.innerHTML='<span class="btn-icon">▶</span> Start Screen Sharing',n.classList.remove("active"),r.textContent="Standby"}});
