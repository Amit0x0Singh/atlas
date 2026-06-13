import { useState, useEffect, useRef, useCallback } from "react";
import { gateApi } from "../../../../api/inventory.js";
import { useAuth } from "../../../../components/erp/AuthContext.jsx";
import GateHeader from "../component/GateHeader.jsx";
import GateTabs from "../component/GateTabs.jsx";
import GateFilterBar from "../component/GateFilterBar.jsx";
import InwardForm from "../component/InwardForm.jsx";
import OutwardForm from "../component/OutwardForm.jsx";
import InwardDetailPanel from "../component/InwardDetailPanel.jsx";
import InwardTable from "../component/InwardTable.jsx";
import OutwardTable from "../component/OutwardTable.jsx";

const EMPTY_FILTERS = { search: "", invoice_no: "", status: "", from_date: "", to_date: "" };

export default function GateEntry() {
  const { hasRole } = useAuth();
  const [tab, setTab] = useState("inward");
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const canGate = hasRole("gate_person", "gate_manager", "gate_staff", "store_person", "store_manager", "admin");

  // debounce ref — only search/invoice_no need debouncing
  const debounceRef = useRef(null);

  const fetchList = useCallback(async (activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 100, ...activeFilters };
      // strip empty strings so they don't become query params
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k] });

      const res = tab === "inward"
        ? await gateApi.inwardList(params)
        : await gateApi.outwardList(params);
      setList(res.data || []);
      setTotal(res.total ?? (res.data?.length ?? 0));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [tab]);

  // Immediate fetch when tab, date, or status changes
  useEffect(() => {
    fetchList(filters);
  }, [tab]);                           // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced fetch for text inputs (search, invoice_no)
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);

    if (key === "search" || key === "invoice_no") {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchList(next), 400);
    } else {
      fetchList(next);
    }
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    fetchList(EMPTY_FILTERS);
  };

  const handleTabChange = (t) => {
    setTab(t);
    setFilters(EMPTY_FILTERS);
    setShowForm(false);
    setDetail(null);
  };

  const submitInward = async (form) => {
    try {
      await gateApi.createInward(form);
      setShowForm(false);
      fetchList(filters);
    } catch (e) {
      alert(e.message);
    }
  };

  const submitOutward = async (form) => {
    try {
      await gateApi.createOutward(form);
      setShowForm(false);
      fetchList(filters);
    } catch (e) {
      alert(e.message);
    }
  };

  const openDetail = async (id) => {
    try {
      const res = await gateApi.inwardDetail(id);
      setDetail(res.data);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div style={{ padding: "24px 28px", background: "#f1f5f9", minHeight: "100vh" }}>
      <GateHeader
        tab={tab}
        showForm={showForm}
        canGate={canGate}
        onNewClick={() => { setShowForm(!showForm); setDetail(null); }}
      />

      <GateTabs tab={tab} onChange={handleTabChange} />

      {showForm && tab === "inward" && (
        <InwardForm onSubmit={submitInward} onCancel={() => setShowForm(false)} />
      )}
      {showForm && tab === "outward" && (
        <OutwardForm onSubmit={submitOutward} onCancel={() => setShowForm(false)} />
      )}

      {detail && (
        <InwardDetailPanel detail={detail} onClose={() => setDetail(null)} />
      )}

      <GateFilterBar
        tab={tab}
        filters={filters}
        onChange={handleFilterChange}
        onClear={handleClearFilters}
        total={total}
      />

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "12px 16px",
            color: "#dc2626",
            fontSize: "13px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: "#fff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            padding: "60px 20px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "14px",
          }}
        >
          Loading…
        </div>
      ) : tab === "inward" ? (
        <InwardTable list={list} total={total} onOpenDetail={openDetail} />
      ) : (
        <OutwardTable list={list} total={total} />
      )}
    </div>
  );
}
