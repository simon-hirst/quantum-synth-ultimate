package main

import (
	"compress/gzip"
	"net/http"
	"strings"

	"github.com/gorilla/handlers"
)

// withStaticCache: long-cache hashed assets, no-store HTML.
func withStaticCache(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		if strings.HasPrefix(p, "/assets/") ||
			strings.HasSuffix(p, ".js") || strings.HasSuffix(p, ".css") ||
			strings.HasSuffix(p, ".png") || strings.HasSuffix(p, ".jpg") ||
			strings.HasSuffix(p, ".jpeg") || strings.HasSuffix(p, ".webp") ||
			strings.HasSuffix(p, ".woff2") || strings.HasSuffix(p, ".woff") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}
		if p == "/" || strings.HasSuffix(p, "/") || strings.HasSuffix(p, ".html") {
			w.Header().Set("Cache-Control", "no-store, no-cache, must-revalidate")
		}
		next.ServeHTTP(w, r)
	})
}

// WrapPerf: static-cache -> gzip -> CORS (corsMW provided by main.go)
func WrapPerf(router http.Handler, corsMW func(http.Handler) http.Handler) http.Handler {
	h := withStaticCache(router)
	h = handlers.CompressHandlerLevel(h, gzip.BestSpeed)
	h = corsMW(h)
	return h
}
