import { useCallback } from 'react'
import { bulkApi } from '../../../../api/inventory.js'
import { useQrScanner } from '../../../../hooks/useQrScanner.js'

// Location-specific wrapper around the shared camera/decode hook: strips the
// "LOC:" prefix, validates the scanned id against the backend, and reports
// success/failure via callbacks instead of exposing raw scan data.
export function useQrLocationScanner({ onFound, onError }) {
  const onScan = useCallback(async (raw) => {
    const locationId = raw.startsWith('LOC:') ? raw.slice(4) : raw
    try {
      await bulkApi.getLocation(locationId)
      onFound(locationId)
      scanner.stop()
    } catch {
      onError(`Location "${locationId}" not found`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFound, onError])

  const scanner = useQrScanner(onScan)

  return {
    scanning: scanner.active,
    videoRef: scanner.videoRef,
    canvasRef: scanner.canvasRef,
    startCamera: scanner.start,
    stopCamera: scanner.stop,
  }
}
