import { useState, useEffect, useRef } from 'react'
import { indentApi } from '../../../../api/production.js'
import './Indent.css'
import { productApi, equipmentApi } from '../../../../api/masters.js'
import { Button, BackButton } from '../../../../components/ui'
import { Plus } from 'lucide-react'
import ProductionIndentTab from '../components/production-indent-tab/ProductionIndentTab.jsx'
import PurchaseIndentTab from '../components/purchase-indent-tab/PurchaseIndentTab.jsx'
import PendingIndentsTab from '../components/pending-indents-tab/PendingIndentsTab.jsx'
import PurchaseOrderModal from '../components/purchase-order-modal/PurchaseOrderModal.jsx'
import StockShortfallModal from '../components/stock-shortfall-modal/StockShortfallModal.jsx'
import CreateIndentModal from '../components/create-indent-modal/CreateIndentModal.jsx'

import { toTitleCase } from '../../../../utils/textDisplay.js'
const TABS = ['Production Indent', 'Purchase Indent', 'Pending Indents']

export default function Indent() {
  const [tab, setTab] = useState(0)
  const [indents, setIndents] = useState([])
  const [productList, setProductList] = useState([])
  const [equipmentList, setEquipmentList] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const LIMIT = 20

  const [purchaseSummary, setPurchaseSummary] = useState([])
  const [purchaseLoading, setPurchaseLoading] = useState(false)
  const [orderQtys, setOrderQtys] = useState({})
  const [showPO, setShowPO] = useState(false)
  const [emailTo, setEmailTo] = useState(() => localStorage.getItem('po_email_to') || '')
  const [emailCc, setEmailCc] = useState(() => localStorage.getItem('po_email_cc') || '')
  const [emailSaved, setEmailSaved] = useState(false)
  const [showSentPOs, setShowSentPOs] = useState(false)

  const [form, setForm] = useState({ productCode: '', productName: '', batchSize: '', batchNo: '', diNo: '', plant: '', equipment: '', cycleBatchSize: '' })
  const [prodSearch, setProdSearch] = useState('')
  const [showProdDrop, setShowProdDrop] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [batchNoAuto, setBatchNoAuto] = useState('')
  const [loadingBatchNo, setLoadingBatchNo] = useState(false)
  const [sfgInfo, setSfgInfo] = useState(null)
  const [stockCheck, setStockCheck] = useState(null)
  const [checkingStock, setCheckingStock] = useState(false)
  const [recipePreview, setRecipePreview] = useState([])
  const [showStockModal, setShowStockModal] = useState(false)
  const stockTimer = useRef(null)

  useEffect(() => { loadAll() }, [page])
  useEffect(() => { if (tab === 1) loadPurchaseSummary() }, [tab, showSentPOs])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [indentRes, prodRes, equipRes] = await Promise.all([
        indentApi.list({ page, limit: LIMIT }),
        productApi.search({}),
        equipmentApi.search(),
      ])
      setIndents(indentRes.data || [])
      setTotal(indentRes.total || 0)
      setProductList(prodRes.data || [])
      setEquipmentList(equipRes.data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const loadPurchaseSummary = async () => {
    setPurchaseLoading(true)
    try {
      const res = await indentApi.purchaseSummary({ showSent: showSentPOs ? 'true' : 'false' })
      const data = res.data || []
      setPurchaseSummary(data)
      const qts = {}
      data.forEach(r => { qts[r.rmCode] = r.suggestedOrderQty })
      setOrderQtys(qts)
    } catch (e) { console.error(e) }
    setPurchaseLoading(false)
  }

  const filteredProducts = productList.filter(p =>
    !prodSearch ||
    p.productName.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.productCode.toLowerCase().includes(prodSearch.toLowerCase())
  )

  const selectProduct = async (prod) => {
    setProdSearch(prod.productName)
    setShowProdDrop(false)
    setStockCheck(null); setSfgInfo(null); setRecipePreview([])
    setForm(f => ({ ...f, productCode: prod.productCode, productName: prod.productName, plant: prod.plant || f.plant }))
    setLoadingBatchNo(true)
    const [batchRes, sfgRes] = await Promise.allSettled([
      indentApi.nextBatchNo(prod.productCode),
      indentApi.sfgAvailable(prod.productCode),
    ])
    setLoadingBatchNo(false)
    if (batchRes.status === 'fulfilled') {
      const bn = batchRes.value?.data?.batchNo || ''
      setBatchNoAuto(bn); setForm(f => ({ ...f, batchNo: bn }))
    }
    if (sfgRes.status === 'fulfilled') {
      const d = sfgRes.value?.data
      if (d && d.totalSfg > 0) setSfgInfo(d)
    }
  }

  const handleBatchSizeChange = (val) => {
    setForm(f => ({ ...f, batchSize: val }))
    setStockCheck(null); setRecipePreview([])
    if (stockTimer.current) clearTimeout(stockTimer.current)
    if (val && form.productCode) {
      stockTimer.current = setTimeout(() => runStockCheck(form.productCode, val), 700)
    }
  }

  const runStockCheck = async (productCode, batchSize) => {
    if (!productCode || !batchSize) return
    setCheckingStock(true)
    try {
      const res = await indentApi.stockCheck(productCode, batchSize)
      const d = res?.data || res
      setStockCheck(d); setRecipePreview(d.checks || [])
    } catch (e) { console.error(e) }
    setCheckingStock(false)
  }

  const handleSubmit = async () => {
    if (!form.productCode) { setError('Select a product'); return }
    if (!form.batchSize) { setError('Batch size is required'); return }
    if (!form.batchNo.trim()) { setError('Batch No is required'); return }
    if (!form.diNo.trim()) { setError('DI No is required'); return }
    if (!stockCheck && form.productCode && form.batchSize) await runStockCheck(form.productCode, form.batchSize)
    if (stockCheck && !stockCheck.allOk) { setShowStockModal(true); return }
    doCreate()
  }

  const doCreate = async () => {
    setShowStockModal(false); setCreating(true); setError('')
    try {
      await indentApi.create(form)
      closeForm(); loadAll()
    } catch (e) { setError(e.message); setCreating(false) }
  }

  const closeForm = () => {
    setShowForm(false)
    setForm({ productCode: '', productName: '', batchSize: '', batchNo: '', diNo: '', plant: '', equipment: '', cycleBatchSize: '' })
    setProdSearch(''); setStockCheck(null); setRecipePreview([]); setSfgInfo(null)
    setBatchNoAuto(''); setError(''); setCreating(false)
  }

  const shortfallItems = stockCheck?.checks?.filter(c => !c.ok) || []
  const visibleIndents = tab === 2
    ? indents.filter(i => i.status === 'PENDING_STOCK')
    : indents.filter(i => i.status !== 'PENDING_STOCK')
  const totalPages = Math.ceil(total / LIMIT)

  const generatePO = () => {
    const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    const uniqueIndents = [...new Set(purchaseSummary.flatMap(r => r.indents?.map(x => x.indentId) || []))]
    const lines = [
      'PURCHASE REQUISITION', 'SOM Phytopharma (India) Ltd',
      'Plot No 154/A5-1, SVCIE, IDA Bollaram, Sangareddy, Hyderabad - 502325', '',
      `Date: ${date}`, `Covering ${uniqueIndents.length} pending production indent(s)`, '', 'Items Required:', '"?'.repeat(60),
    ]
    purchaseSummary.forEach((rm, i) => {
      const qty = orderQtys[rm.rmCode] || rm.suggestedOrderQty
      lines.push(`${i + 1}. ${toTitleCase(rm.rmName)}  [${rm.rmCode}]`)
      lines.push(`   Required : ${Number(rm.totalRequired).toFixed(3)}  |  Available: ${Number(rm.availableQty).toFixed(3)}  |  Shortfall: ${Number(rm.shortfall).toFixed(3)}`)
      lines.push(`   ORDER QTY: ${Number(qty).toFixed(3)}`)
      if (rm.indents?.length) lines.push(`   For indents: ${rm.indents.map(x => x.productName).join(', ')}`)
      lines.push('')
    })
    lines.push('"?'.repeat(60), 'Please arrange procurement at the earliest.', '', 'Regards,', 'Stores Department — SOM Phytopharma (India) Ltd')
    return lines.join('\n')
  }

  const saveEmailDefaults = () => {
    localStorage.setItem('po_email_to', emailTo); localStorage.setItem('po_email_cc', emailCc)
    setEmailSaved(true); setTimeout(() => setEmailSaved(false), 2000)
  }

  const sendEmail = async () => {
    const subject = encodeURIComponent(`Purchase Requisition — ${new Date().toLocaleDateString('en-IN')}`)
    const body = encodeURIComponent(generatePO())
    const cc = emailCc ? `&cc=${encodeURIComponent(emailCc)}` : ''
    const indentIds = [...new Set(purchaseSummary.flatMap(r => r.indents?.map(i => i.indentId) || []))]
    if (indentIds.length) {
      try { await indentApi.markPoSent(indentIds) } catch { /* non-blocking */ }
      loadPurchaseSummary()
    }
    window.location.href = `mailto:${encodeURIComponent(emailTo)}?subject=${subject}${cc}&body=${body}`
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Indent Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Production work orders — Item requirements auto-calculated from Recipe DB</p>
        </div>
        <div className="flex items-center gap-3">
          {tab === 0 && (
            <Button variant="primary" icon={Plus} onClick={() => { setShowForm(true); setError('') }}>
              New Production Indent
            </Button>
          )}
          <BackButton />
        </div>
      </div>

      <div className="flex gap-0 mb-5 border-b border-gray-200">
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {i === 2 && indents.filter(x => x.status === 'PENDING_STOCK').length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {indents.filter(x => x.status === 'PENDING_STOCK').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <ProductionIndentTab
          productList={productList} loading={loading} visibleIndents={visibleIndents}
          selected={selected} setSelected={setSelected}
          page={page} totalPages={totalPages} setPage={setPage}
        />
      )}

      {tab === 1 && (
        <PurchaseIndentTab
          showSentPOs={showSentPOs} setShowSentPOs={setShowSentPOs}
          onRefresh={loadPurchaseSummary} onGeneratePO={() => setShowPO(true)}
          purchaseLoading={purchaseLoading} purchaseSummary={purchaseSummary}
          orderQtys={orderQtys} setOrderQtys={setOrderQtys}
        />
      )}

      {tab === 2 && (
        <PendingIndentsTab loading={loading} visibleIndents={visibleIndents} selected={selected} setSelected={setSelected} />
      )}

      {showPO && (
        <PurchaseOrderModal
          onClose={() => setShowPO(false)}
          generatePO={generatePO}
          emailTo={emailTo} setEmailTo={setEmailTo}
          emailCc={emailCc} setEmailCc={setEmailCc}
          emailSaved={emailSaved} saveEmailDefaults={saveEmailDefaults} sendEmail={sendEmail}
        />
      )}

      {showStockModal && (
        <StockShortfallModal
          shortfallItems={shortfallItems} creating={creating}
          onConfirm={doCreate} onCancel={() => setShowStockModal(false)}
        />
      )}

      {showForm && (
        <CreateIndentModal
          form={form} setForm={setForm} error={error}
          prodSearch={prodSearch} setProdSearch={setProdSearch}
          showProdDrop={showProdDrop} setShowProdDrop={setShowProdDrop}
          filteredProducts={filteredProducts} onSelectProduct={selectProduct}
          sfgInfo={sfgInfo} setStockCheck={setStockCheck} setBatchNoAuto={setBatchNoAuto} setSfgInfo={setSfgInfo}
          batchNoAuto={batchNoAuto} loadingBatchNo={loadingBatchNo}
          onBatchSizeChange={handleBatchSizeChange}
          recipePreview={recipePreview} checkingStock={checkingStock} stockCheck={stockCheck} shortfallItems={shortfallItems}
          equipmentList={equipmentList}
          creating={creating}
          onSubmit={handleSubmit} onClose={closeForm}
        />
      )}
    </div>
  )
}
