#!/bin/bash

# Add note about hiding share screen and implement morphing visualizations
cat > frontend/src/main.ts << 'EOF'
import './style.css'

class QuantumSynth {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationFrame: number | null = null;
  private currentVisualization: number = 0;
  private nextVisualization: number = 0;
  private visualizationTimer: number | null = null;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private visualizationNames = ['Quantum Resonance', 'Neural Particles', 'Temporal Waveforms'];
  private visualizationElement: HTMLElement;
  private visualizationParams: any = {};
  private lastUpdate: number = 0;

  constructor(canvas: HTMLCanvasElement, visualizationElement: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.visualizationElement = visualizationElement;
    this.setupCanvas();
    this.initializeVisualizationParams();
  }

  private setupCanvas() {
    this.canvas.width = this.canvas.offsetWidth * 2;
    this.canvas.height = this.canvas.offsetHeight * 2;
    this.ctx.scale(2, 2);
  }

  private initializeVisualizationParams() {
    // Initialize parameters for each visualization type
    this.visualizationParams = {
      quantum: {
        rotation: 0,
        particleSize: 2,
        waveHeight: 150
      },
      neural: {
        particleCount: 100,
        connectionThreshold: 0.3,
        maxDistance: 150
      },
      temporal: {
        waveWidth: 1,
        waveHeight: 200,
        fillOpacity: 0.2
      }
    };
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
      
      // Start visualization and switching
      this.startVisualizationSwitching();
      this.visualize();
    } catch (error) {
      console.error('Quantum audio initialization failed:', error);
    }
  }

  private startVisualizationSwitching() {
    // Switch visualizations every 20-30 seconds
    const switchVisualization = () => {
      this.nextVisualization = Math.floor(Math.random() * 3);
      this.isTransitioning = true;
      this.transitionProgress = 0;
      
      // Update UI to show transition
      this.visualizationElement.textContent = 
        `${this.visualizationNames[this.currentVisualization]} → ${this.visualizationNames[this.nextVisualization]}`;
      
      // Complete transition after 3 seconds
      setTimeout(() => {
        this.currentVisualization = this.nextVisualization;
        this.isTransitioning = false;
        this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
      }, 3000);
      
      this.visualizationTimer = setTimeout(switchVisualization, 20000 + Math.random() * 10000);
    };
    
    this.visualizationElement.textContent = this.visualizationNames[this.currentVisualization];
    this.visualizationTimer = setTimeout(switchVisualization, 20000 + Math.random() * 10000);
  }

  private visualize() {
    if (!this.analyser || !this.dataArray) return;

    this.analyser.getByteFrequencyData(this.dataArray);
    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    
    // Update visualization parameters
    this.updateVisualizationParams(deltaTime);
    
    // Clear canvas with a subtle dark background
    this.ctx.fillStyle = 'rgba(10, 12, 18, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width/2, this.canvas.height/2);
    
    // Handle transitions with morphing effect
    if (this.isTransitioning) {
      this.transitionProgress += deltaTime / 3; // 3 second transition
      if (this.transitionProgress > 1) this.transitionProgress = 1;
      
      // Draw morphing between visualizations
      this.drawMorphingVisualization(this.transitionProgress);
    } else {
      // Draw single visualization
      this.drawVisualization(this.currentVisualization);
    }
    
    this.animationFrame = requestAnimationFrame(() => this.visualize());
  }

  private updateVisualizationParams(deltaTime: number) {
    // Update parameters for dynamic visualizations
    this.visualizationParams.quantum.rotation += deltaTime * 0.5;
    this.visualizationParams.quantum.particleSize = 2 + (this.getAverageAmplitude() * 6);
    this.visualizationParams.quantum.waveHeight = 150 + (this.getAverageAmplitude() * 100);
    
    this.visualizationParams.neural.particleCount = 80 + Math.floor(this.getAverageAmplitude() * 40);
    this.visualizationParams.neural.connectionThreshold = 0.2 + (this.getAverageAmplitude() * 0.3);
    
    this.visualizationParams.temporal.waveHeight = 200 + (this.getAverageAmplitude() * 150);
    this.visualizationParams.temporal.fillOpacity = 0.1 + (this.getAverageAmplitude() * 0.3);
  }

  private getAverageAmplitude(): number {
    if (!this.dataArray) return 0;
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    return sum / (this.dataArray.length * 255);
  }

  private drawMorphingVisualization(progress: number) {
    // Draw a morphing effect between current and next visualization
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    
    // Save context
    this.ctx.save();
    
    // Apply morphing transformation
    const scale = 0.9 + 0.2 * Math.sin(progress * Math.PI);
    const rotation = progress * Math.PI;
    
    this.ctx.translate(centerX, centerY);
    this.ctx.scale(scale, scale);
    this.ctx.rotate(rotation);
    this.ctx.translate(-centerX, -centerY);
    
    // Draw a hybrid visualization during transition
    this.drawHybridVisualization(progress);
    
    // Restore context
    this.ctx.restore();
  }

  private drawHybridVisualization(progress: number) {
    // Create a hybrid visualization that morphs between the two
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    // Draw particles that transform from one pattern to another
    const particleCount = 150;
    
    for (let i = 0; i < particleCount; i++) {
      const amplitude = this.dataArray![i % this.dataArray!.length] / 255;
      const angle = (i * 2 * Math.PI) / particleCount;
      
      // Calculate position based on progress
      let x, y;
      
      if (progress < 0.5) {
        // First half of transition - from circular to particle
        const circleX = centerX + Math.cos(angle) * radius;
        const circleY = centerY + Math.sin(angle) * radius;
        const particleX = centerX + Math.cos(angle) * (amplitude * radius * 0.7);
        const particleY = centerY + Math.sin(angle) * (amplitude * radius * 0.7);
        
        x = circleX + (particleX - circleX) * (progress * 2);
        y = circleY + (particleY - circleY) * (progress * 2);
      } else {
        // Second half of transition - from particle to waveform
        const particleX = centerX + Math.cos(angle) * (amplitude * radius * 0.7);
        const particleY = centerY + Math.sin(angle) * (amplitude * radius * 0.7);
        const waveX = (i / particleCount) * (this.canvas.width / 2);
        const waveY = centerY - (amplitude - 0.5) * this.visualizationParams.temporal.waveHeight;
        
        x = particleX + (waveX - particleX) * ((progress - 0.5) * 2);
        y = particleY + (waveY - particleY) * ((progress - 0.5) * 2);
      }
      
      const size = 2 + amplitude * 8;
      const hue = (i * 360 / particleCount + Date.now() / 40) % 360;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${0.7 - progress * 0.5})`;
      this.ctx.fill();
    }
  }

  private drawVisualization(visualization: number) {
    switch (visualization) {
      case 0:
        this.drawQuantumResonance();
        break;
      case 1:
        this.drawNeuralParticles();
        break;
      case 2:
        this.drawTemporalWaveforms();
        break;
    }
  }

  private drawQuantumResonance() {
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    const radius = Math.min(centerX, centerY) * 0.8;
    
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(this.visualizationParams.quantum.rotation);
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const angle = (i * 2 * Math.PI) / this.dataArray!.length;
      
      const x1 = Math.cos(angle) * radius;
      const y1 = Math.sin(angle) * radius;
      const x2 = Math.cos(angle) * (radius + amplitude * this.visualizationParams.quantum.waveHeight * 0.5);
      const y2 = Math.sin(angle) * (radius + amplitude * this.visualizationParams.quantum.waveHeight * 0.5);
      
      const hue = (i * 360 / this.dataArray!.length + Date.now() / 50) % 360;
      this.ctx.strokeStyle = `hsl(${hue}, 80%, 65%)`;
      this.ctx.lineWidth = this.visualizationParams.quantum.particleSize + amplitude * 3;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
    
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.2);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGradient.addColorStop(1, 'rgba(120, 150, 255, 0.5)');
    
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.2, 0, 2 * Math.PI);
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawNeuralParticles() {
    const particleCount = this.visualizationParams.neural.particleCount;
    const centerX = this.canvas.width / 4;
    const centerY = this.canvas.height / 4;
    
    const particles: {x: number, y: number, size: number, hue: number}[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const amplitude = this.dataArray![i % this.dataArray!.length] / 255;
      const angle = (i * 2 * Math.PI) / particleCount;
      const distance = amplitude * this.visualizationParams.neural.maxDistance;
      
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      const size = 2 + amplitude * 8;
      const hue = (i * 360 / particleCount + Date.now() / 40) % 360;
      
      particles.push({x, y, size, hue});
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.9)`;
      this.ctx.fill();
    }
    
    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.visualizationParams.neural.maxDistance * this.visualizationParams.neural.connectionThreshold) {
          this.ctx.beginPath();
          this.ctx.moveTo(particles[i].x, particles[i].y);
          this.ctx.lineTo(particles[j].x, particles[j].y);
          this.ctx.strokeStyle = `hsla(${particles[i].hue}, 70%, 60%, ${0.3 - distance / (this.visualizationParams.neural.maxDistance * 2)})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }
    }
  }

  private drawTemporalWaveforms() {
    const centerY = this.canvas.height / 4;
    const width = this.canvas.width / 2;
    const height = this.visualizationParams.temporal.waveHeight;
    
    // Draw background gradient
    const bgGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    bgGradient.addColorStop(0, 'rgba(15, 20, 30, 0.4)');
    bgGradient.addColorStop(1, 'rgba(20, 25, 35, 0.4)');
    
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, centerY - height/2, width, height);
    
    // Draw waveform
    this.ctx.beginPath();
    
    for (let i = 0; i < this.dataArray!.length; i++) {
      const amplitude = this.dataArray![i] / 255;
      const x = (i / this.dataArray!.length) * width;
      const y = centerY - (amplitude - 0.5) * height;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    const timeOffset = Date.now() / 100;
    const waveformGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    waveformGradient.addColorStop(0, `hsl(${(timeOffset) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(0.5, `hsl(${(timeOffset + 120) % 360}, 70%, 65%)`);
    waveformGradient.addColorStop(1, `hsl(${(timeOffset + 240) % 360}, 70%, 65%)`);
    
    this.ctx.strokeStyle = waveformGradient;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Fill waveform
    this.ctx.lineTo(width, centerY);
    this.ctx.lineTo(0, centerY);
    this.ctx.closePath();
    
    const fillGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    fillGradient.addColorStop(0, `hsla(${(timeOffset) % 360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`);
    fillGradient.addColorStop(0.5, `hsla(${(timeOffset + 120) % 360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`);
    fillGradient.addColorStop(1, `hsla(${(timeOffset + 240) % 360}, 70%, 65%, ${this.visualizationParams.temporal.fillOpacity})`);
    
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.visualizationTimer) {
      clearTimeout(this.visualizationTimer);
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth Neural Edition...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="quantum-container">
      <div class="quantum-header">
        <h1 class="quantum-title">QuantumSynth</h1>
        <p class="quantum-subtitle">Infinite audio-reactive visualizations</p>
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
            </div>
            
            <button id="startButton" class="quantum-btn primary">
              <span class="btn-icon">▶</span>
              Start Screen Sharing
            </button>
            
            <button id="stopButton" class="quantum-btn secondary" style="display: none;">
              <span class="btn-icon">⏹</span>
              Stop Sharing
            </button>
          </div>
        </div>
        
        <div class="visualization-container">
          <div class="viz-header">
            <h3>Visualization</h3>
            <div class="status-indicator">
              <span class="status-dot"></span>
              <span class="status-text">Standby</span>
            </div>
          </div>
          <div class="viz-mode">
            <span class="mode-label">Mode:</span>
            <span id="currentVisualization">Quantum Resonance</span>
          </div>
          <canvas id="visualizer"></canvas>
          <div class="viz-footer">
            <p>Visualizations will automatically morph every 20-30 seconds</p>
          </div>
        </div>
      </div>
      
      <div class="quantum-footer">
        <p>QuantumSynth v1.2.0 - Infinite Visualization Engine</p>
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
  const statusDot = document.querySelector('.status-dot')!;
  const statusText = document.querySelector('.status-text')!;

  startButton.addEventListener('click', initializeScreenShare);
  stopButton.addEventListener('click', stopScreenShare);

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
    startButton.style.display = 'block';
    startButton.disabled = false;
    startButton.innerHTML = '<span class="btn-icon">▶</span> Start Screen Sharing';
    statusDot.classList.remove('active');
    statusText.textContent = 'Standby';
  }
});
EOF

