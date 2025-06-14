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
)

//go:embed frontend/dist/* frontend/dist/**/*
// Note: if dist isn't present at build time, static serving will just fall back to disk path.
var distFS embed.FS

// ShaderParams represents the parameters for a shader
type ShaderParams struct {
	Type       string `json:"type"`
	Name       string `json:"name"`
	Code       string `json:"code"`
	Complexity int    `json:"complexity"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Config
	port := getenvDefault("PORT", "8080")
	staticDir := getenvDefault("STATIC_DIR", "./frontend/dist")
	version := getenvDefault("APP_VERSION", "2.2.2")
	allowedOrigins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")) // comma-separated or "*" or empty

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/shader/current", getCurrentShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]any{
			"status":    "healthy",
			"timestamp": time.Now(),
			"version":   version,
		})
	}).Methods("GET", "OPTIONS")

	// Static files / SPA fallback
	router.PathPrefix("/").Handler(spaHandler(staticDir, "index.html"))

	// CORS setup
	corsOpts := []handlers.CORSOption{
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Requested-With"}),
	}
	if allowedOrigins == "" {
		corsOpts = append(corsOpts, handlers.AllowedOrigins([]string{"*"}))
	} else {
		parts := strings.Split(allowedOrigins, ",")
		for i := range parts {
			parts[i] = strings.TrimSpace(parts[i])
		}
		corsOpts = append(corsOpts, handlers.AllowedOrigins(parts))
		// Only allow credentials if NOT wildcard
		if !(len(parts) == 1 && parts[0] == "*") {
			corsOpts = append(corsOpts, handlers.AllowCredentials())
		}
	}
	corsMiddleware := handlers.CORS(corsOpts...)

	// HTTP server with sane timeouts
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

// ---------- Handlers ----------

func getNextShader(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, generateRandomShader())
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, generateRandomShader())
}

// ----------- Helpers -----------

func respondJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	// Cache rules here if needed:
	// w.Header().Set("Cache-Control", "no-store")
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

// spaHandler serves static files from disk if present; otherwise falls back to embedded distFS.
// Any non-existent path falls back to index.html (for SPA routes).
func spaHandler(staticDir, index string) http.Handler {
	// Prefer disk (live dev), else embedded FS (if embedded at build time).
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
		// Try disk first
		if f, err := tryDisk(path); err == nil {
			_ = f.Close()
			http.ServeFile(w, r, filepath.Join(staticDir, path))
			return
		}
		// Try embedded
		if f, err := distFS.Open("frontend/dist/" + path); err == nil {
			_ = f.Close()
			http.FileServer(http.FS(distFS)).ServeHTTP(w, r)
			return
		}
		// Fallback to index.html
		// Disk first
		if f, err := tryDisk(index); err == nil {
			_ = f.Close()
			http.ServeFile(w, r, filepath.Join(staticDir, index))
			return
		}
		// Embedded fallback
		http.ServeFileFS(w, r, distFS, "frontend/dist/"+index)
	})
}

// ---- Shader generation (current JSON contract) ----

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
