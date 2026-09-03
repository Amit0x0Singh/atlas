// Printable Picklist + Labels for a microbial Outward issuance session —
// ported from the microbe.html prototype's generatePicklistFromData /
// generateLabelsFromData (same layout, location-code decoding, and 100×50mm
// label format), re-pointed at this app's real session shape (grouped
// MicrobialSfgOutward + lines, see OutwardHistory.jsx) and its own
// letterhead text (bomPrintTemplates.js).
//
// The Picklist tells the store person exactly which rack/shelf/position to
// go to and how much to weigh out for each container; the Labels get
// attached to the picked pack/bag so whoever receives it can read what's
// inside without opening it.
import { fmtCfu, fmtDate } from './format.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'
import { openAuthedFilePost } from '../../../../utils/authedFile.js'

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Decodes the app's rack-shelf-side-position location code (see
// field-normalization-rules.js's note on shared/status.js's slotCode()) into
// a human sentence for the picker — e.g. "R03-S2-B-L" -> "Rack 3, Shelf 2,
// Back, Left".
function locText(loc) {
  if (!loc) return '—'
  const m = String(loc).match(/R(\d+)-S(\d+)-([BF])-([LMR])/)
  if (!m) return loc
  const side = m[3] === 'B' ? 'Back' : 'Front'
  const pos = m[4] === 'L' ? 'Left' : m[4] === 'M' ? 'Middle' : 'Right'
  return `Rack ${parseInt(m[1], 10)}, Shelf ${m[2]}, ${side}, ${pos}`
}

function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow pop-ups for this site to print.'); return }
  win.document.write(html)
  win.document.close()
}

const LETTERHEAD_NAME = 'SOM PHYTO PHARMA INDIA LTD.'
const LETTERHEAD_ADDR = 'Plot No. 154/A5-1 5VICE, IDA Bollaram - 502325 | +91 9885438365'