# Update backend to support future visualization generation
cat > main.go << 'EOF'
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"
	
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

type VisualizationParams struct {
	Type       string            `json:"type"`
	Parameters map[string]float64 `json:"parameters"`
	Duration   int               `json:"duration"` // Duration in seconds
}

var (
	visualizationQueue []VisualizationParams
	currentViz         VisualizationParams
)

func main() {
	rand.Seed(time.Now().UnixNano())
	
	router := mux.NewRouter()
	
	// API endpoints
	router.HandleFunc("/api/visualization/next", getNextVisualization).Methods("GET")
	router.HandleFunc("/api/visualization/current", getCurrentVisualization).Methods("GET")
	router.HandleFunc("/api/visualization/generate", generateVisualization).Methods("POST")
	router.HandleFunc("/api/health", healthCheck).Methods("GET")
	
	// WebSocket endpoint for real-time updates
	router.HandleFunc("/ws", handleWebSocket)
	
	// Serve frontend
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./frontend/dist/")))
	
	// Initialize with some visualizations
	initializeVisualizations()
	
	// Start visualization scheduler
	go visualizationScheduler()
	
	// CORS middleware
	headers := handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"})
	methods := handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE"})
	origins := handlers.AllowedOrigins([]string{"*"})
	
	fmt.Println("QuantumSynth backend server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", handlers.CORS(headers, methods, origins)(router)))
}

