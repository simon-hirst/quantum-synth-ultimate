package main

import (
	"bytes"
	"embed"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"image"
	"image/color"
	"image/png"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

//go:embed frontend/dist/* frontend/dist/**/*
var distFS embed.FS

// ===== Payload types =====
type UniformDef struct{ Name, Type string }
type TextureDef struct {
	Name     string  `json:"name"`
	DataURL  string  `json:"dataUrl"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	GridCols int     `json:"gridCols,omitempty"`
	GridRows int     `json:"gridRows,omitempty"`
	Frames   int     `json:"frames,omitempty"`
	FPS      float64 `json:"fps,omitempty"`
}
type ShaderPayload struct {
	Type       string       `json:"type"`
	Name       string       `json:"name"`
	Code       string       `json:"code"`
	Complexity int          `json:"complexity"`
	Uniforms   []UniformDef `json:"uniforms,omitempty"`
	Textures   []TextureDef `json:"textures,omitempty"`
	Version    string       `json:"version"`
}

// ===== Caches =====
type rdCacheItem struct {
	day     string
	dataURL string
	w, h    int
	cols, rows, frames int
	fps     float64
}
var rdCache struct{ mu sync.RWMutex; item rdCacheItem }

type flowCacheItem struct {
	key     string // hour key
	dataURL string
	w, h    int
}
var flowCache struct{ mu sync.RWMutex; item flowCacheItem }

func main() {
	rand.Seed(time.Now().UnixNano())
	port := getenvDefault("PORT", "8080")
	staticDir := getenvDefault("STATIC_DIR", "./frontend/dist")
	version := getenvDefault("APP_VERSION", "3.2.0")
	allowedOriginsEnv := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))

	r := mux.NewRouter()

	// API
	r.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/shader/current", getNextShader).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		respondJSON(w, http.StatusOK, map[string]any{"status":"healthy","timestamp":time.Now(),"version":version})
	}).Methods("GET","OPTIONS")

	// WebSocket: echo + stream subscribe
	upgrader := websocket.Upgrader{
		CheckOrigin: func(req *http.Request) bool {
			if allowedOriginsEnv == "" || allowedOriginsEnv == "*" { return true }
			origin := req.Header.Get("Origin")
			if origin == "" { return true }
			for _, o := range strings.Split(allowedOriginsEnv, ",") {
				if strings.EqualFold(strings.TrimSpace(o), origin) { return true }
			}
			return false
		},
	}
	r.HandleFunc("/ws", wsHandler(upgrader)).Methods("GET")

	// SPA/static
	r.PathPrefix("/").Handler(spaHandler(staticDir, "index.html"))

	// CORS
	corsOpts := []handlers.CORSOption{
		handlers.AllowedMethods([]string{"GET","POST","PUT","DELETE","OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type","Authorization","X-Requested-With"}),
	}
	if allowedOriginsEnv == "" {
		corsOpts = append(corsOpts, handlers.AllowedOrigins([]string{"*"}))
	} else {
		parts := strings.Split(allowedOriginsEnv, ",")
		for i := range parts { parts[i] = strings.TrimSpace(parts[i]) }
		corsOpts = append(corsOpts, handlers.AllowedOrigins(parts))
		if !(len(parts)==1 && parts[0]=="*") { corsOpts = append(corsOpts, handlers.AllowCredentials()) }
	}

	srv := &http.Server{
		Addr: ":"+port,
		Handler: handlers.CORS(corsOpts...)(loggingMiddleware(r)),
		ReadHeaderTimeout: 5*time.Second,
		ReadTimeout: 15*time.Second,
		WriteTimeout: 15*time.Second,
		IdleTimeout: 60*time.Second,
	}

	log.Printf("QuantumSynth server on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

// ===== HTTP handlers =====

func getNextShader(w http.ResponseWriter, r *http.Request) {
	q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("type")))
	switch q {
	case "flow":
		respondJSON(w, http.StatusOK, buildFlowShader()); return
	case "grayscott", "rd":
		respondJSON(w, http.StatusOK, buildGrayScottShader()); return
	case "waves", "wave":
		respondJSON(w, http.StatusOK, buildWaveShader()); return
	case "composite":
		respondJSON(w, http.StatusOK, buildCompositeShader()); return
	}
	// Weighted default: mostly composite/RD
	n := rand.Intn(100)
	switch {
	case n < 60: respondJSON(w, http.StatusOK, buildCompositeShader())
	case n < 85: respondJSON(w, http.StatusOK, buildGrayScottShader())
	case n < 95: respondJSON(w, http.StatusOK, buildFlowShader())
	default:     respondJSON(w, http.StatusOK, buildWaveShader())
	}
}

// ===== Composite shader (RD + Flow + optional Stream) =====

func buildCompositeShader() ShaderPayload {
	// cached textures
	flowURL, fw, fh := getCachedFlow()
	rd := getCachedRD()

	fs := `
	precision mediump float;
	varying vec2 vUV;

	uniform float uTime;
	uniform vec2  uRes;
	uniform float uLevel;
	uniform float uBands[4];
	uniform float uPulse;
	uniform float uBeat;

	// weights
	uniform float uBlendFlow;
	uniform float uBlendRD;
	uniform float uBlendStream;

	// flow
	uniform sampler2D uFlowTex;

	// RD atlas
	uniform sampler2D uAtlas;
	uniform vec2  uAtlasGrid;
	uniform float uAtlasFrames;
	uniform float uFrame;
	uniform float uAtlasFPS;

	// streamed field (optional)
	uniform sampler2D uStreamTex;
	uniform vec2  uStreamRes;

	vec2 flow(vec2 uv){
		vec2 f = texture2D(uFlowTex, uv).rg * 2.0 - 1.0;
		return f * (0.5 + 1.5*uLevel);
	}

	vec2 atlasUV(vec2 uv, float frame, vec2 grid){
		float cols = grid.x, rows = grid.y;
		float idx = mod(frame, cols*rows);
		float c = mod(idx, cols);
		float r = floor(idx / cols);
		return (uv + vec2(c, r)) / vec2(cols, rows);
	}

	void main() {
		vec2 uv = vUV;
		float t = uTime*0.5;

		// FLOW layer
		vec2 f1 = flow(fract(uv + vec2( t*0.05, -t*0.03 )));
		vec2 f2 = flow(fract(uv + vec2(-t*0.04,  t*0.06 )));
		vec2 puv = uv + (f1+f2) * (0.10 + 0.25*(uBands[0]*0.5 + uBands[2]*0.5));
		float k1 = sin((puv.x+puv.y)*18.0 - t*2.5)*0.5 + 0.5;
		vec3 flowCol = vec3(
			0.35 + 0.65*sin(t + k1*6.2831 + 0.0),
			0.35 + 0.65*sin(t + k1*6.2831 + 2.1),
			0.35 + 0.65*sin(t + k1*6.2831 + 4.2)
		);

		// RD layer
		float f = uFrame + uLevel*2.0 + uPulse*3.0;
		float g = texture2D(uAtlas, atlasUV(uv, f, uAtlasGrid)).r;
		vec3 rdCol = mix(vec3(0.10,0.90,0.85), vec3(1.0,0.25,0.65), g);
		rdCol *= (0.6 + 1.4*uLevel);

		// STREAM layer (if bound)
		vec3 streamCol = texture2D(uStreamTex, uv).rgb;
		// Slight hue remap
		streamCol = mix(streamCol, vec3(streamCol.gb, 1.0), 0.15);

		// Mix weights
		float wf = uBlendFlow;
		float wr = uBlendRD;
		float ws = uBlendStream;
		float sum = max(1e-4, wf + wr + ws);
		vec3 col = (flowCol*wf + rdCol*wr + streamCol*ws) / sum;

		// Light pulse on beats
		col += uBeat * 0.12;

		// Subtle vignette
		vec2 d = uv - 0.5;
		float vig = 1.0 - dot(d,d)*0.8;
		col *= clamp(vig, 0.2, 1.1);

		gl_FragColor = vec4(col, 1.0);
	}`

	return ShaderPayload{
		Type: "composite",
		Name: "Composite: RD × Flow × Stream",
		Code: fs,
		Complexity: 9,
		Uniforms: []UniformDef{
			{"uTime","float"},{"uRes","vec2"},
			{"uLevel","float"},{"uBands","float[4]"},
			{"uPulse","float"},{"uBeat","float"},
			{"uBlendFlow","float"},{"uBlendRD","float"},{"uBlendStream","float"},
			{"uFlowTex","sampler2D"},
			{"uAtlas","sampler2D"},{"uAtlasGrid","vec2"},{"uAtlasFrames","float"},{"uFrame","float"},{"uAtlasFPS","float"},
			{"uStreamTex","sampler2D"},{"uStreamRes","vec2"},
		},
		Textures: []TextureDef{
			{Name:"uFlowTex", DataURL:flowURL, Width:fw, Height:fh},
			{Name:"uAtlas", DataURL:rd.dataURL, Width:rd.w, Height:rd.h, GridCols:rd.cols, GridRows:rd.rows, Frames:rd.frames, FPS:rd.fps},
		},
		Version: "3.2.0",
	}
}

// ===== Flow, RD, Waves payloads (with caching) =====

func buildFlowShader() ShaderPayload {
	url, w, h := getCachedFlow()
	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime;
	uniform float uLevel;
	uniform float uBands[4];
	uniform sampler2D uFlowTex;
	vec2 flow(vec2 uv){ vec2 f = texture2D(uFlowTex, uv).rg*2.0 - 1.0; return f*(0.5+1.5*uLevel); }
	void main(){
		vec2 uv=vUV; float t=uTime*.35;
		vec2 f1=flow(fract(uv+vec2( t*.05,-t*.03)));
		vec2 f2=flow(fract(uv+vec2(-t*.04, t*.06)));
		vec2 p = uv + (f1+f2) * (0.10 + 0.25*(uBands[0]*.5+uBands[2]*.5));
		float k = sin((p.x+p.y)*18.0 - t*3.0 + uBands[1]*6.0)*.5+.5;
		vec3 col = vec3(.4+.6*sin(t+k*6.2831+0.0), .4+.6*sin(t+k*6.2831+2.1), .4+.6*sin(t+k*6.2831+4.2));
		gl_FragColor = vec4(col,1.0);
	}`
	return ShaderPayload{
		Type:"physics-flow", Name:"Quantum Flowfield", Code:fs, Complexity:7, Version:"3.2.0",
		Uniforms: []UniformDef{{"uTime","float"},{"uLevel","float"},{"uBands","float[4]"},{"uFlowTex","sampler2D"}},
		Textures: []TextureDef{{Name:"uFlowTex", DataURL:url, Width:w, Height:h}},
	}
}

func buildGrayScottShader() ShaderPayload {
	rd := getCachedRD()
	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime;
	uniform float uLevel;
	uniform float uBands[4];
	uniform sampler2D uAtlas;
	uniform vec2  uAtlasGrid;
	uniform float uAtlasFrames;
	uniform float uFrame;
	uniform float uAtlasFPS;
	vec2 atlasUV(vec2 uv, float frame, vec2 grid){
		float cols=grid.x, rows=grid.y;
		float idx=mod(frame, cols*rows);
		float c=mod(idx, cols), r=floor(idx/cols);
		return (uv+vec2(c,r))/vec2(cols,rows);
	}
	void main(){
		float f=uFrame + uLevel*2.0;
		float g=texture2D(uAtlas, atlasUV(vUV,f,uAtlasGrid)).r;
		vec3 col = mix(vec3(.12,.85,.80), vec3(1.0,.25,.6), g) * (0.6 + 1.4*uLevel);
		gl_FragColor=vec4(col,1.0);
	}`
	return ShaderPayload{
		Type:"grayscott", Name:"Gray–Scott Reaction–Diffusion", Code:fs, Complexity:9, Version:"3.2.0",
		Uniforms: []UniformDef{{"uTime","float"},{"uLevel","float"},{"uBands","float[4]"},{"uAtlas","sampler2D"},{"uAtlasGrid","vec2"},{"uAtlasFrames","float"},{"uFrame","float"},{"uAtlasFPS","float"}},
		Textures: []TextureDef{{Name:"uAtlas", DataURL:rd.dataURL, Width:rd.w, Height:rd.h, GridCols:rd.cols, GridRows:rd.rows, Frames:rd.frames, FPS:rd.fps}},
	}
}

func buildWaveShader() ShaderPayload {
	cols, rows, frames := 8, 8, 64
	w, h := 64, 64
	atW, atH := cols*w, rows*h
	fps := 24.0
	url := generateWaveAtlas(cols, rows, frames, w, h)
	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime, uLevel;
	uniform sampler2D uAtlas;
	uniform vec2  uAtlasGrid;
	uniform float uAtlasFrames, uFrame, uAtlasFPS;
	vec2 atlasUV(vec2 uv, float frame, vec2 grid){
		float cols=grid.x, rows=grid.y;
		float idx=mod(frame, cols*rows);
		float c=mod(idx, cols), r=floor(idx/cols);
		return (uv+vec2(c,r))/vec2(cols,rows);
	}
	void main(){
		float f=uFrame;
		float g=texture2D(uAtlas, atlasUV(vUV,f,uAtlasGrid)).r;
		vec3 base=mix(vec3(.10,.85,.95), vec3(.95,.25,.6), g);
		gl_FragColor=vec4(base*(.6+1.6*uLevel),1.0);
	}`
	return ShaderPayload{
		Type:"waves", Name:"Interference Waves", Code:fs, Complexity:6, Version:"3.2.0",
		Uniforms: []UniformDef{{"uTime","float"},{"uLevel","float"},{"uAtlas","sampler2D"},{"uAtlasGrid","vec2"},{"uAtlasFrames","float"},{"uFrame","float"},{"uAtlasFPS","float"}},
		Textures: []TextureDef{{Name:"uAtlas", DataURL:url, Width:atW, Height:atH, GridCols:cols, GridRows:rows, Frames:frames, FPS:fps}},
	}
}

// ===== Texture generation + caching =====

func getCachedFlow() (string,int,int) {
	key := time.Now().UTC().Format("2006-01-02-15") // hourly
	flowCache.mu.RLock()
	if flowCache.item.key == key {
		item := flowCache.item
		flowCache.mu.RUnlock()
		return item.dataURL, item.w, item.h
	}
	flowCache.mu.RUnlock()

	w,h := 256,256
	url := generateFlowTexture(w,h,time.Now().UnixNano())

	flowCache.mu.Lock()
	flowCache.item = flowCacheItem{key:key, dataURL:url, w:w, h:h}
	flowCache.mu.Unlock()
	return url,w,h
}

func getCachedRD() rdCacheItem {
	day := time.Now().UTC().Format("2006-01-02")
	rdCache.mu.RLock()
	if rdCache.item.day == day {
		item := rdCache.item
		rdCache.mu.RUnlock()
		return item
	}
	rdCache.mu.RUnlock()

	cols, rows, frames := 8, 8, 64
	frameW, frameH := 64, 64
	atlasW, atlasH := cols*frameW, rows*frameH
	url := generateGrayScottAtlas(cols, rows, frames, frameW, frameH, 6)
	item := rdCacheItem{day:day, dataURL:url, w:atlasW, h:atlasH, cols:cols, rows:rows, frames:frames, fps:24.0}

	rdCache.mu.Lock()
	rdCache.item = item
	rdCache.mu.Unlock()
	return item
}

func generateFlowTexture(w, h int, seed int64) string {
	img := image.NewNRGBA(image.Rect(0,0,w,h))
	r := rand.New(rand.NewSource(seed))
	phiX := r.Float64()*2*math.Pi
	phiY := r.Float64()*2*math.Pi
	freq := 3.0 + r.Float64()*4.0
	for y:=0;y<h;y++{ for x:=0;x<w;x++{
		fx := 2*math.Pi*float64(x)/float64(w)
		fy := 2*math.Pi*float64(y)/float64(h)
		vx := math.Sin(freq*fx+phiX)*math.Cos(freq*fy-phiY) + 0.5*math.Sin((freq*0.6)*fy+phiY)*math.Cos((freq*0.6)*fx-phiX)
		vy := -math.Cos(freq*fx+phiX)*math.Sin(freq*fy-phiY) + 0.5*math.Cos((freq*0.6)*fy+phiY)*math.Sin((freq*0.6)*fx-phiX)
		scale := 0.5; vx*=scale; vy*=scale
		R := uint8(math.Round((vx*0.5+0.5)*255.0))
		G := uint8(math.Round((vy*0.5+0.5)*255.0))
		img.SetNRGBA(x,y,color.NRGBA{R,G,0,255})
	}}
	var buf bytes.Buffer; _ = png.Encode(&buf, img)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

func generateGrayScottAtlas(cols, rows, frames, w, h, stepsPerFrame int) string {
	atlas := image.NewNRGBA(image.Rect(0,0,cols*w, rows*h))
	U := make([]float64, w*h); V := make([]float64, w*h)
	for i := range U { U[i]=1.0 }
	seed := w/8
	for y:=h/2-seed; y<h/2+seed; y++ { for x:=w/2-seed; x<w/2+seed; x++ {
		i:=y*w+x; V[i]=1.0; U[i]=0.0
	}}
	F,k := 0.0367, 0.0649; Du,Dv := 0.16, 0.08; dt := 1.0
	lap := func(buf []float64, x,y int) float64 {
		xm := (x-1+w)%w; xp := (x+1)%w; ym := (y-1+h)%h; yp := (y+1)%h
		return -4*buf[y*w+x] + buf[y*w+xm] + buf[y*w+xp] + buf[ym*w+x] + buf[yp*w+x]
	}
	for f:=0; f<frames; f++ {
		for s:=0; s<stepsPerFrame; s++ {
			U2 := make([]float64, w*h)
			V2 := make([]float64, w*h)
			for y:=0; y<h; y++ {
				for x:=0; x<w; x++ {
					i:=y*w+x
					u,v := U[i], V[i]
					uvv := u*v*v
					U2[i] = u + (Du*lap(U,x,y) - uvv + F*(1-u))*dt
					V2[i] = v + (Dv*lap(V,x,y) + uvv - (F+k)*v)*dt
					if U2[i]<0{U2[i]=0}; if U2[i]>1{U2[i]=1}
					if V2[i]<0{V2[i]=0}; if V2[i]>1{V2[i]=1}
				}
			}
			U,V = U2,V2
		}
		col := f%cols; row := f/cols
		for y:=0; y<h; y++ { for x:=0; x<w; x++ {
			i:=y*w+x; val := uint8(math.Round(V[i]*255))
			atlas.SetNRGBA(col*w+x, row*h+y, color.NRGBA{val,val,val,255})
		}}
	}
	var buf bytes.Buffer; _ = png.Encode(&buf, atlas)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

func generateWaveAtlas(cols, rows, frames, w, h int) string {
	atlas := image.NewNRGBA(image.Rect(0,0,cols*w, rows*h))
	for f:=0; f<frames; f++ {
		phase := float64(f) / float64(frames) * 2 * math.Pi
		c := f%cols; r := f/cols
		for y:=0; y<h; y++ {
			for x:=0; x<w; x++ {
				u := float64(x)/float64(w); v := float64(y)/float64(h)
				sx1, sy1 := 0.3 + 0.2*math.Sin(phase*0.9), 0.5 + 0.25*math.Cos(phase*0.8)
				sx2, sy2 := 0.7 + 0.2*math.Cos(phase*1.1), 0.5 + 0.25*math.Sin(phase*1.0)
				d1 := math.Hypot(u-sx1, v-sy1); d2 := math.Hypot(u-sx2, v-sy2)
				w1 := math.Sin(18*d1 - phase*4); w2 := math.Sin(18*d2 + phase*3.5)
				val := (w1 + w2)*0.25 + 0.5
				if val<0 { val=0 } ; if val>1 { val=1 }
				g := uint8(math.Round(val*255))
				atlas.SetNRGBA(c*w+x, r*h+y, color.NRGBA{g,g,g,255})
			}
		}
	}
	var buf bytes.Buffer; _ = png.Encode(&buf, atlas)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

// ===== WS streaming =====

func wsHandler(upgrader websocket.Upgrader) http.HandlerFunc {
	type subscribeMsg struct {
		Type string `json:"type"`
		Field string `json:"field"` // "noise", "waves", "flow"
		W int `json:"w"`
		H int `json:"h"`
		FPS int `json:"fps"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil { log.Printf("ws upgrade: %v", err); return }
		defer c.Close()

		_ = c.WriteJSON(map[string]any{"type":"hello","serverTime":time.Now().Format(time.RFC3339)})

		c.SetReadLimit(1<<20)
		_ = c.SetReadDeadline(time.Now().Add(60*time.Second))
		c.SetPongHandler(func(string) error { _ = c.SetReadDeadline(time.Now().Add(60*time.Second)); return nil })

		streaming := false
		stop := make(chan struct{})

		for {
			mt, data, err := c.ReadMessage()
			if err != nil { close(stop); return }
			if mt == websocket.CloseMessage { close(stop); return }

			if mt == websocket.TextMessage {
				// Expect JSON subscribe
				var sub subscribeMsg
				_ = json.Unmarshal(data, &sub)
				if strings.ToLower(sub.Type) == "subscribe" {
					if sub.W <= 0 { sub.W = 256 }
					if sub.H <= 0 { sub.H = 256 }
					if sub.FPS <= 0 || sub.FPS > 60 { sub.FPS = 24 }
					if streaming { close(stop); stop = make(chan struct{}) }
					go streamField(c, stop, sub.Field, sub.W, sub.H, sub.FPS)
					streaming = true
					_ = c.WriteJSON(map[string]any{"type":"subscribed","w":sub.W,"h":sub.H,"fps":sub.FPS,"field":sub.Field})
				} else {
					// echo
					_ = c.WriteJSON(map[string]any{"type":"echo","message":string(data)})
				}
			}
		}
	}
}

func streamField(c *websocket.Conn, stop <-chan struct{}, mode string, w, h, fps int) {
	t := time.NewTicker(time.Second / time.Duration(fps))
	defer t.Stop()
	frame := 0
	buf := make([]byte, w*h*4)
	header := make([]byte, 8+4*4) // "FRAMEv1" + w,h,channels,index
	copy(header[:8], []byte("FRAMEv1"))
	for {
		select {
		case <-stop:
			return
		case now := <-t.C:
			// Fill buffer with analytic RGB pattern depending on mode & time
			fillField(buf, w, h, mode, now, frame)
			// Pack header (LE)
			binary.LittleEndian.PutUint32(header[8:12], uint32(w))
			binary.LittleEndian.PutUint32(header[12:16], uint32(h))
			binary.LittleEndian.PutUint32(header[16:20], uint32(4))
			binary.LittleEndian.PutUint32(header[20:24], uint32(frame))
			// Write binary message: header + RGBA
			out := make([]byte, len(header)+len(buf))
			copy(out, header)
			copy(out[len(header):], buf)
			_ = c.WriteMessage(websocket.BinaryMessage, out)
			frame++
		}
	}
}

func fillField(dst []byte, w, h int, mode string, now time.Time, frame int) {
	// Lightweight "time-varying field": multi-source interference + swirl
	t := float64(now.UnixNano()%1e15) / 1e9
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			u := float64(x)/float64(w)
			v := float64(y)/float64(h)
			// 3 moving sources
			ax, ay := 0.3+0.2*math.Sin(t*0.7), 0.5+0.25*math.Cos(t*0.6)
			bx, by := 0.7+0.2*math.Cos(t*0.9), 0.5+0.25*math.Sin(t*0.8)
			cx, cy := 0.5+0.3*math.Sin(t*0.5), 0.5+0.3*math.Cos(t*0.5)
			d1 := math.Hypot(u-ax, v-ay)
			d2 := math.Hypot(u-bx, v-by)
			d3 := math.Hypot(u-cx, v-cy)
			w1 := math.Sin(16*d1 - t*2.5)
			w2 := math.Sin(18*d2 + t*2.2)
			w3 := math.Sin(14*d3 - t*2.8)

			// combine into colorful field
			r := 0.6 + 0.4*math.Sin(w1 + 0.0)
			g := 0.6 + 0.4*math.Sin(w2 + 2.0)
			b := 0.6 + 0.4*math.Sin(w3 + 4.0)

			i := (y*w + x) * 4
			dst[i+0] = uint8(r*255)
			dst[i+1] = uint8(g*255)
			dst[i+2] = uint8(b*255)
			dst[i+3] = 255
		}
	}
}

// ===== infra helpers =====

func respondJSON(w http.ResponseWriter, code int, v any) { w.Header().Set("Content-Type","application/json"); w.WriteHeader(code); _ = json.NewEncoder(w).Encode(v) }
func getenvDefault(k, def string) string { if v := strings.TrimSpace(os.Getenv(k)); v != "" { return v }; return def }
func loggingMiddleware(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){ start:=time.Now(); next.ServeHTTP(w,r); log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start)) }) }
func spaHandler(staticDir, index string) http.Handler {
	tryDisk := func(p string) (http.File, error) { f, err := os.Open(filepath.Join(staticDir,p)); if err==nil { return f,nil }; return nil, err }
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/"); if path=="" { path=index }
		if f, err := tryDisk(path); err==nil { _=f.Close(); http.ServeFile(w,r,filepath.Join(staticDir,path)); return }
		if f, err := distFS.Open("frontend/dist/"+path); err==nil { _=f.Close(); http.FileServer(http.FS(distFS)).ServeHTTP(w,r); return }
		if f, err := tryDisk(index); err==nil { _=f.Close(); http.ServeFile(w,r,filepath.Join(staticDir,index)); return }
		http.ServeFileFS(w,r,distFS,"frontend/dist/"+index)
	})
}
