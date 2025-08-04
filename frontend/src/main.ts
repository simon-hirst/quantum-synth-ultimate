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

  side.innerHTML = `
    <div class="brand">
      <div class="dot"></div>
      <div class="title">QuantumSynth</div>
      <div class="subtitle">Neural Edition</div>
    </div>
    <div class="controls">
      <button id="btnStart" class="btn primary">Start Screen Sharing</button>
      <button id="btnStop"  class="btn">Stop</button>
      <button id="btnDemo"  class="btn ghost">Demo Mode</button>
      <button id="btnPause" class="btn ghost">Pause rotation (P)</button>
      <div class="status" id="status">Ready</div>
    </div>
    <div class="section-title">Setup</div>
    <ol class="setup">
      <li>Use <b>Chrome</b> or <b>Edge</b> for best results</li>
      <li><b>Best compatibility:</b> choose <b>Entire Screen</b> and tick <b>Share audio</b> (DRM tabs often block audio)</li>
      <li>Select the tab/window you want visualised</li>
      <li>Press <b>M</b> (or 1–5) to switch visualisations</li>
    </ol>
    <div class="built-by">built by <a href="https://github.com/simon-hirst" target="_blank" rel="noreferrer">github.com/simon-hirst</a></div>
  `;
  // === injected: sidebar toggle + fullscreen button ===
  const btnToggleSide = h('button', 'qs-side-toggle', '◄');
  btnToggleSide.id = 'btnToggleSide';
  btnToggleSide.title = 'Toggle sidebar';
  side.prepend(btnToggleSide);

  const btnFullscreen = h('button', 'qs-fullscreen', '⛶');
  btnFullscreen.id = 'btnFullscreen';
  btnFullscreen.title = 'Fullscreen';
  main.appendChild(btnFullscreen);
  // === end injected ===


  const canvas = h('canvas', 'qs-canvas') as HTMLCanvasElement;
  canvas.id = 'visualizer';
  main.appendChild(canvas);

  shell.appendChild(side);
  shell.appendChild(main);
  root.innerHTML = '';
  root.appendChild(shell);

  const statusEl = document.getElementById('status') as HTMLDivElement;
  const btnStart = document.getElementById('btnStart') as HTMLButtonElement;
  const btnStop  = document.getElementById('btnStop')  as HTMLButtonElement;
  const btnDemo  = document.getElementById('btnDemo')  as HTMLButtonElement;
  const btnPause = document.getElementById('btnPause') as HTMLButtonElement;

  const viz = new Visualizer(canvas, {
    onStatus: (s) => { statusEl.textContent = s; },
    onFps: (fps) => { /* optionally show fps */ }
  });

  const setPauseLabel = () => {
    btnPause.textContent = viz.isPaused() ? 'Resume rotation (P)' : 'Pause rotation (P)';
  };

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
  btnStop.onclick = () => { viz.stopScreenShare(); statusEl.textContent = 'Stopped'; };
  btnDemo.onclick = () => { viz.setDemoMode(true); statusEl.textContent = 'Demo mode active'; };
  btnPause.onclick = () => { viz.togglePause(); setPauseLabel(); };
  

  // Keep the canvas sized to its container
  const ro = new ResizeObserver(() => {
    const w = main.clientWidth, h = main.clientHeight;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  });
  ro.observe(main);

  setPauseLabel();

  // Start the render loop (and fetch server shader)
  viz.start().catch(err => console.error(err));

  


// QS010 handlers start
{
  const shellEl = shell;
  const btnToggleSide = document.getElementById('btnToggleSide') as HTMLButtonElement | null;
  const btnFullscreen = document.getElementById('btnFullscreen') as HTMLButtonElement | null;

  if (btnToggleSide) {
    btnToggleSide.onclick = () => {
      shellEl.classList.toggle('side-collapsed');
      btnToggleSide.textContent = shellEl.classList.contains('side-collapsed') ? '►' : '◄';
      window.dispatchEvent(new Event('resize'));
    };
  }

  const requestFs = async (el: any) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    if ((el as any).webkitRequestFullscreen) return (el as any).webkitRequestFullscreen();
    if ((el as any).msRequestFullscreen) return (el as any).msRequestFullscreen();
  };
  const exitFs = async () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    if ((document as any).webkitExitFullscreen) return (document as any).webkitExitFullscreen();
    if ((document as any).msExitFullscreen) return (document as any).msExitFullscreen();
  };

  if (btnFullscreen) {
    btnFullscreen.onclick = async () => {
      const target: any = document.querySelector('.qs-main') || document.documentElement;
      if (!document.fullscreenElement &&
          !(document as any).webkitFullscreenElement &&
          !(document as any).msFullscreenElement) {
        await requestFs(target);
      } else {
        await exitFs();
      }
    };
  }
}
// QS010 handlers end

});