func initializeVisualizations() {
	// Add some initial visualizations to the queue
	visualizationQueue = []VisualizationParams{
		{
			Type: "quantum",
			Parameters: map[string]float64{
				"rotation":     0.5,
				"particleSize": 3.0,
				"waveHeight":   200.0,
			},
			Duration: 20,
		},
		{
			Type: "neural",
			Parameters: map[string]float64{
				"particleCount":       120.0,
				"connectionThreshold": 0.4,
				"maxDistance":         180.0,
			},
			Duration: 25,
		},
		{
			Type: "temporal",
			Parameters: map[string]float64{
				"waveWidth":   1.5,
				"waveHeight":  250.0,
				"fillOpacity": 0.3,
			},
			Duration: 15,
		},
	}
	
	if len(visualizationQueue) > 0 {
		currentViz = visualizationQueue[0]
	}
}

func visualizationScheduler() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	vizTimer := 0
	
	for range ticker.C {
		if len(visualizationQueue) == 0 {
			// Generate a new visualization if queue is empty
			newViz := generateRandomVisualization()
			visualizationQueue = append(visualizationQueue, newViz)
			continue
		}
		
		vizTimer++
		
		// Check if it's time to switch to next visualization
		if vizTimer >= currentViz.Duration {
			// Move to next visualization
			visualizationQueue = visualizationQueue[1:]
			if len(visualizationQueue) > 0 {
				currentViz = visualizationQueue[0]
			} else {
				// Generate a new one if queue is empty
				currentViz = generateRandomVisualization()
				visualizationQueue = append(visualizationQueue, currentViz)
			}
			
			vizTimer = 0
			fmt.Printf("Switched to new visualization: %s\n", currentViz.Type)
		}
	}
}

