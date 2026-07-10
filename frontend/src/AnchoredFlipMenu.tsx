import { type HTMLAttributes, type RefObject, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredMenuPosition } from './useAnchoredMenuPosition'

interface AnchoredFlipMenuProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean
  anchorRef: RefObject<HTMLElement | null>
  onClose?: () => void
  zIndex?: number
}

export default function AnchoredFlipMenu({
  open,
  anchorRef,
  onClose,
  zIndex = 500,
  className,
  style,
  ...rest
}: AnchoredFlipMenuProps) {
  const { menuRef, menuStyle, ready } = useAnchoredMenuPosition(open, anchorRef)

  useEffect(() => {
    if (!open || !onClose) {
      return undefined
    }
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return
      }
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose, anchorRef, menuRef])

  if (!open) {
    return null
  }

  const stopBubble = (event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation()
  }

  return createPortal(
    <div
      ref={menuRef}
      className={[
        className,
        'is-viewport-fixed',
        ready ? '' : 'is-positioning',
      ].filter(Boolean).join(' ')}
      style={{
        ...style,
        position: 'fixed',
        top: menuStyle?.top,
        right: menuStyle?.right,
        maxHeight: menuStyle?.maxHeight,
        height: menuStyle?.height,
        zIndex,
      }}
      {...rest}
      onMouseDown={(event) => {
        stopBubble(event)
        rest.onMouseDown?.(event)
      }}
      onClick={(event) => {
        stopBubble(event)
        rest.onClick?.(event)
      }}
      onPointerDown={(event) => {
        stopBubble(event)
        rest.onPointerDown?.(event)
      }}
      onWheel={(event) => {
        event.stopPropagation()
        rest.onWheel?.(event)
      }}
    />,
    document.body,
  )
}
