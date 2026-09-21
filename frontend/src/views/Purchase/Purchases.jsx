import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import Pagination from "../../components/Pagination/Pagination";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import {
    PURCHASE_STATUS_META,
    PAYMENT_STATUS_META,
} from "../../components/StatusBadge/purchaseStatusMeta";
import { showToast } from "../../lib/toast";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import PurchaseForm from "../../components/PurchaseForms/PurchaseForm";
import PurchaseDetail from "./PurchaseDetail";

function Purchases({ shellProps, prefilledPo, onClearPrefilledPo }) {
    const [supplierFilter, setSupplierFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [suppliers, setSuppliers] = useState([]);

    const extraParams = {};
    if (supplierFilter) extraParams.supplier_id = supplierFilter;
    if (statusFilter) extraParams.status = statusFilter;

    const {
        items: purchases,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/purchases", extraParams);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { pressedId, pressHandlers } = usePressedRow();

    const isAddModalOpen = modalOpen || Boolean(prefilledPo);

    useEffect(() => {
        let cancelled = false;

        api.get("/suppliers", { params: { all: 1 } })
            .then((res) => {
                if (!cancelled) setSuppliers(res.data.filter((s) => s.is_active));
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    function openAddModal() {
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setFormError("");
        if (onClearPrefilledPo) onClearPrefilledPo();
    }

    async function handleFormSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            await api.post("/purchases", values);
            showToast("Purchase recorded and stock received into inventory.");
            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to record purchase."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Purchases"
            subtitle="Record stock receipts, vendor invoices, moving cost updates, and payment settlements."
            error={loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Purchases</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <select
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            value={supplierFilter}
                            onChange={(e) => setSupplierFilter(e.target.value)}
                        >
                            <option value="">All Suppliers</option>
                            {suppliers.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>

                        <select
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="">All Statuses</option>
                            <option value="received">Received</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                            className="tenant-btn tenant-btn--primary"
                            type="button"
                            onClick={openAddModal}
                        >
                            + New Purchase
                        </button>
                    </div>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Ref No</th>
                                <th>Date</th>
                                <th>Supplier</th>
                                <th>Store</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th style={{ textAlign: "right" }}>Total</th>
                                <th style={{ textAlign: "right" }}>Returned</th>
                                <th style={{ textAlign: "right" }}>Paid</th>
                                <th style={{ textAlign: "right" }}>Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={11} rows={6} hasActions />
                            ) : (
                                purchases.map((purchase) => {
                                    const bal = Number(purchase.balance);
                                    const isCredit = bal < -0.005;
                                    const hasDue = bal > 0.005;

                                    return (
                                        <tr
                                            key={purchase.id}
                                            data-toggle
                                            className={pressedId === purchase.id ? "tenant-row--pressed" : ""}
                                            onClick={() => setSelectedPurchaseId(purchase.id)}
                                            {...pressHandlers(purchase.id)}
                                        >
                                            <td data-label="Ref No" className="mobile-summary">
                                                <div className="tenant-cell">
                                                    <strong>{purchase.ref_no || `#${purchase.id}`}</strong>
                                                    {purchase.supplier_invoice_no && (
                                                        <span style={{ fontSize: 11, color: "#6b6b63" }}>
                                                            {purchase.supplier_invoice_no}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td data-label="Date">{purchase.purchase_date}</td>
                                            <td data-label="Supplier">
                                                <strong>{purchase.supplier_name || "—"}</strong>
                                            </td>
                                            <td data-label="Store">{purchase.store_name || "—"}</td>
                                            <td data-label="Status">
                                                <StatusBadge
                                                    status={purchase.status}
                                                    meta={PURCHASE_STATUS_META}
                                                />
                                            </td>
                                            <td data-label="Payment">
                                                <StatusBadge
                                                    status={purchase.payment_status}
                                                    meta={PAYMENT_STATUS_META}
                                                />
                                            </td>
                                            <td data-label="Total" style={{ textAlign: "right" }}>
                                                Rs. {Number(purchase.total).toFixed(2)}
                                            </td>
                                            <td data-label="Returned" style={{ textAlign: "right" }}>
                                                {purchase.returned_total > 0
                                                    ? `Rs. ${Number(purchase.returned_total).toFixed(2)}`
                                                    : "—"}
                                            </td>
                                            <td data-label="Paid" style={{ textAlign: "right" }}>
                                                Rs. {Number(purchase.paid_total).toFixed(2)}
                                            </td>
                                            <td data-label="Balance" style={{ textAlign: "right" }}>
                                                <strong
                                                    style={{
                                                        color: hasDue
                                                            ? "#c22b3a"
                                                            : isCredit
                                                            ? "#aa3bff"
                                                            : "#1c8a53",
                                                    }}
                                                >
                                                    {isCredit
                                                        ? `Credit: Rs. ${Math.abs(bal).toFixed(2)}`
                                                        : `Rs. ${bal.toFixed(2)}`}
                                                </strong>
                                            </td>
                                            <td data-label="Actions">
                                                <button
                                                    type="button"
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPurchaseId(purchase.id);
                                                    }}
                                                >
                                                    Details
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {!loading && purchases.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="tenant-table-empty">
                                        No purchases found. Click &quot;+ New Purchase&quot; to record stock received from a supplier.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {/* New Purchase Modal */}
            {isAddModalOpen && (
                <Modal
                    title="Record Purchase Receipt"
                    onClose={closeModal}
                    maxWidth={840}
                >
                    <PurchaseForm
                        prefilledPo={prefilledPo}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleFormSubmit}
                        onCancel={closeModal}
                    />
                </Modal>
            )}

            {/* Drill-down Detail Modal */}
            {selectedPurchaseId && (
                <Modal
                    title="Purchase Details & Statement"
                    onClose={() => setSelectedPurchaseId(null)}
                    maxWidth={840}
                    className="modal-card--account-details"
                >
                    <PurchaseDetail
                        purchaseId={selectedPurchaseId}
                        onClose={() => setSelectedPurchaseId(null)}
                        onRefreshList={reload}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Purchases;
