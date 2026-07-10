import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from 'react'

const DEFAULT_GAP = 4
const VIEWPORT_MARGIN = 8
const MIN_MENU_HEIGHT = 48

interface MenuLayout {
  naturalHeight: number
  flipUp: boolean
  maxHeight?: number
}

function measureNaturalHeight(menu: HTMLElement): number {
  menu.style.maxHeight = ''
  return menu.scrollHeight || menu.offsetHeight
}

function computeLayout(anchorRect: DOMRect, naturalHeight: number, gap: number): MenuLayout {
  const boundaryTop = VIEWPORT_MARGIN
  const boundaryBottom = window.innerHeight - VIEWPORT_MARGIN

  const spaceBelow = Math.max(0, boundaryBottom - anchorRect.bottom - gap)
  const spaceAbove = Math.max(0, anchorRect.top - boundaryTop - gap)

  let flipUp = false
  if (naturalHeight <= spaceBelow) {
    flipUp = false
  } else if (naturalHeight <= spaceAbove) {
    flipUp = true
  } else {
    flipUp = spaceAbove > spaceBelow
  }

  const available = flipUp ? spaceAbove : spaceBelow
  const menuHeight = Math.min(naturalHeight, Math.max(available, MIN_MENU_HEIGHT))
  const maxHeight = menuHeight < naturalHeight ? menuHeight : undefined

  return { naturalHeight, flipUp, maxHeight }
}

function layoutToStyle(
  anchorRect: DOMRect,
  layout: MenuLayout,
  gap: number,
): Pick<CSSProperties, 'top' | 'right' | 'maxHeight' | 'height'> {
  const boundaryTop = VIEWPORT_MARGIN
  const boundaryBottom = window.innerHeight - VIEWPORT_MARGIN
  const available = layout.flipUp
    ? Math.max(0, anchorRect.top - boundaryTop - gap)
    : Math.max(0, boundaryBottom - anchorRect.bottom - gap)
  const menuHeight = layout.maxHeight ?? Math.min(layout.naturalHeight, Math.max(available, MIN_MENU_HEIGHT))

  let top = layout.flipUp
    ? anchorRect.top - gap - menuHeight
    : anchorRect.bottom + gap

  top = Math.max(boundaryTop, Math.min(top, boundaryBottom - menuHeight))

  const constrainedHeight = layout.maxHeight
  return {
    top,
    right: window.innerWidth - anchorRect.right,
    maxHeight: constrainedHeight,
    height: constrainedHeight,
  }
}

function isMenuScrollEvent(event: Event, menu: HTMLElement): boolean {
  const target = event.target
  return target instanceof Node && menu.contains(target)
}

export function useAnchoredMenuPosition(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  gap = DEFAULT_GAP,
) {
  const menuRef = useRef<HTMLDivElement>(null)
  const layoutRef = useRef<MenuLayout | null>(null)
  const [menuStyle, setMenuStyle] = useState<Pick<CSSProperties, 'top' | 'right' | 'maxHeight' | 'height'> | null>(null)
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    if (!open) {
      layoutRef.current = null
      setMenuStyle(null)
      setReady(false)
      return undefined
    }

    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!anchor || !menu) {
      return undefined
    }

    const update = (event?: Event, remeasure = false) => {
      if (event && isMenuScrollEvent(event, menu)) {
        return
      }

      const scrollTop = menu.scrollTop

      if (remeasure || !layoutRef.current) {
        const naturalHeight = measureNaturalHeight(menu)
        layoutRef.current = computeLayout(anchor.getBoundingClientRect(), naturalHeight, gap)
      }

      setMenuStyle(layoutToStyle(anchor.getBoundingClientRect(), layoutRef.current, gap))
      setReady(true)

      if (scrollTop > 0) {
        menu.scrollTop = scrollTop
      }
    }

    const handleResize = () => update(undefined, true)
    const handleScroll = (event: Event) => update(event, false)

    update(undefined, true)

    const resizeObserver = new ResizeObserver(() => {
      update(undefined, true)
    })
    resizeObserver.observe(menu)

    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true })

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open, anchorRef, gap])

  return { menuRef, menuStyle, ready }
}
