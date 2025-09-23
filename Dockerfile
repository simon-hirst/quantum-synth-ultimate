FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

COPY go.mod go.sum ./

RUN go mod download

COPY . .

RUN go build -o ai-processor .

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

COPY --from=builder /app/ai-processor .

COPY frontend/dist ./frontend/dist

EXPOSE 8080

ENV PORT=8080

CMD ["./ai-processor"]
