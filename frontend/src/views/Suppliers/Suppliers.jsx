import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import SupplierForm from "../../components/SupplierForm/SupplierForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";

function Suppliers({ shellProps }) {
    const {
        items: suppliers,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/suppliers");
    const [error, setError] = useState("");
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const { pressedId, pressHandlers } = usePressedRow();

    function toggleExpanded(id) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function openAddModal() {
        setEditingSupplier(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(supplier) {
        setEditingSupplier(supplier);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingSupplier(null);
    }

    async function handleSubmit(values) {
        if (editingSupplier) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingSupplier.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, values);
                showToast("Supplier updated.");
            } else {
                await api.post("/suppliers", values);
                showToast("Supplier added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save supplier."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(supplier) {
        const confirmed = await confirmAction({
            title: supplier.is_active ? "Deactivate supplier?" : "Activate supplier?",
            message: supplier.is_active
                ? `Deactivate ${supplier.name}? It won't be selectable for new items.`
                : `Activate ${supplier.name}?`,
            confirmLabel: supplier.is_active ? "Deactivate" : "Activate",
            danger: supplier.is_active,
        });

        if (!confirmed) return;

        setBusyId(supplier.id);
        setError("");

        try {
            const action = supplier.is_active ? "deactivate" : "activate";
            await api.post(`/suppliers/${supplier.id}/${action}`);
            showToast(supplier.is_active ? "Supplier deactivated." : "Supplier activated.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update supplier status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(supplier) {
        const confirmed = await confirmAction({
            title: "Delete supplier?",
            message: `Delete ${supplier.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(supplier.id);
        setError("");

        try {
            await api.delete(`/suppliers/${supplier.id}`);
            showToast("Supplier deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete supplier.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Suppliers"
            subtitle="Manage suppliers."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Suppliers</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new supplier
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Contact</th>
                                <th>Address</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={6} rows={6} hasActions />
                            ) : (
                                suppliers.map((supplier) => (
                                    <tr
                                        key={supplier.id}
                                        data-toggle
                                        className={[
                                            expandedIds.has(supplier.id) ? "tenant-row--expanded" : "",
                                            pressedId === supplier.id ? "tenant-row--pressed" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => toggleExpanded(supplier.id)}
                                        {...pressHandlers(supplier.id)}
                                    >
                                        <td data-label="ID">{supplier.id}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{supplier.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Contact">
                                            <div className="tenant-cell">
                                                <strong>{supplier.phone || "—"}</strong>
                                                <span>{supplier.email || "—"}</span>
                                            </div>
                                        </td>
                                        <td data-label="Address">{supplier.address || "—"}</td>
                                        <td data-label="Active">
                                            <input
                                                type="checkbox"
                                                checked={supplier.is_active}
                                                disabled={busyId === supplier.id}
                                                onChange={() => toggleActive(supplier)}
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title={supplier.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
                                            />
                                        </td>
                                        <td data-label="Actions" className="mobile-summary">
                                            <div
                                                className="tenant-table-actions"
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    onClick={() => openEditModal(supplier)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    disabled={busyId === supplier.id}
                                                    onClick={() => handleDelete(supplier)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && suppliers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        No suppliers yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingSupplier ? "Edit supplier" : "Add new supplier"} onClose={closeModal}>
                    <SupplierForm
                        initialValues={editingSupplier}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingSupplier ? "Save changes" : "Add supplier"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Suppliers;
