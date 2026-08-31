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
// in this app for the same reason). ────────────────────────────────────
export function printMicrobeLabels(session) {
  const product = toTitleCase(session.productName) || '—'
  const diNo = session.diNumber || '—'
  const orderQty = session.orderQtyKg || '—'
  const dt = fmtDate(session.firstAt)

  const labels = []
  for (const row of session.microbes || []) {
    if (!row.picks?.length) continue
    const totalQty = row.picks.reduce((t, x) => t + (Number(x.qty_issued_kg) || 0), 0)
    const batches = {}
    for (const p of row.picks) {
      const bc = p.inward?.biomass_batch_code || '—'
      if (!batches[bc]) batches[bc] = { qty: 0 }
      batches[bc].qty += Number(p.qty_issued_kg) || 0
    }
    const bKeys = Object.keys(batches)
    const batchHtml = bKeys.length === 1
      ? `<div style="display:flex;justify-content:space-between;margin-bottom:.5mm"><span style="font-weight:700;font-size:7.5pt">Biomass Batch</span><span style="font-family:monospace;font-size:7.5pt">${esc(bKeys[0])}</span></div>`
      : bKeys.map((bc) => `<div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:7pt">Batch</span><span style="font-size:7pt;font-family:monospace">${esc(bc)} (${batches[bc].qty.toFixed(3)}kg)</span></div>`).join('')
    const allCfu = [...new Set(row.picks.map((p) => fmtCfu(p.cfu_per_g_at_issue)))]
    const allMoist = [...new Set(row.picks.filter((p) => p.inward?.moisture != null).map((p) => p.inward.moisture))]
    const allHarv = [...new Set(row.picks.map((p) => p.inward?.date_of_harvest).filter(Boolean))]
    labels.push({
      microbe: toTitleCase(row.microbe_name),
      reqCfu: fmtCfu(row.picks[0]?.required_cfu_per_g),
      totalQty, batchHtml,
      cfuLine: allCfu.join(' / '),
      moistLine: allMoist.length ? allMoist.join('/') + '%' : '—',
      harvLine: allHarv.map(fmtDate).join(' / '),
    })
  }

  if (!labels.length) { alert('No picked batches in this session.'); return }

  const labelHtml = labels.map((lb) => `
    <div style="width:100mm;height:50mm;border:.5mm solid #000;box-sizing:border-box;padding:2.5mm 3mm;font-family:Arial,sans-serif;display:inline-block;vertical-align:top;overflow:hidden;margin:1mm">
      <div style="border-bottom:.5mm solid #000;padding-bottom:1mm;margin-bottom:1mm;text-align:center">
        <div style="font-size:8.5pt;font-weight:700">${LETTERHEAD_NAME}</div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:.5mm">
        <div style="font-size:7.5pt"><span style="font-weight:700">Product:</span> ${esc(product)}</div>
        <div style="font-size:7.5pt"><span style="font-weight:700">Order Qty:</span> ${esc(orderQty)} kg</div>
      </div>
      <div style="font-size:7.5pt;margin-bottom:.5mm"><span style="font-weight:700">Req. Specs:</span> <span style="font-family:monospace">${lb.reqCfu} CFU/g</span></div>
      <div style="border-top:.5mm solid #000;margin:1mm 0"></div>
      <div style="font-size:9.5pt;font-weight:700;margin-bottom:.5mm">${esc(lb.microbe)}</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:.5mm">
        <div style="font-size:7.5pt"><span style="font-weight:700">In-house CFU/g:</span> <span style="font-family:monospace">${lb.cfuLine}</span></div>
        <div style="font-size:8pt;font-weight:700">Qty: ${lb.totalQty.toFixed(4)} kg</div>
      </div>
      ${lb.batchHtml}
      <div style="display:flex;justify-content:space-between;margin-bottom:.5mm">
        <div style="font-size:7pt"><span style="font-weight:700">Moisture:</span> ${lb.moistLine}</div>
        <div style="font-size:7pt"><span style="font-weight:700">Harvest:</span> ${lb.harvLine}</div>
      </div>
      <div style="border-top:.5mm solid #000;margin-top:.5mm;padding-top:.5mm;display:flex;justify-content:space-between">
        <div style="font-size:7pt"><span style="font-weight:700">DI No:</span> ${esc(diNo)}</div>
        <div style="font-size:7pt"><span style="font-weight:700">Date of Issue:</span> ${dt}</div>
      </div>
    </div>`).join('')

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Labels — ' + esc(product) + '</title>'
    + '<style>@page{size:A4 portrait;margin:4mm}body{margin:0;padding:4mm;font-family:Arial,sans-serif}'
    + '@media print{.np{display:none}}</style></head><body>'
    + '<div class="np" style="background:#92400e;color:#fff;padding:9px 16px;display:flex;gap:10px;align-items:center;margin-bottom:8px">'
    + '<b>Labels — Thermal Printer (100&times;50mm)</b>'
    + '<button onclick="window.print()" style="background:#fff;color:#92400e;border:none;padding:5px 12px;border-radius:5px;font-weight:700;cursor:pointer">\u{1F5A8} Print Labels</button>'
    + '<button onclick="window.close()" style="background:rgba(255,255,255,.2);color:#fff;border:none;padding:5px 10px;border-radius:5px;cursor:pointer">Close</button>'
    + '<span style="font-size:12px;opacity:.8">' + labels.length + ' label(s)</span></div>'
    + labelHtml + '</body></html>'
  openPrintWindow(html)
}
