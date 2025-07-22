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
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type AudioData struct {
	FFT        []int   `json:"fft"`
	Timestamp  int64   `json:"timestamp"`
	SessionID  string  `json:"sessionId"`
	Amplitude  float64 `json:"amplitude"`
	Frequency  float64 `json:"frequency"`
	Complexity float64 `json:"complexity"`
}

type ProcessResponse struct {
	Particles []Particle `json:"particles"`
	Colors    []string   `json:"colors"`
	Intensity float64    `json:"intensity"`
}

type Particle struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Z     float64 `json:"z"`
	Size  float64 `json:"size"`
	Speed float64 `json:"speed"`
}

func handleProcess(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade WebSocket: %v", err)
		return
	}
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("WebSocket read error: %v", err)
			break
		}

		var audioData AudioData
		if err := json.Unmarshal(message, &audioData); err != nil {
			log.Printf("JSON unmarshal error: %v", err)
			continue
		}

		// Process audio data and generate visual response
		response := ProcessResponse{
			Particles: generateParticles(audioData),
			Colors:    []string{"#ff6b6b", "#4ecdc4", "#45b7d1", "#f9c74f", "#ffafcc"},
			Intensity: calculateIntensity(audioData),
		}

		if err := conn.WriteJSON(response); err != nil {
			log.Printf("WebSocket write error: %v", err)
			break
		}
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func generateParticles(audioData AudioData) []Particle {
	particles := make([]Particle, 100)
	for i := range particles {
		particles[i] = Particle{
			X:     rand.Float64()*2 - 1,
			Y:     rand.Float64()*2 - 1,
			Z:     rand.Float64()*2 - 1,
			Size:  rand.Float64()*0.4 + 0.1,
			Speed: rand.Float64()*0.09 + 0.01,
		}
	}
	return particles
}

func calculateIntensity(audioData AudioData) float64 {
	if len(audioData.FFT) == 0 {
		return 0.5
	}
	sum := 0.0
	for _, value := range audioData.FFT {
		sum += float64(value)
	}
	return sum / float64(len(audioData.FFT)) / 255.0
}

func main() {
	rand.Seed(time.Now().UnixNano())

	router := mux.NewRouter()

	router.HandleFunc("/ws", handleProcess).Methods("GET")
	router.HandleFunc("/health", handleHealth).Methods("GET")

	// CORS middleware
	headers := handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"})
	methods := handlers.AllowedMethods([]string{"GET", "POST", "PUT", "HEAD", "OPTIONS"})
	origins := handlers.AllowedOrigins([]string{"*"})

	fmt.Println("Quantum AI Processor starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, methods, origins)(router)))
}
