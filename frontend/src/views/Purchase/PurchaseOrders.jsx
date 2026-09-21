import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import Picker from "../../components/Picker/Picker";
import { SupplierPicker } from "../../components/Picker/presets";
import Pagination from "../../components/Pagination/Pagination";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { PO_STATUS_META } from "../../components/StatusBadge/purchaseStatusMeta";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import PurchaseOrderForm from "../../components/PurchaseForms/PurchaseOrderForm";

const STATUS_OPTIONS = [
    { id: "ordered", name: "Ordered" },
    { id: "received", name: "Received" },
    { id: "cancelled", name: "Cancelled" },
];

function PurchaseOrders({ shellProps, onReceiveToPurchase }) {
    const [supplierFilter, setSupplierFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const extraParams = {};
    if (supplierFilter) extraParams.supplier_id = supplierFilter;
    if (statusFilter) extraParams.status = statusFilter;

    const {
        items: orders,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/purchase-orders", extraParams);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingPo, setEditingPo] = useState(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    function openAddModal() {
        setEditingPo(null);
        setFormError("");
        setModalOpen(true);
    }

    async function openEditModal(po) {
        setFormError("");
        try {
            const res = await api.get(`/purchase-orders/${po.id}`);
            setEditingPo(res.data);
            setModalOpen(true);
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to load purchase order details."), "error");
        }
    }

    function closeModal() {
        setModalOpen(false);
        setEditingPo(null);
        setFormError("");
    }

    async function handleFormSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            if (editingPo) {
                await api.put(`/purchase-orders/${editingPo.id}`, values);
                showToast("Purchase order updated.");
            } else {
                await api.post("/purchase-orders", values);
                showToast("Purchase order created.");
            }
            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save purchase order."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleCancel(po) {
        const confirmed = await confirmAction({
            title: "Cancel Purchase Order?",
            message: `Cancel order ${po.ref_no || `#${po.id}`} from ${po.supplier_name}?`,
            confirmLabel: "Cancel Order",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(po.id);
        try {
            await api.post(`/purchase-orders/${po.id}/cancel`);
            showToast("Purchase order cancelled.");
            reload();
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to cancel purchase order."), "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleReceive(po) {
        try {
            const res = await api.get(`/purchase-orders/${po.id}`);
            if (onReceiveToPurchase) {
                onReceiveToPurchase(res.data);
            }
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to load order items."), "error");
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Purchase Orders"
            subtitle="Plan vendor procurement, track expected delivery dates, and receive directly into inventory."
            error={loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Purchase Orders</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <SupplierPicker
                            variant="filter"
                            value={supplierFilter}
                            onChange={setSupplierFilter}
                            emptyLabel="All Suppliers"
                        />

                        <Picker
                            variant="filter"
                            options={STATUS_OPTIONS}
                            value={statusFilter}
                            onChange={setStatusFilter}
                            emptyLabel="All Statuses"
                        />

                        <button
                            className="tenant-btn tenant-btn--primary"
                            type="button"
                            onClick={openAddModal}
                        >
                            + New Purchase Order
                        </button>
                    </div>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Ref No</th>
                                <th>Order Date</th>
                                <th>Expected Date</th>
                                <th>Supplier</th>
                                <th>Store</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Items</th>
                                <th style={{ textAlign: "right" }}>Total</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={9} rows={6} hasActions />
                            ) : (
                                orders.map((po) => {
                                    const isOrdered = po.status === "ordered";

                                    return (
                                        <tr
                                            key={po.id}
                                            data-toggle
                                            className={pressedId === po.id ? "tenant-row--pressed" : ""}
                                            {...pressHandlers(po.id)}
                                        >
                                            <td data-label="Ref No" className="mobile-summary">
                                                <div className="tenant-cell">
                                                    <strong>{po.ref_no || `#${po.id}`}</strong>
                                                </div>
                                            </td>
                                            <td data-label="Order Date">{po.order_date}</td>
                                            <td data-label="Expected Date">
                                                {po.expected_date || "—"}
                                            </td>
                                            <td data-label="Supplier">
                                                <strong>{po.supplier_name || "—"}</strong>
                                            </td>
                                            <td data-label="Store">{po.store_name || "Any"}</td>
                                            <td data-label="Status">
                                                <StatusBadge
                                                    status={po.status}
                                                    meta={PO_STATUS_META}
                                                />
                                            </td>
                                            <td data-label="Items" style={{ textAlign: "right" }}>
                                                {po.items_count}
                                            </td>
                                            <td data-label="Total" style={{ textAlign: "right" }}>
                                                <strong>Rs. {Number(po.total).toFixed(2)}</strong>
                                            </td>
                                            <td data-label="Actions">
                                                <div style={{ display: "flex", gap: 6 }}>
                                                    {isOrdered && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                                title="Receive items and convert into Purchase"
                                                                onClick={() => handleReceive(po)}
                                                            >
                                                                Receive
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                                onClick={() => openEditModal(po)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                                style={{ color: "#c22b3a" }}
                                                                disabled={busyId === po.id}
                                                                onClick={() => handleCancel(po)}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {!loading && orders.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="tenant-table-empty">
                                        No purchase orders found. Click &quot;+ New Purchase Order&quot; to begin procurement.
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
                    title={editingPo ? `Edit Order (${editingPo.ref_no})` : "New Purchase Order"}
                    onClose={closeModal}
                    maxWidth={840}
                >
                    <PurchaseOrderForm
                        initialValues={editingPo}
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

export default PurchaseOrders;
