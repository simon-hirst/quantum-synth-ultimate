// frontend/src/main.ts
import "./style.css";
import { NeuralVisualizer } from "./neural-visualizer";

// Prefer the canvas in frontend/index.html, fall back to the root index.html id
const canvas =
  (document.getElementById("quantumCanvas") as HTMLCanvasElement) ||
  (document.getElementById("glCanvas") as HTMLCanvasElement);

if (!canvas) {
  throw new Error("Canvas element not found. Make sure index.html has #quantumCanvas.");
}

const viz = new NeuralVisualizer(canvas);

function button(label: string, onClick: () => void) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText = "padding:10px 14px;margin:6px;border-radius:8px;border:0;background:#4F46E5;color:#fff;font-weight:600;cursor:pointer";
  b.onclick = onClick;
  return b;
}

// Sensitivity (gain)
{
  const gain = document.createElement("input");
  gain.type = "range"; gain.min = "0.1"; gain.max = "5"; gain.step = "0.1"; gain.value = "1";
  gain.oninput = () => viz.setGain(parseFloat(gain.value));
  wrap.append(label("Sensitivity", gain));
}
// Theme
{
  const theme = document.createElement("select");
  ["Purple","Neon","Sunset"].forEach(n => {
    const o = document.createElement("option"); o.value=n; o.text=n; theme.append(o);
  });
  theme.onchange = () => viz.setTheme(theme.value as any);
  theme.value = "Purple";
  wrap.append(label("Theme", theme));
}


(function mountCaptureOverlay() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none";
  const panel = document.createElement("div");
  panel.style.cssText = "pointer-events:auto;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);padding:16px 20px;border-radius:12px;color:#fff;font-family:system-ui, sans-serif;text-align:center;max-width:560px";
  const title = document.createElement("div");
  title.textContent = "Choose an audio source";
  title.style.cssText = "font-size:18px;font-weight:700;margin-bottom:8px";
  const hint = document.createElement("div");
  hint.style.cssText = "font-size:13px;opacity:.9;margin-bottom:12px";
  hint.innerHTML = location.hostname.startsWith("192.168.") || location.hostname.includes(".")
    ? 'Tip: for screen-audio capture, open this on <b>http://localhost:5173</b> or use HTTPS.'
    : 'Grant permission to capture audio. For screen-audio, select "Entire screen" and tick "Share audio".';

  const row = document.createElement("div");
  row.style.cssText = "display:flex;flex-wrap:wrap;justify-content:center;margin-top:6px";

  row.append(
    button("Share system audio", () => { viz.startAudioProcessing("display"); wrap.remove(); }),
    button("Use microphone", () => { viz.startAudioProcessing("mic"); wrap.remove(); }),
    button("Demo signal", () => { viz.startAudioProcessing("osc"); wrap.remove(); }),
  );

  panel.append(title, hint, row);
  wrap.append(panel);
  document.body.append(wrap);
})();


window.addEventListener("resize", () => viz.resize());
