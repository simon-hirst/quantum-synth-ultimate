package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// ShaderParams represents the parameters for a shader
type ShaderParams struct {
	Type       string `json:"type"`
	Name       string `json:"name"`
	Code       string `json:"code"`
	Complexity int    `json:"complexity"`
}

func main() {
	rand.Seed(time.Now().UnixNano())

	// Get port from environment variable or use default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := mux.NewRouter()

	// API endpoints
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/shader/current", getCurrentShader).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/health", healthCheck).Methods("GET", "OPTIONS")

	// Serve frontend
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend/dist/")))

	// Configure CORS
	corsMiddleware := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization", "X-Requested-With"}),
		handlers.AllowCredentials(),
	)

	fmt.Printf("QuantumSynth Infinite server starting on :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, corsMiddleware(router)))
}

// Add OPTIONS handler for preflight requests
func optionsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.WriteHeader(http.StatusOK)
}

func getNextShader(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS preflight
	if r.Method == "OPTIONS" {
		optionsHandler(w, r)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS preflight
	if r.Method == "OPTIONS" {
		optionsHandler(w, r)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	// Handle OPTIONS preflight
	if r.Method == "OPTIONS" {
		optionsHandler(w, r)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"version":   "2.2.1",
	})
}

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
