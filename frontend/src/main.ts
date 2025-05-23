// Import styles if they exist
try {
  import('./style.css');
} catch (e) {
  console.log('No stylesheet found, using default styles');
}

import { QuantumSynth } from './visualizer'

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth...');
  
  // Get or create canvas element
  let canvas = document.getElementById('quantumCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.log('Canvas not found, creating one...');
    canvas = document.createElement('canvas');
    canvas.id = 'quantumCanvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    document.body.appendChild(canvas);
  }

  // Initialize QuantumSynth with the canvas
  const quantumSynth = new QuantumSynth(canvas);
  quantumSynth.initialize();

  // Handle page unload
  window.addEventListener('beforeunload', () => {
    quantumSynth.disconnect();
  });
});

// Handle window resize
window.addEventListener('resize', () => {
  const canvas = document.getElementById('quantumCanvas') as HTMLCanvasElement;
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});
