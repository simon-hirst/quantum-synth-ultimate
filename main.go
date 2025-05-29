package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

type VisualizationParams struct {
	Type       string            `json:"type"`
	Parameters map[string]float64 `json:"parameters"`
	Duration   int               `json:"duration"` // Duration in seconds
}

var (
	visualizationQueue []VisualizationParams
	currentViz         VisualizationParams
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
	
	// Initialize with some visualizations
	initializeVisualizations()
	
	// Start visualization scheduler
	go visualizationScheduler()
	
	// CORS middleware
	headers := handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"})
	methods := handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE"})
	origins := handlers.AllowedOrigins([]string{"*"})
	
	fmt.Println("QuantumSynth backend server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, methods, origins)(router)))
}

func initializeVisualizations() {
	// Add some initial visualizations to the queue
	visualizationQueue = []VisualizationParams{
		{
			Type: "quantum",
			Parameters: map[string]float64{
				"rotation":     0.5,
				"particleSize": 3.0,
				"waveHeight":   200.0,
			},
			Duration: 20,
		},
		{
			Type: "neural",
			Parameters: map[string]float64{
				"particleCount":       120.0,
				"connectionThreshold": 0.4,
				"maxDistance":         180.0,
			},
			Duration: 25,
		},
		{
			Type: "temporal",
			Parameters: map[string]float64{
				"waveWidth":   1.5,
				"waveHeight":  250.0,
				"fillOpacity": 0.3,
			},
			Duration: 15,
		},
	}
	
	if len(visualizationQueue) > 0 {
		currentViz = visualizationQueue[0]
	}
}

func visualizationScheduler() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	vizTimer := 0
	
	for range ticker.C {
		if len(visualizationQueue) == 0 {
			// Generate a new visualization if queue is empty
			newViz := generateRandomVisualization()
			visualizationQueue = append(visualizationQueue, newViz)
			continue
		}
		
		vizTimer++
		
		// Check if it's time to switch to next visualization
		if vizTimer >= currentViz.Duration {
			// Move to next visualization
			visualizationQueue = visualizationQueue[1:]
			if len(visualizationQueue) > 0 {
				currentViz = visualizationQueue[0]
			} else {
				// Generate a new one if queue is empty
				currentViz = generateRandomVisualization()
				visualizationQueue = append(visualizationQueue, currentViz)
			}
			
			vizTimer = 0
			fmt.Printf("Switched to new visualization: %s\n", currentViz.Type)
		}
	}
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
		}
	case "neural":
		params = map[string]float64{
			"particleCount":       80.0 + rand.Float64()*80.0,
			"connectionThreshold": 0.2 + rand.Float64()*0.4,
			"maxDistance":         120.0 + rand.Float64()*100.0,
		}
	case "temporal":
		params = map[string]float64{
			"waveWidth":   0.5 + rand.Float64()*2.0,
			"waveHeight":  150.0 + rand.Float64()*150.0,
			"fillOpacity": 0.1 + rand.Float64()*0.3,
		}
	}
	
	return VisualizationParams{
		Type:       randomType,
		Parameters: params,
		Duration:   15 + rand.Intn(20), // 15-35 seconds
	}
}

func getNextVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if len(visualizationQueue) > 1 {
		json.NewEncoder(w).Encode(visualizationQueue[1])
	} else if len(visualizationQueue) == 1 {
		// If only one visualization, generate a new one for the next
		nextViz := generateRandomVisualization()
		json.NewEncoder(w).Encode(nextViz)
	} else {
		// If queue is empty, generate a new one
		nextViz := generateRandomVisualization()
		json.NewEncoder(w).Encode(nextViz)
	}
}

func getCurrentVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(currentViz)
}

func generateVisualization(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	newViz := generateRandomVisualization()
	if req.Type != "" {
		newViz.Type = req.Type
	}
	
	visualizationQueue = append(visualizationQueue, newViz)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newViz)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"queueSize": len(visualizationQueue),
	})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// WebSocket implementation would go here
	// This would allow real-time updates to the frontend
	// when new visualizations are generated
}
