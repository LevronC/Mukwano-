import { useEffect, useRef } from 'react'

const VERT = 'attribute vec2 pos;void main(){gl_Position=vec4(pos,0,1);}'
const FRAG = `precision mediump float;uniform float time;uniform vec2 res;uniform vec2 mouse;float noise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 uv=gl_FragCoord.xy/res;float t=time*.15;vec2 p=uv*3.+vec2(t*.3,t*.2);float n=noise(p)*.1;vec2 mc=(mouse/res-.5)*2.;float d=length(uv*2.-1.-mc);float glow=exp(-d*2.5)*0.04;float gold_tint=n*0.018+glow;gl_FragColor=vec4(gold_tint*.9+0.024,gold_tint*.65+0.05,gold_tint*.1+0.12,1.);}`

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl', { alpha: true })
    if (!gl) return
    const glCtx = gl

    function compile(type: number, src: string) {
      const s = glCtx.createShader(type)
      if (!s) return null
      glCtx.shaderSource(s, src)
      glCtx.compileShader(s)
      return s
    }

    const vs = compile(glCtx.VERTEX_SHADER, VERT)
    const fs = compile(glCtx.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return

    const prog = glCtx.createProgram()
    if (!prog) return
    glCtx.attachShader(prog, vs)
    glCtx.attachShader(prog, fs)
    glCtx.linkProgram(prog)
    if (!glCtx.getProgramParameter(prog, glCtx.LINK_STATUS)) return
    glCtx.useProgram(prog)

    const buf = glCtx.createBuffer()
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buf)
    glCtx.bufferData(glCtx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), glCtx.STATIC_DRAW)
    const pLoc = glCtx.getAttribLocation(prog, 'pos')
    glCtx.enableVertexAttribArray(pLoc)
    glCtx.vertexAttribPointer(pLoc, 2, glCtx.FLOAT, false, 0, 0)

    const tLoc = glCtx.getUniformLocation(prog, 'time')
    const rLoc = glCtx.getUniformLocation(prog, 'res')
    const mLoc = glCtx.getUniformLocation(prog, 'mouse')

    let mxg = 0
    let myg = 0
    const onMove = (e: MouseEvent) => {
      mxg = e.clientX
      myg = window.innerHeight - e.clientY
    }
    document.addEventListener('mousemove', onMove)

    let W = 0
    let H = 0
    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
      glCtx.viewport(0, 0, W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const start = Date.now()
    let frame = 0
    const render = () => {
      glCtx.uniform1f(tLoc, (Date.now() - start) / 1000)
      glCtx.uniform2f(rLoc, W, H)
      glCtx.uniform2f(mLoc, mxg, myg)
      glCtx.drawArrays(glCtx.TRIANGLE_STRIP, 0, 4)
      frame = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      aria-hidden
    />
  )
}
