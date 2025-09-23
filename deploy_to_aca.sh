#!/usr/bin/env bash
set -euo pipefail

: "${RG:=quantum-synth-rg}"
: "${APP:=quantum-ai-backend}"
: "${ACR_NAME:=quantumsynthacr1757219498}"
: "${IMAGE_NAME:=quantum-ai-backend}"
: "${DOCKERFILE:=Dockerfile}"
: "${FRONTEND_DIR:=frontend}"
: "${KEEP_HTTP2:=false}"
: "${WAIT_READY:=true}"
: "${DO_FRONTEND:=true}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "❌ Missing dependency: $1"; exit 1; }; }

write_perf_wrap() {
  cat > perf_wrap.go <<'EOF'
package main

import (
	"compress/gzip"
	"net/http"
	"strings"
	"time"
)

type gzipResponseWriter struct{ http.ResponseWriter; gw *gzip.Writer }
func (g *gzipResponseWriter) Write(b []byte) (int, error) { return g.gw.Write(b) }

func shouldGzip(r *http.Request) bool {
	if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") { return false }
	if strings.ToLower(r.Header.Get("Upgrade")) == "websocket" { return false }
	return r.Method == http.MethodGet
}

func setCacheHeaders(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if strings.HasPrefix(p, "/assets/") ||
		strings.Contains(p, "/frontend/dist/") ||
		strings.HasSuffix(p, ".js") || strings.HasSuffix(p, ".css") ||
		strings.HasSuffix(p, ".png") || strings.HasSuffix(p, ".jpg") ||
		strings.HasSuffix(p, ".webp") || strings.HasSuffix(p, ".wasm") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-store")
	}
}

func WrapPerf(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer-when-downgrade")
		setCacheHeaders(w, r)
		if shouldGzip(r) {
			w.Header().Set("Content-Encoding", "gzip")
			gz := gzip.NewWriter(w); defer gz.Close()
			next.ServeHTTP(&gzipResponseWriter{ResponseWriter: w, gw: gz}, r)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func NewTimeoutServer(addr string, h http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           h,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
}
EOF
}

need az; need docker; need git
if [[ "${DO_FRONTEND}" == "true" ]]; then need node; need npm; fi

ACR_FQDN="${ACR_NAME}.azurecr.io"
GIT_SHA="$(git rev-parse --short=12 HEAD 2>/dev/null || echo no-git)"
TAG="v$(date +%Y%m%d%H%M%S)-${GIT_SHA}"
IMAGE="${ACR_FQDN}/${IMAGE_NAME}:${TAG}"

echo "⚙️  Resource Group:   ${RG}"
echo "⚙️  Container App:    ${APP}"
echo "⚙️  ACR:              ${ACR_FQDN}"
echo "⚙️  Image tag:        ${IMAGE}"
echo

if ! grep -q 'func[[:space:]]\+WrapPerf' perf_wrap.go 2>/dev/null; then
  echo "🧩 Adding perf_wrap.go (gzip + caching + timeouts)…"
  write_perf_wrap
fi

if [[ "${DO_FRONTEND}" == "true" ]]; then
  echo "🧱 Building frontend (vite)…"
  pushd "${FRONTEND_DIR}" >/dev/null
  if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
  npm run build
  [[ -f dist/index.html ]] || { echo "❌ Missing ${FRONTEND_DIR}/dist/index.html"; exit 1; }
  popd >/dev/null
else
  echo "⏭️  Skipping frontend build."
fi

echo "🧪 Backend quick compile…"
if command -v go >/dev/null 2>&1; then
  go mod tidy
  go build -o /tmp/ai-processor-sanity .
  rm -f /tmp/ai-processor-sanity
  echo "✅ Go compiles."
else
  echo "ℹ️  go not found; skipping local compile."
fi

echo "🔐 Logging in to ACR: ${ACR_NAME}"
az acr login -n "${ACR_NAME}" >/dev/null

echo "🐳 Building image…"
docker build \
  --file "${DOCKERFILE}" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  --label "org.opencontainers.image.version=${TAG}" \
  --label "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  -t "${IMAGE}" .

echo "📤 Pushing image…"
docker push "${IMAGE}"

echo "🚀 Updating Container App ${APP} → ${IMAGE}"
PREV_REV="$(az containerapp show -n "${APP}" -g "${RG}" --query "properties.latestReadyRevisionName" -o tsv 2>/dev/null || true)"
az containerapp update -n "${APP}" -g "${RG}" --image "${IMAGE}" --revision-suffix "${TAG}" >/dev/null

if [[ "${KEEP_HTTP2}" == "false" ]]; then
  echo "🌐 Forcing ingress to HTTP/1.1"
  az containerapp ingress update -n "${APP}" -g "${RG}" --transport http >/dev/null || true
fi

FQDN="$(az containerapp show -n "${APP}" -g "${RG}" --query "properties.configuration.ingress.fqdn" -o tsv)"
echo "🌎 FQDN: https://${FQDN}"

if [[ "${WAIT_READY}" == "true" ]]; then
  echo "⏳ Waiting for Running…"
  deadline=$(( $(date +%s) + 300 ))
  while :; do
    STATUS="$(az containerapp show -n "${APP}" -g "${RG}" --query "properties.runningStatus" -o tsv 2>/dev/null || echo '')"
    REV="$(az containerapp show -n "${APP}" -g "${RG}" --query "properties.latestRevisionName" -o tsv 2>/dev/null || echo '')"
    echo "   • ${REV:-<n/a>} => ${STATUS:-<n/a>}"
    [[ "${STATUS}" == "Running" ]] && break
    (( $(date +%s) > deadline )) && { echo "❌ Timeout waiting for Running"; break; }
    sleep 5
  done

  echo "🩺 Smokes…"
  set +e
  HRES="$(curl -kfsS "https://${FQDN}/api/health" -H "Accept: application/json")"; HC=$?
  ASSET_PATH="$(curl -kfsS "https://${FQDN}/" | grep -oE '/assets/[^"]+\.js' | head -n1)"
  ASSET_OK=0; [[ -n "${ASSET_PATH}" ]] && curl -kfsS "https://${FQDN}${ASSET_PATH}" >/dev/null; ASSET_OK=$?
  set -e
  echo "   • /api/health -> exit=${HC} body=${HRES:-<empty>}"
  echo "   • asset probe: ${ASSET_PATH:-<none>} exit=${ASSET_OK}"

  if [[ $HC -ne 0 || $ASSET_OK -ne 0 ]]; then
    echo "❌ Smoke failed. Rolling back traffic…"
    if [[ -n "${PREV_REV}" ]]; then
      az containerapp revision set-mode -n "${APP}" -g "${RG}" --mode Single >/dev/null || true
      az containerapp revision activate -n "${APP}" -g "${RG}" --revision "${PREV_REV}" >/dev/null || true
      echo "↩️  Rolled to ${PREV_REV}"
    fi
    exit 1
  fi
fi

echo "✅ Deploy complete. Frontend dist baked into the image. Visit https://${FQDN}"
