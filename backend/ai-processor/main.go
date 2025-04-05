package main

import (
	"log"
	"math"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		if os.Getenv("ENVIRONMENT") == "production" {
			return r.Header.Get("Origin") == os.Getenv("CORS_ORIGIN")
		}
		return true
	},
}

type AudioData struct {
	FFT       []float32 `json:"fft"`
	Timestamp int64     `json:"timestamp"`
	SessionID string    `json:"sessionId"`
}

type VisualUniverse struct {
	ParticleCount int           `json:"particleCount"`
	GeometryType  string        `json:"geometryType"`
	ColorPalette  []string      `json:"colorPalette"`
	Physics       PhysicsConfig `json:"physics"`
	Shaders       ShaderConfig  `json:"shaders"`
}

type PhysicsConfig struct {
	Gravity    float32 `json:"gravity"`
	Turbulence float32 `json:"turbulence"`
	Attraction float32 `json:"attraction"`
	Repulsion  float32 `json:"repulsion"`
}

type ShaderConfig struct {
	VertexShader   string                 `json:"vertexShader"`
	FragmentShader string                 `json:"fragmentShader"`
	Uniforms       map[string]interface{} `json:"uniforms"`
}

func safeFloat(value float32) float32 {
	if math.IsNaN(float64(value)) {
		return 0.0
	}
	return value
}

func calculateEnergy(fft []float32) float32 {
	if len(fft) == 0 {
		return 0.0
	}

	var sum float32
	for _, val := range fft {
		sum += val * val
	}
	return sum / float32(len(fft))
}

func calculateComplexity(fft []float32) float32 {
	if len(fft) == 0 {
		return 0.0
	}

	var weightedSum, sum float32
	for i, val := range fft {
		freq := float32(i) / float32(len(fft))
		weightedSum += freq * val
		sum += val
	}

	if sum == 0 {
		return 0.0
	}
	return weightedSum / sum
}

func analyzeEmotion(fft []float32) map[string]float32 {
	if len(fft) < 10 {
		return map[string]float32{
			"joy":        0.5,
			"sadness":    0.2,
			"anger":      0.1,
			"excitement": 0.7,
		}
	}

	return map[string]float32{
		"joy":        fft[5] / 255.0,
		"sadness":    fft[2] / 255.0,
		"anger":      fft[7] / 255.0,
		"excitement": fft[9] / 255.0,
	}
}

func selectGeometry(emotion map[string]float32, complexity float32) string {
	return "particles"
}

func generateColorPalette(emotion map[string]float32, energy float32) []string {
	return []string{"#FF6B6B", "#4ECDC4", "#C7F464"}
}

func generateShaders(emotion map[string]float32, complexity float32) ShaderConfig {
	return ShaderConfig{
		VertexShader: `
			uniform float uTime;
			uniform float uEnergy;
			void main() {
				vec3 newPosition = position;
				newPosition.x += sin(uTime * 0.001) * uEnergy;
				newPosition.y += cos(uTime * 0.001) * uEnergy;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
				gl_PointSize = 3.0;
			}
		`,
		FragmentShader: `
			void main() {
				vec2 uv = gl_PointCoord;
				float distance = length(uv - vec2(0.5));
				if (distance > 0.5) {
					discard;
				}
				gl_FragColor = vec4(1.0, 0.5, 0.8, 1.0 - distance * 2.0);
			}
		`,
		Uniforms: map[string]interface{}{
			"uTime":   0.0,
			"uEnergy": 1.0,
		},
	}
}

func generateVisualUniverse(audioData AudioData) VisualUniverse {
	energy := safeFloat(calculateEnergy(audioData.FFT))
	emotion := analyzeEmotion(audioData.FFT)

	return VisualUniverse{
		ParticleCount: 10000,
		GeometryType:  "particles",
		ColorPalette:  generateColorPalette(emotion, energy),
		Physics: PhysicsConfig{
			Gravity:    0.1,
			Turbulence: 0.3,
			Attraction: 0.2,
			Repulsion:  0.1,
		},
		Shaders: generateShaders(emotion, 0.5),
	}
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Print("WebSocket upgrade failed:", err)
		return
	}
	defer conn.Close()

	for {
		var audioData AudioData
		err := conn.ReadJSON(&audioData)
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		universe := generateVisualUniverse(audioData)

		err = conn.WriteJSON(universe)
		if err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("🚀 AI Visual Processor Running"))
	})

	log.Printf("Neural Wave Synthesis AI backend running on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
