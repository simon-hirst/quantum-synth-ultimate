package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	"sync"
	"strings"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type ShaderParams struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Type string `json:"type"`
}

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
	
	shaderTemplates = []string{
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 0.5;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec3 color = vec3(0.0);
			color.r = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
			color.g = cos(uv.y * 8.0 + time) * 0.5 + 0.5;
			color.b = sin((uv.x + uv.y) * 5.0 + time) * 0.5 + 0.5;
			
			color *= intensity * 2.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 0.8;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec2 center = vec2(0.5);
			float dist = distance(uv, center);
			float circle = smoothstep(0.2, 0.19, dist);
			
			vec3 color = vec3(0.0);
			color.r = sin(time + dist * 10.0) * 0.5 + 0.5;
			color.g = cos(time + dist * 8.0) * 0.5 + 0.5;
			color.b = sin(time * 0.5 + dist * 12.0) * 0.5 + 0.5;
			
			color *= circle * intensity * 3.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 1.2;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec3 color = vec3(0.0);
			for (int i = 0; i < 5; i++) {
				float fi = float(i);
				vec2 position = vec2(0.5 + sin(time * 0.5 + fi * 1.2) * 0.3, 
									 0.5 + cos(time * 0.7 + fi * 1.5) * 0.3);
				float dist = distance(uv, position);
				float size = 0.1 + fi * 0.05;
				float glow = exp(-dist * 20.0 / (size * 10.0));
				
				color.r += glow * sin(time + fi * 2.0) * 0.5 + 0.5;
				color.g += glow * cos(time + fi * 2.5) * 0.5 + 0.5;
				color.b += glow * sin(time * 1.5 + fi * 3.0) * 0.5 + 0.5;
			}
			
			color = clamp(color, 0.0, 1.0);
			color *= intensity * 2.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
	}
	
	shaderNames = []string{
		"Quantum Waves",
		"Resonance Circles",
		"Neural Particles",
		"Temporal Fields",
		"Synth Grid",
		"Holographic Matrix",
		"Fractal Dimensions",
		"Energy Vortex",
		"Digital Rain",
		"Cosmic Strings",
	}
)

func main() {
	rand.Seed(time.Now().UnixNano())
	
	router := mux.NewRouter()
	
	// API endpoints
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET")
	router.HandleFunc("/api/shader/current", getCurrentShader).Methods("GET")
	router.HandleFunc("/api/health", healthCheck).Methods("GET")
	
	// WebSocket endpoint for real-time updates
	router.HandleFunc("/ws", handleWebSocket)
	
	// Serve frontend
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend/dist/")))
	
	fmt.Println("QuantumSynth Infinite server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, methods, origins)(router)))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()
	
	clientsMu.Lock()
	clients[conn] = true
	clientsMu.Unlock()
	
	log.Printf("Client connected: %s", conn.RemoteAddr())
	
	// Send initial shader
	shader := generateRandomShader()
	if err := conn.WriteJSON(shader); err != nil {
		log.Printf("WebSocket write failed: %v", err)
		return
	}
	
	for {
		// Read message from client
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		
		var msg map[string]interface{}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}
		
		if msg["type"] == "request_shader" {
			// Send new shader
			shader := generateRandomShader()
			if err := conn.WriteJSON(shader); err != nil {
				log.Printf("WebSocket write failed: %v", err)
				break
			}
		}
	}
	
	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	
	log.Printf("Client disconnected: %s", conn.RemoteAddr())
}

func generateRandomShader() ShaderParams {
	// Select a random template
	templateIndex := rand.Intn(len(shaderTemplates))
	shaderCode := shaderTemplates[templateIndex]
	
	// Select a random name
	nameIndex := rand.Intn(len(shaderNames))
	shaderName := shaderNames[nameIndex]
	
	// Add variations to the shader
	shaderCode = modifyShader(shaderCode)
	
	return ShaderParams{
		Code: shaderCode,
		Name: shaderName,
		Type: "shader",
	}
}

func modifyShader(shader string) string {
	// Simple modifications to create variations
	modifications := []func(string) string{
		func(s string) string { return strings.Replace(s, "0.5", fmt.Sprintf("%.2f", 0.3+rand.Float64()*0.4), 2) },
		func(s string) string { return strings.Replace(s, "10.0", fmt.Sprintf("%.1f", 5.0+rand.Float64()*10.0), 1) },
		func(s string) string { return strings.Replace(s, "8.0", fmt.Sprintf("%.1f", 5.0+rand.Float64()*10.0), 1) },
		func(s string) string { return strings.Replace(s, "5.0", fmt.Sprintf("%.1f", 3.0+rand.Float64()*8.0), 1) },
		func(s string) string { return strings.Replace(s, "20.0", fmt.Sprintf("%.1f", 15.0+rand.Float64()*20.0), 1) },
		func(s string) string { return strings.Replace(s, "0.2", fmt.Sprintf("%.2f", 0.1+rand.Float64()*0.3), 1) },
		func(s string) string { return strings.Replace(s, "0.19", fmt.Sprintf("%.2f", 0.15+rand.Float64()*0.1), 1) },
		func(s string) string { return strings.Replace(s, "0.3", fmt.Sprintf("%.2f", 0.2+rand.Float64()*0.3), 1) },
		func(s string) string { return strings.Replace(s, "0.1", fmt.Sprintf("%.2f", 0.05+rand.Float64()*0.2), 1) },
	}
	
	// Apply random modifications
	for i := 0; i < 3+rand.Intn(3); i++ {
		modIndex := rand.Intn(len(modifications))
		shader = modifications[modIndex](shader)
	}
	
	return shader
}

func getNextShader(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"clients":   len(clients),
	})
}

var (
	headers = handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"})
	methods = handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE"})
	origins = handlers.AllowedOrigins([]string{"*"})
)
