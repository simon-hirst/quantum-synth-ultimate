(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const i of t)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function o(t){const i={};return t.integrity&&(i.integrity=t.integrity),t.referrerPolicy&&(i.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?i.credentials="include":t.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(t){if(t.ep)return;t.ep=!0;const i=o(t);fetch(t.href,i)}})();class n{constructor(e){this.audioData=null,console.log("Visualizer constructor called");try{const o=e.getContext("webgl2");if(!o){console.error("WebGL2 not supported");return}console.log("WebGL2 context created successfully"),this.setupShaders(o)}catch(o){console.error("Visualizer initialization failed:",o)}}setupShaders(e){console.log("Setting up shaders");const o=`
            attribute vec2 aPosition;
            varying float vAmplitude;
            uniform float uAmplitude[256];
            void main() {
                float amplitude = uAmplitude[int(aPosition.x * 255.0)];
                vAmplitude = amplitude;
                gl_Position = vec4(aPosition.x * 2.0 - 1.0, aPosition.y * amplitude, 0.0, 1.0);
                gl_PointSize = 2.0;
            }
        `,a=`
            precision mediump float;
            varying float vAmplitude;
            void main() {
                vec3 color = mix(vec3(0.2, 0.5, 1.0), vec3(1.0, 0.5, 0.2), vAmplitude);
                gl_FragColor = vec4(color, 1.0);
            }
        `,t=e.createShader(e.VERTEX_SHADER);e.shaderSource(t,o),e.compileShader(t);const i=e.createShader(e.FRAGMENT_SHADER);e.shaderSource(i,a),e.compileShader(i);const r=e.createProgram();e.attachShader(r,t),e.attachShader(r,i),e.linkProgram(r),e.useProgram(r),console.log("Shaders compiled successfully")}updateAudioData(e){console.log("Audio data received:",e.length,"samples"),this.audioData=e}render(){this.audioData&&console.log("Rendering audio visualization")}}class l{constructor(){this.visualizer=null,console.log("QuantumSynth Neural Edition constructor called"),this.initializeVisualizer(),this.simulateAudioData()}initializeVisualizer(){const e=document.getElementById("visualizer-canvas");e?(console.log("Canvas found, initializing visualizer"),this.visualizer=new n(e),console.log("Visualizer initialized successfully")):console.error("Canvas element not found")}simulateAudioData(){setInterval(()=>{if(this.visualizer){const e=new Uint8Array(256);for(let o=0;o<256;o++)e[o]=Math.random()*128+128;this.visualizer.updateAudioData(e),this.visualizer.render()}},100)}}console.log("Initializing QuantumSynth...");new l;
