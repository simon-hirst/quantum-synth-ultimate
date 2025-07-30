(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&s(o)}).observe(document,{childList:!0,subtree:!0});function t(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function s(a){if(a.ep)return;a.ep=!0;const i=t(a);fetch(a.href,i)}})();var I,D;const p=((D=(I=import.meta)==null?void 0:I.env)==null?void 0:D.VITE_BACKEND_HOST)||(typeof window<"u"?window.location.host:"localhost:5173");function C(){if(p.includes("://")){const e=new URL(p);return`${e.protocol}//${e.host}`}return`${typeof window<"u"&&window.location.protocol==="https:"?"https:":"http:"}//${p}`}function k(c="/ws"){const t=typeof window<"u"&&window.location.protocol==="https:"?"wss:":"ws:";if(p.startsWith("ws:")||p.startsWith("wss:")){const s=new URL(p);return`${s.protocol}//${s.host}${c}`}if(p.startsWith("http:")||p.startsWith("https:")){const s=new URL(p);return`${t}//${s.host}${c}`}return`${t}//${p}${c}`}const S=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function L(c,e,t){const s=c.createShader(e);if(c.shaderSource(s,t),c.compileShader(s),!c.getShaderParameter(s,c.COMPILE_STATUS))throw new Error(c.getShaderInfoLog(s)||"compile");return s}function U(c,e,t){const s=c.createProgram();if(c.attachShader(s,L(c,c.VERTEX_SHADER,e)),c.attachShader(s,L(c,c.FRAGMENT_SHADER,t)),c.linkProgram(s),!c.getProgramParameter(s,c.LINK_STATUS))throw new Error(c.getProgramInfoLog(s)||"link");return s}const v=`
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x / max(1.0, uRes.y); return p; }
float aspect(){ return uRes.x / max(1.0, uRes.y); }
`,E=`
uniform sampler2D uSpecTex; uniform float uSpecN;
float specSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uSpecN);
  float u = (i + 0.5) / uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
`,B=`
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`,X=`
${v}
${E}
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = specSample(x);
  float H = 0.05 + 1.35*a + 0.65*uLevel + 0.25*uLow + 0.35*uImpact;
  float body = step(uv.y, H);
  float cap = smoothstep(H, H-0.03-0.04*uAir-0.03*uImpact, uv.y);
  float val = max(body, 1.2*cap);
  float shade = 0.35 + 0.65*pow(1.0-abs(uv.x*2.0-1.0), 0.5);
  vec3 col = mix(vec3(0.1,0.7,1.0), vec3(1.0,0.3,0.6), x) * shade;
  float g = smoothstep(H+0.02, H, uv.y) * (0.6+1.7*uLevel+0.7*uImpact);
  col += g*vec3(0.7,0.9,1.0);
  col += uBeat*vec3(1.0,0.7,1.0)*0.45;
  gl_FragColor = vec4(col*val,1.0);
}
`,N=`
${v}
${E}
uniform float uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = abs(uv.x-0.5)*2.0;
  float a = specSample(pow(1.0-x,0.7));
  float h = 0.04 + 1.5*a + 0.6*uLevel + 0.3*uLow + 0.35*uImpact;
  float line = smoothstep(h, h-0.02-0.02*uAir, uv.y);
  float glow = smoothstep(h+0.03+0.03*uImpact, h, uv.y);
  vec3 col = mix(vec3(0.2,0.9,1.0), vec3(1.0,0.4,0.7), a);
  col = col*line + vec3(glow)*(0.35+1.7*uLevel+0.8*uImpact);
  col += uBeat*0.25;
  gl_FragColor = vec4(col, 1.0);
}
`,W=`
${v}
${E}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/(6.28318);
  float s = specSample(fract(idx));
  float ring = smoothstep(0.02, 0.0, abs(r - (0.25+0.35*s+0.25*uLow)) - 0.01 - 0.02*uImpact);
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.8), s);
  col *= ring*(0.6+1.8*uMid+0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,O=`
