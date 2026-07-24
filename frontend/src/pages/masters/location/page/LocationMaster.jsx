import { useState } from 'react'
import { Plus, ScanBarcode } from 'lucide-react'
import { Button, BackButton } from '../../../../components/ui'
import Pagination from '../../../../components/pagination/Pagination.jsx'
import ScannerPanel from '../../../../components/ScannerPanel/ScannerPanel.jsx'
import LocationCard      from '../components/location-card/LocationCard.jsx'
import LocationForm      from '../components/location-form/LocationForm.jsx'
import WorkflowInfoCard  from '../components/workflow-info/WorkflowInfoCard.jsx'
import { bulkApi } from '../../../../api/inventory.js'
import { useLocations, useCreateLocation, useDeleteLocation } from '../../../../hooks/inventory/useLocations.js'
import { useRmMaster } from '../../../../hooks/inventory/useRmMaster.js'

export default function LocationMaster() {
  const [showForm, setShowForm]   = useState(false)
  const [expanded, setExpanded]   = useState(null)
  const [msg, setMsg]             = useState({ type: '', text: '' })
  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(15)
  const [showScanner, setShowScanner] = useState(false)

  const [form, setForm]           = useState({ locationId: '', locationName: '', itemCode: '', itemName: '', uom: 'KG' })
  const [rmSearch, setRmSearch]   = useState('')
  const [showRmDrop, setShowRmDrop] = useState(false)

  // Strips the "LOC:" prefix, validates the scanned id against the backend,
  // and expands that location's card — or reports the error inline.
  const onScanLocation = async (raw) => {
    const locationId = raw.startsWith('LOC:') ? raw.slice(4) : raw
    try {
      await bulkApi.getLocation(locationId)
      setExpanded(locationId)
      setShowScanner(false)
    } catch {
      setMsg({ type: 'error', text: `Location "${locationId}" not found` })
    }
  }

  const { data: locations = [], isLoading: loading } = useLocations()
  const { data: rmList = [] } = useRmMaster()
  const createLocation = useCreateLocation()
  const deleteLocationMutation = useDeleteLocation()

  const filteredRm = rmList.filter(r =>
    r.trackingType === 'BULK' &&
    (!rmSearch || r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) ||
     r.itemCode.toLowerCase().includes(rmSearch.toLowerCase()))
  )
  const rmOptions = filteredRm.length > 0 ? filteredRm
    : rmList.filter(r => !rmSearch || r.itemName.toLowerCase().includes(rmSearch.toLowerCase()) ||
        r.itemCode.toLowerCase().includes(rmSearch.toLowerCase()))

  const selectRm = (rm) => {
    setForm(f => ({ ...f, itemCode: rm.itemCode, itemName: rm.itemName, uom: rm.uom }))
    setRmSearch(rm.itemName)
    setShowRmDrop(false)
  }

  const openAdd = () => {
    setForm({ locationId: '', locationName: '', itemCode: '', itemName: '', uom: 'KG' })
    setRmSearch(''); setMsg({ type: '', text: '' }); setShowForm(true)
  }

  const save = async () => {
    if (!form.locationId || !form.locationName || !form.itemCode)
      return setMsg({ type: 'error', text: 'Location ID, name and item are required' })
    setMsg({ type: '', text: '' })
    try {
      await createLocation.mutateAsync(form)
      setShowForm(false)
      setMsg({ type: 'success', text: `Location ${form.locationId} created successfully` })
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const deleteLocation = async (locationId) => {
    if (!confirm(`Delete location ${locationId}? Only allowed if no active stock.`)) return
    try { await deleteLocationMutation.mutateAsync(locationId) }
    catch (e) { alert(e.message) }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Location Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage physical rack/shelf locations for bulk items — each gets a scannable QR
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Button
            variant={showScanner ? 'danger-solid' : 'outline-gray'}
            icon={ScanBarcode}
            onClick={() => setShowScanner(s => !s)}
            size="sm"
          >
            {showScanner ? 'Hide Scanner' : 'Scan QR'}
          </Button>
          <Button variant="success" icon={Plus} onClick={openAdd} size="sm">New Location</Button>
          <BackButton />
        </div>
      </div>

      {msg.text && (
        <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      <WorkflowInfoCard />

      {showScanner && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 max-w-md">
          <ScannerPanel
            accent="indigo"
            onScan={onScanLocation}
            placeholder="Or type the Location ID…"
            scanHint="Point at location QR code"
          />
        </div>
      )}

      {loading ? <p className="text-gray-400">Loading...</p> : (
        <div className="space-y-3">
          {locations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
              <p className="text-lg">No locations yet</p>
              <p className="text-sm mt-1">Create a location to start bulk tracking</p>
            </div>
          ) : locations.slice((page - 1) * limit, page * limit).map(loc => (
            <LocationCard
              key={loc.locationId}
              loc={loc}
              isOpen={expanded === loc.locationId}
              onToggle={() => setExpanded(expanded === loc.locationId ? null : loc.locationId)}
              onDelete={deleteLocation}
            />
          ))}
          <Pagination page={page} total={locations.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
        </div>
      )}

      {showForm && (
        <LocationForm
          msg={msg}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          rmSearch={rmSearch}
          setRmSearch={setRmSearch}
          showRmDrop={showRmDrop}
          setShowRmDrop={setShowRmDrop}
          rmOptions={rmOptions}
          saving={createLocation.isPending}
          onSelectRm={selectRm}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
