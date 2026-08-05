import './PrintMaster.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, PageHeader, Modal } from "../../../../components/ui";
import { CheckCircle, Printer, Download } from "lucide-react";
import { packsApi } from "../../../../api/inventory.js";
import GenerateForm from "../components/generate-form/page/GenerateForm.jsx";
import GateInwardPanel from "../components/gate-inward-panel/GateInwardPanel.jsx";

export default function PrintMaster() {
  const navigate = useNavigate();
  const [selectedGate, setSelectedGate]     = useState(null);
  const [showGatePanel, setShowGatePanel]   = useState(false);
  const [successInfo, setSuccessInfo]       = useState(null); // { results, totalPacks }

  const selectGate = (record) => {
    setSelectedGate(record);
    setShowGatePanel(false);
  };

  // Print opens the merged label PDF inline in a new tab — same pattern as
  // the per-lot "🖨️ Print All" links on Pack Records, just spanning every
  // item/lot produced by this one generation. Download forces the same PDF
  // to save via a Content-Disposition attachment instead.
  const printAllLabels = () => {
    if (!successInfo?.groups?.length) return;
    window.open(packsApi.batchLabelsMultiUrl(successInfo.groups), "_blank", "noopener");
  };
  const downloadAllLabels = () => {
    if (!successInfo?.groups?.length) return;
    const a = document.createElement("a");
    a.href = packsApi.batchLabelsMultiUrl(successInfo.groups, { download: true });
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Printer}
        title="Print Master — Generate Pack Labels"
        actions={<>
          <Button variant="primary" onClick={() => navigate("/print-master/entries")}>
            Entries
          </Button>
          {/* Real router back — mobile has the native back gesture for this */}
          <span className="hidden md:inline-flex"><BackButton /></span>
        </>}
      />

      <div className="p-4 md:p-6">
        {/* Success popup — lets the QR labels just generated be printed or
            downloaded in one shot, without a trip to Pack Records. */}
        <Modal open={!!successInfo} onClose={() => setSuccessInfo(null)} size="sm">
          <div className="p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">QR Codes Generated Successfully</h2>
            <p className="text-sm text-gray-500 mb-4">
              {successInfo?.totalPacks} pack{successInfo?.totalPacks !== 1 ? 's' : ''} generated across {successInfo?.results.length} item{successInfo?.results.length !== 1 ? 's' : ''}.
            </p>

            <div className="text-left text-sm bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6 space-y-1">
              <div><span className="text-gray-500">Item{successInfo?.itemNames?.length !== 1 ? 's' : ''}:</span> <span className="font-medium text-gray-900">{successInfo?.itemNames?.join(', ')}</span></div>
              <div><span className="text-gray-500">Invoice No:</span> <span className="font-medium text-gray-900">{successInfo?.invoiceNo}</span></div>
              <div><span className="text-gray-500">Lot No{successInfo?.lotNumbers?.length !== 1 ? 's' : ''}:</span> <span className="font-medium text-gray-900">{successInfo?.lotNumbers?.join(', ')}</span></div>
            </div>

            <div className="flex gap-3 mb-3">
              <Button variant="primary" fullWidth icon={Printer} onClick={printAllLabels}>Print All QR Codes</Button>
              <Button variant="outline" fullWidth icon={Download} onClick={downloadAllLabels}>Download All</Button>
            </div>
            <Button variant="secondary" fullWidth onClick={() => setSuccessInfo(null)}>Close</Button>
          </div>
        </Modal>

        {/* Gate Inward picker — opened on demand instead of a permanent
            side panel, so the form gets the full page width. */}
        <Modal open={showGatePanel} onClose={() => setShowGatePanel(false)} size="xl">
          <GateInwardPanel
            onSelect={selectGate}
            selectedId={selectedGate?.inwardId}
            onClose={() => setShowGatePanel(false)}
          />
        </Modal>

        <GenerateForm
          onGenerated={setSuccessInfo}
          onGateUsed={() => setSelectedGate(null)}
          onUnlink={() => setSelectedGate(null)}
          onOpenGatePanel={() => setShowGatePanel(true)}
          prefill={selectedGate}
        />
      </div>
    </div>
  );
}
