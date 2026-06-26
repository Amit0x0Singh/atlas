import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../../../components/erp/BackButton.jsx";
import GenerateForm from "../components/GenerateForm.jsx";
import GateInwardPanel from "../components/GateInwardPanel.jsx";

export default function PrintMaster() {
  const navigate = useNavigate();
  const [reloadTrigger, setReloadTrigger]       = useState(0);
  const [gatePanelTrigger, setGatePanelTrigger] = useState(0);
  const [selectedGate, setSelectedGate]         = useState(null);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Print Master — Generate Pack Labels</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/print-master/entries")}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
          >
            Entries
          </button>
          <BackButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenerateForm
          onGenerated={() => setReloadTrigger(n => n + 1)}
          onGateUsed={() => { setGatePanelTrigger(n => n + 1); setSelectedGate(null); }}
          prefill={selectedGate}
        />
        <GateInwardPanel
          onSelect={setSelectedGate}
          selectedId={selectedGate?.inward_id}
          reloadTrigger={gatePanelTrigger}
        />
      </div>
    </div>
  );
}
