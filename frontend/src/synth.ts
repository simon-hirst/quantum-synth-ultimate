export type SeqOpts = { bpm?: number };

export class StepSequencer {
  private ctx: AudioContext;
  private bpm = 120;
  private steps: boolean[] = new Array(16).fill(false);
  private rootFreq = 110;
  private playing = false;
  private timer: number | null = null;
  private gainNode: GainNode;

  constructor(ctx?: AudioContext, opts: SeqOpts = {}) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = ctx || new AC();
    this.bpm = opts.bpm ?? 120;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.12;
    this.gainNode.connect(this.ctx.destination);
  }

  setBpm(bpm: number) { this.bpm = Math.max(40, Math.min(240, bpm)); }
  setStep(i: number, on: boolean) { if (i>=0 && i<16) this.steps[i] = on; }
  getSteps() { return this.steps.slice(); }

  private noteFreq(step: number) {
    const scale = [0,3,5,7,10];
    const octave = Math.floor(step / 4);
    const degree = scale[step % 5];
    return this.rootFreq * Math.pow(2, octave/1.5) * Math.pow(2, degree/12);
  }

  private trigger(step: number) {
    if (!this.steps[step]) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = this.noteFreq(step);
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.9, t0 + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0005, t0 + 0.25);
    o.connect(env).connect(this.gainNode);
    o.start(t0);
    o.stop(t0 + 0.3);
  }

  async start() {
    if (this.playing) return;
    await this.ctx.resume();
    this.playing = true;
    let step = 0;
    const tickMs = () => (60_000 / this.bpm) / 4;
    const loop = () => {
      if (!this.playing) return;
      this.trigger(step);
      step = (step + 1) % 16;
      this.timer = window.setTimeout(loop, tickMs());
    };
    loop();
  }

  stop() {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }

  isPlaying() { return this.playing; }
  audioContext() { return this.ctx; }
}
