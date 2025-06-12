import './style.css'

class QuantumSynth {
  // ... (previous QuantumSynth class content remains the same until the connectToBackend method)

  private async connectToBackend() {
    // Try multiple endpoints with fallbacks
    const endpoints = [
      'https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next',
      'http://localhost:8080/api/shader/next',
      '/api/shader/next' // Relative path for same-origin requests
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const data = await response.json();
          this.nextShader = data.code;
          this.currentVizName = data.name;
          this.startTransition();
          console.log(`Connected to backend via ${endpoint}`);
          return;
        }
      } catch (error) {
        console.warn(`Failed to connect to ${endpoint}:`, error);
        continue;
      }
    }
    
    // If all endpoints fail, use local generation
    console.error('All backend connections failed, using local fallback');
    this.generateLocalShader();
  }

  // Modify the startPolling method to use the new connectToBackend
  private async startPolling() {
    // Start polling for new shaders
    this.pollingInterval = window.setInterval(() => {
      this.connectToBackend();
    }, 10000) as unknown as number;
    
    // Fetch initial shader
    this.connectToBackend();
  }

  // ... (rest of the QuantumSynth class remains the same)
}

// ... (rest of the file remains the same)
