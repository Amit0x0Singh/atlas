import { useEffect, useRef, useState } from 'react'

/**
 * Single-line text that ellipsis-truncates to its container's width and
 * reveals the full value in a small dark tooltip — hover on desktop, tap on
 * touch devices (matches InfoTooltip's interaction pattern), only when the
 * text actually overflows.
 */
export default function TruncatedText({ text, className = '' }) {
  const [open, setOpen] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const [canHover] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches)
  const wrapRef = useRef(null)
  const textRef = useRef(null)

  useEffect(() => {
    const check = () => {
      const el = textRef.current
      if (el) setOverflowing(el.scrollWidth > el.clientWidth)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [text])

  useEffect(() => {
    if (!open) return
    const closeIfOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', closeIfOutside)
    document.addEventListener('touchstart', closeIfOutside)
    return () => {
      document.removeEventListener('mousedown', closeIfOutside)
      document.removeEventListener('touchstart', closeIfOutside)
    }
  }, [open])

  return (
    <span ref={wrapRef} className="relative inline-block max-w-full align-top">
      <span
        ref={textRef}
        className={`block truncate ${overflowing ? 'cursor-help' : ''} ${className}`}
        onMouseEnter={canHover && overflowing ? () => setOpen(true) : undefined}
        onMouseLeave={canHover ? () => setOpen(false) : undefined}
        onClick={!canHover && overflowing ? (e) => { e.stopPropagation(); setOpen(o => !o) } : undefined}
      >
        {text}
      </span>
      {open && (
        <div
          role="tooltip"
          className="absolute z-50 left-0 bottom-full mb-1.5 max-w-xs w-max rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-2.5 py-1.5 shadow-lg"
        >
          {text}
        </div>
      )}
    </span>
  )
}
