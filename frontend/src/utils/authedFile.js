/**
 * Opens or downloads a same-origin authenticated file endpoint (PDF pack/
 * container labels, etc.) that a plain <a href>/window.open can't reach —
 * those are pure browser navigations and can't carry the app's Bearer
 * Authorization header, so an authenticate-gated endpoint 401s. Fetches
 * with the token instead and opens/downloads the resulting blob.
 */
function extractFilename(res, fallback) {
  const cd = res.headers.get('Content-Disposition') || ''
  const match = cd.match(/filename="?([^";\n]+)"?/)
  return match ? match[1] : fallback
}

async function fetchAuthedBlob(url) {
  const token = localStorage.getItem('erp_token')
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return { blob: await res.blob(), res }
}

// Opens the file inline in a new tab (e.g. a PDF label the user then prints
// via the browser's own print dialog). The tab is opened synchronously,
// before the await, so popup blockers still see it as a direct response to
// the user's click. No `noopener` here (unlike the <a>/window.open calls
// this replaces) — we need the window reference to navigate it to the blob
// once it's ready, and `noopener` makes window.open() return null by spec.
// That's safe here since the tab only ever navigates to a blob: URL we
// create ourselves, never to third-party content — the tabnabbing risk
// `noopener` guards against doesn't apply.
export async function openAuthedFile(url) {
  const win = window.open('', '_blank')
  try {
    const { blob } = await fetchAuthedBlob(url)
    const blobUrl = URL.createObjectURL(blob)
    if (win) win.location.href = blobUrl
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (e) {
    win?.close()
    throw e
  }
}

export async function downloadAuthedFile(url, fallbackFilename = 'download') {
  const { blob, res } = await fetchAuthedBlob(url)
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = extractFilename(res, fallbackFilename)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(blobUrl)
}
