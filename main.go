package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

/* ---------- env & helpers ---------- */

var (
	appVersion     = "dev"
	appBuildTime   = "unknown"
	listenAddr     = getenv("PORT", "8080")
	serveStaticDir = getenv("STATIC_DIR", "./frontend/dist")
	allowedOrigins = splitAndTrim(os.Getenv("ALLOWED_ORIGINS")) // CSV; empty = allow all
)

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
func splitAndTrim(csv string) []string {
	if csv == "" {
		return nil
	}
	parts := strings.Split(csv, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

/* ---------- WS upgrader & keepalive ---------- */

var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		if len(allowedOrigins) == 0 {
			return true
		}
		origin := r.Header.Get("Origin")
		for _, o := range allowedOrigins {
			if strings.EqualFold(o, origin) {
				return true
			}
		}
		return false
	},
}

const (
	writeWait  = 10 * time.Second
	pongWait   = 75 * time.Second
	pingPeriod = 30 * time.Second
)

func wsHandler(w http.ResponseWriter, r *http.Request) {
	log.Printf("WS: upgrade from Origin=%q Host=%q", r.Header.Get("Origin"), r.Host)

	conn, err := wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	conn.SetReadLimit(1 << 20)
	conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.SetPongHandler(func(string) error {
		conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	// read pump
	done := make(chan struct{})
	go func() {
		defer close(done)
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WS read error: %v", err)
				}
				return
			}
		}
	}()

	// write ping pump
	ticker := time.NewTicker(pingPeriod)
	defer ticker.Stop()

	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("WS ping failed: %v", err)
				return
			}
		}
	}
}

/* ---------- API ---------- */

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
}

func versionHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{
		"version":   appVersion,
		"buildTime": appBuildTime,
	})
}

/* ---------- main ---------- */

func main() {
	router := mux.NewRouter()

	// API
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", healthHandler).Methods("GET")
	api.HandleFunc("/version", versionHandler).Methods("GET")

	// WS
	router.HandleFunc("/ws", wsHandler)

	// Static (prod build)
	if info, err := os.Stat(serveStaticDir); err == nil && info.IsDir() {
		fs := http.FileServer(http.Dir(serveStaticDir))
		// assets
		router.PathPrefix("/assets/").Handler(fs)
		// SPA fallback
		router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			http.ServeFile(w, r, filepath.Join(serveStaticDir, "index.html"))
		})
	} else {
		// dev: friendly hint
		router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("Dev mode: run `cd frontend && npm run dev`"))
		})
	}

	// CORS (no cookies required by our app)
	cors := []handlers.CORSOption{
		handlers.AllowedMethods([]string{"GET", "POST", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	}
	if len(allowedOrigins) == 0 {
		cors = append(cors, handlers.AllowedOrigins([]string{"*"}))
	} else {
		cors = append(cors, handlers.AllowedOrigins(allowedOrigins))
	}

	var handler http.Handler = handlers.CORS(cors...)(handlers.ProxyHeaders(router))
	if os.Getenv("ENABLE_SECURITY_HEADERS") == "1" {
		handler = securityHeaders(handler)
	}

	srv := &http.Server{
		Addr:              ":" + listenAddr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("QuantumSynth Infinite server starting on :%s (STATIC_DIR=%s)", listenAddr, serveStaticDir)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
