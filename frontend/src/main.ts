import "./style.css";
import { NeuralVisualizer } from "./neural-visualizer";

const canvas = document.getElementById("visual") as HTMLCanvasElement;
const viz = new NeuralVisualizer(canvas);

function wrap() {
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;top:12px;right:12px;z-index:20;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);padding:10px 12px;border-radius:12px;display:flex;gap:10px;align-items:center;color:#fff;font:13px system-ui";
  return el;
}
function button(label: string, on: () => void, bg = "#4F46E5") {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.cssText = `padding:6px 10px;border:0;border-radius:8px;background:${bg};color:#fff;cursor:pointer`;
  b.onclick = on; return b;
}
function row(text: string, el: HTMLElement) {
  const r = document.createElement("div");
  r.style.cssText = "display:flex;gap:6px;align-items:center";
  const t = document.createElement("span");
  t.textContent = text; t.style.opacity = "0.8";
  r.append(t, el); return r;
}

const panel = wrap();
panel.append(
  button("System", () => viz.start("display")),
  button("Mic", () => viz.start("mic")),
  button("Demo", () => viz.start("osc"), "#10B981")
);

const gain = document.createElement("input");
gain.type = "range"; gain.min = "0.1"; gain.max = "5"; gain.step = "0.1"; gain.value = "1.2";
gain.oninput = () => viz.setGain(parseFloat(gain.value));
panel.append(row("Sensitivity", gain));

const preset = document.createElement("select");
["Aurora","Neon","Sunset","Lush","Candy"].forEach(n => {
  const o = document.createElement("option"); o.value = n; o.text = n; preset.append(o);
});
preset.onchange = () => viz.setTheme(preset.value as any);
preset.value = "Aurora";
panel.append(row("Theme", preset));

panel.append(button("Fullscreen", () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}, "#374151"));

document.body.append(panel);