${v}
${B}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thickness = 0.009 + 0.012*uImpact;
  float line = smoothstep(thickness, 0.0, d);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,$=`
${v}
${E}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
float n21(vec2 p){ return fract(sin(dot(p, vec2(41.0,289.0)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main(){
  vec2 p = toAspect(vUV); float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float k = 10.0 + 36.0*uAir + 10.0*uImpact;
  float phase = uTime*0.7 + uLow*2.4 + 0.4*uImpact;
  float rings = smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.24) * (0.4+1.8*s+0.7*uImpact);
  float bloom = exp(-r*12.0) * (0.6+1.6*uLow+0.6*uImpact);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02);
  col += uBeat*0.13;
  gl_FragColor = vec4(col,1.0);
}
`,V=`
${v}
${B}
uniform float uTime,uBeat,uMid,uImpact;
void main(){
  vec2 uv=vUV;
  float y = 1.0 - waveSample(uv.x);
  float x = waveSample(uv.y);
  float thickness = 0.011 + 0.012*uImpact;
  float lineY = smoothstep(thickness, 0.0, abs(uv.y - y)-0.001);
  float lineX = smoothstep(thickness, 0.0, abs(uv.x - x)-0.001);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, abs(uv.y - y)) + smoothstep(0.06+0.04*uImpact, 0.0, abs(uv.x - x));
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), uv.x);
  col = col * (lineY + lineX) + glow*0.18;
  col += uBeat*0.22;
  gl_FragColor = vec4(col, 1.0);
}
`,G=`
${v}
${E}
uniform float uTime,uBeat,uHat,uMid,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float seg = 10.0 + floor(uHat*14.0) + 4.0*uImpact;
  float rays = abs(sin(a*seg + uTime*2.0))*pow(1.0-r,0.4);
  float s = specSample(fract((a+3.14159)/6.28318));
  vec3 col = mix(vec3(1.0,0.6,0.2), vec3(0.2,0.8,1.0), s);
  col *= 0.35 + 2.5 * rays * (0.3 + 1.6*s + 0.7*uMid + 0.6*uImpact);
  col += uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,H=`
