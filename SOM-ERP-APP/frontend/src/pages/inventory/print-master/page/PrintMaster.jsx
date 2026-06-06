import { useState } from "react";
import GenerateForm from "../components/GenerateForm.jsx";
import HowItWorks from "../components/HowItWorks.jsx";
import PackTable from "../components/PackTable.jsx";

export default function PrintMaster() {
  // Incrementing this tells PackTable to reload after a successful generation
  const [reloadTrigger, setReloadTrigger] = useState(0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Print Master — Generate Pack Labels
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <GenerateForm onGenerated={() => setReloadTrigger((n) => n + 1)} />
        <HowItWorks />
      </div>

      <PackTable reloadTrigger={reloadTrigger} />
    </div>
  );
}
