'use client'

import { useEffect } from 'react'

export function SmartNav() {
  useEffect(() => {
    let lastY = 0
    let ticking = false

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const y = window.scrollY
          const down = y > lastY && y > 80
          document.documentElement.classList.toggle('is-scrolled-down', down)
          lastY = y
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return null
}
