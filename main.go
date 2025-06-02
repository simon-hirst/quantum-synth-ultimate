package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	"sync"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type VisualizationParams struct {
	Type       string             `json:"type"`
	Parameters map[string]float64 `json:"parameters"`
	Duration   float64            `json:"duration"`
	ID         string             `json:"id"`
}

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	upgrader  = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true
		},
	}
)

func main() {
	rand.Seed(time.Now().UnixNano())
	
	router := mux.NewRouter()
	
	// API endpoints
	router.HandleFunc("/api/visualization/next", getNextVisualization).Methods("GET")
	router.HandleFunc("/api/visualization/current", getCurrentVisualization).Methods("GET")
	router.HandleFunc("/api/visualization/generate", generateVisualization).Methods("POST")
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
	
	// Send initial visualization
	viz := generateRandomVisualization()
	if err := conn.WriteJSON(viz); err != nil {
		log.Printf("WebSocket write failed: %v", err)
		return
	}
	
	for {
		// Read message from client (just to keep connection alive)
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
		
		// Send new visualization every 10-20 seconds
		time.Sleep(time.Duration(10 + rand.Intn(10)) * time.Second)
		viz := generateRandomVisualization()
		if err := conn.WriteJSON(viz); err != nil {
			log.Printf("WebSocket write failed: %v", err)
			break
		}
	}
	
	clientsMu.Lock()
	delete(clients, conn)
	clientsMu.Unlock()
	
	log.Printf("Client disconnected: %s", conn.RemoteAddr())
}

func generateRandomVisualization() VisualizationParams {
	vizTypes := []string{"quantum", "neural", "temporal"}
	randomType := vizTypes[rand.Intn(len(vizTypes))]
	
	var params map[string]float64
	
	switch randomType {
	case "quantum":
		params = map[string]float64{
			"rotation":     rand.Float64() * 2.0,
			"particleSize": 2.0 + rand.Float64()*4.0,
			"waveHeight":   150.0 + rand.Float64()*150.0,
			"colorPalette": float64(rand.Intn(5)),
			"symmetry":     float64(rand.Intn(3)),
			"complexity":   0.5 + rand.Float64()*0.5,
		}
	case "neural":
		params = map[string]float64{
			"particleCount":       80.0 + rand.Float64()*80.0,
			"connectionThreshold": 0.2 + rand.Float64()*0.4,
			"maxDistance":         120.0 + rand.Float64()*100.0,
			"particleSize":        2.0 + rand.Float64()*4.0,
			"colorPalette":        float64(rand.Intn(5)),
			"symmetry":            float64(rand.Intn(3)),
			"complexity":          0.5 + rand.Float64()*0.5,
		}
	case "temporal":
		params = map[string]float64{
			"waveWidth":   0.5 + rand.Float64()*2.0,
			"waveHeight":  150.0 + rand.Float64()*150.0,
			"fillOpacity": 0.1 + rand.Float64()*0.3,
			"colorPalette": float64(rand.Intn(5)),
			"symmetry":     float64(rand.Intn(3)),
			"complexity":   0.5 + rand.Float64()*0.5,
		}
	}
	
	return VisualizationParams{
		Type:       randomType,
		Parameters: params,
		Duration:   15 + rand.Float64()*15,
		ID:         fmt.Sprintf("%d", rand.Intn(1000)),
	}
}

func getNextVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	viz := generateRandomVisualization()
	json.NewEncoder(w).Encode(viz)
}

func getCurrentVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	viz := generateRandomVisualization()
	json.NewEncoder(w).Encode(viz)
}

func generateVisualization(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	viz := generateRandomVisualization()
	if req.Type != "" {
		viz.Type = req.Type
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(viz)
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
