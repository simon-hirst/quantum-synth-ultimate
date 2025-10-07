import { setupAudio } from './core/audio.js'
import { VisualizerManager } from './core/visualizerManager.js'
import { createUI } from './core/ui.js'

const canvas = document.getElementById('screen')
const gl = canvas.getContext('webgl2', { alpha:false, antialias:true, desynchronized:true })
if(!gl) alert('WebGL2 required')

const audio = await setupAudio()
const manager = new VisualizerManager(gl, audio, canvas)
const ui = createUI(manager, audio)

let showUI = false
const toggleUI = v => { showUI = v ?? !showUI; document.getElementById('ui').classList.toggle('hidden', !showUI) }
toggleUI(false)

let lastMove = 0
const onMove = () => { lastMove = performance.now(); toggleUI(true) }
window.addEventListener('mousemove', onMove)
window.addEventListener('touchstart', onMove, {passive:true})
setInterval(()=>{ if(performance.now()-lastMove>2500) toggleUI(false) }, 300)

const resize = () => {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = Math.floor(innerWidth * dpr)
  const h = Math.floor(innerHeight * dpr)
  if(canvas.width!==w||canvas.height!==h){ canvas.width=w; canvas.height=h; gl.viewport(0,0,w,h); }
}
addEventListener('resize', resize, {passive:true})
resize()

let raf
const loop = t => { manager.frame(t/1000); raf = requestAnimationFrame(loop) }
raf = requestAnimationFrame(loop)

addEventListener('keydown', e => {
  if(e.key==='[') ui.prev.click()
  if(e.key===']') ui.next.click()
  if(e.key==='f' || e.key==='F') ui.fs.click()
  if(e.key==='p' || e.key==='P') ui.pip.click()
  if(e.key==='c' || e.key==='C') ui.cal.click()
  if(e.key==='h' || e.key==='H') toggleUI()
  const n = parseInt(e.key,10); if(n>=1 && n<=6) ui.picker.selectedIndex=n-1, ui.picker.dispatchEvent(new Event('change'))
})
