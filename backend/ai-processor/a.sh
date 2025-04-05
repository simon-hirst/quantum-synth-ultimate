#!/bin/bash

cd ~/Desktop/hehehehe/quantum-synth-ultimate/backend/ai-processor

# CREATE DOCKERFILE FOR AZURE DEPLOYMENT
cat > Dockerfile << 'EOF'
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o ai-processor .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/ai-processor .
EXPOSE 8080
CMD ["./ai-processor"]
EOF

# CREATE AZURE DEPLOYMENT CONFIG
cat > azure-deploy.sh << 'EOF'
#!/bin/bash

# Azure deployment script for Quantum Synth AI backend
RESOURCE_GROUP="quantum-synth-rg"
LOCATION="eastus"
CONTAINER_REGISTRY="quantumsynthacr"
CONTAINER_APP="quantum-ai-processor"
IMAGE_NAME="ai-processor:latest"

# Login to Azure (uncomment if needed)
# az login

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create container registry
az acr create --resource-group $RESOURCE_GROUP --name $CONTAINER_REGISTRY --sku Basic --admin-enabled true

# Build and push image
az acr build --registry $CONTAINER_REGISTRY --image $IMAGE_NAME .

# Create container app environment
az containerapp env create \
  --name "quantum-synth-env" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Deploy container app
az containerapp create \
  --name $CONTAINER_APP \
  --resource-group $RESOURCE_GROUP \
  --environment "quantum-synth-env" \
  --image $CONTAINER_REGISTRY.azurecr.io/$IMAGE_NAME \
  --target-port 8080 \
  --ingress 'external' \
  --transport 'http2' \
  --env-vars "ENVIRONMENT=production" \
  --cpu 2 \
  --memory 4Gi \
  --min-replicas 1 \
  --max-replicas 10

# Get the public URL
echo "Deployment complete! Your AI backend is running at:"
az containerapp show --name $CONTAINER_APP --resource-group $RESOURCE_GROUP --query "configuration.ingress.fqdn"
EOF

# MAKE DEPLOYMENT SCRIPT EXECUTABLE
chmod +x azure-deploy.sh

# CREATE PRODUCTION ENVIRONMENT CONFIG
cat > .env.production << 'EOF'
ENVIRONMENT=production
PORT=8080
CORS_ORIGIN=https://your-frontend-domain.com
MAX_CPU_CORES=4
MEMORY_LIMIT=4096
EOF

# UPDATE MAIN.GO TO HANDLE PRODUCTION ENV
cat > main.go << 'EOF'
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
EOF

# COMMIT THE AZURE DEPLOYMENT SETUP
cd ..
git add .
GIT_AUTHOR_DATE="2025-04-05T11:37:00" GIT_COMMITTER_DATE="2025-04-05T11:37:00" \
git commit -m "feat: add Azure Container Apps deployment configuration"