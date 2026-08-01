import { useEffect, useRef, useState } from 'react'
import { Info } from 'lucide-react'

/**
 * Small (ⓘ) info icon that reveals an explanatory tooltip — hover on
 * desktop, tap on touch devices, closes on outside click/tap either way.
 *
 * Props:
 *   title    — optional bold heading line inside the tooltip
 *   children — tooltip body content
 */
export default function InfoTooltip({ title, children, className = '' }) {
  const [open, setOpen] = useState(false)
  const [canHover] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches)
  const wrapRef = useRef(null)

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
    <span ref={wrapRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        tabIndex={-1}
        onMouseEnter={canHover ? () => setOpen(true) : undefined}
        onMouseLeave={canHover ? () => setOpen(false) : undefined}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center justify-center text-gray-400 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-full transition-colors"
        aria-label={typeof title === 'string' ? title : 'More information'}
      >
        <Info size={13} strokeWidth={2.25} />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 rounded-lg bg-gray-900 text-white text-xs leading-relaxed px-3 py-2.5 shadow-lg"
        >
          {title && <p className="font-semibold mb-1">{title}</p>}
          <div className="text-gray-200">{children}</div>
          <div className="absolute left-1/2 -translate-x-1/2 top-full -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </span>
  )
}
