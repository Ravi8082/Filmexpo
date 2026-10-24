'use client'

import { useEffect } from 'react'

export function useScrollReveal(selector: string, deps: unknown[] = []) {
  useEffect(() => {
    const revealItems = document.querySelectorAll<HTMLElement>(selector)
    if (!revealItems.length) return

    let previousScrollY = window.scrollY
    let scrollDirection: 'up' | 'down' = 'down'
    let directionChangeY = previousScrollY
    let directionChangePending = false

    const replayElement = (el: HTMLElement) => {
      if (!el.classList.contains('is-visible')) return
      const bounds = el.getBoundingClientRect()
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return

      el.dataset.scrollDirection = scrollDirection
      el.dataset.revealEdge = scrollDirection === 'up' ? 'above' : 'below'
      el.dataset.revealPhase = 'enter'
      el.classList.remove('is-visible')
      void el.offsetWidth
      requestAnimationFrame(() => {
        if (el.isConnected && el.dataset.revealPhase === 'enter') {
          el.classList.add('is-visible')
        }
      })
    }

    const replayAll = () => {
      revealItems.forEach((el) => {
        if (el.classList.contains('is-visible')) replayElement(el)
      })
    }

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY === previousScrollY) return

      const nextDirection = currentScrollY < previousScrollY ? 'up' : 'down'
      const scrollDelta = currentScrollY - previousScrollY
      previousScrollY = currentScrollY
      if (nextDirection !== scrollDirection) {
        scrollDirection = nextDirection
        directionChangeY = currentScrollY
        directionChangePending = true
        if (Math.abs(scrollDelta) >= 24) {
          replayAll()
          directionChangePending = false
        }
        return
      }

      if (!directionChangePending || Math.abs(currentScrollY - directionChangeY) < 24) return
      replayAll()
      directionChangePending = false
    }

    window.addEventListener('scroll', updateScrollDirection, { passive: true })

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!(entry.target instanceof HTMLElement)) return
        const rootTop = entry.rootBounds?.top ?? 0
        const rootBottom = entry.rootBounds?.bottom ?? window.innerHeight
        const edge = entry.isIntersecting
          ? scrollDirection === 'down' ? 'below' : 'above'
          : entry.boundingClientRect.bottom <= rootTop ? 'above' : 'below'
        entry.target.dataset.scrollDirection = scrollDirection
        entry.target.dataset.revealEdge = edge
        entry.target.dataset.revealPhase = entry.isIntersecting ? 'enter' : 'exit'
        if (!entry.isIntersecting) {
          entry.target.classList.remove('is-visible')
          return
        }

        entry.target.classList.remove('is-visible')
        void entry.target.offsetWidth
        requestAnimationFrame(() => {
          if (entry.target instanceof HTMLElement && entry.target.dataset.revealPhase === 'enter') {
            entry.target.classList.add('is-visible')
          }
        })
      })
    }, { threshold: 0, rootMargin: '0px' })

    revealItems.forEach((item) => observer.observe(item))
    return () => {
      window.removeEventListener('scroll', updateScrollDirection)
      observer.disconnect()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
