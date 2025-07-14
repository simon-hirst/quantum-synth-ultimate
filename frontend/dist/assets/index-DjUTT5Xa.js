(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const o of document.querySelectorAll('link[rel="modulepreload"]'))e(o);new MutationObserver(o=>{for(const t of o)if(t.type==="childList")for(const s of t.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&e(s)}).observe(document,{childList:!0,subtree:!0});function i(o){const t={};return o.integrity&&(t.integrity=o.integrity),o.referrerPolicy&&(t.referrerPolicy=o.referrerPolicy),o.crossOrigin==="use-credentials"?t.credentials="include":o.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function e(o){if(o.ep)return;o.ep=!0;const t=i(o);fetch(o.href,t)}})();const U=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`,x=`
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
`,R=`
uniform sampler2D uSpecTex; uniform float uSpecN;
float specSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uSpecN);
  float u = (i + 0.5) / uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
`,D=`
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`,L=`
${x}${R}
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = pow(uv.x, 0.72);
  float a = specSample(x);
  float H = 0.05 + 1.45*a + 0.7*uLevel + 0.35*uLow + 0.45*uImpact;
  float bar = smoothstep(H, H-0.03-0.03*uAir-0.02*uImpact, uv.y);
  float glow = smoothstep(H+0.05+0.05*uImpact, H, uv.y);
  vec3 base = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.35,0.7), x);
  vec3 col = base*bar + glow*(0.25+1.9*uLevel+0.9*uImpact);
  col += uBeat*vec3(0.9,0.6,1.0)*0.18;
  gl_FragColor = vec4(col,1.0);
}
`,I=`
${x}${R}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p = toAspect(vUV);
  float r = length(p)+1e-5;
  float a = (atan(p.y,p.x)+3.14159)/(6.28318);
  float s = specSample(a);
  float spokes = smoothstep(0.0, 0.9, 1.0 - abs(fract(a*24.0) - 0.5)*2.0);
  float ray = smoothstep(0.3, 0.0, r - (0.15 + 0.55*s + 0.35*uAir + 0.25*uImpact));
  float halo = exp(-r*(6.0 + 12.0*uLow + 5.0*uImpact));
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.9), s);
  col = col*(ray*spokes*(0.5+1.6*uMid+0.6*uImpact) + halo);
  col += uBeat*vec3(0.7,0.5,1.0)*0.25;
  gl_FragColor = vec4(col,1.0);
}
`,M=`
${x}
uniform float uTime,uKick,uImpact,uLow,uAir,uBeat;
void main(){
  vec2 p = toAspect(vUV); float r=length(p);
  float t = uTime*0.7 + uKick*2.0 + uImpact*0.7;
  float k = 8.0 + 16.0*uKick + 8.0*uImpact;
  float ring = smoothstep(0.02+0.02*uImpact, 0.0, abs(fract(r*k - t)-0.5)-0.28);
  float glow = exp(-r*(7.0 + 9.0*uLow + 4.0*uImpact));
  vec3 col = mix(vec3(0.15,0.9,1.0), vec3(1.0,0.4,0.8), r);
  col = col*(ring*(0.6+1.9*uKick+0.8*uImpact) + glow);
  col += uBeat*0.18;
  gl_FragColor = vec4(col,1.0);
}
`,k=`
${x}${R}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }
vec2 rand2(vec2 p){ float n=hash(p); return vec2(n, hash(p+19.19)); }
float voronoi(vec2 x){
  vec2 n=floor(x), f=fract(x);
  float md=8.0;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 g=vec2(float(i),float(j));
    vec2 o=rand2(n+g)-0.5;
    o += 0.35*vec2(sin(uTime*0.8+o.x*6.0), cos(uTime*0.7+o.y*6.0))*(0.4+1.1*uAir+0.6*uImpact);
    vec2 r=g+o-f; md=min(md, dot(r,r));
  }
  return sqrt(md);
}
void main(){
  vec2 p = toAspect(vUV)*2.2;
  float d = voronoi(p*(1.0+0.3*uMid));
  float edge = smoothstep(0.06, 0.0, d);
  float glow = smoothstep(0.18, 0.0, d);
  vec3 base = mix(vec3(0.1,0.9,1.0), vec3(1.0,0.35,0.9), qclamp(d*2.0,0.0,1.0));
  vec3 col = base*edge + vec3(glow)*(0.2+1.5*uLow+0.7*uImpact) + uBeat*0.15;
  gl_FragColor = vec4(col,1.0);
}
`,N=`
${x}${R}
uniform float uTime,uLevel,uLow,uMid,uAir,uImpact,uBeat;
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv);
  float lane = floor( uv.x*48.0 ) / 48.0;
  float a = specSample(pow(lane,0.8));
  float H = 0.08 + 1.9*a + 0.5*uLevel + 0.35*uImpact;
  float perspective = (1.0 - abs(p.y))*0.6 + 0.4;
  float h = H*perspective;
  float body = step(uv.y, h);
  float cap = smoothstep(h, h-0.02-0.03*uAir-0.02*uImpact, uv.y);
  vec3 col = mix(vec3(0.1,0.9,1.0), vec3(1.0,0.4,0.75), lane);
  col = col*(body*0.9 + cap) + uBeat*vec3(0.8,0.6,1.0)*0.14;
  gl_FragColor = vec4(col,1.0);
}
`,C=`
${x}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float n21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float fbm(vec2 p){
  float a=0.5,f=1.0,sum=0.0;
  for(int i=0;i<5;i++){ sum+=a*n21(p*f); f*=2.02; a*=0.5; }
  return sum;
}
void main(){
  vec2 uv=vUV; vec2 p=toAspect(uv);
  float field = fbm(p*6.0 + uTime*vec2(0.8,-0.6));
  float thresh = 0.78 - 0.35*uBeat - 0.25*uImpact - 0.2*uLow;
  float spark = step(thresh, field);
  float glow = exp(-dot(p,p)*(5.0 + 6.0*uMid + 3.0*uImpact));
  vec3 col = mix(vec3(0.2,0.9,1.0), vec3(1.0,0.5,0.9), field);
  col = col*(spark*(0.6+1.4*uAir+0.8*uImpact) + glow);
  gl_FragColor=vec4(col,1.0);
}
`,X=`
${x}${R}
uniform float uTime,uLow,uMid,uAir,uImpact,uBeat;
float hash(vec2 p){ return fract(1e4*sin(dot(p,vec2(17.13,39.19)))); }
vec2 flow(vec2 p){
  float ang = sin(p.y*2.0 + uTime*0.8) + cos(p.x*2.0 - uTime*0.9);
  ang += 2.2*specSample(fract((p.x+p.y)*0.25))*(0.5+uAir);
  return vec2(cos(ang), sin(ang));
}
void main(){
  vec2 p = toAspect(vUV)*1.4;
  vec3 col=vec3(0.0);
  vec2 q=p;
  for(int i=0;i<40;i++){
    vec2 d = flow(q)*(0.008 + 0.004*uAir + 0.003*uImpact);
    q += d;
    float t = float(i)/40.0;
    col += mix(vec3(0.15,0.9,1.0), vec3(1.0,0.4,0.85), t)*0.02;
  }
  float halo = exp(-dot(p,p)*(4.0+8.0*uLow+3.0*uImpact));
  col += halo + uBeat*0.18;
  gl_FragColor = vec4(col,1.0);
}
`,O=`
${x}${D}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thick = 0.010 + 0.015*uImpact;
  float line = smoothstep(thick, 0.0, d);
  float glow = smoothstep(0.07+0.05*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.22 + uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,q=`
${x}
uniform sampler2D uFrom, uTo; uniform float uProgress, uBeat, uImpact; uniform vec3 uBands;
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
vec2 sobel(sampler2D t, vec2 uv, vec2 px){
  float tl=luma(texture2D(t, uv+px*vec2(-1.0,-1.0)).rgb);
  float  l=luma(texture2D(t, uv+px*vec2(-1.0, 0.0)).rgb);
  float bl=luma(texture2D(t, uv+px*vec2(-1.0, 1.0)).rgb);
  float tr=luma(texture2D(t, uv+px*vec2( 1.0,-1.0)).rgb);
  float  r=luma(texture2D(t, uv+px*vec2( 1.0, 0.0)).rgb);
  float br=luma(texture2D(t, uv+px*vec2( 1.0, 1.0)).rgb);
  float  t0=luma(texture2D(t, uv+px*vec2( 0.0,-1.0)).rgb);
  float  b0=luma(texture2D(t, uv+px*vec2( 0.0, 1.0)).rgb);
  vec2 g;
  g.x = (tr + 2.0*r + br) - (tl + 2.0*l + bl);
  g.y = (bl + 2.0*b0 + br) - (tl + 2.0*t0 + tr);
  return g;
}
vec2 norm2(vec2 v){ float m=max(1e-5, length(v)); return v/m; }
void main(){
  vec2 uv=vUV; vec2 px=1.0/uRes;
  float p = smoothstep(0.0,1.0,uProgress);
  vec2 gA = sobel(uFrom, uv, px);
  vec2 gB = sobel(uTo,   uv, px);
  vec2 dirA = norm2(gA), dirB = norm2(gB);
  float magA = min(1.0, length(gA)), magB=min(1.0, length(gB));
  float featA = smoothstep(0.15, 0.6, magA), featB = smoothstep(0.15, 0.6, magB);
  float audioAmp = 0.25 + 1.8*uBands.x + 0.8*uImpact + 0.45*uBeat;
  vec2 ua = uv, ub = uv;
  float stepLen = (0.8 + 1.4*uBands.z) * (0.0035 + 0.0045*audioAmp);
  for(int i=0;i<6;i++){ ua += dirA*stepLen*(1.0-p)*featA; ub -= dirB*stepLen*(p)*featB; }
  vec3 colA = texture2D(uFrom, ua).rgb;
  vec3 colB = texture2D(uTo,   ub).rgb;
  float w = smoothstep(0.0,1.0, p + 0.25*(featB - featA)) + 0.12*uBeat;
  gl_FragColor = vec4(mix(colA,colB, min(max(w,0.0),1.0)),1.0);
}
`;class V{constructor(a){this.ctx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.specBins=128,this.waveBins=512,this.progs={},this.scenes=["barsPro","starburst","shockwave","neonVoronoi","cityBars","particlesBurst","flowfieldNeon","waveformLine"],this.idx=0,this.lastFPS=performance.now(),this.frames=0,this.sceneStart=performance.now(),this.minMs=45e3,this.maxMs=75e3,this.rotateAt=performance.now(),this.transitioning=!1,this.transStart=0,this.transDur=1500,this.rotatePaused=!1,this.deadFrames=0,this.loop=()=>{const t=this.gl,s=performance.now(),r=s/1e3;let l=0,n=0,u=0,h=0,p=0,f=0,E=0,y=0,F=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const m=this.freq.length;let d=0;for(let c=0;c<m;c++){const T=this.freq[c]/255;d+=T*T,c<m*.2?n+=T:c<m*.7?u+=T:h+=T}n/=Math.max(1,m*.2),u/=Math.max(1,m*.5),h/=Math.max(1,m*.3),l=Math.min(1,Math.sqrt(d/m)*2.2),p=(n>.55?1:0)*.4+(u>.5?.2:0),f=Math.max(0,n*1.2+u*.6+h*.4-.6),E=n,y=u,F=h;const b=this.specBins,v=new Uint8Array(b*4);for(let c=0;c<b;c++){const T=Math.floor(c*m/b),S=this.freq[T];v[c*4]=v[c*4+1]=v[c*4+2]=S,v[c*4+3]=255}t.activeTexture(t.TEXTURE0+6),t.bindTexture(t.TEXTURE_2D,this.specTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,b,1,0,t.RGBA,t.UNSIGNED_BYTE,v);const w=this.waveBins,A=new Uint8Array(w*4),P=this.wave.length;for(let c=0;c<w;c++){const T=Math.floor(c*P/w),S=this.wave[T];A[c*4]=A[c*4+1]=A[c*4+2]=S,A[c*4+3]=255}t.activeTexture(t.TEXTURE0+8),t.bindTexture(t.TEXTURE_2D,this.waveTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,w,1,0,t.RGBA,t.UNSIGNED_BYTE,A)}s-this.sceneStart;const _=this.scenes[this.idx];if(!this.transitioning&&!this.rotatePaused&&s>=this.rotateAt&&this.nextScene(),this.transitioning){const m=Math.min(1,(s-this.transStart)/this.transDur);t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height),t.useProgram(this.morphProg);const d=v=>t.getUniformLocation(this.morphProg,v);t.activeTexture(t.TEXTURE0+0),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(d("uFrom"),0),t.activeTexture(t.TEXTURE0+1),t.bindTexture(t.TEXTURE_2D,this.texB),t.uniform1i(d("uTo"),1),t.uniform1f(d("uProgress"),m),t.uniform2f(d("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(d("uBeat"),p),t.uniform1f(d("uImpact"),f),t.uniform3f(d("uBands"),n,u,h);const b=t.getAttribLocation(this.morphProg,"aPos");if(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(b),t.vertexAttribPointer(b,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6),m>=1){this.transitioning=!1,this.sceneStart=performance.now(),this.deadFrames=0,this.rotateAt=performance.now()+this.pickRotateDelay();const v=performance.now();this.holdUntil=v+2e4,this.rotateAt=v+this.pickRotateDelay()}}else{this.drawToScreen(_,r,{level:l,low:n,mid:u,air:h,beat:p,impact:f,kick:E,snare:y,hat:F});const m=new Uint8Array(4);this.gl.readPixels(0,0,1,1,this.gl.RGBA,this.gl.UNSIGNED_BYTE,m),(m[0]+m[1]+m[2])/3<2?this.deadFrames++:this.deadFrames=0,this.deadFrames>45&&(console.warn("[watchdog] scene dead → skipping",_),this.nextScene())}this.anim=requestAnimationFrame(this.loop)},this.canvas=a;const i=a.getContext("webgl")||a.getContext("webgl2");if(!i)throw new Error("WebGL unsupported");this.gl=i;const e=i.createBuffer();this.quad=e,i.bindBuffer(i.ARRAY_BUFFER,e),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),i.STATIC_DRAW),this.texA=this.mkTex(2,2),this.fbA=this.mkFB(this.texA),this.texB=this.mkTex(2,2),this.fbB=this.mkFB(this.texB),this.specTex=this.mkAudioTex(this.specBins),this.waveTex=this.mkAudioTex(this.waveBins);const o={barsPro:L,starburst:I,shockwave:M,neonVoronoi:k,cityBars:N,particlesBurst:C,flowfieldNeon:X,waveformLine:O};for(const[t,s]of Object.entries(o))try{const r=this.link(U,s);this.progs[t]=r;const l=i.getAttribLocation(r,"aPos");i.bindBuffer(i.ARRAY_BUFFER,this.quad),i.enableVertexAttribArray(l),i.vertexAttribPointer(l,2,i.FLOAT,!1,0,0)}catch(r){console.error("[Shader fail]",t,r),this.progs[t]=null}this.morphProg=this.link(U,q);{const t=i.getAttribLocation(this.morphProg,"aPos");i.enableVertexAttribArray(t),i.vertexAttribPointer(t,2,i.FLOAT,!1,0,0)}new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement||document.body),this.resize(),this.rotateAt=performance.now()+this.pickRotateDelay(),window.addEventListener("keydown",t=>{const s=t.key.toLowerCase();s==="m"&&this.nextScene(),s==="p"&&this.togglePause();const r=this.scenes;if("1234567890".includes(s)){let l=s==="0"?r.length-1:parseInt(s,10)-1;l=Math.max(0,Math.min(r.length-1,l)),r[l]&&(this.idx=l,this.beginTransition(!0))}})}pickRotateDelay(){return this.minMs+Math.random()*(this.maxMs-this.minMs)}isPaused(){return this.rotatePaused}togglePause(){this.rotatePaused=!this.rotatePaused,this.anim||this.loop()}mkTex(a,i){const e=this.gl,o=e.createTexture();return e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,a,i,0,e.RGBA,e.UNSIGNED_BYTE,null),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),o}mkFB(a){const i=this.gl,e=i.createFramebuffer();return i.bindFramebuffer(i.FRAMEBUFFER,e),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,a,0),i.bindFramebuffer(i.FRAMEBUFFER,null),e}mkAudioTex(a){const i=this.gl,e=i.createTexture();return i.bindTexture(i.TEXTURE_2D,e),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,a,1,0,i.RGBA,i.UNSIGNED_BYTE,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),e}compile(a,i){const e=this.gl,o=e.createShader(a);if(e.shaderSource(o,i),e.compileShader(o),!e.getShaderParameter(o,e.COMPILE_STATUS))throw new Error(e.getShaderInfoLog(o)||"compile");return o}link(a,i){const e=this.gl,o=e.createProgram();if(e.attachShader(o,this.compile(e.VERTEX_SHADER,a)),e.attachShader(o,this.compile(e.FRAGMENT_SHADER,i)),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(o)||"link");return o}resize(){const a=this.gl,i=Math.max(1,Math.round(devicePixelRatio||1)),e=this.canvas.parentElement||document.body,o=e.clientWidth||window.innerWidth,t=e.clientHeight||window.innerHeight,s=o*i,r=t*i;if(this.canvas.width!==s||this.canvas.height!==r){this.canvas.width=s,this.canvas.height=r,this.canvas.style.width=o+"px",this.canvas.style.height=t+"px",a.viewport(0,0,s,r);const l=Math.max(2,Math.floor(s/2)),n=Math.max(2,Math.floor(r/2)),u=(h,p)=>{a.bindTexture(a.TEXTURE_2D,h),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,l,n,0,a.RGBA,a.UNSIGNED_BYTE,null),a.bindFramebuffer(a.FRAMEBUFFER,p),a.framebufferTexture2D(a.FRAMEBUFFER,a.COLOR_ATTACHMENT0,a.TEXTURE_2D,h,0),a.bindFramebuffer(a.FRAMEBUFFER,null)};u(this.texA,this.fbA),u(this.texB,this.fbB)}}async startScreenShare(){var e;const a=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!a.getAudioTracks().length)throw a.getTracks().forEach(o=>o.stop()),new Error("No audio shared");(e=this.ctx)==null||e.close().catch(()=>{}),this.ctx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.ctx.createAnalyser(),this.analyser.fftSize=4096,this.ctx.createMediaStreamSource(a).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=a,a.getVideoTracks()[0].onended=()=>this.stopScreenShare(),this.anim||this.loop()}stopScreenShare(){var a,i;(a=this.stream)==null||a.getTracks().forEach(e=>e.stop()),this.stream=null,this.freq=null,this.wave=null,(i=this.ctx)==null||i.close().catch(()=>{}),this.ctx=null,this.analyser=null}setDemoMode(a){a&&this.stopScreenShare(),this.anim||this.loop()}drawToScreen(a,i,e){const o=this.gl,t=this.progs[a];if(!t)return;o.bindFramebuffer(o.FRAMEBUFFER,null),o.viewport(0,0,this.canvas.width,this.canvas.height),o.clearColor(0,0,0,1),o.clear(o.COLOR_BUFFER_BIT),o.useProgram(t);const s=(l,n,u)=>{const h=o.getUniformLocation(t,l);h&&o[`uniform${u}`](h,...Array.isArray(n)?n:[n])};o.activeTexture(o.TEXTURE0+6),o.bindTexture(o.TEXTURE_2D,this.specTex),s("uSpecTex",6,"1i"),s("uSpecN",128,"1f"),o.activeTexture(o.TEXTURE0+8),o.bindTexture(o.TEXTURE_2D,this.waveTex),s("uWaveTex",8,"1i"),s("uWaveN",512,"1f"),s("uTime",i,"1f"),s("uRes",[this.canvas.width,this.canvas.height],"2f"),s("uLevel",e.level,"1f"),s("uBeat",e.beat,"1f"),s("uLow",e.low,"1f"),s("uMid",e.mid,"1f"),s("uAir",e.air,"1f"),s("uImpact",e.impact,"1f"),s("uKick",e.kick,"1f"),s("uSnare",e.snare,"1f"),s("uHat",e.hat,"1f");const r=o.getAttribLocation(t,"aPos");o.bindBuffer(o.ARRAY_BUFFER,this.quad),o.enableVertexAttribArray(r),o.vertexAttribPointer(r,2,o.FLOAT,!1,0,0),o.drawArrays(o.TRIANGLES,0,6)}beginTransition(a=!1){this.transitioning=!0,this.transStart=performance.now(),a&&(this.sceneStart=performance.now());const i=performance.now(),e=i/1e3,o=this.scenes[this.idx],t=(this.idx+1)%this.scenes.length,s=this.scenes[t];this.renderTo(this.texA,this.fbA,o,e),this.renderTo(this.texB,this.fbB,s,e),this.idx=t}nextScene(){this.beginTransition(!0)}renderTo(a,i,e,o){const t=this.gl,s=this.progs[e];if(!s)return;const r=Math.max(2,Math.floor(this.canvas.width/2)),l=Math.max(2,Math.floor(this.canvas.height/2));t.bindFramebuffer(t.FRAMEBUFFER,i),t.viewport(0,0,r,l),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(s);const n=(h,p,f)=>{const E=t.getUniformLocation(s,h);E&&t[`uniform${f}`](E,...Array.isArray(p)?p:[p])};t.activeTexture(t.TEXTURE0+6),t.bindTexture(t.TEXTURE_2D,this.specTex),n("uSpecTex",6,"1i"),n("uSpecN",128,"1f"),t.activeTexture(t.TEXTURE0+8),t.bindTexture(t.TEXTURE_2D,this.waveTex),n("uWaveTex",8,"1i"),n("uWaveN",512,"1f"),n("uTime",o,"1f"),n("uRes",[this.canvas.width,this.canvas.height],"2f");const u=t.getAttribLocation(s,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(u),t.vertexAttribPointer(u,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}function B(g,a,i){const e=document.createElement(g);return a&&(e.className=a),e}document.addEventListener("DOMContentLoaded",()=>{const g=document.querySelector("#app");if(!g)return;const a=B("div","qs-shell"),i=B("aside","qs-side"),e=B("main","qs-main");i.innerHTML=`
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
  `;const o=B("canvas","qs-canvas");o.id="visualizer",e.appendChild(o),a.appendChild(i),a.appendChild(e),g.innerHTML="",g.appendChild(a);const t=new V(o),s=document.getElementById("status"),r=document.getElementById("btnStart"),l=document.getElementById("btnStop"),n=document.getElementById("btnDemo"),u=document.getElementById("btnPause"),h=()=>{u.textContent=t.isPaused()?"Resume rotation (P)":"Pause rotation (P)"};r.onclick=async()=>{s.textContent="Requesting screen share…";try{await t.startScreenShare(),s.textContent="Screen sharing active ✓ — Best compatibility: choose “Entire Screen” + “Share audio”"}catch(f){console.error(f),s.textContent="Screen share failed. Tip: select “Entire Screen” and enable “Share audio”"}},l.onclick=()=>{t.stopScreenShare(),s.textContent="Stopped"},n.onclick=()=>{t.setDemoMode(!0),s.textContent="Demo mode active"},u.onclick=()=>{t.togglePause(),h()},window.addEventListener("keydown",f=>{f.key.toLowerCase()==="p"&&(t.togglePause(),h())}),new ResizeObserver(()=>{const f=e.clientWidth,E=e.clientHeight;o.style.width=f+"px",o.style.height=E+"px"}).observe(e),h()});
