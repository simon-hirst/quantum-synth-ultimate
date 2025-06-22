package main

import (
	"bytes"
	"embed"
	"encoding/base64"
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
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

//go:embed frontend/dist/* frontend/dist/**/*
var distFS embed.FS

// ---- Payload types ----

type UniformDef struct {
	Name string `json:"name"`
	Type string `json:"type"` // float, vec2, vec3, vec4, sampler2D, float[4]
}

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
	Code       string       `json:"code"` // fragment shader (expects varying vUV)
	Complexity int          `json:"complexity"`
	Uniforms   []UniformDef `json:"uniforms,omitempty"`
	Textures   []TextureDef `json:"textures,omitempty"`
	Version    string       `json:"version"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	port := getenvDefault("PORT", "8080")
	staticDir := getenvDefault("STATIC_DIR", "./frontend/dist")
	version := getenvDefault("APP_VERSION", "3.1.0")
	allowedOriginsEnv := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))

	r := mux.NewRouter()
	r.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/shader/current", getNextShader).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		respondJSON(w, http.StatusOK, map[string]any{"status": "healthy", "timestamp": time.Now(), "version": version})
	}).Methods("GET", "OPTIONS")

	// WebSocket (simple echo/heartbeat)
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

	// Static / SPA
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
		if !(len(parts) == 1 && parts[0] == "*") { corsOpts = append(corsOpts, handlers.AllowCredentials()) }
	}
	srv := &http.Server{
		Addr:              ":"+port,
		Handler:           handlers.CORS(corsOpts...)(loggingMiddleware(r)),
		ReadHeaderTimeout: 5*time.Second,
		ReadTimeout:       15*time.Second,
		WriteTimeout:      15*time.Second,
		IdleTimeout:       60*time.Second,
	}
	log.Printf("QuantumSynth server on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed { log.Fatal(err) }
}

// ---------------- WS, helpers, SPA ----------------

func wsHandler(upgrader websocket.Upgrader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil { log.Printf("ws upgrade: %v", err); return }
		defer c.Close()
		_ = c.WriteJSON(map[string]any{"type":"hello","message":"connected","serverTime":time.Now().Format(time.RFC3339)})
		c.SetReadLimit(1<<20)
		_ = c.SetReadDeadline(time.Now().Add(60*time.Second))
		c.SetPongHandler(func(string) error { _ = c.SetReadDeadline(time.Now().Add(60*time.Second)); return nil })
		t := time.NewTicker(25*time.Second); defer t.Stop()
		for {
			select {
			case <-t.C:
				_ = c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
			default:
				mt, msg, err := c.ReadMessage()
				if err != nil || mt == websocket.CloseMessage { return }
				_ = c.WriteJSON(map[string]any{"type":"echo","serverTime":time.Now().Format(time.RFC3339),"message":string(msg)})
			}
		}
	}
}

func respondJSON(w http.ResponseWriter, code int, v any) { w.Header().Set("Content-Type","application/json"); w.WriteHeader(code); _ = json.NewEncoder(w).Encode(v) }
func getenvDefault(k, def string) string { if v := strings.TrimSpace(os.Getenv(k)); v != "" { return v }; return def }
func loggingMiddleware(next http.Handler) http.Handler { return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){ start:=time.Now(); next.ServeHTTP(w,r); log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start)) }) }

func spaHandler(staticDir, index string) http.Handler {
	tryDisk := func(p string) (http.File, error) {
		f, err := os.Open(filepath.Join(staticDir,p))
		if err == nil { return f, nil }
		return nil, err
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/"); if path=="" { path=index }
		if f, err := tryDisk(path); err==nil { _=f.Close(); http.ServeFile(w,r,filepath.Join(staticDir,path)); return }
		if f, err := distFS.Open("frontend/dist/"+path); err==nil { _=f.Close(); http.FileServer(http.FS(distFS)).ServeHTTP(w,r); return }
		if f, err := tryDisk(index); err==nil { _=f.Close(); http.ServeFile(w,r,filepath.Join(staticDir,index)); return }
		http.ServeFileFS(w,r,distFS,"frontend/dist/"+index)
	})
}

// ---------------- Shader endpoints ----------------

func getNextShader(w http.ResponseWriter, r *http.Request) {
	// Choose by query ?type=flow|grayscott|waves or random
	switch strings.ToLower(strings.TrimSpace(r.URL.Query().Get("type"))) {
	case "flow":
		respondJSON(w, http.StatusOK, buildFlowShader()); return
	case "grayscott", "rd":
		respondJSON(w, http.StatusOK, buildGrayScottShader()); return
	case "waves", "wave":
		respondJSON(w, http.StatusOK, buildWaveShader()); return
	}
	// random pick (weighted: make RD show often)
	n := rand.Intn(100)
	if n < 50 { respondJSON(w, http.StatusOK, buildGrayScottShader()); return }
	if n < 80 { respondJSON(w, http.StatusOK, buildFlowShader()); return }
	respondJSON(w, http.StatusOK, buildWaveShader())
}

// ---- FLOW (vector field texture; light but pretty) ----

func buildFlowShader() ShaderPayload {
	w, h := 256, 256
	dataURL := generateFlowTexture(w, h, time.Now().UnixNano())
	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime;
	uniform vec2  uRes;
	uniform float uLevel;
	uniform float uBands[4];
	uniform sampler2D uFlowTex;

	vec2 flow(vec2 uv){
		vec2 f = texture2D(uFlowTex, uv).rg*2.0 - 1.0;
		return f * (0.5 + 1.5*uLevel);
	}

	void main(){
		vec2 uv = vUV;
		float t = uTime*0.35;
		vec2 f1 = flow(fract(uv + vec2( t*0.05, -t*0.03 )));
		vec2 f2 = flow(fract(uv + vec2(-t*0.04,  t*0.06 )));
		float bandMix = uBands[0]*0.5 + uBands[2]*0.5;
		vec2 p = uv + (f1 + f2) * (0.10 + 0.25*bandMix);
		float k1 = sin((p.x + p.y)*18.0 - t*3.0 + uBands[1]*6.0)*0.5 + 0.5;
		float k2 = cos((p.x*1.2 - p.y*0.9)*22.0 + t*2.2 + uBands[3]*8.0)*0.5 + 0.5;
		vec3 base = vec3(
			0.4 + 0.6*sin(t + k1*6.2831 + 0.0),
			0.4 + 0.6*sin(t + k2*6.2831 + 2.1),
			0.4 + 0.6*sin(t + (k1+k2)*3.1415 + 4.2)
		);
		float mag = length(f1+f2);
		vec3 col = base + mag*vec3(0.2,0.15,0.05);
		gl_FragColor = vec4(col,1.0);
	}`
	return ShaderPayload{
		Type: "physics-flow", Name: "Quantum Flowfield", Code: fs, Complexity: 7, Version: "3.1.0",
		Uniforms: []UniformDef{
			{Name:"uTime",Type:"float"}, {Name:"uRes",Type:"vec2"},
			{Name:"uLevel",Type:"float"}, {Name:"uBands",Type:"float[4]"},
			{Name:"uFlowTex",Type:"sampler2D"},
		},
		Textures: []TextureDef{{Name:"uFlowTex", DataURL:dataURL, Width:w, Height:h}},
	}
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
		scale := 0.5
		vx*=scale; vy*=scale
		R := uint8(math.Round((vx*0.5+0.5)*255.0))
		G := uint8(math.Round((vy*0.5+0.5)*255.0))
		img.SetNRGBA(x,y,color.NRGBA{R,G,0,255})
	}}
	var buf bytes.Buffer; _ = png.Encode(&buf, img)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

