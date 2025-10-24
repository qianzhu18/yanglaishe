import React, { useEffect, useRef, useState } from 'react'

const INTRO_ONCE_KEY = 'intro-shown'

export default function SplashIntro() {
  const [show, setShow] = useState(false)
  const [fade, setFade] = useState(false)
  const rootRef = useRef(null)
  const cleanup = useRef({})

  useEffect(() => {
    if (typeof window === 'undefined') return
    const once = process.env.NEXT_PUBLIC_INTRO_ONCE !== 'false'
    if (once && window.sessionStorage.getItem(INTRO_ONCE_KEY) === '1') return

    // read config.json to decide whether to show
    let introEnabled = true
    let cfg = null
    const loadConfig = async () => {
      try {
        const res = await fetch('/intro/config.json', { cache: 'no-store' })
        if (res.ok) cfg = await res.json()
      } catch (e) {}
      if (cfg && cfg.intro && cfg.intro.background === false) return false
      // env override
      if (process.env.NEXT_PUBLIC_INTRO_ENABLE === 'false') return false
      return true
    }

    loadConfig().then((ok) => {
      introEnabled = ok !== false
      if (!introEnabled) return

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
      var titleText = (cfg && cfg.intro && cfg.intro.title) || 'Welcome'
      var subText = (cfg && cfg.intro && cfg.intro.subtitle) || ''
      var enterText = (cfg && cfg.intro && cfg.intro.enter) || 'enter'
      var nameText = (cfg && cfg.main && cfg.main.name) || ''
      var signText = (cfg && cfg.main && cfg.main.signature) || ''
      var avatarLink = (cfg && cfg.main && cfg.main.avatar && cfg.main.avatar.link) || 'assets/avatar.jpg'
      // Normalize avatar path under /intro/
      if (avatarLink.indexOf('/') !== 0) avatarLink = '/intro/' + avatarLink

      // Build menu items from config
      var ul = (cfg && cfg.main && cfg.main.ul) || {}
      function buildItem(key) {
        var item = ul[key]
        if (!item) return ''
        var icon = item.icon ? 'icon icon-' + item.icon : 'icon'
        var href = item.href || '#'
        var text = item.text || ''
        // mark blog links for intercept
        var blogAttr = /blog\//i.test(href) ? ' data-intro-blog' : ''
        return '<li><a href="' + href + '" aria-label="' + text + '"' + blogAttr + '><i class="' + icon + '"></i><span data-translate="' + text + '">' + text + '</span></a></li>'
      }
      var menuHtml = [buildItem('first'), buildItem('second'), buildItem('third'), buildItem('fourth')].join('')
      container.innerHTML = (
        '<div class="content content-intro">\n' +
        '  <div class="content-inner">\n' +
        '    <canvas id="background"></canvas>\n' +
        '    <div class="wrap fade">\n' +
        '      <h2 class="content-title">' + titleText + '</h2>\n' +
        '      <h3 class="content-subtitle" original-content="' + subText + '">&nbsp;</h3>\n' +
        '      <a class="enter">' + enterText + '</a>\n' +
        '      <div class="arrow arrow-1"></div>\n' +
        '      <div class="arrow arrow-2"></div>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '  <div class="shape-wrap">\n' +
        '    <svg class="shape" width="100%" height="100vh" preserveAspectRatio="none" viewBox="0 0 1440 800" xmlns:pathdata="http://www.codrops.com/">\n' +
        '      <path d="M -44,-50 C -52.71,28.52 15.86,8.186 184,14.69 383.3,22.39 462.5,12.58 638,14 835.5,15.6 987,6.4 1194,13.86 1661,30.68 1652,-36.74 1582,-140.1 1512,-243.5 15.88,-589.5 -44,-50 Z" pathdata:id="M -44,-50 C -137.1,117.4 67.86,445.5 236,452 435.3,459.7 500.5,242.6 676,244 873.5,245.6 957,522.4 1154,594 1593,753.7 1793,226.3 1582,-126 1371,-478.3 219.8,-524.2 -44,-50 Z"></path>\n' +
        '    </svg>\n' +
        '  </div>\n' +
        '</div>\n' +
        '<div class="content content-main">\n' +
        '  <div id="card">\n' +
        '    <div class="card-inner fade">\n' +
        '      <header>\n' +
        '        <img src="' + avatarLink + '" width="100" height="100" alt="avatar">\n' +
        '        <h1 data-translate="name">' + nameText + '</h1>\n' +
        '        <h2 id="signature" data-translate="signature">' + signText + '</h2>\n' +
        '      </header>\n' +
        '      <ul>' + menuHtml + '</ul>\n' +
        '    </div>\n' +
        '  </div>\n' +
        '  <canvas class="grid-background" id="gridCanvas"></canvas>\n' +
        '</div>'
      )

      // Intercept enter click to proceed to main and then auto-close
      var enter = container.querySelector('a.enter')
      var handleEnter = function (e) {
        e.preventDefault()
        // Allow HomePage JS to animate into content-main, then close overlay
        var endDelay = parseInt(process.env.NEXT_PUBLIC_INTRO_EXIT_AFTER_MAIN_MS || '1800', 10)
        window.setTimeout(function () { close() }, endDelay)
      }
      if (enter && enter.addEventListener) enter.addEventListener('click', handleEnter)
      cleanup.current.removeEnter = function () { if (enter && enter.removeEventListener) enter.removeEventListener('click', handleEnter) }

      // Intercept the Blog link to directly reveal site
      var blogLink = container.querySelector('[data-intro-blog]')
      var handleBlog = function (e) { e.preventDefault(); close() }
      if (blogLink && blogLink.addEventListener) blogLink.addEventListener('click', handleBlog)
      cleanup.current.removeBlog = function () { if (blogLink && blogLink.removeEventListener) blogLink.removeEventListener('click', handleBlog) }
    }

    // Provide globals expected by HomePage scripts
    window.$ = function (selector) { return document.querySelector(selector) }
    const getOriginalContent = function (selector) {
      const el = window.$(selector)
      return el && el.getAttribute ? el.getAttribute('original-content') : ''
    }
    window.subtitle = getOriginalContent('.content-subtitle') || ''
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
    const loadScript = function (src) {
      return new Promise(function (resolve, reject) {
        const s = document.createElement('script')
        s.src = src
        s.async = true
        s.onload = function () { resolve(s) }
        s.onerror = reject
        document.body.appendChild(s)
      })
    }

    ;(function () { // IIFE to avoid top-level await
      loadScript('https://cdn.jsdelivr.net/npm/animejs@3.2.1/lib/anime.min.js')
        .catch(function () {})
        .then(function () { return loadScript('/intro/js/main.js').catch(function () {}) })
        .then(function () { return loadScript('/intro/js/background.js').catch(function () {}) })
    })()

    // Auto close fallback
    const duration = parseInt(process.env.NEXT_PUBLIC_INTRO_DURATION || '3500', 10)
    const timer = window.setTimeout(function () { close() }, duration)
    cleanup.current.clearTimer = function () { window.clearTimeout(timer) }

    return () => {
      if (cleanup.current.clearTimer) cleanup.current.clearTimer()
      if (cleanup.current.removeEnter) cleanup.current.removeEnter()
      if (cleanup.current.removeBlog) cleanup.current.removeBlog()
      if (cleanup.current.removeLink) cleanup.current.removeLink()
      if (cleanup.current.restoreOverflow) cleanup.current.restoreOverflow()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const close = () => {
    setFade(true)
    window.setTimeout(function () {
      setShow(false)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(INTRO_ONCE_KEY, '1')
      }
      if (cleanup.current.removeLink) cleanup.current.removeLink()
      if (cleanup.current.restoreOverflow) cleanup.current.restoreOverflow()
    }, 400)
  }

  if (!show) return null
  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    background: '#0b0b0c',
    zIndex: 9999,
    opacity: fade ? 0 : 1,
    transition: 'opacity .4s ease'
  }
  const rootStyle = { width: '100%', height: '100%' }
  const btnStyle = {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10000,
    background: 'rgba(0,0,0,.5)',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer'
  }
  return React.createElement(
    'div',
    { onClick: close, style: overlayStyle },
    [
      React.createElement('div', { key: 'root', ref: rootRef, onClick: function (e) { e.stopPropagation() }, style: rootStyle }),
      React.createElement('button', { key: 'btn', onClick: function (e) { e.stopPropagation(); close() }, style: btnStyle, 'aria-label': 'Skip intro' }, '跳过')
    ]
  )
}
