import './style.css';
import { Visualizer } from './visualizer';

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector<HTMLDivElement>('#app');
  if (!root) return;

  const shell = h('div', 'qs-shell');
  const side  = h('aside', 'qs-side');
  const main  = h('main', 'qs-main');
  const header = `
    <div class="brand">
      <div class="dot"></div>
      <div class="title">QuantumSynth</div>
      <div class="subtitle">Neural Edition</div>
    </div>
  `;

  const tips = `
    <div class="section-title">Setup</div>
    <ol class="setup">
      <li>Use <b>Chrome</b> or <b>Edge</b> for best results</li>
      <li><b>Best compatibility:</b> choose <b>Entire Screen</b> and tick <b>Share audio</b> (DRM tabs often block audio)</li>
      <li>Select the tab/window you want visualised</li>
      <li>Press <b>M</b> (or 1–0) to switch visualisations</li>
    </ol>
    <div class="built-by">built by <a href="https://github.com/simon-hirst" target="_blank" rel="noreferrer">github.com/simon-hirst</a></div>
  `;

  side.innerHTML = `
    ${header}
    <div class="controls">
      <button id="btnStart" class="btn primary">Start Screen Sharing</button>
      <button id="btnStop"  class="btn">Stop</button>
      <button id="btnDemo"  class="btn ghost">Demo Mode</button>
      <div class="status" id="status">Ready</div>
    </div>
    ${tips}
  `;

  const canvas = h('canvas', 'qs-canvas') as HTMLCanvasElement;
  canvas.id = 'visualizer';
  main.appendChild(canvas);

  shell.appendChild(side);
  shell.appendChild(main);
  root.innerHTML = '';
  root.appendChild(shell);

  const viz = new Visualizer(canvas);
  const statusEl = document.getElementById('status')!;

  const btnStart = document.getElementById('btnStart') as HTMLButtonElement;
  const btnStop  = document.getElementById('btnStop')  as HTMLButtonElement;
  const btnDemo  = document.getElementById('btnDemo')  as HTMLButtonElement;

  btnStart.onclick = async () => {
    statusEl.textContent = 'Requesting screen share…';
    try {
      await viz.startScreenShare();
      statusEl.textContent = 'Screen sharing active ✓ — Best compatibility: choose “Entire Screen” + “Share audio”';
    } catch (e:any) {
      console.error(e);
      statusEl.textContent = 'Screen share failed. Tip: select “Entire Screen” and enable “Share audio”';
    }
  };

  btnStop.onclick = () => {
    viz.stopScreenShare();
    statusEl.textContent = 'Stopped';
  };

  btnDemo.onclick = () => {
    viz.setDemoMode(true);
    statusEl.textContent = 'Demo mode active';
  };

  // Resize the canvas container when window changes
  const ro = new ResizeObserver(() => {
    const w = main.clientWidth, h = main.clientHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  });
  ro.observe(main);
});