${v}
${B}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveSample(fract((vUV.x)));
  float b=waveSample(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`,q=`
${v}
${E}
uniform float uTime,uKick,uSnare,uHat,uLow,uMid,uAir,uBeat,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p); float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float z = 1.2/(r+0.12 + 0.25*exp(-r*6.0)*(0.6+1.8*uKick+0.8*uImpact));
  float stripes = sin( (z*8.0 + uTime*2.2) + a*4.0 + (uHat+0.5*uImpact)*10.0 )*0.5+0.5;
  vec3 col = mix(vec3(0.1,0.5,1.2), vec3(1.0,0.4,0.8), stripes);
  col *= (0.3 + 1.0*z) * (0.6 + 1.5*s + 0.8*uAir + 0.5*uImpact);
  col += uBeat*vec3(0.7,0.5,1.0)*0.28;
  gl_FragColor = vec4(col,1.0);
}
`,Y=`
${v}
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
float n21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float smooth2D(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=n21(i), b=n21(i+vec2(1,0)), c=n21(i+vec2(0,1)), d=n21(i+vec2(1,1));
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
void main(){
  vec2 uv=vUV; vec2 p=toAspect(vUV);
  float d = length(p);
  float field = smooth2D(p*3.0 + uTime*vec2(0.4,-0.3)) + 0.5*smooth2D(p*6.0 - uTime*vec2(0.2,0.5));
  float dots = step(0.78 + 0.1*uAir - 0.1*uImpact, fract(field*10.0 + uTime*1.3));
  float glow = exp(-d*(6.2+9.0*uLow+4.0*uImpact));
  vec3 col = mix(vec3(0.2,0.8,1.0), vec3(1.0,0.5,0.8), field);
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact);
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,z=`
${v}
uniform float uTime,uLow,uMid,uAir,uBeat,uImpact;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
void main(){
  vec2 uv=vUV; vec2 p=toAspect(vUV); float d=length(p);
  float speed = 0.8 + 3.5*uLow + 1.4*uImpact;
  vec3 col=vec3(0.0);
  for(int i=0;i<24;i++){
    float f=float(i);
    vec2 q = fract(uv*0.5 + vec2(hash(vec2(f,1.7)),hash(vec2(2.3,f))) + uTime*speed*0.02);
    float star = pow(1.0 - length(q-0.5)*2.0, 6.0);
    col += vec3(star)*(0.3+0.9*uAir);
  }
  col *= 1.0 - d*0.2;
  col += uBeat*vec3(0.5,0.4,1.0)*0.25;
  gl_FragColor=vec4(col,1.0);
}
`,K=`
${v}
uniform sampler2D uFeedback, uStreamTex;
uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=toAspect(uv); float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); vec2 p=vec2(cos(a),sin(a))*r; return p*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  vec2 c=toAspect(uv)-vec2(0.0); float r=length(toAspect(uv));
  float bassWarp=0.48*uKick+0.20*uSnare; uv+=((uv-0.5)*2.0)*(bassWarp*r)*0.5;
  float angle=(uMid*0.85+0.2)*sin(t*0.42)+r*(0.45+0.25*uLow);
  mat2 R=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
  vec3 stream=texture2D(uStreamTex,(R*(uv-0.5)+0.5)+vec2(t*0.02,-t*0.015)).rgb;
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2);
  vec3 prev=texture2D(uFeedback, uv + (uv-0.5)*0.012*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base*0.8+stream*0.4, 0.55+0.45*uEnv);
  col += uBeat*vec3(0.9,0.6,1.0);
  float vg=1.0-dot((toAspect(vUV)),(toAspect(vUV)))*0.7; col*=qclamp(vg,0.25,1.0);
  gl_FragColor=vec4(col,1.0);
}
`,j=`
${v}
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3  uBands;
void main(){
  vec2 uv=vUV;
  float p = clamp(uProgress,0.0,1.0);
  vec3 A = texture2D(uFrom, uv).rgb;
  vec3 B = texture2D(uTo,   uv).rgb;
  vec3 col = mix(A,B,p);
  gl_FragColor = vec4(col,1.0);
}
`,J=15e3,Q=17e3;class Z{constructor(e,t={}){var s,a,i;if(this.opts=t,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.beat=0,this.kick=0,this.snare=0,this.hat=0,this.peak=[0,0,0,0],this.impact=0,this.level=0,this.specTex=null,this.waveTex=null,this.specBins=128,this.waveBins=512,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.88,this.scenes=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield","wow","server"],this.sceneIdx=0,this.nextSwitchAt=0,this.rotatePaused=!1,this.frames=0,this.lastFPS=performance.now(),this.loop=()=>{var b,F;const o=this.gl,r=performance.now();this.frames++,r-this.lastFPS>=1e3&&((F=(b=this.opts).onFps)==null||F.call(b,this.frames),this.frames=0,this.lastFPS=r);let n=0,u=0,l=0,f=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const x=this.freq.length;let P=0;for(let h=0;h<x;h++){const T=this.freq[h]/255;P+=T*T,h<x*.2?n+=T:h<x*.7?u+=T:l+=T}n/=Math.max(1,x*.2),u/=Math.max(1,x*.5),l/=Math.max(1,x*.3),f=Math.min(1,Math.sqrt(P/x)*2.2),this.beat=(n>.55?1:0)*.4+(u>.5?.2:0),this.impact=Math.max(0,n*1.2+u*.6+l*.4-.6),this.kick=n,this.snare=u,this.hat=l;const A=this.specBins,w=new Uint8Array(A*4);for(let h=0;h<A;h++){const T=Math.floor(h*x/A),_=this.freq[T];w[h*4]=w[h*4+1]=w[h*4+2]=_,w[h*4+3]=255}o.activeTexture(o.TEXTURE0+6),o.bindTexture(o.TEXTURE_2D,this.specTex),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,A,1,0,o.RGBA,o.UNSIGNED_BYTE,w);const R=this.waveBins,g=new Uint8Array(R*4),M=this.wave.length;for(let h=0;h<R;h++){const T=Math.floor(h*M/R),_=this.wave[T];g[h*4]=g[h*4+1]=g[h*4+2]=_,g[h*4+3]=255}o.activeTexture(o.TEXTURE0+8),o.bindTexture(o.TEXTURE_2D,this.waveTex),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,R,1,0,o.RGBA,o.UNSIGNED_BYTE,g)}this.level=f,!this.rotatePaused&&r>=this.nextSwitchAt&&this.nextScene(),o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,this.canvas.width,this.canvas.height);const d=r/1e3,m=this.scenes[this.sceneIdx];m==="wow"?this.drawWOW(d):m==="server"?this.drawServer(d):this.drawClassic(m,d),this.anim=requestAnimationFrame(this.loop)},this.canvas=e,this.gl=e.getContext("webgl")||e.getContext("webgl2"),!this.gl){(s=this.canvas.getContext("2d"))==null||s.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),this.resize(),new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement||document.body),(i=(a=this.opts).onStatus)==null||i.call(a,"Ready. M next • 1–9 classic • 0 starfield • 5 WOW • V WOW/Server • N server shader"),window.addEventListener("keydown",o=>{const r=o.key.toLowerCase();if(r==="m"&&this.nextScene(),r==="v"&&this.toggleWow(),r==="n"&&this.loadServerShader("composite").then(()=>{var n,u;return(u=(n=this.opts).onStatus)==null?void 0:u.call(n,"Server shader refreshed")}).catch(()=>{}),"1234567890".includes(r)){const n=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield"],u=r==="0"?n.indexOf("starfield"):parseInt(r,10)-1;n[u]&&(this.sceneIdx=this.scenes.indexOf(n[u]))}})}isPaused(){return this.rotatePaused}togglePause(){this.rotatePaused=!this.rotatePaused}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var e;this.anim&&cancelAnimationFrame(this.anim),(e=this.ws)==null||e.close()}async startScreenShare(){var a;const e=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!e.getAudioTracks().length)throw e.getTracks().forEach(i=>i.stop()),new Error("No audio shared");(a=this.audioCtx)==null||a.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=4096,this.audioCtx.createMediaStreamSource(e).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=e;const s=e.getVideoTracks()[0];s&&(s.onended=()=>this.stopScreenShare())}stopScreenShare(){var e,t;(e=this.stream)==null||e.getTracks().forEach(s=>s.stop()),this.stream=null,this.freq=null,this.wave=null,(t=this.audioCtx)==null||t.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(e){e&&this.stopScreenShare()}toggleWow(){const e=this.scenes[this.sceneIdx];this.sceneIdx=this.scenes.indexOf(e==="wow"?"server":"wow")}initGL(){const e=this.gl,t=e.createBuffer();this.quad=t,e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),e.STATIC_DRAW),this.texA=this.mkTex(2,2),this.fbA=this.mkFB(this.texA),this.texB=this.mkTex(2,2),this.fbB=this.mkFB(this.texB);const s={barsPro:X,centerBars:N,circleSpectrum:W,waveformLine:O,radialRings:$,oscDual:V,sunburst:G,lissajous:H,tunnel:q,particles:Y,starfield:z};for(const[a,i]of Object.entries(s))try{const o=U(e,S,i);this.sceneProg[a]=o}catch(o){console.error("[Shader fail]",a,o),this.sceneProg[a]=null}try{this.wowProg=U(e,S,K)}catch(a){console.error("[WOW fail]",a),this.wowProg=null}this.streamTex=this.mkTex(2,2),this.bumpSwitchTimer()}mkTex(e,t){const s=this.gl,a=s.createTexture();return s.bindTexture(s.TEXTURE_2D,a),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.UNSIGNED_BYTE,null),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.CLAMP_TO_EDGE),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.CLAMP_TO_EDGE),a}mkFB(e){const t=this.gl,s=t.createFramebuffer();return t.bindFramebuffer(t.FRAMEBUFFER,s),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,e,0),t.bindFramebuffer(t.FRAMEBUFFER,null),s}initAudioTextures(){const e=this.gl,t=s=>{const a=e.createTexture();return e.bindTexture(e.TEXTURE_2D,a),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,s,1,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),a};this.specTex=t(this.specBins),this.waveTex=t(this.waveBins)}initWS(){var e;try{(e=this.ws)==null||e.close();const t=k("/ws");this.ws=new WebSocket(t),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var s;(s=this.ws)==null||s.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=s=>{typeof s.data!="string"&&this.onStreamFrame(s.data)}}catch(t){console.warn("WS init failed",t)}}onStreamFrame(e){const t=this.gl,s=new DataView(e,0,24);if(!String.fromCharCode(...new Uint8Array(e.slice(0,8))).startsWith("FRAMEv1"))return;const i=s.getUint32(8,!0),o=s.getUint32(12,!0);if(s.getUint32(16,!0)!==4)return;const n=new Uint8Array(e,24);this.streamW=i,this.streamH=o,t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,i,o,0,t.RGBA,t.UNSIGNED_BYTE,n),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT)}resize(){const e=this.gl,t=Math.max(1,Math.round(window.devicePixelRatio||1)),s=this.canvas.parentElement||document.body,a=s.clientWidth||window.innerWidth,i=s.clientHeight||window.innerHeight,o=a*t,r=i*t;if(this.canvas.width!==o||this.canvas.height!==r){this.canvas.width=o,this.canvas.height=r,this.canvas.style.width=a+"px",this.canvas.style.height=i+"px",e.viewport(0,0,o,r);const n=Math.max(2,Math.floor(o/2)),u=Math.max(2,Math.floor(r/2)),l=(f,d)=>{!f||!d||(e.bindTexture(e.TEXTURE_2D,f),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,n,u,0,e.RGBA,e.UNSIGNED_BYTE,null),e.bindFramebuffer(e.FRAMEBUFFER,d),e.framebufferTexture2D(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,f,0),e.bindFramebuffer(e.FRAMEBUFFER,null))};l(this.texA,this.fbA),l(this.texB,this.fbB)}}nextScene(){this.sceneIdx=(this.sceneIdx+1)%this.scenes.length,this.bumpSwitchTimer()}bumpSwitchTimer(){const e=performance.now();this.nextSwitchAt=e+J+Math.random()*Q}drawClassic(e,t){const s=this.gl,a=this.sceneProg[e];if(!a)return;s.useProgram(a);const i=(r,n,u)=>{const l=s.getUniformLocation(a,r);l&&s[`uniform${u}`](l,...Array.isArray(n)?n:[n])};s.activeTexture(s.TEXTURE0+6),s.bindTexture(s.TEXTURE_2D,this.specTex),i("uSpecTex",6,"1i"),i("uSpecN",this.specBins,"1f"),s.activeTexture(s.TEXTURE0+8),s.bindTexture(s.TEXTURE_2D,this.waveTex),i("uWaveTex",8,"1i"),i("uWaveN",this.waveBins,"1f"),i("uTime",t,"1f"),i("uRes",[this.canvas.width,this.canvas.height],"2f"),i("uLevel",this.level,"1f"),i("uBeat",this.beat,"1f"),i("uKick",this.kick,"1f"),i("uSnare",this.snare,"1f"),i("uHat",this.hat,"1f"),i("uLow",this.kick,"1f"),i("uMid",this.snare,"1f"),i("uAir",this.hat,"1f"),i("uImpact",Math.min(2,this.impact),"1f");const o=s.getAttribLocation(a,"aPos");s.bindBuffer(s.ARRAY_BUFFER,this.quad),s.enableVertexAttribArray(o),s.vertexAttribPointer(o,2,s.FLOAT,!1,0,0),s.drawArrays(s.TRIANGLES,0,6)}drawWOW(e){const t=this.gl;if(!this.wowProg)return;const s=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));t.bindFramebuffer(t.FRAMEBUFFER,this.fbA),t.viewport(0,0,s,a),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(this.wowProg);const i=d=>t.getUniformLocation(this.wowProg,d);t.uniform1f(i("uTime"),e),t.uniform2f(i("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(i("uDecay"),this.decay),t.uniform1f(i("uEnv"),this.level),t.uniform1f(i("uBeat"),this.beat),t.uniform1f(i("uKick"),this.kick),t.uniform1f(i("uSnare"),this.snare),t.uniform1f(i("uHat"),this.hat),t.uniform1f(i("uLow"),this.kick),t.uniform1f(i("uMid"),this.snare),t.uniform1f(i("uAir"),this.hat),t.activeTexture(t.TEXTURE0+7),t.bindTexture(t.TEXTURE_2D,this.texB),t.uniform1i(i("uFeedback"),7),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.uniform1i(i("uStreamTex"),this.streamUnit);const o=t.getAttribLocation(this.wowProg,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height);const r=this.sceneProg.waveformLine||U(t,S,j);t.useProgram(r);const n=d=>t.getUniformLocation(r,d);t.activeTexture(t.TEXTURE0),t.bindTexture(t.TEXTURE_2D,this.texA),n("uFrom")&&t.uniform1i(n("uFrom"),0);const u=t.getAttribLocation(r,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(u),t.vertexAttribPointer(u,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6);const l=this.texA;this.texA=this.texB,this.texB=l;const f=this.fbA;this.fbA=this.fbB,this.fbB=f}async loadServerShader(e){const t=new URLSearchParams;e&&t.set("type",e),t.set("ts",Date.now().toString());const a=`${C()}/api/shader/next?${t.toString()}`,i=await fetch(a,{cache:"no-store"});if(!i.ok)throw new Error("HTTP "+i.status);const o=await i.json(),r=this.gl;try{const n=U(r,S,o.code);this.serverProg=n,r.useProgram(n);const l=(f=>r.getUniformLocation(n,f))("uStreamTex");l&&r.uniform1i(l,this.streamUnit)}catch(n){console.error("[ServerShader] compile/link failed:",n)}}drawServer(e){const t=this.gl,s=this.serverProg;if(!s){this.drawClassic("barsPro",e);return}t.useProgram(s);const a=(o,r,n)=>{const u=t.getUniformLocation(s,o);u&&t[`uniform${n}`](u,...Array.isArray(r)?r:[r])};a("uTime",e,"1f"),a("uRes",[this.canvas.width,this.canvas.height],"2f"),a("uLevel",this.level,"1f"),a("uBeat",this.beat,"1f"),a("uLow",this.kick,"1f"),a("uMid",this.snare,"1f"),a("uAir",this.hat,"1f"),a("uImpact",Math.min(2,this.impact),"1f"),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex);const i=t.getAttribLocation(s,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(i),t.vertexAttribPointer(i,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}function y(c,e,t){const s=document.createElement(c);return e&&(s.className=e),s}document.addEventListener("DOMContentLoaded",()=>{const c=document.querySelector("#app");if(!c)return;const e=y("div","qs-shell"),t=y("aside","qs-side"),s=y("main","qs-main");t.innerHTML=`
    <div class="brand">
      <div class="dot"></div>
      <div class="title">QuantumSynth</div>
      <div class="subtitle">Neural Edition</div>
    </div>
    <div class="controls">
      <button id="btnStart" class="btn primary">Start Screen Sharing</button>
      <button id="btnStop"  class="btn">Stop</button>
      <button id="btnDemo"  class="btn ghost">Demo Mode</button>
      <button id="btnPause" class="btn ghost">Pause rotation (P)</button>
      <div class="status" id="status">Ready</div>
    </div>
    <div class="section-title">Setup</div>
    <ol class="setup">
      <li>Use <b>Chrome</b> or <b>Edge</b> for best results</li>
      <li><b>Best compatibility:</b> choose <b>Entire Screen</b> and tick <b>Share audio</b> (DRM tabs often block audio)</li>
      <li>Select the tab/window you want visualised</li>
      <li>Press <b>M</b> (or 1–0) to switch visualisations</li>
    </ol>
    <div class="built-by">built by <a href="https://github.com/simon-hirst" target="_blank" rel="noreferrer">github.com/simon-hirst</a></div>
  `;const a=y("canvas","qs-canvas");a.id="visualizer",s.appendChild(a),e.appendChild(t),e.appendChild(s),c.innerHTML="",c.appendChild(e);const i=document.getElementById("status"),o=document.getElementById("btnStart"),r=document.getElementById("btnStop"),n=document.getElementById("btnDemo"),u=document.getElementById("btnPause"),l=new Z(a,{onStatus:m=>{i.textContent=m},onFps:m=>{}}),f=()=>{u.textContent=l.isPaused()?"Resume rotation (P)":"Pause rotation (P)"};o.onclick=async()=>{i.textContent="Requesting screen share…";try{await l.startScreenShare(),i.textContent="Screen sharing active ✓ — Best compatibility: choose “Entire Screen” + “Share audio”"}catch(m){console.error(m),i.textContent="Screen share failed. Tip: select “Entire Screen” and enable “Share audio”"}},r.onclick=()=>{l.stopScreenShare(),i.textContent="Stopped"},n.onclick=()=>{l.setDemoMode(!0),i.textContent="Demo mode active"},u.onclick=()=>{l.togglePause(),f()},window.addEventListener("keydown",m=>{m.key.toLowerCase()==="p"&&(l.togglePause(),f())}),new ResizeObserver(()=>{const m=s.clientWidth,b=s.clientHeight;a.style.width=m+"px",a.style.height=b+"px"}).observe(s),f(),l.start().catch(m=>console.error(m))});
