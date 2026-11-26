import { useEffect, useEffectEvent, useState, type FocusEvent } from 'react'
import './UndoToast.css'

const EXPIRE_AFTER_MS = 5000

type UndoToastProps = {
  message: string
  autoFocusUndo: boolean
  onUndo: () => void
  onExpire: () => void
}

// The toast shown after a deletion: offers "Hoàn tác" and tells the parent when 5 s have run out.
export default function UndoToast({ message, autoFocusUndo, onUndo, onExpire }: UndoToastProps) {
  const [pointerInside, setPointerInside] = useState(false)
  const [focusInside, setFocusInside] = useState(autoFocusUndo)
  const expire = useEffectEvent(onExpire)
  const paused = pointerInside || focusInside

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(expire, EXPIRE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [paused])

  function leaveFocus(event: FocusEvent<HTMLElement>) {
    setFocusInside(event.currentTarget.contains(event.relatedTarget))
  }

  return (
    <div
      role="status"
      className="undo-toast"
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => setPointerInside(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={leaveFocus}
    >
      <span className="undo-toast-message">{message}</span>
      <button type="button" className="undo-toast-undo" autoFocus={autoFocusUndo} onClick={onUndo}>
        Hoàn tác
      </button>
    </div>
  )
}
