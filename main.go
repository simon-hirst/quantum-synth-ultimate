//go:build !js

package main

import (
	"bytes"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type ShaderParams struct {
	Type       string        `json:"type"`
	Name       string        `json:"name"`
	Code       string        `json:"code"`
	Complexity int           `json:"complexity"`
	Version    string        `json:"version"`
	Uniforms   []UniformMeta `json:"uniforms,omitempty"`
	Textures   []TextureMeta `json:"textures,omitempty"`
}

type UniformMeta struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

type TextureMeta struct {
	Name     string `json:"name"`
	DataURL  string `json:"dataUrl"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	GridCols int    `json:"gridCols,omitempty"`
	GridRows int    `json:"gridRows,omitempty"`
	Frames   int    `json:"frames,omitempty"`
	FPS      int    `json:"fps,omitempty"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := mux.NewRouter()

	// API
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/shader/current", getNextShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/health", healthCheck).Methods("GET", "OPTIONS")
	router.HandleFunc("/ws", wsHandler).Methods("GET")

	// Serve frontend
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend/dist/")))

	// CORS
	corsMiddleware := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Requested-With"}),
		handlers.AllowCredentials(),
	)

	fmt.Printf("QuantumSynth Infinite server starting on :%s\n", port)
	// performance-wrapped server with gzip, caching, and timeouts
	handler := WrapPerf(router, corsMiddleware)
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	log.Fatal(server.ListenAndServe())
}

func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.WriteHeader(http.StatusOK)
}

func jsonOK(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

func getNextShader(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		optionsHandler(w, r)
		return
	}

	// Build textures
	flowW, flowH := 256, 256
	flowTex := makeFlowField(flowW, flowH) // RG = flow vec mapped to [0..1], B=mag
	flowURL := encodePNGDataURL(flowTex)

	// RD atlas (Gray–Scott)
	frames, fps := 16, 24
	gridCols, gridRows := 4, 4
	atlas, aw, ah := makeRDAtlas(256, 256, frames, gridCols, gridRows)
	rdURL := encodePNGDataURL(atlas)

	// Composite fragment shader that consumes uFlowTex, uRDAtlas, uStreamTex (+ audio uniforms)
	fs := serverCompositeFS()

	payload := ShaderParams{
		Type:       "composite",
		Name:       "Flow+RD Composite",
		Code:       fs,
		Complexity: 8,
		Version:    "2.3.0",
		Uniforms: []UniformMeta{
			{Name: "uTime", Type: "float"}, {Name: "uRes", Type: "vec2"},
			{Name: "uLevel", Type: "float"}, {Name: "uBands", Type: "vec3"},
			{Name: "uPulse", Type: "float"}, {Name: "uBeat", Type: "float"},
			{Name: "uImpact", Type: "float"},
			{Name: "uFlowTex", Type: "sampler2D"},
			{Name: "uRDAtlas", Type: "sampler2D"},
			{Name: "uStreamTex", Type: "sampler2D"},
			{Name: "uAtlasGrid", Type: "vec2"},
			{Name: "uAtlasFrames", Type: "float"},
			{Name: "uAtlasFPS", Type: "float"},
			{Name: "uFrame", Type: "float"},
		},
		Textures: []TextureMeta{
			{Name: "uFlowTex", DataURL: flowURL, Width: flowW, Height: flowH},
			{Name: "uRDAtlas", DataURL: rdURL, Width: aw, Height: ah, GridCols: gridCols, GridRows: gridRows, Frames: frames, FPS: fps},
		},
	}

	jsonOK(w)
	_ = json.NewEncoder(w).Encode(payload)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		optionsHandler(w, r)
		return
	}
	jsonOK(w)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "2.3.0",
	})
}

/* ───────────────────────────── WebSocket stream ───────────────────────────── */

var upgrader = websocket.Upgrader{
	ReadBufferSize: 1024, WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool { return true }, // ACA ingress handles fronting
}

type subMsg struct {
	Type  string `json:"type"`
	Field string `json:"field"`
	W     int    `json:"w"`
	H     int    `json:"h"`
	FPS   int    `json:"fps"`
}

