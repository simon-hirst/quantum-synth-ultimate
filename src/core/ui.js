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

  share.onclick = async () => { await audio.share() }
  next.onclick = () => { manager.next(); picker.selectedIndex = manager.index; name.textContent = manager.names()[manager.index] }
  prev.onclick = () => { manager.prev(); picker.selectedIndex = manager.index; name.textContent = manager.names()[manager.index] }
  picker.onchange = e => { manager.set(parseInt(e.target.value,10)); name.textContent = manager.names()[parseInt(e.target.value,10)] }
  cal.onclick = () => audio.calibrate()

  fs.onclick = () => {
    const el = document.documentElement
    if(!document.fullscreenElement) el.requestFullscreen().catch(()=>{})
    else document.exitFullscreen().catch(()=>{})
  }

  let pipVideo = null
  pip.onclick = async () => {
    try{
      const canvas = document.getElementById('screen')
      if(!pipVideo){
        pipVideo = document.createElement('video')
        pipVideo.srcObject = canvas.captureStream(60)
        await pipVideo.play()
      }
      if(document.pictureInPictureElement) await document.exitPictureInPicture()
      else await pipVideo.requestPictureInPicture()
    }catch{}
  }

  return { share, next, prev, picker, fs, pip, cal }
}
