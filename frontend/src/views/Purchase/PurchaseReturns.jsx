import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import { StorePicker, SupplierPicker } from "../../components/Picker/presets";
import Pagination from "../../components/Pagination/Pagination";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import { showToast } from "../../lib/toast";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import PurchaseReturnForm from "../../components/PurchaseForms/PurchaseReturnForm";

function ReturnDetailModal({ returnId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await api.get(`/purchase-returns/${returnId}`);
                if (!cancelled) setData(res.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load return details."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [returnId]);

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading return items...</span>
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

    return (
        <div className="sd-root">
            <div className="sd-header">
                <div className="sd-header__main">
                    <div className="sd-header__title-row">
                        <h3 className="sd-header__item-name">{data.supplier_name}</h3>
                        <span className="sd-header__ref-badge">{data.ref_no}</span>
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item">
                            Store: <strong>{data.store_name}</strong>
                        </span>
                        <span className="sd-header__meta-item">
                            Purchase: <strong>{data.purchase_ref_no || `#${data.purchase_id}`}</strong>
                        </span>
                        <span className="sd-header__meta-item">
                            Date: <strong>{data.return_date}</strong>
                        </span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div className="sd-header__finance-btn" style={{ cursor: "default" }}>
                        <span className="sd-header__finance-label">
                            Rs. {Number(data.total).toFixed(2)}
                        </span>
                        <span className="sd-header__finance-sub">Total credited</span>
                    </div>
                </div>
            </div>

            {data.reason && (
                <div
                    style={{
                        padding: "10px 14px",
                        background: "#fbfaf6",
                        border: "1px solid #eeece3",
                        borderRadius: 8,
                        fontSize: 13,
                    }}
                >
                    Reason: <strong>{data.reason}</strong>
                </div>
            )}

            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div>
                        <h4 className="sd-pane-title">Returned Items</h4>
                        <p className="sd-pane-desc">Stock items removed and credited against this return</p>
                    </div>
                    <div className="sd-work-total-badge">
                        <span>Items:</span>
                        <strong>{data.items.length}</strong>
                    </div>
                </div>

                <div className="sd-table-wrap">
                    <table className="sd-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th style={{ textAlign: "right" }}>Quantity Returned</th>
                                <th style={{ textAlign: "right" }}>Value Credited</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="sd-table__cell-desc">
                                        <strong>{item.product_name}</strong>
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 600, color: "#c22b3a" }}>
                                        -{item.quantity}
                                    </td>
                                    <td className="sd-table__cell-cost">
                                        Rs. {Number(item.line_total).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="tenant-form__actions" style={{ marginTop: 12 }}>
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                    Close
                </button>
            </div>
        </div>
    );
}

function PurchaseReturns({ shellProps }) {
    const [supplierFilter, setSupplierFilter] = useState("");
    const [storeFilter, setStoreFilter] = useState("");

    const extraParams = {};
    if (supplierFilter) extraParams.supplier_id = supplierFilter;
    if (storeFilter) extraParams.store_id = storeFilter;

    const {
        items: returns,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/purchase-returns", extraParams);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedReturnId, setSelectedReturnId] = useState(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const { pressedId, pressHandlers } = usePressedRow();

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
            await api.post("/purchase-returns", values);
            showToast("Purchase return recorded and stock deducted.");
            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to record return."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Purchase Returns"
            subtitle="Process goods returned to suppliers, decrement inventory, and post ledger credits."
            error={loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Purchase Returns</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <SupplierPicker
                            variant="filter"
                            value={supplierFilter}
                            onChange={setSupplierFilter}
                            emptyLabel="All Suppliers"
                        />

                        <StorePicker
                            variant="filter"
                            value={storeFilter}
                            onChange={setStoreFilter}
                            emptyLabel="All Stores"
                        />

                        <button
                            className="tenant-btn tenant-btn--primary"
                            type="button"
                            onClick={openModal}
                        >
                            + Record Return
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
                                <th>Store</th>
                                <th style={{ textAlign: "right" }}>Items</th>
                                <th style={{ textAlign: "right" }}>Total Value</th>
                                <th>Reason</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={9} rows={6} hasActions />
                            ) : (
                                returns.map((ret) => (
                                    <tr
                                        key={ret.id}
                                        data-toggle
                                        className={pressedId === ret.id ? "tenant-row--pressed" : ""}
                                        onClick={() => setSelectedReturnId(ret.id)}
                                        {...pressHandlers(ret.id)}
                                    >
                                        <td data-label="Ref No" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{ret.ref_no || `#${ret.id}`}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Date">{ret.return_date}</td>
                                        <td data-label="Supplier">
                                            <strong>{ret.supplier_name || "—"}</strong>
                                        </td>
                                        <td data-label="Purchase Ref">
                                            {ret.purchase_ref_no || `#${ret.purchase_id}`}
                                        </td>
                                        <td data-label="Store">{ret.store_name || "—"}</td>
                                        <td data-label="Items" style={{ textAlign: "right" }}>
                                            {ret.items_count}
                                        </td>
                                        <td data-label="Total Value" style={{ textAlign: "right" }}>
                                            <strong style={{ color: "#c22b3a" }}>
                                                Rs. {Number(ret.total).toFixed(2)}
                                            </strong>
                                        </td>
                                        <td data-label="Reason">{ret.reason || "—"}</td>
                                        <td data-label="Actions">
                                            <button
                                                type="button"
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedReturnId(ret.id);
                                                }}
                                            >
                                                View Items
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && returns.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="tenant-table-empty">
                                        No purchase returns logged. Click &quot;+ Record Return&quot; if goods need to be returned to a vendor.
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
                    title="Record Purchase Return"
                    onClose={closeModal}
                    maxWidth={780}
                >
                    <PurchaseReturnForm
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleFormSubmit}
                        onCancel={closeModal}
                    />
                </Modal>
            )}

            {selectedReturnId && (
                <Modal
                    title="Purchase Return Details"
                    onClose={() => setSelectedReturnId(null)}
                    maxWidth={720}
                    className="modal-card--account-details"
                >
                    <ReturnDetailModal
                        returnId={selectedReturnId}
                        onClose={() => setSelectedReturnId(null)}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default PurchaseReturns;
