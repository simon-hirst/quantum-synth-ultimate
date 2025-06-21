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

        <div class="qs-kv">
          <div id="status" class="qs-status">Ready</div>
          <div id="fps" class="qs-fps">FPS: 0</div>
        </div>

        <div class="qs-actions">
          <button id="btnShare" class="btn btn-primary">Start Screen Sharing</button>
          <button id="btnDemo" class="btn btn-ghost">Demo Mode</button>
        </div>

        <h2 class="qs-h2">Setup</h2>
        <ol class="qs-list">
          <li>Use Chrome or Edge for best results</li>
          <li>When prompted, tick <b>“Share audio”</b></li>
          <li>Select the tab/window you want visualised</li>
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
  const statusEl = document.getElementById('status')!;
  const fpsEl    = document.getElementById('fps')!;
  const btnShare = document.getElementById('btnShare') as HTMLButtonElement;
  const btnDemo  = document.getElementById('btnDemo') as HTMLButtonElement;

  if (!canvas) return;

  const viz = new Visualizer(canvas, {
    onStatus: (s) => { statusEl.textContent = s; },
    onFps: (f) => { fpsEl.textContent = `FPS: ${f}`; },
  });
  viz.start(); // Start render loop (audio uniforms will be 0 until a source is provided)

  btnShare.addEventListener('click', async () => {
    btnShare.disabled = true;
    statusEl.textContent = 'Requesting screen share (enable "Share audio")…';
    try {
      await viz.startScreenShare();
      statusEl.textContent = 'Screen sharing active';
      btnShare.textContent = 'Stop Screen Sharing';
      btnShare.disabled = false;

      // Toggle behaviour: stop if already sharing
      btnShare.onclick = async () => {
        if (viz.isSharing()) {
          viz.stopScreenShare();
          statusEl.textContent = 'Screen share stopped';
          btnShare.textContent = 'Start Screen Sharing';
        } else {
          btnShare.disabled = true;
          statusEl.textContent = 'Requesting screen share…';
          try {
            await viz.startScreenShare();
            statusEl.textContent = 'Screen sharing active';
            btnShare.textContent = 'Stop Screen Sharing';
          } catch (e) {
            statusEl.textContent = 'Permission denied or no audio shared';
          } finally {
            btnShare.disabled = false;
          }
        }
      };
    } catch (e) {
      statusEl.textContent = 'Permission denied or no audio shared';
      btnShare.disabled = false;
    }
  });

  let demo = false;
  btnDemo.addEventListener('click', () => {
    demo = !demo;
    viz.setDemoMode(demo);
    btnDemo.textContent = demo ? 'Stop Demo' : 'Demo Mode';
    statusEl.textContent = demo ? 'Demo mode active' : 'Ready';
  });
});
