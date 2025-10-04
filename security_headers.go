package main

import (
	"net/http"
	"os"
	"strings"
)

func securityHeaders(next http.Handler) http.Handler {
	// Only enable when explicitly requested (prod builds).
	if os.Getenv("ENABLE_SECURITY_HEADERS") != "1" {
		return next
	}

	// Allow 'self' and wss:, plus any extra connect targets via ALLOWED_ORIGINS.
	connectSrc := []string{"'self'", "wss:"}
	if extra := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				connectSrc = append(connectSrc, o)
			}
		}
	}

	csp := strings.Join([]string{
		"default-src 'self'",
		"script-src 'self'",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' blob: data:",
		"font-src 'self' data:",
		"connect-src " + strings.Join(connectSrc, " "),
		"media-src 'self' blob: data:",
		"object-src 'none'",
		"frame-ancestors 'none'",
		"worker-src 'self' blob:",
	}, "; ")

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Do not set HSTS on random trycloudflare subdomains.
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		// Permissions-Policy: allow fullscreen, display-capture, microphone on self
		w.Header().Set("Permissions-Policy", "fullscreen=(self), display-capture=(self), microphone=(self)")
		w.Header().Set("Content-Security-Policy", csp)
		next.ServeHTTP(w, r)
	})
}