// ---- GRAY–SCOTT (reaction–diffusion) as texture atlas (64 frames, 512x512 POT) ----

func buildGrayScottShader() ShaderPayload {
	cols, rows, frames := 8, 8, 64
	frameW, frameH := 64, 64         // small sim for perf; atlas becomes 512x512 (POT)
	atlasW, atlasH := cols*frameW, rows*frameH
	fps := 24.0

	dataURL := generateGrayScottAtlas(cols, rows, frames, frameW, frameH, 6) // 6 steps/frame

	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime;
	uniform vec2  uRes;
	uniform float uLevel;
	uniform float uBands[4];

	uniform sampler2D uAtlas;
	uniform vec2  uAtlasGrid;     // cols, rows
	uniform float uAtlasFrames;   // total frames
	uniform float uFrame;         // current frame (float index)
	uniform float uAtlasFPS;      // playback rate

	vec2 atlasUV(vec2 uv, float frame, vec2 grid){
		float cols = grid.x, rows = grid.y;
		float idx = mod(frame, cols*rows);
		float c = mod(idx, cols);
		float r = floor(idx / cols);
		return (uv + vec2(c, r)) / vec2(cols, rows);
	}

	void main(){
		vec2 uv = vUV;
		// ping-pong frame slightly with audio energy
		float f = uFrame + uLevel*2.0;
		float g = texture2D(uAtlas, atlasUV(uv, f, uAtlasGrid)).r;

		// colorize RD pattern and react to bands
		float bass = uBands[0], air = uBands[3];
		vec3 col = mix(vec3(0.12,0.85,0.80), vec3(1.0,0.25,0.6), g);
		col *= 0.6 + 1.4*uLevel;
		col += 0.15*air;

		gl_FragColor = vec4(col, 1.0);
	}`
	return ShaderPayload{
		Type: "grayscott", Name: "Gray–Scott Reaction–Diffusion", Code: fs, Complexity: 9, Version: "3.1.0",
		Uniforms: []UniformDef{
			{Name:"uTime",Type:"float"}, {Name:"uRes",Type:"vec2"},
			{Name:"uLevel",Type:"float"}, {Name:"uBands",Type:"float[4]"},
			{Name:"uAtlas",Type:"sampler2D"}, {Name:"uAtlasGrid",Type:"vec2"},
			{Name:"uAtlasFrames",Type:"float"}, {Name:"uFrame",Type:"float"},
			{Name:"uAtlasFPS",Type:"float"},
		},
		Textures: []TextureDef{{
			Name:"uAtlas", DataURL:dataURL, Width:atlasW, Height:atlasH,
			GridCols: cols, GridRows: rows, Frames: frames, FPS: fps,
		}},
	}
}

func generateGrayScottAtlas(cols, rows, frames, w, h, stepsPerFrame int) string {
	atlas := image.NewNRGBA(image.Rect(0,0,cols*w, rows*h))
	// model buffers
	U := make([]float64, w*h)
	V := make([]float64, w*h)
	// init: U=1 everywhere, V=0, with a seed square
	for i := range U { U[i] = 1.0 }
	seed := w/8
	for y:=h/2-seed; y<h/2+seed; y++ {
		for x:=w/2-seed; x<w/2+seed; x++ {
			idx := y*w + x; V[idx] = 1.0; U[idx] = 0.0
		}
	}
	// parameters (nice patterns)
	F, k := 0.0367, 0.0649
	Du, Dv := 0.16, 0.08
	dt := 1.0

	lap := func(buf []float64, x, y int) float64 {
		// 5-point stencil with wrap
		xm := (x-1+w)%w; xp := (x+1)%w
		ym := (y-1+h)%h; yp := (y+1)%h
		return -4*buf[y*w+x] + buf[y*w+xm] + buf[y*w+xp] + buf[ym*w+x] + buf[yp*w+x]
	}

	for f:=0; f<frames; f++ {
		// evolve a few steps
		for s:=0; s<stepsPerFrame; s++ {
			U2 := make([]float64, w*h)
			V2 := make([]float64, w*h)
			for y:=0; y<h; y++ {
				for x:=0; x<w; x++ {
					i := y*w + x
					u := U[i]; v := V[i]
					uvv := u*v*v
					U2[i] = u + (Du*lap(U,x,y) - uvv + F*(1-u))*dt
					V2[i] = v + (Dv*lap(V,x,y) + uvv - (F+k)*v)*dt
					if U2[i] < 0 { U2[i] = 0 }; if U2[i] > 1 { U2[i] = 1 }
					if V2[i] < 0 { V2[i] = 0 }; if V2[i] > 1 { V2[i] = 1 }
				}
			}
			U, V = U2, V2
		}
		// render V to grayscale tile
		col := f%cols; row := f/cols
		for y:=0; y<h; y++ {
			for x:=0; x<w; x++ {
				i := y*w + x
				val := uint8(math.Round(V[i]*255))
				atlas.SetNRGBA(col*w+x, row*h+y, color.NRGBA{val, val, val, 255})
			}
		}
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, atlas)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

// ---- WAVE (cheap analytic wave eq.) atlas 64 frames 512x512 ----

func buildWaveShader() ShaderPayload {
	cols, rows, frames := 8, 8, 64
	w, h := 64, 64
	fps := 24.0
	dataURL := generateWaveAtlas(cols, rows, frames, w, h)
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
		float cols = grid.x, rows = grid.y;
		float idx = mod(frame, cols*rows);
		float c = mod(idx, cols);
		float r = floor(idx / cols);
		return (uv + vec2(c, r)) / vec2(cols, rows);
	}

	void main(){
		float f = uFrame;
		float g = texture2D(uAtlas, atlasUV(vUV, f, uAtlasGrid)).r;
		float energy = 0.6 + 1.6*uLevel;
		vec3 base = mix(vec3(0.10,0.85,0.95), vec3(0.95,0.25,0.6), g);
		gl_FragColor = vec4(base * energy, 1.0);
	}`
	atW, atH := cols*w, rows*h
	return ShaderPayload{
		Type: "waves", Name: "Interference Waves", Code: fs, Complexity: 6, Version: "3.1.0",
		Uniforms: []UniformDef{
			{Name:"uTime",Type:"float"}, {Name:"uLevel",Type:"float"}, {Name:"uBands",Type:"float[4]"},
			{Name:"uAtlas",Type:"sampler2D"}, {Name:"uAtlasGrid",Type:"vec2"}, {Name:"uAtlasFrames",Type:"float"},
			{Name:"uFrame",Type:"float"}, {Name:"uAtlasFPS",Type:"float"},
		},
		Textures: []TextureDef{{
			Name:"uAtlas", DataURL:dataURL, Width:atW, Height:atH, GridCols:cols, GridRows:rows, Frames:frames, FPS:fps,
		}},
	}
}

