import * as THREE from "three";

const vert = `
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
`;
const frag = `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uRes;
  uniform float uBass;
  uniform float uMid;
  uniform float uHigh;
  uniform vec3  uTint;

  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n2(vec2 p){
    vec2 i=floor(p),f=fract(p);
    float a=h(i),b=h(i+vec2(1.,0.)),c=h(i+vec2(0.,1.)),d=h(i+vec2(1.,1.));
    vec2 u=f*f*(3.-2.*f);
    return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
  }
  float fbm(vec2 p){
    float v=0.,a=.5;
    for(int i=0;i<6;i++){v+=a*n2(p);p=p*2.04+vec2(37.1,17.7);a*=.5;}
    return v;
  }
  vec3 toRGB(vec3 hsb){
    vec3 p=abs(fract(hsb.xxx+vec3(0.,2./3.,1./3.))*6.-3.);
    vec3 rgb=clamp(p-1.,0.,1.);
    return hsb.z*mix(vec3(1.),rgb,hsb.y);
  }

  void main(){
    vec2 uv=vUv-0.5;
    float ar=uRes.x/max(1.,uRes.y);
    uv.x*=ar;

    float t=uTime*0.75;
    float r=length(uv)+1e-6;
    float a=atan(uv.y,uv.x);

    float bass=uBass;
    float mid=uMid;
    float high=uHigh;

    float swirl=sin(a*(6.+2.*mid)+t*(1.6+0.2*high))*(.15+.65*high);
    float rings=sin(r*(28.+10.*bass)+t*(2.5+.5*mid));
    float flow=fbm(uv*2.2+vec2(t*0.25,0.))+fbm(uv*3.4-vec2(0.,t*0.22));
    float energy=0.35*swirl+0.45*rings+0.6*flow;
    energy=pow(max(0.,energy),1.2);

    float hue=fract(0.62+0.25*bass+0.15*high+energy*0.08);
    float sat=clamp(0.55+0.35*mid,0.,1.);
    float val=clamp(0.2+1.4*energy,0.,1.3);
    vec3 core=toRGB(vec3(hue,sat,val));

    float glow=smoothstep(1.2,0.2,r);
    vec3 col=mix(vec3(0.02,0.02,0.03),core,glow);
    col*=uTint;
    gl_FragColor=vec4(col,1.0);
  }
`;

export class NeuralVisualizer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private uniforms: {
    uTime:{value:number};
    uRes:{value:THREE.Vector2};
    uBass:{value:number};
    uMid:{value:number};
    uHigh:{value:number};
    uTint:{value:THREE.Vector3};
  };
  private analyser: AnalyserNode|null = null;
  private audio: AudioContext|null = null;
  private fft: Uint8Array|null = null;
  private smoothing = 0.8;
  private fftSize: 256|512|1024|2048|4096|8192 = 2048;
  private visualGain = 1.2;
  private startT = performance.now();
  private raf = 0;

  constructor(private canvas: HTMLCanvasElement){
    this.uniforms = {
      uTime:{value:0},
      uRes:{value:new THREE.Vector2(1,1)},
      uBass:{value:0},
      uMid:{value:0},
      uHigh:{value:0},
      uTint:{value:new THREE.Vector3(1.0,0.95,1.05)}
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60,1,0.1,1000);
    this.camera.position.z = 50;
    this.renderer = new THREE.WebGLRenderer({canvas,antialias:true});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(200,200),
      new THREE.ShaderMaterial({vertexShader:vert,fragmentShader:frag,uniforms:this.uniforms,depthWrite:false,depthTest:false})
    );
    plane.position.set(0,0,-10);
    this.scene.add(plane);
    window.addEventListener("resize",()=>this.resize());
    this.resize();
    this.animate();
  }

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    if (this.analyser && this.fft) this.analyser.getByteFrequencyData(this.fft);
    const t = (performance.now()-this.startT)/1000;
    this.uniforms.uTime.value = t;
    const bands = this.bands();
    this.uniforms.uBass.value = bands.bass;
    this.uniforms.uMid.value = bands.mid;
    this.uniforms.uHigh.value = bands.high;
    this.renderer.render(this.scene,this.camera);
  };

  private bands(){
    if (!this.fft) return {bass:0,mid:0,high:0};
    const sr = this.audio?.sampleRate || 44100;
    const ny = sr/2;
    const binHz = ny/this.fft.length;
    const avg = (lo:number,hi:number)=>{
      const i0 = Math.max(0,Math.floor(lo/binHz));
      const i1 = Math.min(this.fft.length-1,Math.ceil(hi/binHz));
      let s=0,n=0;
      for (let i=i0;i<=i1;i++){s+=this.fft[i];n++;}
      const v = n?s/n:0;
      return Math.min(1,(v/255)*this.visualGain);
    };
    return {bass:avg(20,140),mid:avg(140,2200),high:avg(2200,10000)};
  }

  start(mode: "display"|"mic"|"osc" = "display"){
    const secure = window.isSecureContext || location.hostname==="localhost" || location.hostname==="127.0.0.1";
    if (mode!=="osc" && !secure) throw new Error("Use localhost or HTTPS for audio capture.");
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!this.audio) this.audio = new AC();
    const resume = this.audio.resume();
    resume.then(async ()=>{
      let source: MediaStreamAudioSourceNode|OscillatorNode;
      if (mode==="display"){
        // @ts-ignore
        const stream = await navigator.mediaDevices.getDisplayMedia({video:true,audio:{echoCancellation:false,noiseSuppression:false,sampleRate:44100}});
        if (!stream.getAudioTracks().length) throw new Error("Select Entire screen and enable Share audio.");
        source = this.audio!.createMediaStreamSource(stream);
      } else if (mode==="mic"){
        const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,sampleRate:44100}});
        source = this.audio!.createMediaStreamSource(stream);
      } else {
        const osc = this.audio!.createOscillator();
        osc.type = "sawtooth"; osc.frequency.value = 220; osc.start();
        source = osc;
      }
      if (!this.analyser) this.analyser = this.audio!.createAnalyser();
      this.analyser.fftSize = this.fftSize;
      this.analyser.smoothingTimeConstant = this.smoothing;
      // @ts-expect-error
      source.connect(this.analyser);
      this.fft = new Uint8Array(this.analyser.frequencyBinCount);
    });
  }

  setGain(v:number){ this.visualGain = Math.max(0.1,Math.min(5,v)); }
  setSmoothing(v:number){ this.smoothing = Math.min(0.99,Math.max(0,v)); if (this.analyser) this.analyser.smoothingTimeConstant = this.smoothing; }
  setFftSize(size:256|512|1024|2048|4096|8192){ this.fftSize = size; if (this.analyser){ this.analyser.fftSize = size; this.fft = new Uint8Array(this.analyser.frequencyBinCount); } }
  setTheme(name:"Aurora"|"Neon"|"Sunset"|"Lush"|"Candy"){
    const t=this.uniforms.uTint.value;
    if (name==="Neon") t.set(0.9,1.2,1.2);
    else if (name==="Sunset") t.set(1.2,0.85,0.5);
    else if (name==="Lush") t.set(0.8,1.0,0.6);
    else if (name==="Candy") t.set(1.1,0.7,1.0);
    else t.set(1.0,0.95,1.05);
  }

  resize(){
    const w=window.innerWidth,h=window.innerHeight;
    this.renderer.setSize(w,h);
    this.camera.aspect=w/h;
    this.camera.updateProjectionMatrix();
    this.uniforms.uRes.value.set(w,h);
  }

  destroy(){
    cancelAnimationFrame(this.raf);
  }
}