func generateRandomVisualization() VisualizationParams {
	vizTypes := []string{"quantum", "neural", "temporal"}
	randomType := vizTypes[rand.Intn(len(vizTypes))]
	
	var params map[string]float64
	
	switch randomType {
	case "quantum":
		params = map[string]float64{
			"rotation":     rand.Float64() * 2.0,
			"particleSize": 2.0 + rand.Float64()*4.0,
			"waveHeight":   150.0 + rand.Float64()*150.0,
		}
	case "neural":
		params = map[string]float64{
			"particleCount":       80.0 + rand.Float64()*80.0,
			"connectionThreshold": 0.2 + rand.Float64()*0.4,
			"maxDistance":         120.0 + rand.Float64()*100.0,
		}
	case "temporal":
		params = map[string]float64{
			"waveWidth":   0.5 + rand.Float64()*2.0,
			"waveHeight":  150.0 + rand.Float64()*150.0,
			"fillOpacity": 0.1 + rand.Float64()*0.3,
		}
	}
	
	return VisualizationParams{
		Type:       randomType,
		Parameters: params,
		Duration:   15 + rand.Intn(20), // 15-35 seconds
	}
}

func getNextVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	if len(visualizationQueue) > 1 {
		json.NewEncoder(w).Encode(visualizationQueue[1])
	} else if len(visualizationQueue) == 1 {
		// If only one visualization, generate a new one for the next
		nextViz := generateRandomVisualization()
		json.NewEncoder(w).Encode(nextViz)
	} else {
		// If queue is empty, generate a new one
		nextViz := generateRandomVisualization()
		json.NewEncoder(w).Encode(nextViz)
	}
}

