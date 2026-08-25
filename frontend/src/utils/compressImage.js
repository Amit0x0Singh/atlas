const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.82
// Don't bother recompressing files already this small — the cost isn't worth it.
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024

// Phone cameras routinely produce 8-25MB photos (or HEIC re-encoded to JPEG
// by the browser) — uploading those as-is over a flaky mobile connection is
// what actually stalls/fails, not anything the app does with them
// afterwards. This downscales + recompresses to JPEG before the file is
// staged, using createImageBitmap + canvas rather than a FileReader-to-
// base64 step (the classic way a mobile browser tab runs out of memory on a
// large photo). Always falls back to the original File on any failure — a
// slow/large upload beats a silently dropped attachment.
export async function compressImageFile(file) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/svg+xml') return file
  if (file.size <= SKIP_BELOW_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob || blob.size >= file.size) return file // recompression didn't actually help — keep the original

    const newName = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file // unsupported format / canvas failure — upload the original rather than block the user
  }
}

/** Compresses every image in a FileList/array; non-images pass through untouched. */
export function compressImageFiles(files) {
  return Promise.all(Array.from(files).map(compressImageFile))
}
