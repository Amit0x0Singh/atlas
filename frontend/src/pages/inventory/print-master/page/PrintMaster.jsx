import './PrintMaster.css';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BackButton, Button, PageHeader, Modal } from "../../../../components/ui";
import { CheckCircle, Printer } from "lucide-react";
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
