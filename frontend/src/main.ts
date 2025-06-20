import './style.css'
import { Visualizer } from './visualizer';

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;

  root.innerHTML = `
    <div class="qs-shell">
      <aside class="qs-panel glass">
        <h1 class="qs-title">QuantumSynth</h1>
        <p class="qs-sub">Neural Edition</p>
        <div class="qs-divider"></div>
        <h2 class="qs-h2">Setup</h2>
        <ol class="qs-list">
          <li>Use Chrome or Edge for best results</li>
          <li>Enable “Share audio” when screen sharing (feature coming soon)</li>
          <li>Allow motion/animation in browser settings</li>
        </ol>
        <div class="qs-footer">
          built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">https://github.com/simon-hirst</a>
        </div>
      </aside>

      <main class="qs-stage">
        <canvas id="visualizer" class="qs-canvas"></canvas>
      </main>
    </div>
  `;

  const canvas = document.getElementById('visualizer') as HTMLCanvasElement | null;
  if (!canvas) return;

  const viz = new Visualizer(canvas);
  viz.start(); // demo visualisations on by default
});
