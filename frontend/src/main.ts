import './style.css'

class QuantumSynth {
  // ... (existing QuantumSynth class code remains the same until the fetchNewShader method)

  private async fetchNewShader() {
    const endpoints = [
      'https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io/api/shader/next',
      'http://localhost:8080/api/shader/next'
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout
        
        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          this.nextVizType = data.type || 'quantum';
          this.currentVizName = data.name || 'Quantum Resonance';
          this.statusDot.classList.remove('pending');
          this.statusDot.classList.add('active');
          this.statusElement.textContent = 'Active';
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
    this.statusDot.classList.remove('active');
    this.statusDot.classList.add('pending');
    this.statusElement.textContent = 'Local Mode';
    this.generateLocalShader();
  }

  // ... (rest of the class remains the same)
}

// ... (rest of the file remains the same)
