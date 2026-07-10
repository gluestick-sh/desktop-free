import { type RefObject, useLayoutEffect, useState } from 'react'

const VIEWPORT_MARGIN = 8
const MIN_SCROLL_HEIGHT = 80

export function useBoundedScrollHeight(
  scrollRef: RefObject<HTMLElement | null>,
  active: boolean,
) {
  const [maxHeight, setMaxHeight] = useState<number | undefined>()

  useLayoutEffect(() => {
    if (!active) {
      setMaxHeight(undefined)
      return undefined
    }

    const update = () => {
      const el = scrollRef.current
      if (!el) {
        return
      }
      const top = el.getBoundingClientRect().top
      const max = Math.floor(window.innerHeight - VIEWPORT_MARGIN - top)
      setMaxHeight(Math.max(MIN_SCROLL_HEIGHT, max))
    }

    update()
    const raf = window.requestAnimationFrame(update)

    const menu = scrollRef.current?.closest('.launch-menu')
    const resizeObserver = new ResizeObserver(update)
    if (menu instanceof HTMLElement) {
      resizeObserver.observe(menu)
    }
    if (scrollRef.current) {
      resizeObserver.observe(scrollRef.current)
    }

    window.addEventListener('resize', update, { passive: true })
    window.addEventListener('scroll', update, { passive: true, capture: true })

    return () => {
      window.cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, scrollRef])

  return maxHeight
}
