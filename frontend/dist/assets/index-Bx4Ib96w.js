(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const i of e.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function a(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function n(t){if(t.ep)return;t.ep=!0;const e=a(t);fetch(t.href,e)}})();class v{constructor(s){this.audioContext=null,this.analyser=null,this.dataArray=null,this.animationFrame=null,this.canvas=s,this.ctx=s.getContext("2d"),this.setupCanvas()}setupCanvas(){this.canvas.width=this.canvas.offsetWidth*2,this.canvas.height=this.canvas.offsetHeight*2,this.ctx.scale(2,2)}initialize(s){console.log("Initializing quantum audio processing...");try{this.audioContext=new AudioContext;const a=this.audioContext.createMediaStreamSource(s);this.analyser=this.audioContext.createAnalyser(),this.analyser.fftSize=512,a.connect(this.analyser),this.dataArray=new Uint8Array(this.analyser.frequencyBinCount),this.visualize()}catch(a){console.error("Quantum audio initialization failed:",a)}}visualize(){if(!this.analyser||!this.dataArray)return;this.analyser.getByteFrequencyData(this.dataArray);const s=this.ctx.createRadialGradient(this.canvas.width/4,this.canvas.height/4,0,this.canvas.width/4,this.canvas.height/4,this.canvas.width/2);s.addColorStop(0,"rgba(10, 10, 40, 0.1)"),s.addColorStop(1,"rgba(5, 5, 20, 0.3)"),this.ctx.fillStyle=s,this.ctx.fillRect(0,0,this.canvas.width/2,this.canvas.height/2);const a=this.canvas.width/4,n=this.canvas.height/4,t=Math.min(a,n)*.8;this.ctx.save(),this.ctx.translate(a,n);for(let i=0;i<this.dataArray.length;i++){const r=this.dataArray[i]/255,c=i*2*Math.PI/this.dataArray.length,l=Math.cos(c)*t,o=Math.sin(c)*t,d=Math.cos(c)*(t+r*t*.5),p=Math.sin(c)*(t+r*t*.5),h=this.ctx.createLinearGradient(l,o,d,p);h.addColorStop(0,`hsl(${i*360/this.dataArray.length}, 100%, 70%)`),h.addColorStop(1,`hsl(${(i*360/this.dataArray.length+60)%360}, 100%, 50%)`),this.ctx.strokeStyle=h,this.ctx.lineWidth=2+r*3,this.ctx.beginPath(),this.ctx.moveTo(l,o),this.ctx.lineTo(d,p),this.ctx.stroke()}const e=this.ctx.createRadialGradient(0,0,0,0,0,t*.2);e.addColorStop(0,"rgba(255, 255, 255, 0.8)"),e.addColorStop(1,"rgba(100, 200, 255, 0.5)"),this.ctx.beginPath(),this.ctx.arc(0,0,t*.2,0,2*Math.PI),this.ctx.fillStyle=e,this.ctx.fill(),this.ctx.restore(),this.animationFrame=requestAnimationFrame(()=>this.visualize())}stop(){this.animationFrame&&cancelAnimationFrame(this.animationFrame),this.audioContext&&this.audioContext.close()}}document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth Neural Edition...");const u=document.querySelector("#app");u.innerHTML=`
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
          <canvas id="visualizer"></canvas>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>Powered by Quantum Audio Processing • v1.0.0</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;const s=document.getElementById("visualizer"),a=new v(s);let n=null;const t=document.getElementById("startButton"),e=document.getElementById("stopButton"),i=document.querySelector(".status-dot"),r=document.querySelector(".status-text");t.addEventListener("click",c),e.addEventListener("click",l);function c(){t.disabled=!0,t.innerHTML='<span class="btn-icon">⏳</span> Initializing...',i.classList.add("pending"),r.textContent="Initializing",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(o=>{console.log("Quantum capture established"),n=o,t.style.display="none",e.style.display="block",i.classList.remove("pending"),i.classList.add("active"),r.textContent="Active",a.initialize(o);const d=o.getVideoTracks()[0];d&&(d.onended=l)}).catch(o=>{console.error("Quantum capture failed:",o),t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Retry Quantum Capture',i.classList.remove("pending"),r.textContent="Error"}):(alert("Quantum capture not supported in this browser"),t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Initiate Quantum Capture',r.textContent="Unsupported")}function l(){n&&(n.getTracks().forEach(o=>o.stop()),n=null),a.stop(),e.style.display="none",t.style.display="block",t.disabled=!1,t.innerHTML='<span class="btn-icon">⚡</span> Initiate Quantum Capture',i.classList.remove("active"),r.textContent="Standby"}});