func generateWaveAtlas(cols, rows, frames, w, h int) string {
	atlas := image.NewNRGBA(image.Rect(0,0,cols*w, rows*h))
	for f:=0; f<frames; f++ {
		phase := float64(f) / float64(frames) * 2 * math.Pi
		c := f%cols; r := f/cols
		for y:=0; y<h; y++ {
			for x:=0; x<w; x++ {
				u := float64(x)/float64(w)
				v := float64(y)/float64(h)
				// two moving wave sources
				sx1, sy1 := 0.3 + 0.2*math.Sin(phase*0.9), 0.5 + 0.25*math.Cos(phase*0.8)
				sx2, sy2 := 0.7 + 0.2*math.Cos(phase*1.1), 0.5 + 0.25*math.Sin(phase*1.0)
				d1 := math.Hypot(u-sx1, v-sy1)
				d2 := math.Hypot(u-sx2, v-sy2)
				w1 := math.Sin(18*d1 - phase*4)
				w2 := math.Sin(18*d2 + phase*3.5)
				val := (w1 + w2)*0.5*0.5 + 0.5 // scale & bias
				if val < 0 { val = 0 } ; if val > 1 { val = 1 }
				gray := uint8(math.Round(val*255))
				atlas.SetNRGBA(c*w+x, r*h+y, color.NRGBA{gray,gray,gray,255})
			}
		}
	}
	var buf bytes.Buffer; _ = png.Encode(&buf, atlas)
	return "data:image/png;base64,"+base64.StdEncoding.EncodeToString(buf.Bytes())
}

// ---------------- END BACKEND ----------------
