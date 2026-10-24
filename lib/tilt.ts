import type { PointerEvent } from 'react'

export const tiltHandlers = {
  onPointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === 'touch') return
    const el = event.currentTarget
    const box = el.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    el.style.setProperty('--ry', `${((x - 0.5) * 16).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
  },
  onPointerLeave(event: PointerEvent<HTMLElement>) {
    const el = event.currentTarget
    el.style.setProperty('--rx', '0deg')
    el.style.setProperty('--ry', '0deg')
  },
}
