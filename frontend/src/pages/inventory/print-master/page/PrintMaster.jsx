import './PrintMaster.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, PageHeader, Modal } from "../../../../components/ui";
import { CheckCircle, Printer, ArrowLeftRight } from "lucide-react";
import GenerateForm from "../components/generate-form/GenerateForm.jsx";
import GateInwardPanel from "../components/gate-inward-panel/GateInwardPanel.jsx";

export default function PrintMaster() {
  const navigate = useNavigate();
  const [reloadTrigger, setReloadTrigger]       = useState(0);
  const [gatePanelTrigger, setGatePanelTrigger] = useState(0);
  const [selectedGate, setSelectedGate]         = useState(null);
  const [successInfo, setSuccessInfo]           = useState(null); // { results, totalPacks }

  const handleGenerated = ({ results, totalPacks }) => {
    setSuccessInfo({ results, totalPacks });
    setReloadTrigger(n => n + 1);
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Printer}
        title="Print Master — Generate Pack Labels"
        description="Fill invoice details, add items, then generate QR labels"
        actions={<>
          <Button
            variant="outline-gray"
            icon={ArrowLeftRight}
            onClick={() => navigate("/print-master/return-material")}>
            Return Material
          </Button>
          <Button variant="primary" onClick={() => navigate("/print-master/entries")}>
            Entries
          </Button>
          {/* Real router back — mobile has the native back gesture for this */}
          <span className="hidden md:inline-flex"><BackButton /></span>
        </>}
      />

      <div className="p-4 md:p-6">
      {/* Success popup — QR labels themselves are printed/downloaded from
          Pack Records, not from here, so this just confirms generation. */}
      <Modal open={!!successInfo} onClose={() => setSuccessInfo(null)} size="sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">QR Codes Generated</h2>
          <p className="text-sm text-gray-500 mb-6">
            {successInfo?.totalPacks} pack{successInfo?.totalPacks !== 1 ? 's' : ''} generated across {successInfo?.results.length} item{successInfo?.results.length !== 1 ? 's' : ''}.
            Head to Pack Records to print or download the QR labels.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setSuccessInfo(null)}>Close</Button>
            <Button variant="primary" fullWidth onClick={() => navigate("/print-master/entries")}>Go to Pack Records</Button>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenerateForm
          onGenerated={handleGenerated}
          onGateUsed={() => { setGatePanelTrigger(n => n + 1); setSelectedGate(null); }}
          onUnlink={() => setSelectedGate(null)}
          prefill={selectedGate}
        />
        <GateInwardPanel
          onSelect={setSelectedGate}
          selectedId={selectedGate?.inwardId}
          reloadTrigger={gatePanelTrigger}
        />
      </div>
      </div>
    </div>
  );
}
