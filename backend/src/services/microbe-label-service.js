import PDFDocument from 'pdfkit'

// Physical label size — MUST match the TSC thermal printer's loaded label
// stock exactly (100x50mm), same convention as label-service.js's Raw
// Material pack labels. The previous microbe-label implementation rendered
// plain HTML under `@page{size:A4}` and printed it via window.print() — a
// page-size mismatch against a printer actually loaded with 100x50mm label
// stock, which is what made it "not print correctly" (scaled/shifted/split
// across labels). Rendering a real PDF whose page size IS the label size
// fixes that the same way it already works for RM/pack labels.
const MM = 2.8346
const W = 100 * MM   // 283 pt — exactly 100mm, never changes
const H = 50 * MM    // 142 pt — exactly 50mm, never changes
// Safety padding from every physical edge of the label — every field below
// is positioned/clipped relative to this, so bumping it gives text more
// breathing room from the die-cut edge (thermal printers commonly can't
// print all the way to the edge, and roll registration drifts a little
// print to print) without needing to touch the layout logic itself.
const M = 4 * MM

// fmtCfu() on the frontend renders exponents as Unicode superscript digits
// (e.g. "6.20×10⁹") for on-screen/HTML display. PDFKit's standard fonts
// (Helvetica/Courier) only cover WinAnsi encoding, which doesn't include
// those superscript glyphs — left as-is they print as garbled placeholder
// characters. Converted to a plain caret exponent ("6.20×10^9") instead,
// which every standard PDF font can render correctly.
const SUPERSCRIPT_DIGITS = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' }
function pdfSafeCfu(s) {
  return String(s ?? '').replace(/×10([⁰¹²³⁴⁵⁶⁷⁸⁹]+)/g, (_, sup) =>
    '×10^' + [...sup].map((c) => SUPERSCRIPT_DIGITS[c] || c).join(''))
}

// Room left before the bottom margin at vertical position y — passed as
// pdfkit's `height` option on every text draw below so an unusually long
// value (several distinct batches on one microbe) gets clipped to what
// still fits on the label instead of silently triggering pdfkit's own
// auto-pagination (text without a bounding height that would overflow the
// page makes pdfkit insert an extra page) — which would otherwise print
// stray extra "labels" bearing only a leftover line or two, desyncing the
// printed label count from the picklist.
function roomBelow(y) {
  return Math.max(6, H - M - y)
}

// Draws (or, with draw=false, only measures) one "Label: value" field at a
// fixed (x, y), value clipped to maxWidth, and returns the height it uses.
// Positions are computed with doc.widthOfString()/heightOfString() rather
// than pdfkit's `continued: true` chaining — continued text's `width`
// option doesn't reliably clip a wrapped value against the box it's meant
// to stay in, which overlapped neighbouring columns when a value ran long.
// Explicit x/y per field has no such cross-call state to get out of sync.
//
// draw=false runs the exact same font/metric calls (so the measured height
// is exact, not approximated) but skips the two `.text()` ink calls — used
// for the dry-run layout pass described on drawMicrobeLabel below.
function field(doc, x, y, maxWidth, f, size, draw = true) {
  if (!f) return 0
  const avail = roomBelow(y)
  doc.fontSize(size).fillColor('#000').font('Helvetica-Bold')
  const labelText = `${f.label}: `
  const labelW = doc.widthOfString(labelText)
  if (draw) doc.text(labelText, x, y, { lineBreak: false, width: maxWidth, height: avail })
  doc.font(f.mono ? 'Courier-Bold' : 'Helvetica')
  const valueText = String(f.value ?? '—')
  const valueWidth = Math.max(10, maxWidth - labelW)
  const h = Math.min(doc.heightOfString(valueText, { width: valueWidth }), avail)
  if (draw) doc.text(valueText, x + labelW, y, { width: valueWidth, height: avail })
  return Math.max(h, size * 1.15)
}

// N fields laid out in equal-width columns across the label — used both for
// the 2-column rows (Product/Order Qty, Moisture/Harvest, DI No/Date) and
// the 3-column Batch/Qty/CFU row. Returns the tallest column's height, so a
// long-wrapping value in any column pushes the next row down by enough.
function fieldRow(doc, y, items, { size = 8 } = {}, draw = true) {
  const n = items.length
  const gap = 2 * MM
  const colW = (W - 2 * M - (n - 1) * gap) / n
  let h = 0
  items.forEach((it, i) => {
    const x = M + i * (colW + gap)
    h = Math.max(h, field(doc, x, y, colW, it, size, draw))
  })
  return h
}

function hr(doc, y, weight = 0.75) {
  doc.moveTo(M, y).lineTo(W - M, y).lineWidth(weight).strokeColor('#000').stroke()
}

// Minimum (compact) gaps between sections — used as-is for the dry-run
// layout pass, then stretched (see drawMicrobeLabel) for the real draw so a
// label with only one batch doesn't leave most of the sticker blank while a
// label with many batches still fits.
const BASE_GAPS = {
  afterHeader: 1 * MM,
  afterReqSpecs: 1.2 * MM,
  afterMicrobe: 1 * MM,
  betweenBatches: 0.8 * MM,
  afterBatches: 0.4 * MM,
  beforeFooterDivider: 1.4 * MM,
}
// Which of the gaps above absorb the label's leftover vertical space when
// content is short (all but the tight, deliberately-small gap *within* the
// batch list — spreading individual batch rows apart would make them
// harder to scan as one group, so that one stays fixed).
const STRETCH_KEYS = ['afterHeader', 'afterReqSpecs', 'afterMicrobe', 'afterBatches', 'beforeFooterDivider']
const MAX_STRETCH_PER_GAP = 8 * MM

