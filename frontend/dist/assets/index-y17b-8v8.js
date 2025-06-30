(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))i(e);new MutationObserver(e=>{for(const r of e)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&i(a)}).observe(document,{childList:!0,subtree:!0});function s(e){const r={};return e.integrity&&(r.integrity=e.integrity),e.referrerPolicy&&(r.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?r.credentials="include":e.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function i(e){if(e.ep)return;e.ep=!0;const r=s(e);fetch(e.href,r)}})();const A=`
attribute vec2 aPos; varying vec2 vUV;
void main(){ vUV = aPos*0.5 + 0.5; gl_Position = vec4(aPos,0.0,1.0); }
`;function R(f,t,s){const i=f.createShader(t);if(f.shaderSource(i,s),f.compileShader(i),!f.getShaderParameter(i,f.COMPILE_STATUS))throw new Error(f.getShaderInfoLog(i)||"compile");return i}function w(f,t,s){const i=f.createProgram();if(f.attachShader(i,R(f,f.VERTEX_SHADER,t)),f.attachShader(i,R(f,f.FRAGMENT_SHADER,s)),f.linkProgram(i),!f.getProgramParameter(i,f.LINK_STATUS))throw new Error(f.getProgramInfoLog(i)||"link");return i}const p=`
precision mediump float;
varying vec2 vUV;
uniform vec2 uRes;
float qclamp(float x,float a,float b){ return max(a, min(b, x)); }
vec2 toAspect(vec2 uv){ vec2 p = uv*2.0-1.0; p.x *= uRes.x / max(1.0, uRes.y); return p; }
float aspect(){ return uRes.x / max(1.0, uRes.y); }
`,x=`
uniform sampler2D uSpecTex; uniform float uSpecN;
float specSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uSpecN);
  float u = (i + 0.5) / uSpecN;
  return texture2D(uSpecTex, vec2(u,0.5)).r;
}
`,g=`
uniform sampler2D uWaveTex; uniform float uWaveN;
float waveSample(float x){
  float xx = min(max(x, 0.0), 0.999);
  float i = floor(xx * uWaveN);
  float u = (i + 0.5) / uWaveN;
  return texture2D(uWaveTex, vec2(u,0.5)).r;
}
`,b=`
${p}
${x}
uniform float uTime,uLevel,uBeat,uLow,uMid,uAir,uImpact;
void main(){
  vec2 uv=vUV; // bars use UV directly (x axis linear)
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
`,S=`
${p}
${x}
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
`,U=`
${p}
${x}
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
`,B=`
${p}
${g}
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
`,F=`
${p}
${x}
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
`,_=`
${p}
${g}
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
`,P=`
${p}
${x}
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
`,L=`
${p}
${g}
uniform float uTime,uBeat,uAir,uImpact;
void main(){
  vec2 uv=toAspect(vUV);
  float a=waveSample(fract((vUV.x))); // keep sampling in 0..1 space
  float b=waveSample(fract((vUV.y)));
  float d = length(uv - vec2(2.0*a-1.0, 2.0*b-1.0));
  float line = smoothstep(0.018+0.01*uImpact, 0.0, d-0.002);
  vec3 col = mix(vec3(0.1,0.8,1.0), vec3(1.0,0.6,0.9), a*b);
  col += uBeat*0.18;
  gl_FragColor = vec4(col*line, 1.0);
}
`,y=`
${p}
${x}
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
`,I=`
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
  col = col*(0.2+1.8*glow) + vec3(dots)*0.75*(0.4+1.5*uMid+0.6*uImpact);
  col += uBeat*0.22;
  gl_FragColor = vec4(col,1.0);
}
`,D=`
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
`,M=`
${p}
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
`,X=`
${p}
uniform sampler2D uFrom, uTo;
uniform float uProgress, uBeat, uImpact;
uniform vec3  uBands;
vec3 toRGB(vec4 c){ return c.rgb; }
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
  vec2 dirA = norm2(gA);
  vec2 dirB = norm2(gB);
  float magA = min(1.0, length(gA));
  float magB = min(1.0, length(gB));
  float featA = smoothstep(0.15, 0.6, magA);
  float featB = smoothstep(0.15, 0.6, magB);
  float audioAmp = 0.25 + 1.8*uBands.x + 0.8*uImpact + 0.45*uBeat;
  vec2 ua = uv, ub = uv;
  float stepLen = (0.8 + 1.4*uBands.z) * (0.0035 + 0.0045*audioAmp);
  for(int i=0;i<6;i++){ ua += dirA * stepLen * (1.0-p) * featA; ub -= dirB * stepLen * (p) * featB; }
  vec3 colA = texture2D(uFrom, ua).rgb;
  vec3 colB = texture2D(uTo,   ub).rgb;
  float carryA = featA * (1.0 - p);
  float carryB = featB * p;
  float w = smoothstep(0.0,1.0, p + 0.25*(carryB - carryA)) + 0.15*uBeat;
  w = min(max(w, 0.0), 1.0);
  vec3 glow = vec3(0.08,0.04,0.12) * (uBeat*0.6 + uImpact*0.25);
  vec3 col = mix(colA, colB, w) + glow;
  gl_FragColor = vec4(col,1.0);
}
`;class C{constructor(t,s={}){var i,e,r;if(this.opts=s,this.gl=null,this.quad=null,this.audioCtx=null,this.analyser=null,this.freq=null,this.wave=null,this.stream=null,this.env=0,this.envAttack=.52,this.envRelease=.1,this.lastMag=null,this.fluxRing=[],this.fluxIdx=0,this.fluxSize=64,this.beat=0,this.beatCooldown=0,this.bands=[0,0,0,0],this.kick=0,this.snare=0,this.hat=0,this.peak=[0,0,0,0],this.agcGain=1,this.agcTarget=.5,this.agcSpeedUp=.12,this.agcSpeedDown=.03,this.impact=0,this.specTex=null,this.waveTex=null,this.specBins=128,this.waveBins=512,this.ws=null,this.streamTex=null,this.streamUnit=5,this.streamW=1,this.streamH=1,this.sceneProg={},this.serverProg=null,this.serverUniforms={},this.serverTextures=[],this.wowProg=null,this.fbA=null,this.fbB=null,this.texA=null,this.texB=null,this.decay=.88,this.sceneA=null,this.sceneB=null,this.texSceneA=null,this.texSceneB=null,this.morphProg=null,this.scenes=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield","wow","server"],this.sceneIdx=0,this.sceneTimer=0,this.sceneMinMs=15e3,this.sceneMaxMs=32e3,this.transitioning=!1,this.transStart=0,this.transDur=1900,this.frames=0,this.lastFPS=performance.now(),this.resizeObs=null,this.loop=()=>{var o,u;this.gl;const a=performance.now();if(this.frames++,a-this.lastFPS>=1e3&&((u=(o=this.opts).onFps)==null||u.call(o,this.frames),this.frames=0,this.lastFPS=a),this.analyser&&this.freq&&this.wave){this.analyser.getByteFrequencyData(this.freq),this.analyser.getByteTimeDomainData(this.wave);const l=this.freq.length,h=new Float32Array(l);for(let v=0;v<l;v++)h[v]=this.freq[v]/255;let n=0;for(let v=0;v<l;v++)n+=h[v]*h[v];let c=Math.sqrt(n/l);const d=.5/Math.max(1e-4,c),m=d>1?.12:.03;this.agcGain+=(d-this.agcGain)*m,c=Math.min(3,c*this.agcGain),c>this.env?this.env+=(c-this.env)*.52:this.env+=(c-this.env)*.1,this.env}this.transitioning?this.renderMorph(a):this.renderScene(a),this.anim=requestAnimationFrame(this.loop)},this.canvas=t,this.gl=t.getContext("webgl")||t.getContext("webgl2"),!this.gl){(i=this.canvas.getContext("2d"))==null||i.fillText("WebGL not supported",10,20);return}this.initGL(),this.initAudioTextures(),this.initWS(),this.observeContainer(),(r=(e=this.opts).onStatus)==null||r.call(e,"Ready. M next • 1–9 classic • 0 starfield • 5 WOW • V WOW/Server • N server shader")}safeLink(t,s){try{return w(this.gl,A,s)}catch(i){return console.error(`[Shader:${t}]`,(i==null?void 0:i.message)||i),null}}observeContainer(){const t=this.canvas.parentElement||document.body,s=new ResizeObserver(()=>this.resize());s.observe(t),this.resizeObs=s,this.resize()}mkTex(t,s){const i=this.gl,e=i.createTexture();return i.bindTexture(i.TEXTURE_2D,e),i.texImage2D(i.TEXTURE_2D,0,i.RGBA,t,s,0,i.RGBA,i.UNSIGNED_BYTE,null),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MAG_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE),e}mkFB(t){const s=this.gl,i=s.createFramebuffer();return s.bindFramebuffer(s.FRAMEBUFFER,i),s.framebufferTexture2D(s.FRAMEBUFFER,s.COLOR_ATTACHMENT0,s.TEXTURE_2D,t,0),s.bindFramebuffer(s.FRAMEBUFFER,null),i}initGL(){const t=this.gl,s=t.createBuffer();this.quad=s,t.bindBuffer(t.ARRAY_BUFFER,s),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,-1,1,1,-1,1]),t.STATIC_DRAW),this.texA=this.mkTex(2,2),this.fbA=this.mkFB(this.texA),this.texB=this.mkTex(2,2),this.fbB=this.mkFB(this.texB),this.texSceneA=this.mkTex(2,2),this.sceneA=this.mkFB(this.texSceneA),this.texSceneB=this.mkTex(2,2),this.sceneB=this.mkFB(this.texSceneB),Object.entries({barsPro:b,centerBars:S,circleSpectrum:U,waveformLine:B,radialRings:F,oscDual:_,sunburst:P,lissajous:L,tunnel:y,particles:I,starfield:D}).forEach(([e,r])=>{this.sceneProg[e]=this.safeLink(e,r)}),this.wowProg=this.safeLink("wow",M),this.morphProg=this.safeLink("morph",X);for(const e of Object.values({...this.sceneProg,wow:this.wowProg,morph:this.morphProg})){if(!e)continue;t.useProgram(e);const r=t.getAttribLocation(e,"aPos");r!==-1&&(t.bindBuffer(t.ARRAY_BUFFER,this.quad),t.enableVertexAttribArray(r),t.vertexAttribPointer(r,2,t.FLOAT,!1,0,0))}this.streamTex=t.createTexture(),t.activeTexture(t.TEXTURE0+this.streamUnit),t.bindTexture(t.TEXTURE_2D,this.streamTex),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,1,1,0,t.RGBA,t.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.REPEAT),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.REPEAT),window.addEventListener("keydown",e=>this.onKey(e))}resize(){const t=this.gl,s=Math.max(1,Math.round(window.devicePixelRatio||1)),i=this.canvas.parentElement||document.body,e=i.clientWidth||window.innerWidth,r=i.clientHeight||window.innerHeight,a=e*s,o=r*s;if(this.canvas.width!==a||this.canvas.height!==o){this.canvas.width=a,this.canvas.height=o,this.canvas.style.width=e+"px",this.canvas.style.height=r+"px",t.viewport(0,0,a,o);const u=Math.max(2,Math.floor(a/2)),l=Math.max(2,Math.floor(o/2)),h=n=>{let c=null,d=null;n==="A"&&(c=this.texA,d=this.fbA),n==="B"&&(c=this.texB,d=this.fbB),n==="SA"&&(c=this.texSceneA,d=this.sceneA),n==="SB"&&(c=this.texSceneB,d=this.sceneB),c&&d&&(t.bindTexture(t.TEXTURE_2D,c),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,u,l,0,t.RGBA,t.UNSIGNED_BYTE,null),t.bindFramebuffer(t.FRAMEBUFFER,d),t.framebufferTexture2D(t.FRAMEBUFFER,t.COLOR_ATTACHMENT0,t.TEXTURE_2D,c,0),t.bindFramebuffer(t.FRAMEBUFFER,null))};["A","B","SA","SB"].forEach(n=>h(n))}}initAudioTextures(){const t=this.gl,s=i=>{const e=t.createTexture();return t.bindTexture(t.TEXTURE_2D,e),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,i,1,0,t.RGBA,t.UNSIGNED_BYTE,null),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),e};this.specTex=s(this.specBins),this.waveTex=s(this.waveBins)}initWS(){var s;const t=location.protocol==="https:"?"wss:":"ws:";(s=this.ws)==null||s.close(),this.ws=new WebSocket(`${t}//${location.host}/ws`),this.ws.binaryType="arraybuffer",this.ws.onopen=()=>{var i;(i=this.ws)==null||i.send(JSON.stringify({type:"subscribe",field:"waves",w:256,h:256,fps:24}))},this.ws.onmessage=i=>{typeof i.data!="string"&&this.onStreamFrame(i.data)}}onStreamFrame(t){const s=this.gl,i=new DataView(t,0,24);if(!String.fromCharCode(...new Uint8Array(t.slice(0,8))).startsWith("FRAMEv1"))return;const r=i.getUint32(8,!0),a=i.getUint32(12,!0);if(i.getUint32(16,!0)!==4)return;const u=new Uint8Array(t,24);this.streamW=r,this.streamH=a,s.activeTexture(s.TEXTURE0+this.streamUnit),s.bindTexture(s.TEXTURE_2D,this.streamTex),s.texImage2D(s.TEXTURE_2D,0,s.RGBA,r,a,0,s.RGBA,s.UNSIGNED_BYTE,u),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MIN_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_MAG_FILTER,s.LINEAR),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_S,s.REPEAT),s.texParameteri(s.TEXTURE_2D,s.TEXTURE_WRAP_T,s.REPEAT)}async start(){await this.loadServerShader("composite").catch(()=>{}),this.loop()}stop(){var t;this.anim&&cancelAnimationFrame(this.anim),(t=this.ws)==null||t.close()}async startScreenShare(){var e;const t=await navigator.mediaDevices.getDisplayMedia({video:!0,audio:{echoCancellation:!1,noiseSuppression:!1}});if(!t.getAudioTracks().length)throw t.getTracks().forEach(r=>r.stop()),new Error("No audio shared");(e=this.audioCtx)==null||e.close().catch(()=>{}),this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.analyser=this.audioCtx.createAnalyser(),this.analyser.fftSize=4096,this.audioCtx.createMediaStreamSource(t).connect(this.analyser),this.freq=new Uint8Array(this.analyser.frequencyBinCount),this.wave=new Uint8Array(this.analyser.fftSize),this.stream=t;const i=t.getVideoTracks()[0];i&&(i.onended=()=>this.stopScreenShare())}stopScreenShare(){var t,s;(t=this.stream)==null||t.getTracks().forEach(i=>i.stop()),this.stream=null,this.freq=null,this.wave=null,(s=this.audioCtx)==null||s.close().catch(()=>{}),this.audioCtx=null,this.analyser=null}isSharing(){return!!this.stream}setDemoMode(t){t&&this.stopScreenShare()}toggleWow(){this.scenes[this.sceneIdx]==="wow"?this.sceneIdx=this.scenes.indexOf("server"):this.sceneIdx=this.scenes.indexOf("wow"),this.beginTransition(!0)}async loadServerShaderPublic(){var t,s;await this.loadServerShader("composite"),(s=(t=this.opts).onStatus)==null||s.call(t,"Server shader refreshed")}onKey(t){const s=t.key.toLowerCase();s==="v"&&this.toggleWow(),s==="n"&&this.loadServerShaderPublic(),s==="m"&&this.nextScene();const i=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield"];if("0123456789".includes(s)){const e=s==="0"?i.indexOf("starfield"):parseInt(s,10)-1;i[e]&&(this.sceneIdx=this.scenes.indexOf(i[e]),this.beginTransition(!0))}}async loadServerShader(t){const s=new URLSearchParams;t&&s.set("type",t),s.set("ts",Date.now().toString());const i="/api/shader/next?"+s.toString(),e=await fetch(i,{cache:"no-store"});if(!e.ok)throw new Error("HTTP "+e.status);const r=await e.json(),a=this.gl;try{const o=w(a,A,r.code);this.serverProg=o,this.serverUniforms={},this.serverTextures=[],a.useProgram(o);for(const n of["uTime","uRes","uLevel","uBands","uPulse","uBeat","uBlendFlow","uBlendRD","uBlendStream","uFrame","uAtlasGrid","uAtlasFrames","uAtlasFPS","uStreamRes","uImpact"])this.serverUniforms[n]=a.getUniformLocation(o,n);let u=0;if(r.textures)for(const n of r.textures){const c=a.createTexture();await new Promise((m,v)=>{const T=new Image;T.onload=()=>{a.activeTexture(a.TEXTURE0+u),a.bindTexture(a.TEXTURE_2D,c),a.texImage2D(a.TEXTURE_2D,0,a.RGBA,a.RGBA,a.UNSIGNED_BYTE,T),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MIN_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_MAG_FILTER,a.LINEAR),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_S,a.REPEAT),a.texParameteri(a.TEXTURE_2D,a.TEXTURE_WRAP_T,a.REPEAT),m()},T.onerror=()=>v(new Error("tex")),T.src=n.dataUrl});const d=a.getUniformLocation(o,n.name);d&&a.uniform1i(d,u),this.serverTextures.push({name:n.name,tex:c,unit:u,meta:n}),u++,n.gridCols&&n.gridRows&&(this.serverUniforms.uAtlasGrid&&a.uniform2f(this.serverUniforms.uAtlasGrid,n.gridCols,n.gridRows),this.serverUniforms.uAtlasFrames&&a.uniform1f(this.serverUniforms.uAtlasFrames,n.frames??n.gridCols*n.gridRows),this.serverUniforms.uAtlasFPS&&a.uniform1f(this.serverUniforms.uAtlasFPS,n.fps??24))}const l=a.getUniformLocation(o,"uStreamTex");l&&a.uniform1i(l,this.streamUnit);const h=this.serverUniforms.uStreamRes;h&&a.uniform2f(h,this.streamW,this.streamH)}catch(o){console.error("[ServerShader] compile/link failed:",o)}}renderScene(t){const s=this.gl;s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.clearColor(0,0,0,1),s.clear(s.COLOR_BUFFER_BIT);const i=t/1e3,e=["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield","wow","server"][this.sceneIdx];e==="wow"?this.drawWOW(i,this.env):e==="server"?this.drawServer(i,this.env):this.drawClassic(e,i,this.env)}beginTransition(t=!1){this.transitioning=!0,this.transStart=performance.now(),t&&(this.sceneTimer=0);const s=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,s,["barsPro","centerBars","circleSpectrum","waveformLine","radialRings","oscDual","sunburst","lissajous","tunnel","particles","starfield","wow","server"][this.sceneIdx])}nextScene(){const t=this.sceneIdx;this.sceneIdx=(this.sceneIdx+1)%this.scenes.length;const s=performance.now();this.renderSceneTo(this.texSceneA,this.sceneA,s,this.scenes[t]),this.renderSceneTo(this.texSceneB,this.sceneB,s,this.scenes[this.sceneIdx]),this.beginTransition(!0)}renderSceneTo(t,s,i,e){const r=this.gl;r.bindFramebuffer(r.FRAMEBUFFER,s),r.viewport(0,0,Math.max(2,Math.floor(this.canvas.width/2)),Math.max(2,Math.floor(this.canvas.height/2))),r.clearColor(0,0,0,1),r.clear(r.COLOR_BUFFER_BIT);const a=i/1e3;e==="wow"?this.drawWOW(a,this.env,!0):e==="server"?this.drawServer(a,this.env,!0):this.drawClassic(e,a,this.env,!0)}renderMorph(t){const s=this.gl;if(!this.morphProg){this.transitioning=!1;return}const i=Math.min(1,(t-this.transStart)/this.transDur);s.bindFramebuffer(s.FRAMEBUFFER,null),s.viewport(0,0,this.canvas.width,this.canvas.height),s.useProgram(this.morphProg);const e=a=>s.getUniformLocation(this.morphProg,a);s.activeTexture(s.TEXTURE0+0),s.bindTexture(s.TEXTURE_2D,this.texSceneA),s.uniform1i(e("uFrom"),0),s.activeTexture(s.TEXTURE0+1),s.bindTexture(s.TEXTURE_2D,this.texSceneB),s.uniform1i(e("uTo"),1),s.uniform1f(e("uProgress"),i),s.uniform2f(e("uRes"),this.canvas.width,this.canvas.height),s.uniform1f(e("uBeat"),this.beat),s.uniform3f(e("uBands"),this.peak[0],this.peak[2],this.peak[3]),s.uniform1f(e("uImpact"),Math.min(2,this.impact));const r=s.getAttribLocation(this.morphProg,"aPos");s.bindBuffer(s.ARRAY_BUFFER,this.quad),s.enableVertexAttribArray(r),s.vertexAttribPointer(r,2,s.FLOAT,!1,0,0),s.drawArrays(s.TRIANGLES,0,6),i>=1&&(this.transitioning=!1)}drawClassic(t,s,i,e=!1){const r=this.gl,a=this.sceneProg[t];if(!a)return;r.useProgram(a);const o=(l,h,n)=>{const c=r.getUniformLocation(a,l);c&&r[`uniform${n}`](c,...Array.isArray(h)?h:[h])};r.activeTexture(r.TEXTURE0+6),r.bindTexture(r.TEXTURE_2D,this.specTex),o("uSpecTex",6,"1i"),o("uSpecN",this.specBins,"1f"),r.activeTexture(r.TEXTURE0+8),r.bindTexture(r.TEXTURE_2D,this.waveTex),o("uWaveTex",8,"1i"),o("uWaveN",this.waveBins,"1f"),o("uTime",s,"1f"),o("uRes",[this.canvas.width,this.canvas.height],"2f"),o("uLevel",i,"1f"),o("uBeat",this.beat,"1f"),o("uKick",this.peak[0]*1.35,"1f"),o("uSnare",this.snare,"1f"),o("uHat",this.peak[3],"1f"),o("uLow",this.peak[0],"1f"),o("uMid",this.peak[2],"1f"),o("uAir",this.peak[3],"1f"),o("uImpact",Math.min(2,this.impact),"1f");const u=r.getAttribLocation(a,"aPos");r.bindBuffer(r.ARRAY_BUFFER,this.quad),r.enableVertexAttribArray(u),r.vertexAttribPointer(u,2,r.FLOAT,!1,0,0),r.drawArrays(r.TRIANGLES,0,6)}drawWOW(t,s,i=!1){const e=this.gl;if(!this.wowProg)return;i||e.bindFramebuffer(e.FRAMEBUFFER,this.fbA);const r=Math.max(2,Math.floor(this.canvas.width/2)),a=Math.max(2,Math.floor(this.canvas.height/2));e.viewport(0,0,r,a),e.clearColor(0,0,0,1),e.clear(e.COLOR_BUFFER_BIT),e.useProgram(this.wowProg);const o=l=>e.getUniformLocation(this.wowProg,l);e.uniform1f(o("uTime"),t),e.uniform2f(o("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(o("uDecay"),this.decay),e.uniform1f(o("uEnv"),s),e.uniform1f(o("uBeat"),this.beat),e.uniform1f(o("uKick"),this.peak[0]*1.35),e.uniform1f(o("uSnare"),this.snare),e.uniform1f(o("uHat"),this.peak[3]),e.uniform1f(o("uLow"),this.peak[0]),e.uniform1f(o("uMid"),this.peak[2]),e.uniform1f(o("uAir"),this.peak[3]),e.activeTexture(e.TEXTURE0+7),e.bindTexture(e.TEXTURE_2D,this.texB),e.uniform1i(o("uFeedback"),7),e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex),e.uniform1i(o("uStreamTex"),this.streamUnit);const u=e.getAttribLocation(this.wowProg,"aPos");if(e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6),!i){e.bindFramebuffer(e.FRAMEBUFFER,null),e.viewport(0,0,this.canvas.width,this.canvas.height);const l=this.morphProg;e.useProgram(l);const h=m=>e.getUniformLocation(l,m);e.activeTexture(e.TEXTURE0+0),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(h("uFrom"),0),e.activeTexture(e.TEXTURE0+1),e.bindTexture(e.TEXTURE_2D,this.texA),e.uniform1i(h("uTo"),1),e.uniform1f(h("uProgress"),0),e.uniform2f(h("uRes"),this.canvas.width,this.canvas.height),e.uniform1f(h("uBeat"),this.beat),e.uniform3f(h("uBands"),this.peak[0],this.peak[2],this.peak[3]),e.uniform1f(h("uImpact"),Math.min(2,this.impact));const n=e.getAttribLocation(l,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(n),e.vertexAttribPointer(n,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6);const c=this.texA;this.texA=this.texB,this.texB=c;const d=this.fbA;this.fbA=this.fbB,this.fbB=d}}drawServer(t,s,i=!1){const e=this.gl,r=this.serverProg;if(!r){this.drawClassic("barsPro",t,s);return}e.useProgram(r);const a=(m,v,T)=>{const E=e.getUniformLocation(r,m);E&&e[`uniform${T}`](E,...Array.isArray(v)?v:[v])};a("uTime",t,"1f"),a("uRes",[this.canvas.width,this.canvas.height],"2f"),a("uLevel",s,"1f");const o=e.getUniformLocation(r,"uBands");o&&e.uniform1fv(o,new Float32Array(this.bands.map(m=>Math.min(1,m*1.6))));const u=e.getUniformLocation(r,"uPulse");u&&e.uniform1f(u,Math.min(1,this.env*1.8));const l=e.getUniformLocation(r,"uBeat");l&&e.uniform1f(l,Math.min(1,this.beat*2));const h=e.getUniformLocation(r,"uImpact");h&&e.uniform1f(h,Math.min(2,this.impact));for(const m of this.serverTextures)e.activeTexture(e.TEXTURE0+m.unit),e.bindTexture(e.TEXTURE_2D,m.tex);e.activeTexture(e.TEXTURE0+this.streamUnit),e.bindTexture(e.TEXTURE_2D,this.streamTex);const n=e.getUniformLocation(r,"uStreamTex");n&&e.uniform1i(n,this.streamUnit);const c=this.serverTextures.find(m=>m.meta&&m.meta.gridCols&&m.meta.gridRows);if(c!=null&&c.meta){const m=c.meta.frames??c.meta.gridCols*c.meta.gridRows,v=c.meta.fps??24,T=Math.floor(t*v)%Math.max(1,m);this.serverUniforms.uAtlasGrid&&e.uniform2f(this.serverUniforms.uAtlasGrid,c.meta.gridCols,c.meta.gridRows),this.serverUniforms.uAtlasFrames&&e.uniform1f(this.serverUniforms.uAtlasFrames,m),this.serverUniforms.uAtlasFPS&&e.uniform1f(this.serverUniforms.uAtlasFPS,v),this.serverUniforms.uFrame&&e.uniform1f(this.serverUniforms.uFrame,T)}const d=e.getAttribLocation(r,"aPos");e.bindBuffer(e.ARRAY_BUFFER,this.quad),e.enableVertexAttribArray(d),e.vertexAttribPointer(d,2,e.FLOAT,!1,0,0),e.drawArrays(e.TRIANGLES,0,6)}}document.addEventListener("DOMContentLoaded",async()=>{const f=document.querySelector("#app");if(!f)return;f.innerHTML=`
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
  `;const t=document.getElementById("visualizer"),s=document.getElementById("status"),i=document.getElementById("fps"),e=document.getElementById("btnShare"),r=document.getElementById("btnDemo");if(!t)return;const a=new C(t,{onStatus:l=>{s.textContent=l},onFps:l=>{i.textContent=`FPS: ${l}`}});await a.start();const o=()=>{e.textContent=a.isSharing()?"Stop Screen Sharing":"Start Screen Sharing"};o(),e.addEventListener("click",async()=>{if(a.isSharing()){a.stopScreenShare(),s.textContent="Screen share stopped",o();return}e.disabled=!0,s.textContent='Requesting screen share (enable "Share audio")…';try{await a.startScreenShare(),s.textContent="Screen sharing active"}catch{s.textContent="Permission denied or no audio shared"}finally{e.disabled=!1,o()}});let u=!1;r.addEventListener("click",()=>{u=!u,a.setDemoMode(u),r.textContent=u?"Stop Demo":"Demo Mode",s.textContent=u?"Demo mode active":"Ready"}),document.addEventListener("keydown",l=>{var h;l.key.toLowerCase()==="n"&&((h=a.loadServerShader)==null||h.call(a))})});