// ─── Picklist ────────────────────────────────────────────────────────────
export function printMicrobePicklist(session) {
  const product = toTitleCase(session.productName) || '—'
  const customer = session.customerName ? toTitleCase(session.customerName) : '—'
  const diNo = session.diNumber || '—'
  const batch = session.batchCode || '—'
  const section = session.section ? toTitleCase(session.section) : '—'
  const issuer = session.issuerName ? toTitleCase(session.issuerName) : '—'
  const orderQty = session.orderQtyKg || '—'
  const dt = fmtDate(session.firstAt)

  let sno = 0, rowsHtml = '', totalConts = 0
  for (const row of session.microbes || []) {
    if (!row.picks?.length) continue
    totalConts += row.picks.length
    const totalPick = row.picks.reduce((t, x) => t + (Number(x.qty_issued_kg) || 0), 0)
    const reqQty = row.picks[0]?.required_qty_kg
    const reqCfu = row.picks[0]?.required_cfu_per_g
    rowsHtml += `<tr style="background:#e8f4ea"><td colspan="10" style="border:1px solid #5585aa;padding:5px 8px;font-weight:700;font-size:10pt;color:#1a4a1a">`
      + `\u{1F9EA} ${esc(toTitleCase(row.microbe_name))} &nbsp;|&nbsp; Req in Product: <b>${reqQty ?? '—'} kg</b> @ <b>${fmtCfu(reqCfu)} CFU/g</b> &nbsp;|&nbsp; Total to Pick: <b>${totalPick.toFixed(4)} kg</b>`
      + `</td></tr>`
    row.picks.forEach((p, i) => {
      sno++
      const loc = p.inward?.container?.location || ''
      rowsHtml += `<tr style="height:26px">`
        + `<td style="border:1px solid #000;padding:3px 5px;text-align:center;font-size:10pt">${sno}</td>`
        + `<td style="border:1px solid #000;padding:3px 6px;font-size:10pt"><b>${esc(toTitleCase(row.microbe_name))}</b>${row.picks.length > 1 ? ` <span style="font-size:9pt;color:#64748b">(${i + 1}/${row.picks.length})</span>` : ''}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-family:monospace;font-weight:700;font-size:10pt">${esc(p.container_code || '—')}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:10pt">${esc(loc || '—')}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-size:9pt;color:#374151">${locText(loc)}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-family:monospace;font-size:9.5pt">${fmtCfu(p.cfu_per_g_at_issue)}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;text-align:center;font-size:10pt">${p.inward?.moisture != null ? p.inward.moisture + '%' : '—'}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-size:10pt;text-align:center">${fmtDate(p.inward?.date_of_harvest)}</td>`
        + `<td style="border:1px solid #000;padding:3px 5px;font-weight:700;font-size:11pt;text-align:center">${Number(p.qty_issued_kg || 0).toFixed(4)}</td>`
        + `<td style="border:1px solid #000;padding:3px 4px;text-align:center;font-size:14pt">&#9744;</td>`
        + `</tr>`
    })
  }

  if (!rowsHtml) { alert('No picked batches in this session.'); return }

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Picklist — ' + esc(product) + '</title>'
    + '<style>@page{size:A4 portrait;margin:10mm}body{font-family:"Times New Roman",Georgia,serif;color:#000}table{border-collapse:collapse;width:100%}'
    + '@media print{.np{display:none}}</style></head><body>'
    + '<div class="np" style="background:#1a3a6b;color:#fff;padding:10px 18px;display:flex;gap:12px;align-items:center;margin-bottom:10px">'
    + '<b>Microbial Picklist</b>'
    + '<button onclick="window.print()" style="background:#fff;color:#1a3a6b;border:none;padding:6px 14px;border-radius:5px;font-weight:700;cursor:pointer">\u{1F5A8} Print</button>'
    + '<button onclick="window.close()" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:6px 12px;border-radius:5px;cursor:pointer">Close</button></div>'
    + '<div style="text-align:center;border-bottom:2.5px solid #000;padding-bottom:6px;margin-bottom:4px">'
    + '<div style="font-size:16pt;font-weight:700;letter-spacing:.5px">' + LETTERHEAD_NAME + '</div>'
    + '<div style="font-size:9pt;margin-top:2px">' + LETTERHEAD_ADDR + '</div></div>'
    + '<div style="text-align:center;font-weight:700;font-size:12pt;background:#f0f0f0;border:1px solid #000;padding:4px 0;letter-spacing:.5px">MICROBIAL MATERIAL PICKLIST</div>'
    + '<table style="margin-bottom:2px"><tr>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5;width:16%">PRODUCT</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:11pt;width:34%">' + esc(product) + '</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5;width:16%">CUSTOMER</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;width:34%">' + esc(customer) + '</td>'
    + '</tr><tr>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">DI NUMBER</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-family:monospace;font-weight:700">' + esc(diNo) + '</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">ORDER QTY</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700">' + esc(orderQty) + ' kg</td>'
    + '</tr><tr>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">BATCH CODE</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-family:monospace;font-weight:700">' + esc(batch) + '</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">SECTION</td>'
    + '<td style="border:1px solid #000;padding:4px 7px">' + esc(section) + '</td>'
    + '</tr><tr>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">DATE OF ISSUE</td>'
    + '<td style="border:1px solid #000;padding:4px 7px">' + dt + '</td>'
    + '<td style="border:1px solid #000;padding:4px 7px;font-weight:700;font-size:9.5pt;background:#f5f5f5">PREPARED BY</td>'
    + '<td style="border:1px solid #000;padding:4px 7px">' + esc(issuer) + ' &nbsp;|&nbsp; ' + (session.microbes || []).filter((r) => r.picks?.length).length + ' microbe(s), ' + totalConts + ' container(s)</td>'
    + '</tr></table>'
    + '<table style="margin-top:6px"><thead><tr style="background:#1a3a6b;color:#fff">'
    + '<th style="border:1px solid #000;padding:4px 4px;font-size:9pt;width:4%">S.No</th>'
    + '<th style="border:1px solid #000;padding:4px 6px;font-size:9pt;width:15%">Microbe</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:12%">Container Code</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:8%">Location</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:17%">Where to Go</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:10%">In-house CFU/g</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:6%">Moist%</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:9%">Harvest Date</th>'
    + '<th style="border:1px solid #000;padding:4px 5px;font-size:9pt;width:10%">Qty to Pick (kg)</th>'
    + '<th style="border:1px solid #000;padding:4px 4px;font-size:9pt;width:5%">&#9744;</th>'
    + '</tr></thead><tbody>' + rowsHtml + '</tbody></table>'
    + '<div style="border:1.5px solid #1a3a6b;border-radius:4px;padding:10px 14px;margin-top:10px;font-size:9.5pt;background:#f8fafc">'
    + '<b style="color:#1a3a6b">Instructions to Picker:</b><br>'
    + '1. Pick in the order listed. Verify container code before opening.<br>'
    + '2. Location format: <b>R[Rack]-S[Shelf]-[B=Back/F=Front]-[L=Left/M=Middle/R=Right]</b> — e.g. R03-S2-B-L = Rack 3, Shelf 2, Back, Left position.<br>'
    + '3. If a microbe spans multiple containers, pick them in sequence. Do not mix pouches from different containers.<br>'
    + '4. Tick &#9744; after each pick and return the completed picklist to QC for verification before labelling.</div>'
    + '<table style="width:100%;border-collapse:collapse;margin-top:10px"><tr>'
    + '<td style="border:2px solid #000;padding:5px 10px;font-weight:700;font-size:10pt;text-align:center;width:48%;background:#f0f0f0">Prepared By (Microbial Store)</td>'
    + '<td style="width:4%;border:none"></td>'
    + '<td style="border:2px solid #000;padding:5px 10px;font-weight:700;font-size:10pt;text-align:center;width:48%;background:#f0f0f0">Verified By (QC)</td></tr><tr>'
    + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 10px 5px">Signature &amp; Date:</td><td style="border:none"></td>'
    + '<td style="border-left:2px solid #000;border-right:2px solid #000;padding:22px 10px 5px">Signature &amp; Date:</td></tr><tr>'
    + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:6px 10px">Name:</td><td style="border:none"></td>'
    + '<td style="border:2px solid #000;border-top:1px solid #bbb;padding:6px 10px">Name:</td></tr></table>'
    + '</body></html>'
  openPrintWindow(html)
}

