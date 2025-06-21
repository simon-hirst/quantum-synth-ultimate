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

// Back-compat structure (still used by frontend if needed)
type ShaderParams struct {
	Type       string `json:"type"`
	Name       string `json:"name"`
	Code       string `json:"code"`
	Complexity int    `json:"complexity"`
}

// New richer schema
type UniformDef struct {
	Name string `json:"name"`
	Type string `json:"type"` // e.g., "float", "vec2", "vec3", "vec4", "sampler2D"
}

type TextureDef struct {
	Name   string `json:"name"`
	DataURL string `json:"dataUrl"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

type ShaderPayload struct {
	Type       string       `json:"type"`
	Name       string       `json:"name"`
	Code       string       `json:"code"` // full fragment shader (expects varying vUV, uniforms below)
	Complexity int          `json:"complexity"`
	Uniforms   []UniformDef `json:"uniforms,omitempty"`
	Textures   []TextureDef `json:"textures,omitempty"`
	Version    string       `json:"version"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	port := getenvDefault("PORT", "8080")
	staticDir := getenvDefault("STATIC_DIR", "./frontend/dist")
	version := getenvDefault("APP_VERSION", "3.0.0")
	allowedOriginsEnv := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))

	router := mux.NewRouter()

	// API
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/shader/current", getCurrentShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]any{
			"status":    "healthy",
			"timestamp": time.Now(),
			"version":   version,
		})
	}).Methods("GET", "OPTIONS")

	// WebSocket (/ws) – already present in previous patch
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			if allowedOriginsEnv == "" || allowedOriginsEnv == "*" {
				return true
			}
			origin := r.Header.Get("Origin")
			if origin == "" {
				return true
			}
			for _, o := range strings.Split(allowedOriginsEnv, ",") {
				o = strings.TrimSpace(o)
				if strings.EqualFold(o, origin) {
					return true
				}
			}
			return false
		},
	}
	router.HandleFunc("/ws", wsHandler(upgrader)).Methods("GET")

	// Static / SPA
	router.PathPrefix("/").Handler(spaHandler(staticDir, "index.html"))

	// CORS
	corsOpts := []handlers.CORSOption{
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Requested-With"}),
	}
	if allowedOriginsEnv == "" {
		corsOpts = append(corsOpts, handlers.AllowedOrigins([]string{"*"}))
	} else {
		parts := strings.Split(allowedOriginsEnv, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		corsOpts = append(corsOpts, handlers.AllowedOrigins(parts))
		if !(len(parts) == 1 && parts[0] == "*") {
			corsOpts = append(corsOpts, handlers.AllowCredentials())
		}
	}
	corsMiddleware := handlers.CORS(corsOpts...)

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           corsMiddleware(loggingMiddleware(router)),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	log.Printf("QuantumSynth Infinite server starting on :%s", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

// ----- WS -----
func wsHandler(upgrader websocket.Upgrader) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer c.Close()
		type hello struct {
			Type       string `json:"type"`
			Message    string `json:"message"`
			ServerTime string `json:"serverTime"`
		}
		_ = c.WriteJSON(hello{Type: "hello", Message: "connected", ServerTime: time.Now().Format(time.RFC3339)})

		c.SetReadLimit(1 << 20)
		_ = c.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.SetPongHandler(func(appData string) error {
			_ = c.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		ping := time.NewTicker(25 * time.Second)
		defer ping.Stop()

		for {
			select {
			case <-ping.C:
				_ = c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
			default:
				mt, msg, err := c.ReadMessage()
				if err != nil {
					return
				}
				if mt == websocket.CloseMessage {
					return
				}
				_ = c.WriteJSON(map[string]any{
					"type":       "echo",
					"serverTime": time.Now().Format(time.RFC3339),
					"message":    string(msg),
				})
			}
		}
	}
}

// ----- HTTP helpers -----
func respondJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}
func getenvDefault(k, def string) string { if v := strings.TrimSpace(os.Getenv(k)); v != "" { return v }; return def }
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s (%s)", r.Method, r.URL.Path, time.Since(start))
	})
}
func spaHandler(staticDir, index string) http.Handler {
	tryDisk := func(p string) (http.File, error) {
		f, err := os.Open(filepath.Join(staticDir, p))
		if err == nil { return f, nil }
		return nil, err
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" { path = index }
		if f, err := tryDisk(path); err == nil { _ = f.Close(); http.ServeFile(w, r, filepath.Join(staticDir, path)); return }
		if f, err := distFS.Open("frontend/dist/" + path); err == nil { _ = f.Close(); http.FileServer(http.FS(distFS)).ServeHTTP(w, r); return }
		if f, err := tryDisk(index); err == nil { _ = f.Close(); http.ServeFile(w, r, filepath.Join(staticDir, index)); return }
		http.ServeFileFS(w, r, distFS, "frontend/dist/"+index)
	})
}

// ====== API handlers returning server-provided shaders ======

func getNextShader(w http.ResponseWriter, r *http.Request) {
	payload := buildPhysicsShader()
	respondJSON(w, http.StatusOK, payload)
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	payload := buildPhysicsShader()
	respondJSON(w, http.StatusOK, payload)
}

