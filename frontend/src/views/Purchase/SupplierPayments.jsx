import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import Pagination from "../../components/Pagination/Pagination";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { PAYMENT_KIND_META } from "../../components/StatusBadge/purchaseStatusMeta";
import { showToast } from "../../lib/toast";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import SupplierPaymentForm from "../../components/PurchaseForms/SupplierPaymentForm";

function SupplierPayments({ shellProps }) {
    const [supplierFilter, setSupplierFilter] = useState("");
    const [kindFilter, setKindFilter] = useState("");
    const [suppliers, setSuppliers] = useState([]);

    const extraParams = {};
    if (supplierFilter) extraParams.supplier_id = supplierFilter;
    if (kindFilter) extraParams.kind = kindFilter;

    const {
        items: payments,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/supplier-payments", extraParams);

    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { pressedId, pressHandlers } = usePressedRow();

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

    function openModal() {
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setFormError("");
    }

    async function handleFormSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            await api.post("/supplier-payments", values);
            showToast(values.kind === "refund" ? "Supplier refund recorded." : "Supplier payment recorded.");
            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to record payment."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Supplier Payments"
            subtitle="Track vendor disbursements, cheques, bank wires, and supplier refunds."
            error={loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Supplier Payments</h2>
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
                            value={kindFilter}
                            onChange={(e) => setKindFilter(e.target.value)}
                        >
                            <option value="">All Transactions</option>
                            <option value="payment">Payments</option>
                            <option value="refund">Refunds</option>
                        </select>

                        <button
                            className="tenant-btn tenant-btn--primary"
                            type="button"
                            onClick={openModal}
                        >
                            + Record Payment
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
                                <th>Purchase Ref</th>
                                <th>Kind</th>
                                <th>Method</th>
                                <th style={{ textAlign: "right" }}>Amount</th>
                                <th>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={8} rows={6} />
                            ) : (
                                payments.map((p) => (
                                    <tr
                                        key={p.id}
                                        data-toggle
                                        className={pressedId === p.id ? "tenant-row--pressed" : ""}
                                        {...pressHandlers(p.id)}
                                    >
                                        <td data-label="Ref No" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{p.ref_no || `#${p.id}`}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Date">{p.paid_at}</td>
                                        <td data-label="Supplier">
                                            <strong>{p.supplier_name || "—"}</strong>
                                        </td>
                                        <td data-label="Purchase Ref">
                                            {p.purchase_ref_no || `#${p.purchase_id}`}
                                        </td>
                                        <td data-label="Kind">
                                            <StatusBadge status={p.kind} meta={PAYMENT_KIND_META} />
                                        </td>
                                        <td data-label="Method" style={{ textTransform: "capitalize" }}>
                                            {p.method}
                                        </td>
                                        <td data-label="Amount" style={{ textAlign: "right" }}>
                                            <strong
                                                style={{
                                                    color: p.kind === "refund" ? "#aa3bff" : "#14151a",
                                                }}
                                            >
                                                {p.kind === "refund" ? "-Rs. " : "Rs. "}
                                                {Number(p.amount).toFixed(2)}
                                            </strong>
                                        </td>
                                        <td data-label="Note">{p.note || "—"}</td>
                                    </tr>
                                ))
                            )}

                            {!loading && payments.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="tenant-table-empty">
                                        No payments recorded yet. Click &quot;+ Record Payment&quot; to log a vendor transaction.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal
                    title="Record Supplier Payment"
                    onClose={closeModal}
                    maxWidth={560}
                >
                    <SupplierPaymentForm
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleFormSubmit}
                        onCancel={closeModal}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default SupplierPayments;
