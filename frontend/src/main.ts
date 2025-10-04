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

window.addEventListener("resize", () => viz.resize());