// buildPhysicsShader returns a fragment shader + uniforms + an encoded flow-field texture.
// The goal is to offload heavier precomputation (flow field) to backend, while keeping
// the fragment fast enough on client.
func buildPhysicsShader() ShaderPayload {
	// Generate a 256x256 vector field texture (swirly flow)
	w, h := 256, 256
	dataURL := generateFlowTextureDataURL(w, h, time.Now().UnixNano())

	fs := `
	precision mediump float;
	varying vec2 vUV;
	uniform float uTime;
	uniform vec2  uRes;
	uniform float uLevel;
	uniform float uBands[4];
	uniform sampler2D uFlowTex;

	vec2 flow(vec2 uv){
		// flow encoded as RG in [0,1]; remap to [-1,1]
		vec2 f = texture2D(uFlowTex, uv).rg * 2.0 - 1.0;
		// smooth & scale
		return f * (0.5 + 1.5*uLevel);
	}

	void main(){
		vec2 uv = vUV;
		float t = uTime * 0.35;

		// sample flow with time-varying offset
		vec2 f1 = flow(fract(uv + vec2( t*0.05, -t*0.03 )));
		vec2 f2 = flow(fract(uv + vec2(-t*0.04,  t*0.06 )));

		// advect position by combined flow, modulated by bands
		float bandMix = uBands[0]*0.5 + uBands[2]*0.5;
		vec2 p = uv + (f1 + f2) * (0.10 + 0.25*bandMix);

		// interference patterns
		float k1 = sin((p.x + p.y)*18.0 - t*3.0 + uBands[1]*6.0)*0.5 + 0.5;
		float k2 = cos((p.x*1.2 - p.y*0.9)*22.0 + t*2.2 + uBands[3]*8.0)*0.5 + 0.5;

		vec3 base = vec3(
			0.4 + 0.6*sin(t + k1*6.2831 + 0.0),
			0.4 + 0.6*sin(t + k2*6.2831 + 2.1),
			0.4 + 0.6*sin(t + (k1+k2)*3.1415 + 4.2)
		);

		// subtle highlight by local flow magnitude
		float mag = length(f1+f2);
		vec3 col = base + mag*vec3(0.2,0.15,0.05);

		gl_FragColor = vec4(col, 1.0);
	}
	`

	return ShaderPayload{
		Type:       "physics-flow",
		Name:       "Quantum Flowfield",
		Code:       fs,
		Complexity: 7,
		Uniforms: []UniformDef{
			{Name: "uTime", Type: "float"},
			{Name: "uRes", Type: "vec2"},
			{Name: "uLevel", Type: "float"},
			{Name: "uBands", Type: "float[4]"},
			{Name: "uFlowTex", Type: "sampler2D"},
		},
		Textures: []TextureDef{
			{Name: "uFlowTex", DataURL: dataURL, Width: w, Height: h},
		},
		Version: "3.0.0",
	}
}

// generateFlowTextureDataURL makes a PNG data URL encoding a smooth vector field in RG.
func generateFlowTextureDataURL(w, h int, seed int64) string {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	// simple tiling, swirly field from summed sines with random phases
	r := rand.New(rand.NewSource(seed))
	phiX := r.Float64() * 2 * math.Pi
	phiY := r.Float64() * 2 * math.Pi
	freq := 3.0 + r.Float64()*4.0 // 3..7 waves across

	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			fx := 2*math.Pi*float64(x)/float64(w)
			fy := 2*math.Pi*float64(y)/float64(h)

			// vector components
			vx := math.Sin(freq*fx+phiX)*math.Cos(freq*fy-phiY) +
				0.5*math.Sin((freq*0.6)*fy+phiY)*math.Cos((freq*0.6)*fx-phiX)
			vy := -math.Cos(freq*fx+phiX)*math.Sin(freq*fy-phiY) +
				0.5*math.Cos((freq*0.6)*fy+phiY)*math.Sin((freq*0.6)*fx-phiX)

			// normalize to [-1,1] then map to [0,255]
			// scale down to keep field smooth
			scale := 0.5
			vx *= scale
			vy *= scale

			R := uint8(math.Round((vx*0.5+0.5)*255.0))
			G := uint8(math.Round((vy*0.5+0.5)*255.0))
			B := uint8(0)
			A := uint8(255)
			img.SetNRGBA(x, y, color.NRGBA{R, G, B, A})
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return ""
	}
	return "data:image/png;base64," + base64.StdEncoding.EncodeToString(buf.Bytes())
}

// ====== Legacy helpers retained for reference / potential fallback ======
func generateRandomShader() ShaderParams {
	shaderTypes := []string{"quantum", "neural", "temporal", "fractal", "harmonic", "resonance"}
	shaderNames := []string{
		"Quantum Resonance",
		"Neural Particles",
		"Temporal Waveforms",
		"Fractal Dimensions",
		"Harmonic Oscillations",
		"Resonance Fields",
	}
	i := rand.Intn(len(shaderTypes))
	return ShaderParams{
		Type:       shaderTypes[i],
		Name:       shaderNames[i],
		Code:       "/* deprecated path */",
		Complexity: rand.Intn(10) + 1,
	}
}