func wsHandler(w http.ResponseWriter, r *http.Request) {
	c, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade:", err)
		return
	}
	defer c.Close()

	var wdt, hgt, fps int = 256, 256, 24

	// read one subscribe message optionally
	c.SetReadLimit(1 << 20)
	c.SetReadDeadline(time.Now().Add(10 * time.Second))
	_, data, err := c.ReadMessage()
	if err == nil {
		var m subMsg
		if json.Unmarshal(data, &m) == nil && m.Type == "subscribe" {
			if m.W > 0 {
				wdt = m.W
			}
			if m.H > 0 {
				hgt = m.H
			}
			if m.FPS > 0 {
				fps = m.FPS
			}
		}
	}
	_ = c.SetReadDeadline(time.Time{}) // no further reads required

	// start wave simulation streamer
	stop := make(chan struct{})
	go streamWaves(c, wdt, hgt, fps, stop)

	// keep the connection alive with pings
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			if err := c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second)); err != nil {
				close(stop)
				return
			}
		}
	}
}

func streamWaves(conn *websocket.Conn, w, h, fps int, stop chan struct{}) {
	// simple 2D wave equation with occasional impulses
	if w < 16 {
		w = 16
	}
	if h < 16 {
		h = 16
	}
	if fps < 6 {
		fps = 6
	}
	dt := 1.0 / float64(fps)
	c2 := 0.25
	alpha := 0.001 // damping

	N := w * h
	uPrev := make([]float64, N)
	u := make([]float64, N)
	uNext := make([]float64, N)

	// initial ripples
	for i := 0; i < 6; i++ {
		x := rand.Intn(w)
		y := rand.Intn(h)
		u[y*w+x] = 1.0
	}

	ticker := time.NewTicker(time.Duration(float64(time.Second) * dt))
	defer ticker.Stop()

	header := func() []byte {
		buf := &bytes.Buffer{}
		buf.WriteString("FRAMEv1") // 7 bytes
		buf.WriteByte(0x00)        // pad to 8
		_ = binary.Write(buf, binary.LittleEndian, uint32(w))
		_ = binary.Write(buf, binary.LittleEndian, uint32(h))
		_ = binary.Write(buf, binary.LittleEndian, uint32(4)) // RGBA
		return buf.Bytes()
	}()

	px := make([]byte, w*h*4)

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			// random impulses
			if rand.Float64() < 0.12 {
				x := rand.Intn(w)
				y := rand.Intn(h)
				u[y*w+x] += 1.0 + 1.0*rand.Float64()
			}

			// update wave: uNext = 2u - uPrev + c^2 * lap(u) - alpha * u
			for y := 1; y < h-1; y++ {
				for x := 1; x < w-1; x++ {
					i := y*w + x
					uxx := u[i-1] - 2*u[i] + u[i+1]
					uyy := u[i-w] - 2*u[i] + u[i+w]
					uNext[i] = 2*u[i] - uPrev[i] + c2*(uxx+uyy) - alpha*u[i]
				}
			}
			// rotate buffers
			uPrev, u, uNext = u, uNext, uPrev

			// normalize and pack to RGBA
			var minV, maxV float64 = 9e9, -9e9
			for i := 0; i < N; i++ {
				if u[i] < minV {
					minV = u[i]
				}
				if u[i] > maxV {
					maxV = u[i]
				}
			}
			scale := 1.0
			if maxV-minV > 1e-6 {
				scale = 1.0 / (maxV - minV)
			}
			for i := 0; i < N; i++ {
				v := (u[i] - minV) * scale
				if v < 0 {
					v = 0
				}
				if v > 1 {
					v = 1
				}
				b := byte(v*255 + 0.5)
				j := i * 4
				px[j+0] = b
				px[j+1] = b
				px[j+2] = b
				px[j+3] = 255
			}

			// write frame
			out := make([]byte, len(header)+len(px))
			copy(out, header)
			copy(out[len(header):], px)
			if err := conn.WriteMessage(websocket.BinaryMessage, out); err != nil {
				return
			}
		}
	}
}

/* ───────────────────────────── Flow field texture ─────────────────────────── */

