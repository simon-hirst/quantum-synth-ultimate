import { Visualizer } from './visualizer';

class QuantumSynth {
    private visualizer: Visualizer | null = null;

    constructor() {
        console.log('QuantumSynth Neural Edition constructor called');
        this.initializeVisualizer();
        this.simulateAudioData();
    }

    private initializeVisualizer() {
        const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;
        if (canvas) {
            console.log('Canvas found, initializing visualizer');
            this.visualizer = new Visualizer(canvas);
            console.log('Visualizer initialized successfully');
        } else {
            console.error('Canvas element not found');
        }
    }

    private simulateAudioData() {
        // Simulate audio data for testing
        setInterval(() => {
            if (this.visualizer) {
                const data = new Uint8Array(256);
                for (let i = 0; i < 256; i++) {
                    data[i] = Math.random() * 128 + 128;
                }
                this.visualizer.updateAudioData(data);
                this.visualizer.render();
            }
        }, 100);
    }
}

// Initialize
console.log('Initializing QuantumSynth...');
new QuantumSynth();
