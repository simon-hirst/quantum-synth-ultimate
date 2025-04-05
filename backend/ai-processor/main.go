package main

import (
	"log"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Allow all origins in development, restrict in production
		if os.Getenv("ENVIRONMENT") == "production" {
			return r.Header.Get("Origin") == os.Getenv("CORS_ORIGIN")
		}
		return true
	},
}

// ... [rest of the existing code remains the same] ...

func main() {
	rand.Seed(time.Now().UnixNano())
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("🚀 AI Visual Processor Running in " + os.Getenv("ENVIRONMENT")))
	})

	log.Printf("🚀 Neural Wave Synthesis AI backend running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
