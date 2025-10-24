import React, { useEffect, useState } from 'react'

const INTRO_ONCE_KEY = 'intro-shown'

export default function SplashIntro() {
  const [show, setShow] = useState(false)
  const [fade, setFade] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const enabled = process.env.NEXT_PUBLIC_INTRO_ENABLE !== 'false'
    const once = process.env.NEXT_PUBLIC_INTRO_ONCE !== 'false'
    if (!enabled) return
    if (once && window.sessionStorage.getItem(INTRO_ONCE_KEY) === '1') return

    setShow(true)
    const duration = parseInt(process.env.NEXT_PUBLIC_INTRO_DURATION || '3000', 10)
    const t = setTimeout(() => close(), duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    setFade(true)
    setTimeout(() => {
      setShow(false)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(INTRO_ONCE_KEY, '1')
      }
    }, 400)
  }

  if (!show) return null
  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        zIndex: 9999,
        opacity: fade ? 0 : 1,
        transition: 'opacity .4s ease'
      }}
    >
      <iframe
        title="intro"
        src="/intro/index.html"
        style={{
          width: '100%',
          height: '100%',
          border: '0',
          display: 'block'
        }}
      />
      <button
        onClick={(e) => { e.stopPropagation(); close() }}
        style={{ position: 'absolute', top: 16, right: 16, zIndex: 10000, background: 'rgba(0,0,0,.5)', color: '#fff', border: '1px solid #555', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
        aria-label="Skip intro"
      >跳过</button>
    </div>
  )
}
