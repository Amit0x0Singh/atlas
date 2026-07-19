import { Button } from "../../../../../components/ui";
import { Plus, X } from "lucide-react";
import "./GateHeader.css";

export default function GateHeader({ tab, showForm, canGate, onNewClick, backButton }) {
  return (
    <div className="gh-wrap">
      <div>
        <h1 className="gh-title">Gate Entry</h1>
        <p className="gh-subtitle">Manage inward and outward material movements</p>
      </div>

      <div className="gh-actions">
        {canGate && (
          <Button
            variant={showForm ? "secondary" : "primary"}
            icon={showForm ? X : Plus}
            onClick={onNewClick}
          >
            {showForm ? "Cancel" : `New ${tab === "inward" ? "Inward" : "Outward"}`}
          </Button>
        )}
        {backButton}
      </div>
    </div>
  );
}
