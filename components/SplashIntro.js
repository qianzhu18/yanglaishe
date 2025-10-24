import React, { useEffect, useRef, useState } from 'react'

const INTRO_ONCE_KEY = 'intro-shown'

export default function SplashIntro() {
  const [show, setShow] = useState(false)
  const [fade, setFade] = useState(false)
  const rootRef = useRef(null)
  const cleanup = useRef({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const enabled = process.env.NEXT_PUBLIC_INTRO_ENABLE !== 'false'
    const once = process.env.NEXT_PUBLIC_INTRO_ONCE !== 'false'
    if (!enabled) return
    if (once && window.sessionStorage.getItem(INTRO_ONCE_KEY) === '1') return

    setShow(true)

    // Prevent background scroll during intro
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverflow = document.body.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    cleanup.current.restoreOverflow = () => {
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overflow = prevBodyOverflow
    }

    // Inject intro stylesheet
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/intro/css/style.css'
    document.head.appendChild(link)
    cleanup.current.removeLink = () => link.remove()

    // Build intro DOM (based on HomePage dist/index.html intro section)
    const container = rootRef.current
    if (container) {
      container.innerHTML = `
        <div class="content content-intro">
          <div class="content-inner">
            <canvas id="background"></canvas>
            <div class="wrap fade">
              <h2 class="content-title">Welcome</h2>
              <h3 class="content-subtitle" original-content=""></h3>
              <a class="enter">enter</a>
              <div class="arrow arrow-1"></div>
              <div class="arrow arrow-2"></div>
            </div>
          </div>
          <div class="shape-wrap">
            <svg class="shape" width="100%" height="100vh" preserveAspectRatio="none" viewBox="0 0 1440 800" xmlns:pathdata="http://www.codrops.com/">
              <path d="M -44,-50 C -52.71,28.52 15.86,8.186 184,14.69 383.3,22.39 462.5,12.58 638,14 835.5,15.6 987,6.4 1194,13.86 1661,30.68 1652,-36.74 1582,-140.1 1512,-243.5 15.88,-589.5 -44,-50 Z" pathdata:id="M -44,-50 C -137.1,117.4 67.86,445.5 236,452 435.3,459.7 500.5,242.6 676,244 873.5,245.6 957,522.4 1154,594 1593,753.7 1793,226.3 1582,-126 1371,-478.3 219.8,-524.2 -44,-50 Z"></path>
            </svg>
          </div>
        </div>`

      // Intercept enter click to close overlay
      const enter = container.querySelector('a.enter')
      const handleEnter = (e) => { e.preventDefault(); close() }
      enter?.addEventListener('click', handleEnter)
      cleanup.current.removeEnter = () => enter?.removeEventListener('click', handleEnter)
    }

    // Provide globals expected by HomePage scripts
    window.$ = (selector) => document.querySelector(selector)
    const getOriginalContent = (selector) => window.$(selector)?.getAttribute('original-content')
    window.subtitle = getOriginalContent?.('.content-subtitle') || ''
    window.signature = ''
    window.config = {
      SIM_RESOLUTION: 128,
      DYE_RESOLUTION: 1024,
      CAPTURE_RESOLUTION: 512,
      DENSITY_DISSIPATION: 1,
      VELOCITY_DISSIPATION: 0.2,
      PRESSURE: 0.8,
      PRESSURE_ITERATIONS: 20,
      CURL: 30,
      SPLAT_RADIUS: 0.25,
      SPLAT_FORCE: 6000,
      SHADING: true,
      COLORFUL: true,
      COLOR_UPDATE_SPEED: 10,
      PAUSED: false,
      BACK_COLOR: { r: 30, g: 31, b: 33 },
      TRANSPARENT: false,
      BLOOM: true,
      BLOOM_ITERATIONS: 8,
      BLOOM_RESOLUTION: 256,
      BLOOM_INTENSITY: 0.4,
      BLOOM_THRESHOLD: 0.8,
      BLOOM_SOFT_KNEE: 0.7,
      SUNRAYS: true,
      SUNRAYS_RESOLUTION: 196,
      SUNRAYS_WEIGHT: 1.0
    }

    // Dynamically load scripts in sequence
    const loadScript = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = src
      s.async = true
      s.onload = () => resolve(s)
      s.onerror = reject
      document.body.appendChild(s)
    })

    const seq = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js')
      } catch (_) {}
      try { await loadScript('/intro/js/main.js') } catch (_) {}
      try { await loadScript('/intro/js/background.js') } catch (_) {}
    }
    seq()

    // Auto close fallback
    const duration = parseInt(process.env.NEXT_PUBLIC_INTRO_DURATION || '3500', 10)
    const timer = window.setTimeout(() => close(), duration)
    cleanup.current.clearTimer = () => window.clearTimeout(timer)

    return () => {
      cleanup.current.clearTimer?.()
      cleanup.current.removeEnter?.()
      cleanup.current.removeLink?.()
      cleanup.current.restoreOverflow?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    setFade(true)
    window.setTimeout(() => {
      setShow(false)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(INTRO_ONCE_KEY, '1')
      }
      cleanup.current.removeLink?.()
      cleanup.current.restoreOverflow?.()
    }, 400)
  }

  if (!show) return null
  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0b0b0c',
        zIndex: 9999,
        opacity: fade ? 0 : 1,
        transition: 'opacity .4s ease'
      }}
    >
      <div
        ref={rootRef}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', height: '100%' }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); close() }}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10000, background: 'rgba(0,0,0,.5)', color: '#fff', border: '1px solid #555', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
        aria-label="Skip intro"
      >跳过</button>
    </div>
  )
}
