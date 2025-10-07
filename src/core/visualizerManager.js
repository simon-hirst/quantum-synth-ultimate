import { makeTex1D, updateTex1D, makeFBO, quad, program } from './utils.js'
import { Transition } from './transitionManager.js'
import { SpectrumRings } from '../visuals/spectrumRings.js'
import { ParticleNebula } from '../visuals/particleNebula.js'
import { LiquidGrid } from '../visuals/liquidGrid.js'
import { WaveTunnel } from '../visuals/waveTunnel.js'
import { KaleidoBloom } from '../visuals/kaleidoBloom.js'
import { NeonLissajous } from '../visuals/neonLissajous.js'

const vs = `#version 300 es
layout(location=0) in vec2 p;
out vec2 uv;
void main(){ uv=.5*(p+1.); gl_Position=vec4(p,0,1); }`

const blitFs = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o; uniform sampler2D tex;
void main(){ o = texture(tex, uv); }`

export class VisualizerManager {
  constructor(gl, audio, canvas){
    this.gl = gl
    this.audio = audio
    this.canvas = canvas
    this.vao = quad(gl)
    this.blit = program(gl, vs, blitFs)
    this.fftTex = makeTex1D(gl, audio.analyser.frequencyBinCount)
    this.fboA = null
    this.fboB = null
    this.transition = new Transition(gl)
    this.index = 0
    this.time = 0
    this.last = 0
    this.active = null
    this.incoming = null
    this.visuals = [SpectrumRings, ParticleNebula, LiquidGrid, WaveTunnel, KaleidoBloom, NeonLissajous].map(V => new V(gl))
    this.set(0, true)
  }
  set(i, instant=false){
    i = (i+this.visuals.length)%this.visuals.length
    if(instant){ this.index=i; this.active=this.visuals[i]; return }
    if(this.incoming) return
    this.incoming = this.visuals[i]
    this.transition.start()
  }
  next(){ this.set(this.index+1) }
  prev(){ this.set(this.index-1) }
  ensureFBOs(){
    const {gl,canvas} = this
    if(!this.fboA || this.fboA.w!==canvas.width || this.fboA.h!==canvas.height){
      this.fboA = makeFBO(gl, canvas.width, canvas.height)
      this.fboB = makeFBO(gl, canvas.width, canvas.height)
    }
  }
  frame(t){
    const dt = Math.min(.1, t - this.time)
    this.time = t
    this.audio.update(dt)
    const { gl } = this
    this.ensureFBOs()
    updateTex1D(gl, this.fftTex, this.audio.buffers.linear)

    const drawOne = (vis, targetFbo) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo.fbo)
      gl.viewport(0,0,targetFbo.w,targetFbo.h)
      vis.draw(this.fftTex, this.audio.state, this.time, [targetFbo.w, targetFbo.h])
    }

    if(!this.active) this.active = this.visuals[this.index]
    drawOne(this.active, this.fboA)

    if(this.incoming){
      drawOne(this.incoming, this.fboB)
      const progressed = this.transition.step(dt)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0,0,this.canvas.width,this.canvas.height)
      this.transition.draw(this.fboA.tex, this.fboB.tex, this.fftTex)
      if(!progressed){
        this.active = this.incoming
        this.incoming = null
        this.index = this.visuals.indexOf(this.active)
      }
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0,0,this.canvas.width,this.canvas.height)
      gl.useProgram(this.blit)
      gl.bindVertexArray(this.vao)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.fboA.tex)
      gl.uniform1i(gl.getUniformLocation(this.blit,'tex'),0)
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4)
    }
  }
  names(){ return this.visuals.map(v=>v.name) }
}
