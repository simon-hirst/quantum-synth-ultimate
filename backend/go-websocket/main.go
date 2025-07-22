package main

import (
	"github.com/gorilla/websocket"
	"log"
	"net/http"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("WebSocket upgrade failed:", err)
			return
		}
		defer conn.Close()

		for {
			// Read audio data from frontend
			var msg map[string]interface{}
			err := conn.ReadJSON(&msg)
			if err != nil {
				log.Println("Read error:", err)
				break
			}

			// Process audio data (could do enhanced processing here)
			log.Printf("Received audio data: %d samples\n", len(msg["data"].([]interface{})))
		}
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
