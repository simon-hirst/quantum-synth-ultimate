export const setupAudio = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.7
  const gain = ctx.createGain()
  gain.gain.value = 1
  gain.connect(analyser)
  analyser.connect(ctx.destination)

  let stream = null
  let source = null

  const buffers = {
    time: new Float32Array(analyser.fftSize),
    freq: new Uint8Array(analyser.frequencyBinCount),
    linear: new Float32Array(analyser.frequencyBinCount),
    flux: new Float32Array(1024)
  }

  const state = {
    bpm: 120,
    beat: 0,
    bass: 0, mid: 0, treble: 0,
    energy: 0,
    silence: false,
    calibrating: false,
    gain: 1,
    fluxIdx: 0,
    ready: false
  }

  const getDisplayWithAudio = async () => {
    try {
      return await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { systemAudio: 'include' }
      })
    } catch (e) {
      if (e && (e.name === 'NotSupportedError' || e.name === 'OverconstrainedError')) {
        return await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      }
      throw e
    }
  }

  const share = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      throw new Error('Display capture with audio is not available in this browser')
    }
    if (stream) stream.getTracks().forEach(t => t.stop())
    stream = await getDisplayWithAudio()

    const hasAudio = stream.getAudioTracks().length > 0
    if (!hasAudio) {
      stream.getTracks().forEach(t => t.stop())
      throw new Error('No audio in the selected source. Pick a Chrome tab and tick “Share tab audio”, or share Entire screen with “Share system audio”.')
    }

    stream.getVideoTracks().forEach(t => { t.enabled = false })

    source = ctx.createMediaStreamSource(stream)
    source.connect(gain)
    state.ready = true
    if (ctx.state === 'suspended') await ctx.resume()
  }

  const update = () => {
    analyser.getFloatTimeDomainData(buffers.time)
    analyser.getByteFrequencyData(buffers.freq)
    for (let i = 0; i < buffers.freq.length; i++) buffers.linear[i] = buffers.freq[i] / 255

    let sum = 0
    for (let i = 0; i < buffers.time.length; i++) sum += buffers.time[i] * buffers.time[i]
    const rms = Math.sqrt(sum / buffers.time.length)
    const target = 0.12
    const needsAuto = state.calibrating || (rms < 0.02 || rms > 0.2)
    if (needsAuto) {
      const k = Math.min(5, Math.max(0.2, target / (rms + 1e-6)))
      gain.gain.value = gain.gain.value * 0.98 + k * 0.02
      state.gain = gain.gain.value
    }

    const integrate = (a, b) => {
      let s = 0, c = 0
      for (let i = a; i < b; i++) { s += buffers.linear[i]; c++ }
      return s / Math.max(1, c)
    }
    state.bass = integrate(0, 64)
    state.mid = integrate(64, 512)
    state.treble = integrate(512, buffers.linear.length)
    state.energy = state.bass * 0.5 + state.mid * 0.35 + state.treble * 0.15

    const m = Math.min(1024, buffers.linear.length)
    let flux = 0
    for (let i = 0; i < m; i++) {
      const idx = (state.fluxIdx + i) % 1024
      const prev = buffers.flux[idx]
      const cur = buffers.linear[i]
      flux += Math.max(0, cur - prev)
      buffers.flux[idx] = cur
    }
    state.fluxIdx = (state.fluxIdx + m) % 1024
    const beatGate = state.energy > 0.02 && flux > 0.5
    state.beat = Math.max(0, state.beat * 0.9 + (beatGate ? 0.5 : 0))
    state.silence = state.energy < 0.01
  }

  const calibrate = () => {
    state.calibrating = true
    setTimeout(() => { state.calibrating = false }, 2000)
  }

  return { ctx, analyser, buffers, state, share, update, calibrate }
}
