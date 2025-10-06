package main

import (
	"net/http"
	"os"
	"strings"
)

func securityHeaders(next http.Handler) http.Handler {
	if os.Getenv("ENABLE_SECURITY_HEADERS") != "1" {
		return next
	}

	connectSrc := []string{"'self'", "wss:"}
	if extra := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if s := strings.TrimSpace(o); s != "" {
				connectSrc = append(connectSrc, s)
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
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Permissions-Policy", "fullscreen=(self), display-capture=(self), microphone=(self)")
		w.Header().Set("Content-Security-Policy", csp)
		next.ServeHTTP(w, r)
	})
}
