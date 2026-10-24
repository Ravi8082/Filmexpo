'use client'

import { useEffect } from 'react'

// Attaches pointer-driven 3D tilt to elements matching `selector`, mirroring the
// home page hero/card motion. Skipped for touch and reduced-motion users.
export function useTilt(selector: string, deps: unknown[] = [], max = 9) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = document.querySelectorAll<HTMLElement>(selector)
    const cleanups: Array<() => void> = []

    items.forEach((el) => {
      const move = (event: PointerEvent) => {
        if (event.pointerType === 'touch') return
        const bounds = el.getBoundingClientRect()
        const px = (event.clientX - bounds.left) / bounds.width - 0.5
        const py = (event.clientY - bounds.top) / bounds.height - 0.5
        el.style.transform = `perspective(900px) rotateY(${px * 2 * max}deg) rotateX(${-py * 2 * max}deg) translateY(-4px) scale(1.02)`
        el.style.setProperty('--gx', `${(px + 0.5) * 100}%`)
        el.style.setProperty('--gy', `${(py + 0.5) * 100}%`)
      }
      const reset = () => { el.style.transform = '' }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerleave', reset)
      cleanups.push(() => {
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerleave', reset)
      })
    })

    return () => cleanups.forEach((cleanup) => cleanup())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