// One microbe label — pdfkit layout of the same information the old HTML
// template showed, reworked per on-the-floor feedback from actual printed
// labels:
//   - the "SOM PHYTO PHARMA INDIA LTD." letterhead row is dropped — it was
//     eating vertical space the rest of the label badly needed;
//   - fields print noticeably larger so the TSC printer's 203dpi head
//     doesn't have to resolve tiny glyphs;
//   - Batch, Qty and CFU/g print on ONE row per batch — previously CFU
//     values were summarized once at the top, disconnected from which
//     batch/qty they belonged to;
//   - the label is laid out in two passes: a "dry run" with the gaps above
//     at their minimum, purely to measure how tall the content naturally
//     is (and how many batch rows fit at all), then a real pass that
//     stretches those same gaps to fill whatever's left of the label — so
//     a 1-batch label doesn't print a cramped block of text sitting on a
//     mostly-blank sticker, and a many-batch label still tightens back
//     down to what actually fits (same "+N more" cutoff as before).
function drawMicrobeLabel(doc, header, lb) {
  const maxContentY = H - M - 3.8 * MM

  function layout(gaps, draw) {
    let y = M

    y += fieldRow(doc, y, [
      { label: 'Product', value: header.product },
      { label: 'Order Qty', value: `${header.orderQty} kg` },
    ], { size: 8.5 }, draw)
    y += gaps.afterHeader

    y += field(doc, M, y, W - 2 * M, { label: 'Req. Specs', value: `${pdfSafeCfu(lb.reqCfu)} CFU/g`, mono: true }, 8.5, draw)
    y += gaps.afterReqSpecs

    if (draw) hr(doc, y, 0.7)
    y += 2.2 * MM

    const microbeW = W * 0.58 - M
    doc.font('Helvetica-Bold').fontSize(12)
    const microbeText = String(lb.microbe || '—')
    const microbeH = doc.heightOfString(microbeText, { width: microbeW, height: roomBelow(y) })
    if (draw) {
      doc.fillColor('#000').text(microbeText, M, y, { width: microbeW, height: roomBelow(y) })
      field(doc, M + W * 0.58, y + 2, W - 2 * M - W * 0.58, { label: 'Total Qty', value: `${Number(lb.totalQty || 0).toFixed(4)} kg` }, 7.5)
    }
    y += Math.max(microbeH, 6 * MM)
    y += gaps.afterMicrobe

    // Batch rows stop once they'd run into the footer's reserved space —
    // any further batches collapse into a "+N more" note.
    const batches = lb.batches || []
    let shown = 0
    for (const b of batches) {
      if (y + 3.4 * MM > maxContentY - 1 * MM) break
      y += fieldRow(doc, y, [
        { label: 'Batch', value: b.code || '—', mono: true },
        { label: 'Qty', value: `${Number(b.qty || 0).toFixed(3)}kg` },
        { label: 'CFU/g', value: pdfSafeCfu(b.cfu) || '—', mono: true },
      ], { size: 7.5 }, draw)
      y += gaps.betweenBatches
      shown++
    }
    let moreCount = batches.length - shown
    if (moreCount > 0) {
      if (draw) {
        doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#444')
          .text(`+ ${moreCount} more batch(es)`, M, y, { height: roomBelow(y) })
      }
      y += 2.6 * MM
    }
    y += gaps.afterBatches

    // Only draw if it actually fits above the reserved footer zone — with
    // the batch list already clamped above, this only ever gets skipped in
    // the extreme case of a microbe with more distinct batches than a
    // 100x50mm label can physically list; better to omit Moisture/Harvest
    // there than overlap it.
    if (y + 3.6 * MM <= maxContentY - 1 * MM) {
      y += fieldRow(doc, y, [
        { label: 'Moisture', value: lb.moistLine },
        { label: 'Harvest', value: lb.harvLine },
      ], { size: 7.5 }, draw)
    }
    y += gaps.beforeFooterDivider

    const footerY = Math.min(y, maxContentY)
    if (draw) {
      hr(doc, footerY, 0.7)
      fieldRow(doc, footerY + 2.2 * MM, [
        { label: 'DI No', value: header.diNo },
        { label: 'Date of Issue', value: header.dt },
      ], { size: 7.5 })
    }
    return footerY + 2.2 * MM
  }

  // Pass 1 — dry run at minimum gaps, to see how much vertical space is
  // actually needed. Nothing gets drawn to the page.
  const naturalEnd = layout(BASE_GAPS, false)
  const slack = Math.max(0, maxContentY - naturalEnd)
  const perGap = Math.min(MAX_STRETCH_PER_GAP, slack / STRETCH_KEYS.length)
  const stretchedGaps = { ...BASE_GAPS }
  for (const k of STRETCH_KEYS) stretchedGaps[k] += perGap

  // Pass 2 — the real draw, gaps stretched to use the leftover room instead
  // of leaving it blank at the bottom of the sticker.
  layout(stretchedGaps, true)
}

// `payload.labels` items: { microbe, reqCfu, totalQty, moistLine, harvLine,
// batches: [{ code, qty, cfu }] } — the exact same per-label data the
// frontend already derives from the outward session (see
// outwardPrintTemplates.js). This service only lays it out; it never
// re-derives it, so the printed label can't drift from what the app shows.
export async function generateMicrobeLabelBuffer(payload) {
  const { product, diNo, orderQty, dt, labels } = payload || {}
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false })
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    for (const lb of labels || []) {
      doc.addPage()
      drawMicrobeLabel(doc, { product, diNo, orderQty, dt }, lb)
    }
    doc.end()
  })
}
