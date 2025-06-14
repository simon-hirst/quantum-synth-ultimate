package main

import (
	"embed"
	"encoding/json"
	"fmt"
	"log"
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

type ShaderParams struct {
	Type       string `json:"type"`
	Name       string `json:"name"`
	Code       string `json:"code"`
	Complexity int    `json:"complexity"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	port := getenvDefault("PORT", "8080")
	staticDir := getenvDefault("STATIC_DIR", "./frontend/dist")
	version := getenvDefault("APP_VERSION", "2.2.3")
	allowedOriginsEnv := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")) // "*" or CSV list

	// Router
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

	// WebSocket
	upgrader := websocket.Upgrader{
		// CORS-like origin check for WS
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

	// CORS for HTTP endpoints
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

func wsHandler(upgrader websocket.Upgrader) http.HandlerFunc {
	type hello struct {
		Type       string `json:"type"`
		Message    string `json:"message"`
		ServerTime string `json:"serverTime"`
	}
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("ws upgrade error: %v", err)
			return
		}
		defer c.Close()

		// Basic ping/pong & read deadlines
		c.SetReadLimit(1 << 20)
		_ = c.SetReadDeadline(time.Now().Add(60 * time.Second))
		c.SetPongHandler(func(appData string) error {
			_ = c.SetReadDeadline(time.Now().Add(60 * time.Second))
			return nil
		})

		// Initial hello
		_ = c.WriteJSON(hello{
			Type:       "hello",
			Message:    "connected",
			ServerTime: time.Now().Format(time.RFC3339),
		})

		// Ping ticker
		ping := time.NewTicker(25 * time.Second)
		defer ping.Stop()

		// Reader loop
		errCh := make(chan error, 1)
		go func() {
			for {
				mt, msg, err := c.ReadMessage()
				if err != nil {
					errCh <- err
					return
				}
				if mt == websocket.CloseMessage {
					errCh <- nil
					return
				}
				// Echo with server time
				resp := map[string]any{
					"type":       "echo",
					"serverTime": time.Now().Format(time.RFC3339),
					"message":    string(msg),
				}
				if e := c.WriteJSON(resp); e != nil {
					errCh <- e
					return
				}
			}
		}()

		for {
			select {
			case <-ping.C:
				_ = c.WriteControl(websocket.PingMessage, []byte("ping"), time.Now().Add(5*time.Second))
			case err := <-errCh:
				if err != nil {
					log.Printf("ws read loop ended: %v", err)
				}
				return
			}
		}
	}
}

// ---------- HTTP handlers ----------

func getNextShader(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, generateRandomShader())
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, generateRandomShader())
}

// ---------- helpers ----------

func respondJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func getenvDefault(k, def string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return def
}

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
		if err == nil {
			return f, nil
		}
		return nil, err
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = index
		}
		if f, err := tryDisk(path); err == nil {
			_ = f.Close()
			http.ServeFile(w, r, filepath.Join(staticDir, path))
			return
		}
		if f, err := distFS.Open("frontend/dist/" + path); err == nil {
			_ = f.Close()
			http.FileServer(http.FS(distFS)).ServeHTTP(w, r)
			return
		}
		if f, err := tryDisk(index); err == nil {
			_ = f.Close()
			http.ServeFile(w, r, filepath.Join(staticDir, index))
			return
		}
		// Last resort: try embedded index
		http.ServeFileFS(w, r, distFS, "frontend/dist/"+index)
	})
}

// ---- Shader generation ----

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
	randomIndex := rand.Intn(len(shaderTypes))
	return ShaderParams{
		Type:       shaderTypes[randomIndex],
		Name:       shaderNames[randomIndex],
		Code:       generateShaderCode(shaderTypes[randomIndex]),
		Complexity: rand.Intn(10) + 1,
	}
}

func generateShaderCode(shaderType string) string {
	baseCode := `
		void main() {
			vec2 uv = gl_FragCoord.xy / iResolution.xy;
			float time = iTime * 0.5;
			vec3 color = vec3(0.0);

			%s

			gl_FragColor = vec4(color, 1.0);
		}
	`
	var effectCode string
	switch shaderType {
	case "quantum":
		effectCode = `
			for (int i = 0; i < 5; i++) {
				float fi = float(i);
				vec2 center = vec2(0.5 + 0.3 * sin(time * 0.5 + fi * 1.2), 0.5 + 0.3 * cos(time * 0.7 + fi * 0.9));
				float dist = length(uv - center);
				float intensity = 0.02 / dist;
				color += intensity * vec3(0.5 + 0.5 * sin(time + fi), 0.5 + 0.5 * cos(time * 1.3 + fi), 0.5 + 0.5 * sin(time * 0.7 + fi));
			}
		`
	case "neural":
		effectCode = `
			for (int i = 0; i < 20; i++) {
				float fi = float(i);
				vec2 pos = vec2(0.5 + 0.4 * sin(time * 0.3 + fi * 0.7), 0.5 + 0.4 * cos(time * 0.5 + fi * 0.4));
				float dist = length(uv - pos);
				float size = 0.01 + 0.005 * sin(time * 2.0 + fi);
				if (dist < size) {
					color += vec3(0.8 + 0.2 * sin(time + fi), 0.4 + 0.2 * cos(time * 1.2 + fi), 0.2 + 0.2 * sin(time * 0.8 + fi));
				}
			}
		`
	case "temporal":
		effectCode = `
			uv = uv * 2.0 - 1.0;
			float angle = atan(uv.y, uv.x);
			float radius = length(uv);

			for (int i = 0; i < 8; i++) {
				float fi = float(i);
				float wave = sin(radius * 20.0 - time * 3.0 + fi * 0.5) * 0.5 + 0.5;
				color += vec3(wave * (0.5 + 0.5 * sin(time + fi)), wave * (0.5 + 0.5 * cos(time * 1.3 + fi)), wave * (0.5 + 0.5 * sin(time * 0.7 + fi))) * 0.2;
			}
		`
	case "fractal":
		effectCode = `
			uv = (uv - 0.5) * 2.0;
			uv.x *= iResolution.x / iResolution.y;

			vec2 c = vec2(0.285 + 0.1 * sin(time * 0.3), 0.01 + 0.1 * cos(time * 0.2));
			vec2 z = uv;

			int iterations = 0;
			for (int i = 0; i < 100; i++) {
				z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
				if (dot(z, z) > 4.0) {
					break;
				}
				iterations++;
			}

			float t = float(iterations) / 100.0;
			color = vec3(0.5 + 0.5 * cos(6.2831 * t + time), 0.5 + 0.5 * cos(6.2831 * t + time + 2.0), 0.5 + 0.5 * cos(6.2831 * t + time + 4.0));
		`
	default:
		effectCode = `
			color = vec3(
				0.5 + 0.5 * sin(uv.x * 10.0 + time),
				0.5 + 0.5 * cos(uv.y * 8.0 + time * 1.3),
				0.5 + 0.5 * sin((uv.x + uv.y) * 5.0 + time * 0.7)
			);
		`
	}
	return fmt.Sprintf(baseCode, effectCode)
}
