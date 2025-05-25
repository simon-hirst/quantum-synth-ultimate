(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))o(e);new MutationObserver(e=>{for(const n of e)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&o(r)}).observe(document,{childList:!0,subtree:!0});function s(e){const n={};return e.integrity&&(n.integrity=e.integrity),e.referrerPolicy&&(n.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?n.credentials="include":e.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function o(e){if(e.ep)return;e.ep=!0;const n=s(e);fetch(e.href,n)}})();document.addEventListener("DOMContentLoaded",()=>{console.log("Initializing QuantumSynth...");const t=document.querySelector("#app");t.innerHTML=`
    <div class="container">
      <h1>QuantumSynth Neural Edition</h1>
      <div class="instructions">
        <h2>Setup Instructions:</h2>
        <ol>
          <li>Click "Start Screen Sharing" below</li>
          <li>Select your entire screen</li>
          <li>Check "Share audio" option</li>
          <li>Click "Share"</li>
        </ol>
        <button id="startButton">Start Screen Sharing</button>
      </div>
      <canvas id="visualizer"></canvas>
    </div>
  `,document.getElementById("startButton").addEventListener("click",a)});function a(){const t=document.getElementById("startButton");t.disabled=!0,t.textContent="Starting...",navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia?navigator.mediaDevices.getDisplayMedia({video:!0,audio:!0}).then(i=>{console.log("Screen sharing started"),t.style.display="none",c(i)}).catch(i=>{console.error("Error starting screen share:",i),t.disabled=!1,t.textContent="Try Again"}):(alert("Screen sharing not supported in this browser"),t.disabled=!1,t.textContent="Start Screen Sharing")}function c(t){if(!document.getElementById("visualizer")){console.error("Canvas element not found");return}console.log("Initializing visualizer with stream:",t)}
