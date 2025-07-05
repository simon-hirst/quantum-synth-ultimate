(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))a(t);new MutationObserver(t=>{for(const e of t)if(e.type==="childList")for(const r of e.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&a(r)}).observe(document,{childList:!0,subtree:!0});function i(t){const e={};return t.integrity&&(e.integrity=t.integrity),t.referrerPolicy&&(e.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?e.credentials="include":t.crossOrigin==="anonymous"?e.credentials="omit":e.credentials="same-origin",e}function a(t){if(t.ep)return;t.ep=!0;const e=i(t);fetch(t.href,e)}})();const _=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`,d=`
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x/max(1.0,uRes.y); return p; }
`,b=`
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
`,I=`
${d}${b}
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
${d}${b}
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
`,M=`
${d}${b}
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
`,C=`
${d}${L}
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
`,N=`
${d}${b}
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
`,X=`
${d}${L}
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
`,k=`
${d}${b}
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
`,q=`
${d}
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
`,O=`
${d}
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
`,V=`
${d}
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
`,G=`
${d}
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
`;class H{constructor(s){this.ctx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.specBins=128,this.waveBins=512,this.progs={},this.scenes=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","lissajous","tunnel","particles","starfield","wow"],this.idx=0,this.lastFPS=performance.now(),this.frames=0,this.sceneStart=performance.now(),this.minMs=16e3,this.maxMs=3e4,this.transitioning=!1,this.transStart=0,this.transDur=1600,this.deadFrames=0,this.loop=()=>{const e=this.gl,r=performance.now(),o=r/1e3;this.frames++,r-this.lastFPS>=1e3&&(this.lastFPS=r,this.frames=0);let c=0,n=0,u=0,m=0,h=0,x=0,T=0,w=0,S=0;if(this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const f=this.freq.length;let v=0;for(let l=0;l<f;l++){const p=this.freq[l]/255;v+=p*p,l<f*.2?n+=p:l<f*.7?u+=p:m+=p}n/=Math.max(1,f*.2),u/=Math.max(1,f*.5),m/=Math.max(1,f*.3),c=Math.min(1,Math.sqrt(v/f)*2.2),h=(n>.55?1:0)*.4+(u>.5?.2:0),x=Math.max(0,n*1.2+u*.6+m*.4-.6),T=n,w=u,S=m;const g=this.specBins,E=new Uint8Array(g*4);for(let l=0;l<g;l++){const p=Math.floor(l*f/g),F=this.freq[p];E[l*4]=E[l*4+1]=E[l*4+2]=F,E[l*4+3]=255}e.activeTexture(e.TEXTURE0+6),e.bindTexture(e.TEXTURE_2D,this.specTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,g,1,0,e.RGBA,e.UNSIGNED_BYTE,E);const B=this.waveBins,A=new Uint8Array(B*4),D=this.wave.length;for(let l=0;l<B;l++){const p=Math.floor(l*D/B),F=this.wave[p];A[l*4]=A[l*4+1]=A[l*4+2]=F,A[l*4+3]=255}e.activeTexture(e.TEXTURE0+8),e.bindTexture(e.TEXTURE_2D,this.waveTex),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,B,1,0,e.RGBA,e.UNSIGNED_BYTE,A)}const y=r-this.sceneStart,U=this.scenes[this.idx];if(!this.transitioning&&y>this.minMs+Math.random()*(this.maxMs-this.minMs)&&this.nextScene(),this.transitioning){const f=Math.min(1,(r-this.transStart)/this.transDur);e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height),e.useProgram(this.morphProg);const v=E=>e.getUniformLocation(this.morphProg,E);e.activeTexture(e.TEXTURE0+0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(v("uFrom"),0),e.activeTexture(e.TEXTURE0+1),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(v("uTo"),1),e.uniform1f(v("uProgress"),f),e.uniform2f(v("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(v("uBeat"),h),e.uniform1f(v("uImpact"),x),e.uniform3f(v("uBands"),n,u,m);const g=e.getAttribLocation(this.morphProg,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(g),e.vertexAttribPointer(g,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),f>=1&&(this.transitioning=!1,this.sceneStart=performance.now(),this.deadFrames=0)}else{this.drawToScreen(U,o,{level:c,low:n,mid:u,air:m,beat:h,impact:x,kick:T,snare:w,hat:S});const f=new Uint8Array(4);this.gl.readPixels(0,0,1,1,this.gl.RGBA,this.gl.UNSIGNED_BYTE,f),(f[0]+f[1]+f[2])/3<2?this.deadFrames++:this.deadFrames=0,this.deadFrames>45&&(console.warn("[watchdog] scene dead → skipping",U),this.nextScene())}this.anim=requestAnimationFrame(this.loop)},this.canvas=s;const i=s.getContext("webgl")||s.getContext("webgl2");if(!i)throw new Error("WebGL unsupported");this.gl=i;const a=i.createBuffer();this.quad=a,i.bindBuffer(i.ARRAY_BUFFER,a),i.bufferData(i.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),i.STATIC_DRAW),this.texA=this.mkTex(2,2),this.fbA=this.mkFB(this.texA),this.texB=this.mkTex(2,2),this.fbB=this.mkFB(this.texB),this.specTex=this.mkAudioTex(this.specBins),this.waveTex=this.mkAudioTex(this.waveBins);const t={barsPro:I,centerBars:P,circleSpectrum:M,waveformLine:C,radialRings:N,lissajous:X,tunnel:k,particles:q,starfield:O,wow:V};for(const[e,r]of Object.entries(t))try{const o=this.link(_,r);this.progs[e]=o;const c=i.getAttribLocation(o,"aPos");i.bindBuffer(i.ARRAY_BUFFER,this.quad),i.enableVertexAttribArray(c),i.vertexAttribPointer(c,2,i.FLOAT,!1,0,0)}catch(o){console.error("[Shader fail]",e,o),this.progs[e]=null}this.morphProg=this.link(_,G);{const e=i.getAttribLocation(this.morphProg,"aPos");i.enableVertexAttribArray(e),i.vertexAttribPointer(e,2,i.FLOAT,!1,0,0)}new ResizeObserver(()=>this.resize()).observe(this.canvas.parentElement||document.body),this.resize(),window.addEventListener("keydown",e=>{const r=e.key.toLowerCase();r==="m"&&this.nextScene();const o=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","lissajous","tunnel","particles","starfield","wow"];if("0123456789".includes(r)){const c=r==="0"?o.indexOf("starfield"):parseInt(r,10)-1;o[c]&&(this.idx=this.scenes.indexOf(o[c]),this.beginTransition(!0))}})}mkTex(s,i){const a=this.gl,t=a.createTexture();return a.bindTexture(a.TEXTURE_2D,t),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,s,i,0,a.RGBA,a.UNSIGNED_BYTE,null),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.CLAMP_TO_EDGE),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.CLAMP_TO_EDGE),t}mkFB(s){const i=this.gl,a=i.createFramebuffer();return i.bindFramebuffer(i.FRAMEBUFFER,a),i.framebufferTexture2D(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,s,0),i.bindFramebuffer(i.FRAMEBUFFER,null),a}mkAudioTex(s){const i=this.gl,a=i.createTexture();return i.bindTexture(i.TEXTURE_2D,a),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,s,1,0,i.RGBA,i.UNSIGNED_BYTE,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),a}compile(s,i){const a=this.gl,t=a.createShader(s);if(a.shaderSource(t,i),a.compileShader(t),!a.getShaderParameter(t,a.COMPILE_STATUS))throw new Error(a.getShaderInfoLog(t)||"compile");return t}link(s,i){const a=this.gl,t=a.createProgram();if(a.attachShader(t,this.compile(a.VERTEX_SHADER,s)),a.attachShader(t,this.compile(a.FRAGMENT_SHADER,i)),a.linkProgram(t),!a.getProgramParameter(t,a.LINK_STATUS))throw new Error(a.getProgramInfoLog(t)||"link");return t}resize(){const s=this.gl,i=Math.max(1,Math.round(devicePixelRatio||1)),a=this.canvas.parentElement||document.body,t=a.clientWidth||window.innerWidth,e=a.clientHeight||window.innerHeight,r=t*i,o=e*i;if(this.canvas.width!==r||this.canvas.height!==o){this.canvas.width=r,this.canvas.height=o,this.canvas.style.width=t+"px",this.canvas.style.height=e+"px",s.viewport(0,0,r,o);const c=Math.max(2,Math.floor(r/2)),n=Math.max(2,Math.floor(o/2)),u=(m,h)=>{s.bindTexture(s.TEXTURE_2D,m),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,c,n,0,s.RGBA,s.UNSIGNED_BYTE,null),s.bindFramebuffer(s.FRAMEBUFFER,h),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,m,0),s.bindFramebuffer(s.FRAMEBUFFER,null)};u(this.texA,this.fbA),u(this.texB,this.fbB)}}async startScreenShare(){var a;const s=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!s.getAudioTracks().length)throw s.getTracks().forEach(t=>t.stop()),new Error("No audio shared");(a=this.ctx)==null||a.close().catch(()=>{}),this.ctx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.ctx.createAnalyser(),this.analyser.fftSize=4096,this.ctx.createMediaStreamSource(s).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=s,s.getVideoTracks()[0].onended=()=>this.stopScreenShare(),this.anim||this.loop()}stopScreenShare(){var s,i;(s=this.stream)==null||s.getTracks().forEach(a=>a.stop()),this.stream=null,this.freq=null,this.wave=null,(i=this.ctx)==null||i.close().catch(()=>{}),this.ctx=null,this.analyser=null}setDemoMode(s){s&&this.stopScreenShare(),this.anim||this.loop()}drawToScreen(s,i,a){const t=this.gl,e=this.progs[s];if(!e)return;t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.useProgram(e);const r=(o,c,n)=>{const u=t.getUniformLocation(e,o);u&&t[`uniform${n}`](u,...Array.isArray(c)?c:[c])};if(t.activeTexture(t.TEXTURE0+6),t.bindTexture(t.TEXTURE_2D,this.specTex),r("uSpecTex",6,"1i"),r("uSpecN",128,"1f"),t.activeTexture(t.TEXTURE0+8),t.bindTexture(t.TEXTURE_2D,this.waveTex),r("uWaveTex",8,"1i"),r("uWaveN",512,"1f"),r("uTime",i,"1f"),r("uRes",[this.canvas.width,this.canvas.height],"2f"),r("uLevel",a.level,"1f"),r("uBeat",a.beat,"1f"),r("uLow",a.low,"1f"),r("uMid",a.mid,"1f"),r("uAir",a.air,"1f"),r("uImpact",a.impact,"1f"),r("uKick",a.kick,"1f"),r("uSnare",a.snare,"1f"),r("uHat",a.hat,"1f"),s==="wow"){t.activeTexture(t.TEXTURE0+9),t.bindTexture(t.TEXTURE_2D,this.texB);const o=t.getUniformLocation(e,"uFeedback");o&&t.uniform1i(o,9);const c=t.getAttribLocation(e,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(c),t.vertexAttribPointer(c,2,t.FLOAT,!1,0,0);const n=Math.max(2,Math.floor(this.canvas.width/2)),u=Math.max(2,Math.floor(this.canvas.height/2));t.bindFramebuffer(t.FRAMEBUFFER,this.fbA),t.viewport(0,0,n,u),t.clearColor(0,0,0,1),t.clear(t.COLOR_BUFFER_BIT),t.drawArrays(t.TRIANGLES,0,6),t.bindFramebuffer(t.FRAMEBUFFER,null),t.viewport(0,0,this.canvas.width,this.canvas.height);const m=this.morphProg,h=S=>t.getUniformLocation(m,S);t.useProgram(m),t.activeTexture(t.TEXTURE0+0),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uFrom"),0),t.activeTexture(t.TEXTURE0+1),t.bindTexture(t.TEXTURE_2D,this.texA),t.uniform1i(h("uTo"),1),t.uniform1f(h("uProgress"),0),t.uniform2f(h("uRes"),this.canvas.width,this.canvas.height),t.uniform1f(h("uBeat"),a.beat),t.uniform1f(h("uImpact"),a.impact),t.uniform3f(h("uBands"),a.low,a.mid,a.air);const x=t.getAttribLocation(m,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(x),t.vertexAttribPointer(x,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6);const T=this.texA;this.texA=this.texB,this.texB=T;const w=this.fbA;this.fbA=this.fbB,this.fbB=w}else{const o=t.getAttribLocation(e,"aPos");t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(o),t.vertexAttribPointer(o,2,t.FLOAT,!1,0,0),t.drawArrays(t.TRIANGLES,0,6)}}beginTransition(s=!1){this.transitioning=!0,this.transStart=performance.now(),s&&(this.sceneStart=performance.now());const i=performance.now(),a=i/1e3,t=this.scenes[this.idx],e=(this.idx+1)%this.scenes.length,r=this.scenes[e];this.renderTo(this.texA,this.fbA,t,a),this.renderTo(this.texB,this.fbB,r,a),this.idx=e}nextScene(){this.beginTransition(!0)}renderTo(s,i,a,t){const e=this.gl,r=this.progs[a];if(!r)return;const o=Math.max(2,Math.floor(this.canvas.width/2)),c=Math.max(2,Math.floor(this.canvas.height/2));e.bindFramebuffer(e.FRAMEBUFFER,i),e.viewport(0,0,o,c),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(r);const n=(m,h,x)=>{const T=e.getUniformLocation(r,m);T&&e[`uniform${x}`](T,...Array.isArray(h)?h:[h])};e.activeTexture(e.TEXTURE0+6),e.bindTexture(e.TEXTURE_2D,this.specTex),n("uSpecTex",6,"1i"),n("uSpecN",128,"1f"),e.activeTexture(e.TEXTURE0+8),e.bindTexture(e.TEXTURE_2D,this.waveTex),n("uWaveTex",8,"1i"),n("uWaveN",512,"1f"),n("uTime",t,"1f"),n("uRes",[this.canvas.width,this.canvas.height],"2f");const u=e.getAttribLocation(r,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}}document.addEventListener("DOMContentLoaded",async()=>{const R=document.querySelector("#app");if(!R)return;R.innerHTML=`
    <div class="qs-shell">
      <aside class="qs-panel glass">
        <h1 class="qs-title">QuantumSynth</h1>
        <p class="qs-sub">Neural Edition</p>
        <div class="qs-divider"></div>

        <div class="qs-kv">
          <div id="status" class="qs-status">Ready</div>
          <div id="fps" class="qs-fps">FPS: 0</div>
        </div>

        <div class="qs-actions">
          <button id="btnShare" class="btn btn-primary">Start Screen Sharing</button>
          <button id="btnDemo" class="btn btn-ghost">Demo Mode</button>
        </div>

        <h2 class="qs-h2">Setup</h2>
        <ol class="qs-list">
          <li>Use Chrome or Edge for best results</li>
          <li>When prompted, tick <b>“Share audio”</b></li>
          <li>Select the tab/window you want visualised</li>
          <li>Press <b>N</b> to load next server shader</li>
        </ol>

        <div class="qs-footer">
          built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">https://github.com/simon-hirst</a>
        </div>
      </aside>

      <main class="qs-stage">
        <canvas id="visualizer" class="qs-canvas"></canvas>
      </main>
    </div>
  `;const s=document.getElementById("visualizer"),i=document.getElementById("status"),a=document.getElementById("fps"),t=document.getElementById("btnShare"),e=document.getElementById("btnDemo");if(!s)return;const r=new H(s,{onStatus:n=>{i.textContent=n},onFps:n=>{a.textContent=`FPS: ${n}`}});await r.start();const o=()=>{t.textContent=r.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),t.addEventListener("click",async()=>{if(r.isSharing()){r.stopScreenShare(),i.textContent="Screen share stopped",o();return}t.disabled=!0,i.textContent='Requesting screen share (enable "Share audio")…';try{await r.startScreenShare(),i.textContent="Screen sharing active"}catch{i.textContent="Permission denied or no audio shared"}finally{t.disabled=!1,o()}});let c=!1;e.addEventListener("click",()=>{c=!c,r.setDemoMode(c),e.textContent=c?"Stop Demo":"Demo Mode",i.textContent=c?"Demo mode active":"Ready"}),document.addEventListener("keydown",n=>{var u;n.key.toLowerCase()==="n"&&((u=r.loadServerShader)==null||u.call(r))})});
