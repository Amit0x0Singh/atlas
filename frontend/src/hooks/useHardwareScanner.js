import { useRef, useState, useEffect, useCallback } from 'react'

// A real scan-gun burst (its full decoded payload, keystroke by keystroke)
// completes in a handful of milliseconds — nothing like human typing speed.
// If the buffer goes quiet for longer than this, the burst is over: either it
// terminated normally (already resolved) or the device sent no terminator at
// all — treat a lingering, non-empty buffer as a finished scan rather than
// staying silent forever.
const SCAN_BURST_IDLE_MS = 300

// Generic keyboard-wedge capture for USB/Bluetooth barcode-gun scanners
// (Zebra TC21 etc., via DataWedge or an equivalent keyboard-emulation
// profile — the factory default on most handhelds). The device just "types"
// its decoded value into whichever input currently has focus, then usually
// sends Enter or Tab — so all "hardware mode" needs is an always-focused
// text input wired to a terminator-aware onScan callback. Same mechanism
// originally built for Pack Inward, extracted so every scan point in the
// app can offer it instead of only working with a camera.
export function useHardwareScanner({ onScan, active = true } = {}) {
  const inputRef = useRef(null)
  const idleTimerRef = useRef(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  useEffect(() => () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current) }, [])

  // Keeps the capture input focused after anything steals it away (e.g. the
  // operator tapping elsewhere on the screen) — call from that input's onBlur.
  const refocus = useCallback(() => {
    if (!active) return
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [active])

  // React clears the controlled value on the *next* render, but a scan gun
  // can inject the next bag's keystrokes faster than that commit — force the
  // DOM value empty synchronously too, so nothing can survive between scans.
  const clearBuffer = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null }
    setValue('')
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const resolve = useCallback((raw) => {
    const id = (raw || '').trim()
    clearBuffer()
    if (id) onScan(id)
  }, [clearBuffer, onScan])

  const handleChange = useCallback((e) => {
    const raw = e.target.value
    const terminatorIdx = raw.search(/[\r\n\t]/)
    if (terminatorIdx !== -1) { resolve(raw.slice(0, terminatorIdx)); return }

    setValue(raw)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (!raw.trim()) return
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null
      const stale = inputRef.current?.value
      if (stale?.trim()) resolve(stale)
    }, SCAN_BURST_IDLE_MS)
  }, [resolve])

  const handleKeyDown = useCallback((e) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return
    e.preventDefault()
    resolve(e.target.value)
  }, [resolve])

  return { inputRef, value, handleChange, handleKeyDown, refocus, clearBuffer }
}
