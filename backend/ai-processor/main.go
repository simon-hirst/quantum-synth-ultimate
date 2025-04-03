package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type AudioData struct {
	FFT        []float32 `json:"fft"`
	Timestamp  int64     `json:"timestamp"`
	SessionID  string    `json:"sessionId"`
}

type VisualUniverse struct {
	ParticleCount int        `json:"particleCount"`
	GeometryType  string     `json:"geometryType"`
	ColorPalette  []string   `json:"colorPalette"`
	Physics       PhysicsConfig `json:"physics"`
	Shaders       ShaderConfig  `json:"shaders"`
}

type PhysicsConfig struct {
	Gravity       float32 `json:"gravity"`
	Turbulence    float32 `json:"turbulence"`
	Attraction    float32 `json:"attraction"`
	Repulsion     float32 `json:"repulsion"`
}

type ShaderConfig struct {
	VertexShader   string `json:"vertexShader"`
	FragmentShader string `json:"fragmentShader"`
	Uniforms       map[string]interface{} `json:"uniforms"`
}

// AI Model to generate visual universes from audio data
func generateVisualUniverse(audioData AudioData) VisualUniverse {
	// Analyze audio emotional signature
	energy := calculateEnergy(audioData.FFT)
	complexity := calculateComplexity(audioData.FFT)
	emotion := analyzeEmotion(audioData.FFT)

	return VisualUniverse{
		ParticleCount: int(30000 + energy*20000),
		GeometryType:  selectGeometry(emotion, complexity),
		ColorPalette:  generateColorPalette(emotion, energy),
		Physics: PhysicsConfig{
			Gravity:    0.1 + energy*0.4,
			Turbulence: 0.2 + complexity*0.6,
			Attraction: 0.3 + emotion["joy"]*0.4,
			Repulsion:  0.1 + emotion["anger"]*0.3,
		},
		Shaders: generateShaders(emotion, complexity),
	}
}

func calculateEnergy(fft []float32) float32 {
	var sum float32
	for _, val := range fft {
		sum += val * val
	}
	return sum / float32(len(fft))
}

func calculateComplexity(fft []float32) float32 {
	// Calculate spectral centroid and spread
	var weightedSum, sum float32
	for i, val := range fft {
		freq := float32(i) / float32(len(fft))
		weightedSum += freq * val
		sum += val
	}
	return weightedSum / sum
}

func analyzeEmotion(fft []float32) map[string]float32 {
	// Simulated AI emotion analysis based on frequency distribution
	return map[string]float32{
		"joy":       fft[5] / 255.0,
		"sadness":   fft[2] / 255.0,
		"anger":     fft[7] / 255.0,
		"excitement": fft[9] / 255.0,
	}
}

func selectGeometry(emotion map[string]float32, complexity float32) string {
	geometries := []string{"particles", "waves", "strings", "volumetric", "fractal"}
	weights := []float32{
		emotion["joy"] * 0.8,
		emotion["excitement"] * 0.6,
		complexity * 0.7,
		emotion["anger"] * 0.9,
		emotion["sadness"] * 0.5,
	}
	
	return geometries[int(weights[0]*float32(len(geometries)))%len(geometries)]
}

func generateColorPalette(emotion map[string]float32, energy float32) []string {
	palettes := map[string][]string{
		"joy":       {"#FF6B6B", "#4ECDC4", "#C7F464", "#FFE66D", "#4A4A4A"},
		"sadness":   {"#6B5B95", "#88B04B", "#EFC050", "#5B5EA6", "#DD4124"},
		"anger":     {"#FF0000", "#990000", "#660000", "#330000", "#110000"},
		"excitement": {"#00FF00", "#00CC00", "#009900", "#006600", "#003300"},
	}
	
	dominantEmotion := "joy"
	maxVal := float32(0)
	for k, v := range emotion {
		if v > maxVal {
			maxVal = v
			dominantEmotion = k
		}
	}
	
	return palettes[dominantEmotion]
}

func generateShaders(emotion map[string]float32, complexity float32) ShaderConfig {
	// Generate GLSL shaders based on audio characteristics
	return ShaderConfig{
		VertexShader: generateVertexShader(emotion, complexity),
		FragmentShader: generateFragmentShader(emotion, complexity),
		Uniforms: map[string]interface{}{
			"uTime": 0.0,
			"uEnergy": emotion["excitement"],
			"uComplexity": complexity,
			"uColorJoy": emotion["joy"],
			"uColorAnger": emotion["anger"],
		},
	}
}

func generateVertexShader(emotion map[string]float32, complexity float32) string {
	return `
		uniform float uTime;
		uniform float uEnergy;
		uniform float uComplexity;
		
		void main() {
			vec3 newPosition = position;
			newPosition.x += sin(uTime * 0.001 + position.y * uComplexity) * uEnergy * 2.0;
			newPosition.y += cos(uTime * 0.001 + position.x * uComplexity) * uEnergy * 2.0;
			newPosition.z += sin(uTime * 0.002) * uEnergy;
			
			gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
			gl_PointSize = (uEnergy * 5.0) + 2.0;
		}
	`
}

func generateFragmentShader(emotion map[string]float32, complexity float32) string {
	return `
		uniform float uTime;
		uniform float uColorJoy;
		uniform float uColorAnger;
		
		void main() {
			vec2 uv = gl_PointCoord;
			float distance = length(uv - vec2(0.5));
			
			if (distance > 0.5) {
				discard;
			}
			
			vec3 color = mix(
				vec3(uColorJoy, 0.5, 0.8),
				vec3(uColorAnger, 0.2, 0.1),
				sin(uTime * 0.001) * 0.5 + 0.5
			);
			
			float alpha = 1.0 - smoothstep(0.3, 0.5, distance);
			gl_FragColor = vec4(color * alpha, alpha);
		}
	`
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

		// Process audio with AI and generate visual universe
		universe := generateVisualUniverse(audioData)
		
		// Send generated universe back to frontend
		err = conn.WriteJSON(universe)
		if err != nil {
			log.Println("Write error:", err)
			break
		}
	}
}

func main() {
	rand.Seed(time.Now().UnixNano())
	
	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("AI Visual Processor Running"))
	})

	log.Println("🚀 Neural Wave Synthesis AI backend running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