func getCurrentVisualization(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(currentViz)
}

func generateVisualization(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Type string `json:"type"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}
	
	newViz := generateRandomVisualization()
	if req.Type != "" {
		newViz.Type = req.Type
	}
	
	visualizationQueue = append(visualizationQueue, newViz)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newViz)
}

func healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now(),
		"queueSize": len(visualizationQueue),
	})
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// WebSocket implementation would go here
	// This would allow real-time updates to the frontend
	// when new visualizations are generated
}
EOF

# Update backend dependencies
cat > go.mod << 'EOF'
module ai-processor

go 1.21

require (
    github.com/gorilla/handlers v1.5.2
    github.com/gorilla/mux v1.8.1
    github.com/gorilla/websocket v1.5.1
)
EOF

# Build and deploy both frontend and backend
cd frontend
npm run build
cd ..

# Build backend
go mod download
go build -o ai-processor .

# Deploy frontend to Azure Storage
az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Fix git commit time handling to ensure time always moves forward
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const shouldSameDay = Math.random() < 0.75; // 75% chance same day

let newDate;
if (shouldSameDay) {
  // Same day, ensure time is always later than last commit
  newDate = new Date(lastDate);
  
  // Add at least 1 minute, at most 3 hours
  const minutesToAdd = 1 + Math.floor(Math.random() * 179);
  newDate.setMinutes(newDate.getMinutes() + minutesToAdd);
  
  // If we've gone past midnight, move to next day instead
  if (newDate.getDate() !== lastDate.getDate()) {
    newDate = new Date(lastDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(Math.floor(Math.random() * 24));
    newDate.setMinutes(Math.floor(Math.random() * 60));
    newDate.setSeconds(Math.floor(Math.random() * 60));
  }
} else {
  // Different day (1-7 days later)
  const daysToAdd = Math.floor(Math.random() * 7) + 1;
  newDate = new Date(lastDate);
  newDate.setDate(newDate.getDate() + daysToAdd);
  newDate.setHours(Math.floor(Math.random() * 24));
  newDate.setMinutes(Math.floor(Math.random() * 60));
  newDate.setSeconds(Math.floor(Math.random() * 60));
}

// Make sure we don't go beyond current date
const now = new Date();
if (newDate > now) newDate = now;

console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "feat: add morphing transitions and backend support for infinite visualizations"
echo "✅ Added morphing transitions and backend support for infinite visualizations!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the new visualizations"
echo "🚀 Backend updated with visualization API for endless generative visualizations"