// ─── Labels — 100×50mm thermal, one per microbe, attached to the picked
// pack/bag so the receiving person can read what's inside without opening
// it (mirrors the RM/Container QR label convention already used elsewhere
// in this app for the same reason).
//
// Previously rendered as an HTML popup printed via window.print() under
// `@page{size:A4}` — on a TSC thermal printer actually loaded with 100×50mm
// label stock that page-size mismatch is what made the print come out
// wrong (scaled down, shifted, or split across labels). Raw Material/pack
// labels never had this problem because they're rendered server-side as a
// real PDF whose page size IS the label size (see label-service.js) — this
// now does the same, plus two changes from on-the-floor feedback on the
// first printed batch: the letterhead row is gone (freed space went to
// larger fonts, since small text was hard to read off the thermal print),
// and each batch's CFU/g now travels WITH that batch's own qty (instead of
// listing every distinct CFU/g reading once at the top, separately from
// which batch/qty it belonged to — operators couldn't tell which batch a
// given CFU reading was for).
export async function printMicrobeLabels(session) {
  const product = toTitleCase(session.productName) || '—'
  const diNo = session.diNumber || '—'
  const orderQty = session.orderQtyKg || '—'
  const dt = fmtDate(session.firstAt)

  const labels = []
  for (const row of session.microbes || []) {
    if (!row.picks?.length) continue
    const totalQty = row.picks.reduce((t, x) => t + (Number(x.qty_issued_kg) || 0), 0)
    // Grouped by batch code, each batch keeps its OWN qty and CFU/g — a
    // batch is drawn from one inward lot, so its CFU/g is a single value in
    // the overwhelming majority of cases; the rare split (two picks of the
    // same batch code recorded at different potencies) still shows both,
    // joined, rather than silently picking one.
    const batchMap = {}
    for (const p of row.picks) {
      const bc = p.inward?.biomass_batch_code || '—'
      if (!batchMap[bc]) batchMap[bc] = { qty: 0, cfus: new Set() }
      batchMap[bc].qty += Number(p.qty_issued_kg) || 0
      batchMap[bc].cfus.add(fmtCfu(p.cfu_per_g_at_issue))
    }
    const batches = Object.entries(batchMap).map(([code, v]) => ({ code, qty: v.qty, cfu: [...v.cfus].join(' / ') }))
    const allMoist = [...new Set(row.picks.filter((p) => p.inward?.moisture != null).map((p) => p.inward.moisture))]
    const allHarv = [...new Set(row.picks.map((p) => p.inward?.date_of_harvest).filter(Boolean))]
    labels.push({
      microbe: toTitleCase(row.microbe_name),
      reqCfu: fmtCfu(row.picks[0]?.required_cfu_per_g),
      totalQty, batches,
      moistLine: allMoist.length ? allMoist.join('/') + '%' : '—',
      harvLine: allHarv.map(fmtDate).join(' / '),
    })
  }

  if (!labels.length) { alert('No picked batches in this session.'); return }

  try {
    await openAuthedFilePost('/api/microbial-sfg/outward/labels/pdf', { product, diNo, orderQty, dt, labels })
  } catch (e) {
    alert('Could not generate labels: ' + (e.message || 'unknown error'))
  }
}
