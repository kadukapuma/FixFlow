import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import {
    PURCHASE_STATUS_META,
    PAYMENT_STATUS_META,
    PAYMENT_KIND_META,
} from "../../components/StatusBadge/purchaseStatusMeta";
import { confirmAction } from "../../lib/confirm";
import { showToast } from "../../lib/toast";
import Modal from "../../components/Modal/Modal";
import SupplierPaymentForm from "../../components/PurchaseForms/SupplierPaymentForm";
import PurchaseReturnForm from "../../components/PurchaseForms/PurchaseReturnForm";

function PurchaseDetail({ purchaseId, onClose, onRefreshList }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("items");
    const [cancelling, setCancelling] = useState(false);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [paymentError, setPaymentError] = useState("");

    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [returnSubmitting, setReturnSubmitting] = useState(false);
    const [returnError, setReturnError] = useState("");

    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await api.get(`/purchases/${purchaseId}`);
                if (!cancelled) {
                    setData(res.data);
                    setError("");
                }
            } catch (err) {
                if (!cancelled) {
                    setError(getErrorMessage(err, "Unable to load purchase details."));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [purchaseId, reloadKey]);

    async function handleCancelPurchase() {
        const confirmed = await confirmAction({
            title: "Cancel Purchase?",
            message: `Are you sure you want to cancel purchase ${data.ref_no || `#${data.id}`}? Stock will be reversed and accounting journal entries will be posted. This cannot be undone.`,
            confirmLabel: "Cancel Purchase",
            danger: true,
        });

        if (!confirmed) return;

        setCancelling(true);
        try {
            await api.post(`/purchases/${data.id}/cancel`);
            showToast("Purchase cancelled and stock reversed.");
            setReloadKey((k) => k + 1);
            if (onRefreshList) onRefreshList();
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to cancel purchase."), "error");
        } finally {
            setCancelling(false);
        }
    }

    async function handlePaymentSubmit(values) {
        setPaymentSubmitting(true);
        setPaymentError("");
        try {
            await api.post("/supplier-payments", values);
            showToast(values.kind === "refund" ? "Supplier refund recorded." : "Supplier payment recorded.");
            setPaymentModalOpen(false);
            setReloadKey((k) => k + 1);
            if (onRefreshList) onRefreshList();
        } catch (err) {
            setPaymentError(getErrorMessage(err, "Failed to record payment."));
        } finally {
            setPaymentSubmitting(false);
        }
    }

    async function handleReturnSubmit(values) {
        setReturnSubmitting(true);
        setReturnError("");
        try {
            await api.post("/purchase-returns", values);
            showToast("Purchase return recorded.");
            setReturnModalOpen(false);
            setReloadKey((k) => k + 1);
            if (onRefreshList) onRefreshList();
        } catch (err) {
            setReturnError(getErrorMessage(err, "Failed to record return."));
        } finally {
            setReturnSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading purchase details...</span>
            </div>
        );
    }

    if (error) {
        return (
            <p className="tenant-alert" role="alert">
                {error}
            </p>
        );
    }

    if (!data) return null;

    const balance = Number(data.balance);
    const hasBalanceDue = balance > 0.005;
    const isCredit = balance < -0.005;
    const isCancelled = data.status === "cancelled";
    const canCancel = !isCancelled && data.payments.length === 0 && data.returns.length === 0;
    const canReturn = !isCancelled && data.items.some((i) => i.returnable_quantity > 0);

    return (
        <div className="sd-root">
            {/* Header */}
            <div className="sd-header">
                <div className="sd-header__main">
                    <div className="sd-header__title-row">
                        <h3 className="sd-header__item-name">
                            {data.supplier?.name || "Supplier"}
                        </h3>
                        <span className="sd-header__ref-badge">{data.ref_no}</span>
                        <StatusBadge status={data.status} meta={PURCHASE_STATUS_META} />
                        <StatusBadge status={data.payment_status} meta={PAYMENT_STATUS_META} />
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item">
                            Store: <strong>{data.store?.name || "—"}</strong>
                        </span>
                        <span className="sd-header__meta-item">
                            Date: <strong>{data.purchase_date}</strong>
                        </span>
                        {data.supplier_invoice_no && (
                            <span className="sd-header__meta-item">
                                Inv: <strong>{data.supplier_invoice_no}</strong>
                            </span>
                        )}
                        {data.purchase_order && (
                            <span className="sd-header__meta-item">
                                From PO: <strong>{data.purchase_order.ref_no}</strong>
                            </span>
                        )}
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div
                        className={`sd-header__finance-btn ${
                            hasBalanceDue
                                ? "sd-header__finance-btn--due"
                                : isCredit
                                ? "sd-header__finance-btn--credit"
                                : "sd-header__finance-btn--paid"
                        }`}
                        style={{ cursor: "default" }}
                    >
                        <span className="sd-header__finance-label">
                            {isCredit
                                ? `Credit: Rs. ${Math.abs(balance).toFixed(2)}`
                                : `Rs. ${balance.toFixed(2)}`}
                        </span>
                        <span className="sd-header__finance-sub">
                            {hasBalanceDue ? "Balance due" : isCredit ? "Supplier credit" : "Settled in full"}
                        </span>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="sd-kpi-bar">
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Purchased</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.total).toFixed(2)}</span>
                </div>
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Returned</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.returned_total).toFixed(2)}</span>
                </div>
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Paid</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.paid_total).toFixed(2)}</span>
                </div>
                <div
                    className={`sd-kpi-card ${
                        hasBalanceDue ? "sd-kpi-card--due" : isCredit ? "sd-kpi-card--credit" : "sd-kpi-card--paid"
                    }`}
                >
                    <span className="sd-kpi-card__label">Net Balance</span>
                    <span className="sd-kpi-card__value">
                        {isCredit
                            ? `Credit Rs. ${Math.abs(balance).toFixed(2)}`
                            : hasBalanceDue
                            ? `Rs. ${balance.toFixed(2)}`
                            : "Paid in full"}
                    </span>
                </div>
            </div>

            {/* Action Bar */}
            {!isCancelled && (
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        padding: "0 2px",
                    }}
                >
                    {Math.abs(balance) > 0.005 && (
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--primary tenant-btn--sm"
                            onClick={() => setPaymentModalOpen(true)}
                        >
                            {isCredit ? "Record Supplier Refund" : "Record Supplier Payment"}
                        </button>
                    )}

                    {canReturn && (
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            onClick={() => setReturnModalOpen(true)}
                        >
                            Return Items to Supplier
                        </button>
                    )}

                    {canCancel ? (
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            style={{ color: "#c22b3a", marginLeft: "auto" }}
                            disabled={cancelling}
                            onClick={handleCancelPurchase}
                        >
                            {cancelling ? "Cancelling..." : "Cancel Purchase"}
                        </button>
                    ) : (
                        <span
                            style={{
                                marginLeft: "auto",
                                fontSize: 12,
                                color: "#9b9a8f",
                                fontStyle: "italic",
                            }}
                        >
                            {data.payments.length > 0 || data.returns.length > 0
                                ? "Cannot cancel: transactions exist"
                                : ""}
                        </span>
                    )}
                </div>
            )}

            {isCancelled && (
                <div
                    className="tenant-alert"
                    style={{ background: "#fadfe1", color: "#c22b3a", borderColor: "#fadfe1" }}
                >
                    This purchase was cancelled on {data.cancelled_at}. All stock movements and ledger
                    postings were reversed.
                </div>
            )}

            {/* Tabs & Table */}
            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div style={{ display: "flex", gap: 12 }}>
                        <button
                            type="button"
                            className={`tenant-btn tenant-btn--sm ${
                                activeTab === "items" ? "tenant-btn--primary" : "tenant-btn--ghost"
                            }`}
                            onClick={() => setActiveTab("items")}
                        >
                            Items ({data.items.length})
                        </button>
                        <button
                            type="button"
                            className={`tenant-btn tenant-btn--sm ${
                                activeTab === "payments" ? "tenant-btn--primary" : "tenant-btn--ghost"
                            }`}
                            onClick={() => setActiveTab("payments")}
                        >
                            Payments ({data.payments.length})
                        </button>
                        <button
                            type="button"
                            className={`tenant-btn tenant-btn--sm ${
                                activeTab === "returns" ? "tenant-btn--primary" : "tenant-btn--ghost"
                            }`}
                            onClick={() => setActiveTab("returns")}
                        >
                            Returns ({data.returns.length})
                        </button>
                    </div>

                    <div className="sd-work-total-badge">
                        <span>Status:</span>
                        <strong style={{ textTransform: "capitalize" }}>{data.status}</strong>
                    </div>
                </div>

                {activeTab === "items" && (
                    <div className="sd-table-wrap">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th style={{ textAlign: "right" }}>Qty Recv.</th>
                                    <th style={{ textAlign: "right" }}>Qty Ret.</th>
                                    <th style={{ textAlign: "right" }}>Unit Cost</th>
                                    <th style={{ textAlign: "right" }}>Discount</th>
                                    <th style={{ textAlign: "right" }}>Net Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="sd-table__cell-desc">
                                            <strong>{item.product_name}</strong>
                                        </td>
                                        <td style={{ textAlign: "right" }}>{item.quantity}</td>
                                        <td style={{ textAlign: "right" }}>
                                            {item.returned_quantity > 0 ? (
                                                <span style={{ color: "#c22b3a", fontWeight: 600 }}>
                                                    {item.returned_quantity}
                                                </span>
                                            ) : (
                                                "0"
                                            )}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            Rs. {Number(item.unit_cost).toFixed(2)}
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            {item.discount_value > 0
                                                ? item.discount_type === "percent"
                                                    ? `${item.discount_value}%`
                                                    : `Rs. ${item.discount_value.toFixed(2)}`
                                                : "—"}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            Rs. {Number(item.line_total).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "payments" && (
                    <div className="sd-table-wrap">
                        {data.payments.length > 0 ? (
                            <table className="sd-table">
                                <thead>
                                    <tr>
                                        <th>Ref No</th>
                                        <th>Date</th>
                                        <th>Kind</th>
                                        <th>Method</th>
                                        <th style={{ textAlign: "right" }}>Amount</th>
                                        <th>Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.payments.map((p) => (
                                        <tr key={p.id}>
                                            <td className="sd-table__cell-desc">{p.ref_no}</td>
                                            <td>{p.paid_at}</td>
                                            <td>
                                                <StatusBadge status={p.kind} meta={PAYMENT_KIND_META} />
                                            </td>
                                            <td style={{ textTransform: "capitalize" }}>{p.method}</td>
                                            <td className="sd-table__cell-cost">
                                                Rs. {Number(p.amount).toFixed(2)}
                                            </td>
                                            <td>{p.note || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="sd-empty-state">
                                <h5>No payments recorded</h5>
                                <p>No payments or refunds have been logged for this purchase yet.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "returns" && (
                    <div className="sd-table-wrap">
                        {data.returns.length > 0 ? (
                            <table className="sd-table">
                                <thead>
                                    <tr>
                                        <th>Return Ref</th>
                                        <th>Date</th>
                                        <th>Items Returned</th>
                                        <th style={{ textAlign: "right" }}>Total Value</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.returns.map((ret) => (
                                        <tr key={ret.id}>
                                            <td className="sd-table__cell-desc">{ret.ref_no}</td>
                                            <td>{ret.return_date}</td>
                                            <td>
                                                {ret.items.map((ri, idx) => (
                                                    <span key={ri.id}>
                                                        {idx > 0 && ", "}
                                                        {ri.quantity}x {ri.product_name}
                                                    </span>
                                                ))}
                                            </td>
                                            <td className="sd-table__cell-cost">
                                                Rs. {Number(ret.total).toFixed(2)}
                                            </td>
                                            <td>{ret.reason || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="sd-empty-state">
                                <h5>No returns recorded</h5>
                                <p>No items have been returned from this purchase.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {paymentModalOpen && (
                <Modal
                    title={isCredit ? "Record Supplier Refund" : "Record Supplier Payment"}
                    onClose={() => setPaymentModalOpen(false)}
                    maxWidth={540}
                >
                    <SupplierPaymentForm
                        initialPurchaseId={data.id}
                        submitting={paymentSubmitting}
                        error={paymentError}
                        onSubmit={handlePaymentSubmit}
                        onCancel={() => setPaymentModalOpen(false)}
                    />
                </Modal>
            )}

            {returnModalOpen && (
                <Modal
                    title="Return Items to Supplier"
                    onClose={() => setReturnModalOpen(false)}
                    maxWidth={760}
                >
                    <PurchaseReturnForm
                        initialPurchaseId={data.id}
                        submitting={returnSubmitting}
                        error={returnError}
                        onSubmit={handleReturnSubmit}
                        onCancel={() => setReturnModalOpen(false)}
                    />
                </Modal>
            )}

            {onClose && (
                <div className="tenant-form__actions" style={{ marginTop: 12 }}>
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                        Close
                    </button>
                </div>
            )}
        </div>
    );
}

export default PurchaseDetail;
