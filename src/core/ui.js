export const createUI = (manager, audio) => {
  const share = document.getElementById('share')
  const next = document.getElementById('next')
  const prev = document.getElementById('prev')
  const picker = document.getElementById('picker')
  const fs = document.getElementById('fs')
  const pip = document.getElementById('pip')
  const cal = document.getElementById('cal')
  const name = document.getElementById('name')

  picker.innerHTML = manager.names().map((n,i)=>`<option value="${i}">${i+1}. ${n}</option>`).join('')
  name.textContent = manager.names()[0]

  share.onclick = async () => {
    try {
      await audio.share()
    } catch (e) {
      const msg = (e && e.message) ? e.message : 'Screen share with audio is not supported here'
      alert(msg + '\nUse Chrome or Edge, then pick a tab or the entire screen and tick the audio checkbox.')
    }
  }

  next.onclick = () => { manager.next(); picker.selectedIndex = manager.index; name.textContent = manager.names()[manager.index] }
  prev.onclick = () => { manager.prev(); picker.selectedIndex = manager.index; name.textContent = manager.names()[manager.index] }
  picker.onchange = e => { const i = parseInt(e.target.value,10); manager.set(i); name.textContent = manager.names()[i] }
  cal.onclick = () => audio.calibrate()

  fs.onclick = () => {
    const el = document.documentElement
    if (!document.fullscreenElement) el.requestFullscreen().catch(()=>{})
    else document.exitFullscreen().catch(()=>{})
  }

  let pipVideo = null
  pip.onclick = async () => {
    try {
      const canvas = document.getElementById('screen')
      if (!pipVideo) {
        pipVideo = document.createElement('video')
        pipVideo.srcObject = canvas.captureStream(60)
        await pipVideo.play()
      }
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await pipVideo.requestPictureInPicture()
    } catch {}
  }

  return { share, next, prev, picker, fs, pip, cal }
}