func makeFlowField(w, h int) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	cx := float64(w) * 0.5
	cy := float64(h) * 0.5
	rmax := math.Hypot(cx, cy)

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			px := float64(x) - cx
			py := float64(y) - cy
			r := math.Hypot(px, py) / rmax
			_ = r
			ang := math.Atan2(py, px)
			// swirl + orbital flow with mild noise
			spin := 1.2 + 0.8*math.Sin(2.0*ang)
			vx := -py / rmax * spin
			vy := px / rmax * spin
			// radial push on bass
			vx += 0.15 * px / rmax
			vy += 0.15 * py / rmax
			mag := math.Min(1.0, math.Hypot(vx, vy)*1.2)

			r8 := byte(((vx*0.5 + 0.5) * 255.0) + 0.5) // map [-1,1] -> [0,1]
			g8 := byte(((vy*0.5 + 0.5) * 255.0) + 0.5)
			b8 := byte(mag*255.0 + 0.5)

			i := y*img.Stride + x*4
			img.Pix[i+0] = r8
			img.Pix[i+1] = g8
			img.Pix[i+2] = b8
			img.Pix[i+3] = 255
		}
	}
	return img
}

/* ───────────────────────────── Gray–Scott RD atlas ────────────────────────── */

type rdField struct {
	u []float64
	v []float64
	w int
	h int
}

func newRD(w, h int) *rdField {
	f := &rdField{
		u: make([]float64, w*h),
		v: make([]float64, w*h),
		w: w, h: h,
	}
	for i := 0; i < w*h; i++ {
		f.u[i] = 1.0
		f.v[i] = 0.0
	}
	// seeds
	for n := 0; n < 6; n++ {
		cx := rand.Intn(w)
		cy := rand.Intn(h)
		for y := -6; y <= 6; y++ {
			for x := -6; x <= 6; x++ {
				ix := cx + x
				iy := cy + y
				if ix >= 0 && ix < w && iy >= 0 && iy < h {
					i := iy*w + ix
					f.v[i] = 1.0
				}
			}
		}
	}
	return f
}

func (f *rdField) step(Du, Dv, feed, kill, dt float64) {
	w, h := f.w, f.h
	u2 := make([]float64, w*h)
	v2 := make([]float64, w*h)
	for y := 1; y < h-1; y++ {
		for x := 1; x < w-1; x++ {
			i := y*w + x
			u := f.u[i]
			v := f.v[i]
			uvv := u * v * v
			// Laplacian 5-point
			lapU := f.u[i-1] + f.u[i+1] + f.u[i-w] + f.u[i+w] - 4*u
			lapV := f.v[i-1] + f.v[i+1] + f.v[i-w] + f.v[i+w] - 4*v
			u2[i] = u + (Du*lapU-uvv+feed*(1.0-u))*dt
			v2[i] = v + (Dv*lapV+uvv-(kill+feed)*v)*dt
			if u2[i] < 0 {
				u2[i] = 0
			}
			if v2[i] < 0 {
				v2[i] = 0
			}
			if u2[i] > 1 {
				u2[i] = 1
			}
			if v2[i] > 1 {
				v2[i] = 1
			}
		}
	}
	f.u, f.v = u2, v2
}

