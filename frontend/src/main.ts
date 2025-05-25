import './style.css'

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing QuantumSynth...');
  
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div class="container">
      <h1>QuantumSynth Neural Edition</h1>
      <div class="instructions">
        <h2>Setup Instructions:</h2>
        <ol>
          <li>Click "Start Screen Sharing" below</li>
          <li>Select your entire screen</li>
          <li>Check "Share audio" option</li>
          <li>Click "Share"</li>
        </ol>
        <button id="startButton">Start Screen Sharing</button>
      </div>
      <canvas id="visualizer"></canvas>
    </div>
  `;

  const startButton = document.getElementById('startButton')!;
  startButton.addEventListener('click', initializeScreenShare);
});

function initializeScreenShare() {
  const startButton = document.getElementById('startButton') as HTMLButtonElement;
  startButton.disabled = true;
  startButton.textContent = 'Starting...';

  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia({ 
      video: true,
      audio: true 
    })
    .then(stream => {
      console.log('Screen sharing started');
      startButton.style.display = 'none';
      initializeVisualizer(stream);
    })
    .catch(error => {
      console.error('Error starting screen share:', error);
      startButton.disabled = false;
      startButton.textContent = 'Try Again';
    });
  } else {
    alert('Screen sharing not supported in this browser');
    startButton.disabled = false;
    startButton.textContent = 'Start Screen Sharing';
  }
}

function initializeVisualizer(stream: MediaStream) {
  const canvas = document.getElementById('visualizer') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  // Initialize your visualizer here
  console.log('Initializing visualizer with stream:', stream);
}
