(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const r of e.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function i(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function a(t){if(t.ep)return;t.ep=!0;const e=i(t);fetch(t.href,e)}})();const y=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`,p=`
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
`,L=`
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`,M=`
${p}${R}
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
  col += g*vec3(0.7,0.9,1.0) + uBeat*vec3(0.9,0.6,1.0)*0.18;
  gl_FragColor = vec4(col*val,1.0);
}
`,P=`
${p}${R}
uniform float uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV;
  float x = abs(uv.x-0.5)*2.0;
  float a = specSample(pow(1.0-x,0.7));
  float h = 0.04 + 1.5*a + 0.6*uLevel + 0.3*uLow + 0.35*uImpact;
  float line = smoothstep(h, h-0.02-0.02*uAir, uv.y);
  float glow = smoothstep(h+0.03+0.03*uImpact, h, uv.y);
  vec3 col = mix(vec3(0.2,0.9,1.0), vec3(1.0,0.4,0.7), a);
  col = col*line + vec3(glow)*(0.35+1.7*uLevel+0.8*uImpact) + uBeat*0.2;
  gl_FragColor = vec4(col, 1.0);
}
`,C=`
${p}${R}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p=toAspect(vUV); float r=length(p)+1e-5; float a=atan(p.y,p.x);
  float idx = (a+3.14159)/(6.28318);
  float s = specSample(fract(idx));
  float ring = smoothstep(0.02, 0.0, abs(r - (0.25+0.35*s+0.25*uLow)) - 0.01 - 0.02*uImpact);
  vec3 col = mix(vec3(0.2,1.0,0.9), vec3(1.0,0.5,0.8), s);
  col *= ring*(0.6+1.8*uMid+0.6*uImpact) + uBeat*0.2;
  gl_FragColor = vec4(col,1.0);
}
`,N=`
${p}${L}
uniform float uTime,uBeat,uImpact;
void main(){
  float y = 1.0 - waveSample(vUV.x);
  float d = abs(vUV.y - y);
  float thickness = 0.009 + 0.012*uImpact;
  float line = smoothstep(thickness, 0.0, d);
  float glow = smoothstep(0.06+0.04*uImpact, 0.0, d);
  vec3 col = mix(vec3(0.2,1.0,0.8), vec3(0.9,0.4,1.0), vUV.x);
  col = col * line + glow * 0.18 + uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,X=`
${p}${R}
uniform float uTime,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 p = toAspect(vUV); float r=length(p)+1e-4; float a=atan(p.y,p.x);
  float s = specSample(fract((a+3.14159)/6.28318));
  float k = 10.0 + 36.0*uAir + 10.0*uImpact;
  float phase = uTime*0.7 + uLow*2.4 + 0.4*uImpact;
  float rings = smoothstep(0.01,0.0,abs(fract(r*k+phase)-0.5)-0.24) * (0.4+1.8*s+0.7*uImpact);
  float bloom = exp(-r*12.0) * (0.6+1.6*uLow+0.6*uImpact);
  vec3 col = mix(vec3(0.1,0.9,0.8), vec3(1.0,0.5,0.8), fract(a/6.28318 + uMid*0.1));
  col = col*(rings*0.9 + bloom) + vec3(0.02) + uBeat*vec3(0.7,0.5,1.0)*0.13;
  gl_FragColor = vec4(col,1.0);
}
`,k=`
${p}${L}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveSample(fract((vUV.x)));
  float b=waveSample(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b) + uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`,O=`
${p}${R}
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
`,V=`
${p}
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
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact) + uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,q=`
${p}
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
`,G=`
${p}
uniform sampler2D uFeedback;
uniform float uTime,uDecay,uEnv,uBeat,uKick,uSnare,uHat,uLow,uMid,uAir;
vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }
vec2 kaleido(vec2 uv,float seg){ uv=toAspect(uv); float a=atan(uv.y,uv.x),r=length(uv); float m=6.2831/seg; a=mod(a,m); a=abs(a-0.5*m); vec2 p=vec2(cos(a),sin(a))*r; return p*0.5+0.5; }
void main(){
  vec2 uv=vUV; float t=uTime;
  float seg=5.0+floor(uHat*9.0);
  uv=kaleido(uv,seg);
  float f1=18.0+10.0*uLow, f2=24.0+14.0*uAir;
  float w=sin((uv.x+uv.y)*f1+t*3.3+uSnare*8.0)*0.5+0.5;
  float v=cos((uv.x-uv.y)*f2-t*2.4+uHat*12.0)*0.5+0.5;
  vec3 base=pal(w*0.7+v*0.3+t*0.05+uMid*0.2)*(0.5+1.2*uEnv);
  vec3 prev=texture2D(uFeedback, uv + (uv-0.5)*0.01*uEnv).rgb * uDecay;
  vec3 col=mix(prev, base, 0.6+0.35*uEnv) + uBeat*vec3(0.9,0.6,1.0)*0.15;
  float vg=1.0-dot((toAspect(vUV)),(toAspect(vUV)))*0.7; col*=qclamp(vg,0.25,1.0);
  gl_FragColor=vec4(col,1.0);
}
`,H=`
${p}
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
`;class W{constructor(o){this.ctx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.specBins=128,this.waveBins=512,this.progs={},this.scenes=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","lissajous","tunnel","particles","starfield","wow"],this.idx=0,this.lastFPS=performance.now(),this.frames=0,this.sceneStart=performance.now(),this.minMs=16e3,this.maxMs=3e4,this.transitioning=!1,this.transStart=0,this.transDur=1600,this.deadFrames=0,this.loop=()=>{const e=this.gl,r=performance.now(),s=r/1e3;this.frames++,r-this.lastFPS>=1e3&&(this.lastFPS=r,this.frames=0);let n=0,c=0,u=0,f=0,h=0,v=0,x=0,w=0,S=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const m=this.freq.length;let d=0;for(let l=0;l<m;l++){const T=this.freq[l]/255;d+=T*T,l<m*.2?c+=T:l<m*.7?u+=T:f+=T}c/=Math.max(1,m*.2),u/=Math.max(1,m*.5),f/=Math.max(1,m*.3),n=Math.min(1,Math.sqrt(d/m)*2.2),h=(c>.55?1:0)*.4+(u>.5?.2:0),v=Math.max(0,c*1.2+u*.6+f*.4-.6),x=c,w=u,S=f;const E=this.specBins,b=new Uint8Array(E*4);for(let l=0;l<E;l++){const T=Math.floor(l*m/E),U=this.freq[T];b[l*4]=b[l*4+1]=b[l*4+2]=U,b[l*4+3]=255}e.activeTexture(e.TEXTURE0+6),e.bindTexture(e.TEXTURE_2D,this.specTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,E,1,0,e.RGBA,e.UNSIGNED_BYTE,b);const B=this.waveBins,A=new Uint8Array(B*4),I=this.wave.length;for(let l=0;l<B;l++){const T=Math.floor(l*I/B),U=this.wave[T];A[l*4]=A[l*4+1]=A[l*4+2]=U,A[l*4+3]=255}e.activeTexture(e.TEXTURE0+8),e.bindTexture(e.TEXTURE_2D,this.waveTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,B,1,0,e.RGBA,e.UNSIGNED_BYTE,A)}const D=r-this.sceneStart,_=this.scenes[this.idx];if(!this.transitioning&&D>this.minMs+Math.random()*(this.maxMs-this.minMs)&&this.nextScene(),this.transitioning){const m=Math.min(1,(r-this.transStart)/this.transDur);e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),e.useProgram(this.morphProg);const d=b=>e.getUniformLocation(this.morphProg,b);e.activeTexture(e.TEXTURE0+0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(d("uFrom"),0),e.activeTexture(e.TEXTURE0+1),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(d("uTo"),1),e.uniform1f(d("uProgress"),m),e.uniform2f(d("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(d("uBeat"),h),e.uniform1f(d("uImpact"),v),e.uniform3f(d("uBands"),c,u,f);const E=e.getAttribLocation(this.morphProg,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(E),e.vertexAttribPointer(E,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),m>=1&&(this.transitioning=!1,this.sceneStart=performance.now(),this.deadFrames=0)}else{this.drawToScreen(_,s,{level:n,low:c,mid:u,air:f,beat:h,impact:v,kick:x,snare:w,hat:S});const m=new Uint8Array(4);this.gl.readPixels(0,0,1,1,this.gl.RGBA,this.gl.UNSIGNED_BYTE,m),(m[0]+m[1]+m[2])/3<2?this.deadFrames++:this.deadFrames=0,this.deadFrames>45&&(console.warn("[watchdog] scene dead → skipping",_),this.nextScene())}this.anim=requestAnimationFrame(this.loop)},this.canvas=o;const i=o.getContext("webgl")||o.getContext("webgl2");if(!i)throw new Error("WebGL unsupported");this.gl=i;const a=i.createBuffer();this.quad=a,i.bindBuffer(i.ARRAY_BUFFER,a),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),i.STATIC_DRAW),this.texA=this.mkTex(2,2),this.fbA=this.mkFB(this.texA),this.texB=this.mkTex(2,2),this.fbB=this.mkFB(this.texB),this.specTex=this.mkAudioTex(this.specBins),this.waveTex=this.mkAudioTex(this.waveBins);const t={barsPro:M,centerBars:P,circleSpectrum:C,waveformLine:N,radialRings:X,lissajous:k,tunnel:O,particles:V,starfield:q,wow:G};for(const[e,r]of Object.entries(t))try{const s=this.link(y,r);this.progs[e]=s;const n=i.getAttribLocation(s,"aPos");i.bindBuffer(i.ARRAY_BUFFER,this.quad),i.enableVertexAttribArray(n),i.vertexAttribPointer(n,2,i.FLOAT,!1,0,0)}catch(s){console.error("[Shader fail]",e,s),this.progs[e]=null}this.morphProg=this.link(y,H);{const e=i.getAttribLocation(this.morphProg,"aPos");i.enableVertexAttribArray(e),i.vertexAttribPointer(e,2,i.FLOAT,!1,0,0)}new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement||document.body),this.resize(),window.addEventListener("keydown",e=>{const r=e.key.toLowerCase();r==="m"&&this.nextScene();const s=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","lissajous","tunnel","particles","starfield","wow"];if("0123456789".includes(r)){const n=r==="0"?s.indexOf("starfield"):parseInt(r,10)-1;s[n]&&(this.idx=this.scenes.indexOf(s[n]),this.beginTransition(!0))}})}mkTex(o,i){const a=this.gl,t=a.createTexture();return a.bindTexture(a.TEXTURE_2D,t),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,o,i,0,a.RGBA,a.UNSIGNED_BYTE,null),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),t}mkFB(o){const i=this.gl,a=i.createFramebuffer();return i.bindFramebuffer(i.FRAMEBUFFER,a),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,o,0),i.bindFramebuffer(i.FRAMEBUFFER,null),a}mkAudioTex(o){const i=this.gl,a=i.createTexture();return i.bindTexture(i.TEXTURE_2D,a),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,o,1,0,i.RGBA,i.UNSIGNED_BYTE,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),a}compile(o,i){const a=this.gl,t=a.createShader(o);if(a.shaderSource(t,i),a.compileShader(t),!a.getShaderParameter(t,a.COMPILE_STATUS))throw new Error(a.getShaderInfoLog(t)||"compile");return t}link(o,i){const a=this.gl,t=a.createProgram();if(a.attachShader(t,this.compile(a.VERTEX_SHADER,o)),a.attachShader(t,this.compile(a.FRAGMENT_SHADER,i)),a.linkProgram(t),!a.getProgramParameter(t,a.LINK_STATUS))throw new Error(a.getProgramInfoLog(t)||"link");return t}resize(){const o=this.gl,i=Math.max(1,Math.round(devicePixelRatio||1)),a=this.canvas.parentElement||document.body,t=a.clientWidth||window.innerWidth,e=a.clientHeight||window.innerHeight,r=t*i,s=e*i;if(this.canvas.width!==r||this.canvas.height!==s){this.canvas.width=r,this.canvas.height=s,this.canvas.style.width=t+"px",this.canvas.style.height=e+"px",o.viewport(0,0,r,s);const n=Math.max(2,Math.floor(r/2)),c=Math.max(2,Math.floor(s/2)),u=(f,h)=>{o.bindTexture(o.TEXTURE_2D,f),o.texImage2D(o.TEXTURE_2D,0,o.RGBA,n,c,0,o.RGBA,o.UNSIGNED_BYTE,null),o.bindFramebuffer(o.FRAMEBUFFER,h),o.framebufferTexture2D(o.FRAMEBUFFER,o.COLOR_ATTACHMENT0,o.TEXTURE_2D,f,0),o.bindFramebuffer(o.FRAMEBUFFER,null)};u(this.texA,this.fbA),u(this.texB,this.fbB)}}async startScreenShare(){var a;const o=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!o.getAudioTracks().length)throw o.getTracks().forEach(t=>t.stop()),new Error("No audio shared");(a=this.ctx)==null||a.close().catch(()=>{}),this.ctx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.ctx.createAnalyser(),this.analyser.fftSize=4096,this.ctx.createMediaStreamSource(o).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=o,o.getVideoTracks()[0].onended=()=>this.stopScreenShare(),this.anim||this.loop()}stopScreenShare(){var o,i;(o=this.stream)==null||o.getTracks().forEach(a=>a.stop()),this.stream=null,this.freq=null,this.wave=null,(i=this.ctx)==null||i.close().catch(()=>{}),this.ctx=null,this.analyser=null}setDemoMode(o){o&&this.stopScreenShare(),this.anim||this.loop()}drawToScreen(o,i,a){const t=this.gl,e=this.progs[o];if(!e)return;t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(e);const r=(s,n,c)=>{const u=t.getUniformLocation(e,s);u&&t[`uniform${c}`](u,...Array.isArray(n)?n:[n])};if(t.activeTexture(t.TEXTURE0+6),t.bindTexture(t.TEXTURE_2D,this.specTex),r("uSpecTex",6,"1i"),r("uSpecN",128,"1f"),t.activeTexture(t.TEXTURE0+8),t.bindTexture(t.TEXTURE_2D,this.waveTex),r("uWaveTex",8,"1i"),r("uWaveN",512,"1f"),r("uTime",i,"1f"),r("uRes",[this.canvas.width,this.canvas.height],"2f"),r("uLevel",a.level,"1f"),r("uBeat",a.beat,"1f"),r("uLow",a.low,"1f"),r("uMid",a.mid,"1f"),r("uAir",a.air,"1f"),r("uImpact",a.impact,"1f"),r("uKick",a.kick,"1f"),r("uSnare",a.snare,"1f"),r("uHat",a.hat,"1f"),o==="wow"){t.activeTexture(t.TEXTURE0+9),t.bindTexture(t.TEXTURE_2D,this.texB);const s=t.getUniformLocation(e,"uFeedback");s&&t.uniform1i(s,9);const n=t.getAttribLocation(e,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(n),t.vertexAttribPointer(n,2,t.FLOAT,!1,0,0);const c=Math.max(2,Math.floor(this.canvas.width/2)),u=Math.max(2,Math.floor(this.canvas.height/2));t.bindFramebuffer(t.FRAMEBUFFER,this.fbA),t.viewport(0,0,c,u),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLES,0,6),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height);const f=this.morphProg,h=S=>t.getUniformLocation(f,S);t.useProgram(f),t.activeTexture(t.TEXTURE0+0),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uFrom"),0),t.activeTexture(t.TEXTURE0+1),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uTo"),1),t.uniform1f(h("uProgress"),0),t.uniform2f(h("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(h("uBeat"),a.beat),t.uniform1f(h("uImpact"),a.impact),t.uniform3f(h("uBands"),a.low,a.mid,a.air);const v=t.getAttribLocation(f,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(v),t.vertexAttribPointer(v,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6);const x=this.texA;this.texA=this.texB,this.texB=x;const w=this.fbA;this.fbA=this.fbB,this.fbB=w}else{const s=t.getAttribLocation(e,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(s),t.vertexAttribPointer(s,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}beginTransition(o=!1){this.transitioning=!0,this.transStart=performance.now(),o&&(this.sceneStart=performance.now());const i=performance.now(),a=i/1e3,t=this.scenes[this.idx],e=(this.idx+1)%this.scenes.length,r=this.scenes[e];this.renderTo(this.texA,this.fbA,t,a),this.renderTo(this.texB,this.fbB,r,a),this.idx=e}nextScene(){this.beginTransition(!0)}renderTo(o,i,a,t){const e=this.gl,r=this.progs[a];if(!r)return;const s=Math.max(2,Math.floor(this.canvas.width/2)),n=Math.max(2,Math.floor(this.canvas.height/2));e.bindFramebuffer(e.FRAMEBUFFER,i),e.viewport(0,0,s,n),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(r);const c=(f,h,v)=>{const x=e.getUniformLocation(r,f);x&&e[`uniform${v}`](x,...Array.isArray(h)?h:[h])};e.activeTexture(e.TEXTURE0+6),e.bindTexture(e.TEXTURE_2D,this.specTex),c("uSpecTex",6,"1i"),c("uSpecN",128,"1f"),e.activeTexture(e.TEXTURE0+8),e.bindTexture(e.TEXTURE_2D,this.waveTex),c("uWaveTex",8,"1i"),c("uWaveN",512,"1f"),c("uTime",t,"1f"),c("uRes",[this.canvas.width,this.canvas.height],"2f");const u=e.getAttribLocation(r,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}}function F(g,o,i){const a=document.createElement(g);return o&&(a.className=o),a}document.addEventListener("DOMContentLoaded",()=>{const g=document.querySelector("#app");if(!g)return;const o=F("div","qs-shell"),i=F("aside","qs-side"),a=F("main","qs-main"),t=`
    <div class="brand">
      <div class="dot"></div>
      <div class="title">QuantumSynth</div>
      <div class="subtitle">Neural Edition</div>
    </div>
  `,e=`
    <div class="section-title">Setup</div>
    <ol class="setup">
      <li>Use <b>Chrome</b> or <b>Edge</b> for best results</li>
      <li><b>Best compatibility:</b> choose <b>Entire Screen</b> and tick <b>Share audio</b> (DRM tabs often block audio)</li>
      <li>Select the tab/window you want visualised</li>
      <li>Press <b>M</b> (or 1–0) to switch visualisations</li>
    </ol>
    <div class="built-by">built by <a href="https://github.com/simon-hirst" target="_blank" rel="noreferrer">github.com/simon-hirst</a></div>
  `;i.innerHTML=`
    ${t}
    <div class="controls">
      <button id="btnStart" class="btn primary">Start Screen Sharing</button>
      <button id="btnStop"  class="btn">Stop</button>
      <button id="btnDemo"  class="btn ghost">Demo Mode</button>
      <div class="status" id="status">Ready</div>
    </div>
    ${e}
  `;const r=F("canvas","qs-canvas");r.id="visualizer",a.appendChild(r),o.appendChild(i),o.appendChild(a),g.innerHTML="",g.appendChild(o);const s=new W(r),n=document.getElementById("status"),c=document.getElementById("btnStart"),u=document.getElementById("btnStop"),f=document.getElementById("btnDemo");c.onclick=async()=>{n.textContent="Requesting screen share…";try{await s.startScreenShare(),n.textContent="Screen sharing active ✓ — Best compatibility: choose “Entire Screen” + “Share audio”"}catch(v){console.error(v),n.textContent="Screen share failed. Tip: select “Entire Screen” and enable “Share audio”"}},u.onclick=()=>{s.stopScreenShare(),n.textContent="Stopped"},f.onclick=()=>{s.setDemoMode(!0),n.textContent="Demo mode active"},new ResizeObserver(()=>{const v=a.clientWidth,x=a.clientHeight;r.style.width=v+"px",r.style.height=x+"px"}).observe(a)});
