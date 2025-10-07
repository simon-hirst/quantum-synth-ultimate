export const setupAudio = async () => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = .7
  const gain = ctx.createGain()
  gain.gain.value = 1
  gain.connect(analyser)
  analyser.connect(ctx.destination)

  let stream = null
  let source = null

  const buffers = {
    time:new Float32Array(analyser.fftSize),
    freq:new Uint8Array(analyser.frequencyBinCount),
    linear:new Float32Array(analyser.frequencyBinCount),
    flux:new Float32Array(1024),
  }

  const state = {
    bpm:120,
    beat:0,
    bass:0, mid:0, treble:0,
    energy:0,
    silence:false,
    calibrating:false,
    gain:1,
    fluxIdx:0,
    lastFluxBeat:0,
    lastAutocal:0,
    ready:false
  }

  const share = async () => {
    if(stream) stream.getTracks().forEach(t=>t.stop())
    stream = await navigator.mediaDevices.getDisplayMedia({audio:true, video:false})
    source = ctx.createMediaStreamSource(stream)
    source.connect(gain)
    state.ready = true
    if(ctx.state==='suspended') await ctx.resume()
  }

  const update = (dt) => {
    analyser.getFloatTimeDomainData(buffers.time)
    analyser.getByteFrequencyData(buffers.freq)
    for(let i=0;i<buffers.freq.length;i++) buffers.linear[i] = buffers.freq[i]/255

    const n = buffers.time.length
    let sum = 0
    for(let i=0;i<n;i++) sum += buffers.time[i]*buffers.time[i]
    const rms = Math.sqrt(sum/n)
    const target = .12
    if(state.calibrating || (rms<.02 || rms>.2)) {
      const k = Math.min(5, Math.max(.2, target/(rms+1e-6)))
      gain.gain.value = gain.gain.value*0.98 + k*0.02
      state.gain = gain.gain.value
    }

    const bands = {bass:[0,64], mid:[64,512], treble:[512, buffers.linear.length]}
    const integrate = (a,b) => {
      let s=0,c=0
      for(let i=a;i<b;i++){ s+=buffers.linear[i]; c++ }
      return s/Math.max(1,c)
    }
    state.bass = integrate(...bands.bass)
    state.mid = integrate(...bands.mid)
    state.treble = integrate(...bands.treble)
    state.energy = (state.bass*.5 + state.mid*.35 + state.treble*.15)

    const fluxWin = 1024
    const m = Math.min(fluxWin, buffers.linear.length)
    let flux = 0
    for(let i=0;i<m;i++){
      const prev = buffers.flux[(state.fluxIdx+i)%fluxWin]
      const cur = buffers.linear[i]
      flux += Math.max(0, cur - prev)
      buffers.flux[(state.fluxIdx+i)%fluxWin] = cur
    }
    state.fluxIdx = (state.fluxIdx + m) % fluxWin
    const beatGate = state.energy>.02 && flux>.5
    state.beat = Math.max(0, state.beat*0.9 + (beatGate?0.5:0))

    state.silence = state.energy < .01
  }

  const calibrate = () => { state.calibrating = true; setTimeout(()=>state.calibrating=false, 2000) }

  return { ctx, analyser, buffers, state, share, update, calibrate }
}
