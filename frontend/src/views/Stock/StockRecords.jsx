import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import Pagination from "../../components/Pagination/Pagination";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import {
    OpeningStockForm,
    StockAdjustmentForm,
    DamageStockForm,
    StockTransferForm,
} from "../../components/StockMovementForms/StockMovementForms";
import { showToast } from "../../lib/toast";
import { usePaginatedResource } from "../../lib/usePaginatedResource";

const PAGES = {
    opening: {
        title: "Opening Stock",
        subtitle: "Starting stock quantities entered per product and store.",
        addLabel: "Add opening stock",
        empty: "No opening stock recorded yet.",
        endpoint: "/stock/opening",
        success: "Opening stock recorded.",
        Form: OpeningStockForm,
        noteLabel: "Note",
    },
    adjustment: {
        title: "Stock Adjustment",
        subtitle: "Manual corrections that increase or decrease stock.",
        addLabel: "Add adjustment",
        empty: "No stock adjustments recorded yet.",
        endpoint: "/stock/adjustments",
        success: "Stock adjustment recorded.",
        Form: StockAdjustmentForm,
        noteLabel: "Reason",
    },
    damage: {
        title: "Damaged Stock",
        subtitle: "Stock written off because it was damaged.",
        addLabel: "Record damage",
        empty: "No damaged stock recorded yet.",
        endpoint: "/stock/damage",
        success: "Damaged stock recorded.",
        Form: DamageStockForm,
        noteLabel: "Reason",
    },
    transfer: {
        title: "Stock Transfer",
        subtitle: "Stock moved from one store to another.",
        addLabel: "New transfer",
        empty: "No stock transfers recorded yet.",
        endpoint: "/stock/transfers",
        success: "Stock transferred.",
        Form: StockTransferForm,
        noteLabel: "Note",
    },
};

function formatQuantity(type, quantity) {
    if (type === "transfer" || type === "damage") return Math.abs(quantity);
    return quantity > 0 ? `+${quantity}` : quantity;
}

function StockRecords({ shellProps, type }) {
    const page = PAGES[type];
    const {
        items: records,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/stock/records", { type });
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const isTransfer = type === "transfer";
    const columnCount = isTransfer ? 6 : 5;

    function openModal() {
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setFormError("");
    }

    async function handleSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            await api.post(page.endpoint, values);
            showToast(page.success);
            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save stock movement."));
        } finally {
            setSubmitting(false);
        }
    }

    const Form = page.Form;

    return (
        <TenantShell {...shellProps} title={page.title} subtitle={page.subtitle} error={loadError}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>{page.title}</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openModal}>
                        {page.addLabel}
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Product</th>
                                <th>{isTransfer ? "From store" : "Store"}</th>
                                {isTransfer && <th>To store</th>}
                                <th>Quantity</th>
                                <th>{page.noteLabel}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={columnCount} rows={6} />
                            ) : (
                                records.map((record) => (
                                    <tr key={record.id}>
                                        <td data-label="Date">{record.created_at}</td>
                                        <td data-label="Product" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{record.product_name}</strong>
                                            </div>
                                        </td>
                                        <td data-label={isTransfer ? "From store" : "Store"}>{record.store_name}</td>
                                        {isTransfer && <td data-label="To store">{record.to_store_name || "—"}</td>}
                                        <td data-label="Quantity">
                                            <strong>{formatQuantity(type, record.quantity)}</strong>
                                        </td>
                                        <td data-label={page.noteLabel}>{record.note || "—"}</td>
                                    </tr>
                                ))
                            )}

                            {!loading && records.length === 0 && (
                                <tr>
                                    <td colSpan={columnCount} className="tenant-table-empty">
                                        {page.empty}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={page.title} onClose={closeModal}>
                    <Form submitting={submitting} error={formError} onSubmit={handleSubmit} onCancel={closeModal} />
                </Modal>
            )}
        </TenantShell>
    );
}

export default StockRecords;
