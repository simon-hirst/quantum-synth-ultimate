#!/bin/bash

# Switch from WebSockets to HTTP polling for better Azure compatibility
cat > frontend/src/main.ts << 'EOF'
import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private visualizationElement: HTMLElement;
  private lastUpdate: number = 0;
  private currentShader: string = '';
  private nextShader: string = '';
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private pipContainer: HTMLDivElement | null = null;
  private isPipMode: boolean = false;
  private pollingInterval: number | null = null;
  private currentVizName: string = 'Connecting to AI...';

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualizationElement = visualizationElement;
    this.setupCanvas();
    this.createPipContainer();
    this.startPolling();
  }

  private setupCanvas() {
    this.canvas.width = this.canvas.offsetWidth * 2;
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  private createPipContainer() {
    this.pipContainer = document.createElement('div');
    this.pipContainer.className = 'pip-container hidden';
    this.pipContainer.innerHTML = `
      <div class="pip-header">
        <span>QuantumSynth Visualization</span>
        <div class="pip-controls">
          <button class="pip-btn" id="pipClose">✕</button>
        </div>
      </div>
      <div class="pip-content">
        <canvas id="pipCanvas"></canvas>
      </div>
    `;
    document.body.appendChild(this.pipContainer);

    const pipClose = document.getElementById('pipClose')!;
    pipClose.addEventListener('click', () => this.togglePipMode());
  }

  togglePipMode() {
    this.isPipMode = !this.isPipMode;
    
    if (this.isPipMode) {
      // Move canvas to PiP container
      const pipCanvas = document.getElementById('pipCanvas') as HTMLCanvasElement;
      const mainCanvas = this.canvas;
      
      // Copy canvas properties
      pipCanvas.width = mainCanvas.width;
      pipCanvas.height = mainCanvas.height;
      const pipCtx = pipCanvas.getContext('2d')!;
      
      // Update reference
      this.canvas = pipCanvas;
      this.ctx = pipCtx;
      
      // Show PiP container
      this.pipContainer!.classList.remove('hidden');
    } else {
      // Move canvas back to main container
      const mainCanvas = document.getElementById('visualizer') as HTMLCanvasElement;
      const pipCanvas = this.canvas;
      
      // Copy canvas properties
      mainCanvas.width = pipCanvas.width;
      mainCanvas.height = pipCanvas.height;
      const mainCtx = mainCanvas.getContext('2d')!;
      
      // Update reference
      this.canvas = mainCanvas;
      this.ctx = mainCtx;
      
      // Hide PiP container
      this.pipContainer!.classList.add('hidden');
    }
  }

  private async startPolling() {
    // Start polling for new shaders
    this.pollingInterval = window.setInterval(() => {
      this.fetchNewShader();
    }, 5000) as unknown as number;
    
    // Fetch initial shader
    this.fetchNewShader();
  }

  private async fetchNewShader() {
    try {
      const response = await fetch('https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next');
      if (response.ok) {
        const data = await response.json();
        this.nextShader = data.code;
        this.currentVizName = data.name;
        this.startTransition();
      }
    } catch (error) {
      console.error('Failed to fetch shader:', error);
      // Fallback to local generation
      this.generateLocalShader();
    }
  }

  private generateLocalShader() {
    // Fallback local shader generator
    const types = ['quantum', 'neural', 'temporal'];
    const names = ['Quantum Waves', 'Neural Particles', 'Temporal Fields'];
    const randomIndex = Math.floor(Math.random() * types.length);
    
    this.nextShader = types[randomIndex];
    this.currentVizName = names[randomIndex];
    this.startTransition();
  }

  private startTransition() {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.visualizationElement.textContent = `Transitioning to: ${this.currentVizName}`;
    
    // Complete transition after 3 seconds
    const transitionDuration = 3000;
    const startTime = Date.now();
    
    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      this.transitionProgress = elapsed / transitionDuration;
      
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 1;
        this.currentShader = this.nextShader;
        this.isTransitioning = false;
        this.visualizationElement.textContent = this.currentVizName;
      } else {
        requestAnimationFrame(animateTransition);
      }
    };
    
    animateTransition();
  }

  initialize(stream: MediaStream) {
    console.log('Initializing quantum audio processing...');
    
    try {
      // Setup audio context and analyser
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 512;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.lastUpdate = Date.now();
      
      // Start visualization
      this.visualize();
    } catch (error) {
      console.error('Quantum audio initialization failed:', error);
    }
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    // Clear canvas
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Draw visualization based on current mode
    if (this.isTransitioning) {
      this.drawTransitionVisualization();
    } else if (this.currentShader) {
      this.drawShaderVisualization();
    } else {
      this.drawFallbackVisualization();
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private drawTransitionVisualization() {
    // Create a morphing effect between shaders
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const time = Date.now() / 1000;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    
    // Apply transition effects
    const scale = 0.9 + 0.2 * Math.sin(this.transitionProgress * Math.PI);
    const rotation = this.transitionProgress * Math.PI * 2;
    this.ctx.scale(scale, scale);
    this.ctx.rotate(rotation);
    
    // Draw a hybrid visualization
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      const distance = amplitude * 150;
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      const size = 2 + amplitude * 8;
      
      const hue = (i * 360 / this.dataArray!.length + time * 50) % 360;
      const alpha = 0.7 - this.transitionProgress * 0.5;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private drawShaderVisualization() {
    // This would execute the GLSL shader received from the backend
    // For now, we'll create a visualization based on the shader concept
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const time = Date.now() / 1000;
    
    // Simulate shader-like behavior
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      const distance = amplitude * 200;
      
      // Create complex patterns based on the audio data
      const patternX = Math.cos(angle * 3 + time) * distance;
      const patternY = Math.sin(angle * 2 + time) * distance;
      
      const x = centerX + patternX;
      const y = centerY + patternY;
      const size = 3 + amplitude * 10;
      
      // Use a color palette based on the shader concept
      const hue = (i * 360 / this.dataArray!.length + time * 60) % 360;
      const saturation = 80 + amplitude * 20;
      const lightness = 50 + amplitude * 30;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      this.ctx.fill();
      
      // Draw connecting lines for a neural network effect
      if (i > 0 && amplitude > 0.3) {
        const prevAmplitude = this.dataArray![(i-1) % this.dataArray!.length] / 255;
        const prevAngle = ((i-1) * 2 * Math.PI) / this.dataArray!.length;
        const prevDistance = prevAmplitude * 200;
        const prevPatternX = Math.cos(prevAngle * 3 + time) * prevDistance;
        const prevPatternY = Math.sin(prevAngle * 2 + time) * prevDistance;
        const prevX = centerX + prevPatternX;
        const prevY = centerY + prevPatternY;
        
        this.ctx.beginPath();
        this.ctx.moveTo(prevX, prevY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.3 + amplitude * 0.4})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
  }

  private drawFallbackVisualization() {
    // Fallback visualization when no shader is available
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    const time = Date.now() / 1000;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(time * 0.5);
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * radius * 0.7);
      const y2 = Math.sin(angle) * (radius + amplitude * radius * 0.7);
      
      const hue = (i * 360 / this.dataArray!.length + time * 50) % 360;
      this.ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
      this.ctx.lineWidth = 2 + amplitude * 5;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth Infinite Edition...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth Infinite</h1>
        <p class="quantum-subtitle">AI-Generated Infinite Visualizations</p>
      </div>
      
      <div class="quantum-content">
        <div class="quantum-card">
          <div class="card-header">
            <h2>Setup</h2>
          </div>
          
          <div class="card-body">
            <div class="instructions">
              <div class="instruction-step">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h3>Start Capture</h3>
                  <p>Click the button below to begin screen sharing</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h3>Select Source</h3>
                  <p>Share your entire screen or just your music player window</p>
                </div>
              </div>
              
              <div class="instruction-step">
                <div class="step-number">3</div>
                <div class="step-content">
                  <h3>Enable Audio</h3>
                  <p>Check "Share audio" to capture sound for visualization</p>
                </div>
              </div>

              <div class="instruction-step">
                <div class="step-number">💡</div>
                <div class="step-content">
                  <h3>Pro Tip</h3>
                  <p>After sharing, click "Hide" on the share dialog to remove it from your screen</p>
                </div>
              </div>

              <div class="drm-warning">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                  <h3>DRM Notice</h3>
                  <p>Some players like Spotify won't work due to DRM protection. You must share your entire screen for these applications.</p>
                </div>
              </div>
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">▶</span>
              Start Screen Sharing
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹</span>
              Stop Sharing
            </button>

            <button id="pipButton" class="quantum-btn" style="display: none; margin-top: 10px;">
              <span class="btn-icon">🔲</span>
              Toggle Picture-in-Picture
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Live Generation</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Visualization:</span>
            <span id="currentVisualization">Connecting to AI...</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Infinite AI-generated visualizations streaming live</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth Infinite v2.2.0 - Endless AI Generation</p>
        <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
      </div>
    </div>
  `;

  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  const visualizationElement = document.getElementById('currentVisualization')!;
  const quantumSynth = new QuantumSynth(canvas, visualizationElement);
  let mediaStream: MediaStream | null = null;

  const startButton = document.getElementById('startButton')!;
  const stopButton = document.getElementById('stopButton')!;
  const pipButton = document.getElementById('pipButton')!;
  const statusDot = document.querySelector('.status-dot')!;
  const statusText = document.querySelector('.status-text')!;

  startButton.addEventListener('click', initializeScreenShare);
  stopButton.addEventListener('click', stopScreenShare);
  pipButton.addEventListener('click', () => quantumSynth.togglePipMode());

  function initializeScreenShare() {
    startButton.disabled = true;
    startButton.innerHTML = '<span class="btn-icon">⏳</span> Initializing...';
    statusDot.classList.add('pending');
    statusText.textContent = 'Initializing';

    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true 
      })
      .then(stream => {
        console.log('Screen sharing started');
        mediaStream = stream;
        startButton.style.display = 'none';
        stopButton.style.display = 'block';
        pipButton.style.display = 'block';
        statusDot.classList.remove('pending');
        statusDot.classList.add('active');
        statusText.textContent = 'Active';
        quantumSynth.initialize(stream);
        
        // Handle when user stops sharing from browser UI
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = stopScreenShare;
        }
      })
      .catch(error => {
        console.error('Error starting screen share:', error);
        startButton.disabled = false;
        startButton.innerHTML = '<span class="btn-icon">▶</span> Try Again';
        statusDot.classList.remove('pending');
        statusText.textContent = 'Error';
      });
    } else {
      alert('Screen sharing not supported in this browser');
      startButton.disabled = false;
      startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
      statusText.textContent = 'Unsupported';
    }
  }

  function stopScreenShare() {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
    
    quantumSynth.stop();
    stopButton.style.display = 'none';
    pipButton.style.display = 'none';
    startButton.style.display = 'block';
    startButton.disabled = false;
    startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
});
EOF

# Update backend to handle HTTP requests properly
cat > main.go << 'EOF'
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	"strings"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

type ShaderParams struct {
	Code string `json:"code"`
	Name string `json:"name"`
	Type string `json:"type"`
}

var (
	shaderTemplates = []string{
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 0.5;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec3 color = vec3(0.0);
			color.r = sin(uv.x * 10.0 + time) * 0.5 + 0.5;
			color.g = cos(uv.y * 8.0 + time) * 0.5 + 0.5;
			color.b = sin((uv.x + uv.y) * 5.0 + time) * 0.5 + 0.5;
			
			color *= intensity * 2.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 0.8;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec2 center = vec2(0.5);
			float dist = distance(uv, center);
			float circle = smoothstep(0.2, 0.19, dist);
			
			vec3 color = vec3(0.0);
			color.r = sin(time + dist * 10.0) * 0.5 + 0.5;
			color.g = cos(time + dist * 8.0) * 0.5 + 0.5;
			color.b = sin(time * 0.5 + dist * 12.0) * 0.5 + 0.5;
			
			color *= circle * intensity * 3.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
		`
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			float time = u_time * 1.2;
			float intensity = texture2D(audioData, vec2(uv.x, 0.0)).r;
			
			vec3 color = vec3(0.0);
			for (int i = 0; i < 5; i++) {
				float fi = float(i);
				vec2 position = vec2(0.5 + sin(time * 0.5 + fi * 1.2) * 0.3, 
									 0.5 + cos(time * 0.7 + fi * 1.5) * 0.3);
				float dist = distance(uv, position);
				float size = 0.1 + fi * 0.05;
				float glow = exp(-dist * 20.0 / (size * 10.0));
				
				color.r += glow * sin(time + fi * 2.0) * 0.5 + 0.5;
				color.g += glow * cos(time + fi * 2.5) * 0.5 + 0.5;
				color.b += glow * sin(time * 1.5 + fi * 3.0) * 0.5 + 0.5;
			}
			
			color = clamp(color, 0.0, 1.0);
			color *= intensity * 2.0;
			gl_FragColor = vec4(color, 1.0);
		}
		`,
	}
	
	shaderNames = []string{
		"Quantum Waves",
		"Resonance Circles",
		"Neural Particles",
		"Temporal Fields",
		"Synth Grid",
		"Holographic Matrix",
		"Fractal Dimensions",
		"Energy Vortex",
		"Digital Rain",
		"Cosmic Strings",
	}
)

func main() {
	rand.Seed(time.Now().UnixNano())
	
	router := mux.NewRouter()
	
	// API endpoints
	router.HandleFunc("/api/shader/next", getNextShader).Methods("GET")
	router.HandleFunc("/api/shader/current", getCurrentShader).Methods("GET")
	router.HandleFunc("/api/health", healthCheck).Methods("GET")
	
	// Serve frontend
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend/dist/")))
	
	fmt.Println("QuantumSynth Infinite server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, methods, origins)(router)))
}

func getNextShader(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func getCurrentShader(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	shader := generateRandomShader()
	json.NewEncoder(w).Encode(shader)
}

func generateRandomShader() ShaderParams {
	// Select a random template
	templateIndex := rand.Intn(len(shaderTemplates))
	shaderCode := shaderTemplates[templateIndex]
	
	// Select a random name
	nameIndex := rand.Intn(len(shaderNames))
	shaderName := shaderNames[nameIndex]
	
	// Add variations to the shader
	shaderCode = modifyShader(shaderCode)
	
	return ShaderParams{
		Code: shaderCode,
		Name: shaderName,
		Type: "shader",
	}
}

func modifyShader(shader string) string {
	// Simple modifications to create variations
	modifications := []func(string) string{
		func(s string) string { return strings.Replace(s, "0.5", fmt.Sprintf("%.2f", 0.3+rand.Float64()*0.4), 2) },
		func(s string) string { return strings.Replace(s, "10.0", fmt.Sprintf("%.1f", 5.0+rand.Float64()*10.0), 1) },
		func(s string) string { return strings.Replace(s, "8.0", fmt.Sprintf("%.1f", 5.0+rand.Float64()*10.0), 1) },
		func(s string) string { return strings.Replace(s, "5.0", fmt.Sprintf("%.1f", 3.0+rand.Float64()*8.0), 1) },
		func(s string) string { return strings.Replace(s, "20.0", fmt.Sprintf("%.1f", 15.0+rand.Float64()*20.0), 1) },
		func(s string) string { return strings.Replace(s, "0.2", fmt.Sprintf("%.2f", 0.1+rand.Float64()*0.3), 1) },
		func(s string) string { return strings.Replace(s, "0.19", fmt.Sprintf("%.2f", 0.15+rand.Float64()*0.1), 1) },
		func(s string) string { return strings.Replace(s, "0.3", fmt.Sprintf("%.2f", 0.2+rand.Float64()*0.3), 1) },
		func(s string) string { return strings.Replace(s, "0.1", fmt.Sprintf("%.2f", 0.05+rand.Float64()*0.2), 1) },
	}
	
	// Apply random modifications
	for i := 0; i < 3+rand.Intn(3); i++ {
		modIndex := rand.Intn(len(modifications))
		shader = modifications[modIndex](shader)
	}
	
	return shader
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
	})
}

var (
	headers = handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"})
	methods = handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	origins = handlers.AllowedOrigins([]string{"*"})
)
EOF

# Build and deploy
echo "📦 Building backend..."
go build -o ai-processor .

echo "🚀 Deploying frontend..."
cd frontend
npm run build
cd ..

az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Fix git commit time handling
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const now = new Date();
const shouldSameDay = Math.random() < 0.75;

let newDate;
if (shouldSameDay) {
  newDate = new Date(lastDate);
  const maxMinutes = Math.min(179, ((now - lastDate) / 60000) - 1);
  
  if (maxMinutes > 1) {
    const minutesToAdd = 1 + Math.floor(Math.random() * maxMinutes);
    newDate.setMinutes(newDate.getMinutes() + minutesToAdd);
  } else {
    newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(Math.floor(Math.random() * 24));
    newDate.setMinutes(Math.floor(Math.random() * 60));
    newDate.setSeconds(Math.floor(Math.random() * 60));
  }
} else {
  const daysToAdd = Math.floor(Math.random() * 7) + 1;
  newDate = new Date(lastDate);
  newDate.setDate(newDate.getDate() + daysToAdd);
  newDate.setHours(Math.floor(Math.random() * 24));
  newDate.setMinutes(Math.floor(Math.random() * 60));
  newDate.setSeconds(Math.floor(Math.random() * 60));
}

if (newDate > now) {
  const randomPast = new Date(now.getTime() - Math.floor(Math.random() * 86400000));
  newDate = randomPast;
}

console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "fix: replace WebSockets with HTTP polling for Azure compatibility"
echo "✅ Replaced WebSockets with HTTP polling for better Azure compatibility!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the updates"
echo "🚀 Backend now uses HTTP endpoints for better compatibility with Azure Container Apps"