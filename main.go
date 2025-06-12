package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	"strings"
	"os"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

// ... (ShaderParams struct and variables remain the same)

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

// ... (rest of the functions remain the same)