func makeRDAtlas(w, h, frames, cols, rows int) (*image.NRGBA, int, int) {
	if cols*rows < frames {
		cols = int(math.Ceil(math.Sqrt(float64(frames))))
		rows = cols
	}
	cellW, cellH := w, h
	aw, ah := cols*cellW, rows*cellH
	atlas := image.NewNRGBA(image.Rect(0, 0, aw, ah))

	// Tuned params (classic "coral" / "mixed")
	Du, Dv := 0.16, 0.08
	feed, kill := 0.060, 0.062
	dt := 1.0

	f := newRD(w, h)
	totalSteps := 1200
	captureEvery := totalSteps / frames
	if captureEvery < 10 {
		captureEvery = 10
	}

	frame := 0
	for step := 0; step < totalSteps && frame < frames; step++ {
		f.step(Du, Dv, feed, kill, dt)
		if step%captureEvery == 0 {
			// render V as luminance with soft palette
			img := image.NewNRGBA(image.Rect(0, 0, w, h))
			for y := 0; y < h; y++ {
				for x := 0; x < w; x++ {
					i := y*w + x
					v := f.v[i]
					// simple palette
					r := uint8(255 * math.Min(1, math.Max(0, 0.5+0.8*v)))
					g := uint8(255 * math.Min(1, math.Max(0, 0.35+0.9*v)))
					b := uint8(255 * math.Min(1, math.Max(0, 0.4+0.7*v)))
					img.Set(x, y, color.NRGBA{R: r, G: g, B: b, A: 255})
				}
			}
			c := frame % cols
			rw := frame / cols
			dst := image.Rect(c*cellW, rw*cellH, c*cellW+cellW, rw*cellH+cellH)
			draw.Draw(atlas, dst, img, image.Point{}, draw.Src)
			frame++
		}
	}
	return atlas, aw, ah
}

/* ───────────────────────────── Utilities ─────────────────────────────── */

func encodePNGDataURL(img image.Image) string {
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	base := base64.StdEncoding.EncodeToString(buf.Bytes())
	return "data:image/png;base64," + base
}

/* ───────────────────────────── Server shader ─────────────────────────── */

func serverCompositeFS() string {
	return `
precision mediump float;
varying vec2 vUV;

uniform vec2  uRes;
uniform float uTime, uLevel, uBeat, uImpact;
uniform vec3  uBands; // low, mid, air
uniform sampler2D uFlowTex;   // RG = flow vec mapped [0..1], B=mag
uniform sampler2D uRDAtlas;   // sprite atlas
uniform sampler2D uStreamTex; // waves over WS

uniform vec2  uAtlasGrid;   // cols, rows
uniform float uAtlasFrames; // total frames
uniform float uAtlasFPS;    // nominal fps
uniform float uFrame;       // current frame (frontend sets based on time)

vec3 pal(float t){ return 0.5 + 0.5*cos(6.2831*(vec3(0.0,0.33,0.67)+t)); }

vec2 sampleFlow(vec2 uv){
  vec3 f = texture2D(uFlowTex, uv).rgb;
  vec2 v = (f.rg * 2.0 - 1.0);
  return v * (0.06 + 0.38*uBands.x + 0.22*uBeat + 0.30*uLevel);
}

vec2 atlasUV(vec2 uv, float frame){
  float cols = max(1.0, uAtlasGrid.x), rows = max(1.0, uAtlasGrid.y);
  float idx = mod(frame, uAtlasFrames);
  float c = mod(idx, cols);
  float r = floor(idx / cols);
  vec2 cell = (uv + vec2(c, r)) / vec2(cols, rows);
  return cell;
}

void main(){
  vec2 uv = vUV;
  vec2 flow = sampleFlow(uv);

  // advect by flow + tiny curl for motion richness
  float curl = sin((uv.x+uv.y)*18.0 + uTime*2.1) * 0.003;
  vec2 adv = uv + flow + vec2(-flow.y, flow.x) * curl;

  // RD atlas animation
  float f = uFrame;
  vec3 rd = texture2D(uRDAtlas, atlasUV(fract(adv), f)).rgb;

  // Wave stream (server WS)
  vec3 waves = texture2D(uStreamTex, adv*vec2(1.0,1.0)).rgb;

  // Color composition: RD as base, modulated by bands; waves add sparkle/rings
  vec3 base = rd * (0.45 + 1.35*uLevel + 0.60*uBands.y);
  float rings = waves.r;
  vec3 tone = mix(base, base*pal(0.1 + uBands.z*0.3 + uTime*0.05), 0.35 + 0.4*rings);

  // Kick punch & beat flashes
  tone += vec3(0.9,0.5,1.0) * (0.18*uBeat + 0.12*uImpact);

  // Vignette
  vec2 p = uv - 0.5; float r2 = dot(p,p);
  float vig = smoothstep(0.95, 0.2, r2*(1.0 + 0.25*uBands.z));
  vec3 col = tone * vig;

  gl_FragColor = vec4(col, 1.0);
}
`
}
