import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import StoreForm from "../../components/StoreForm/StoreForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";

function Stores({ shellProps }) {
    const {
        items: stores,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/stores");
    const [error, setError] = useState("");
    const [editingStore, setEditingStore] = useState(null);
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
        setEditingStore(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(store) {
        setEditingStore(store);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingStore(null);
    }

    async function handleSubmit(values) {
        if (editingStore) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingStore.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingStore) {
                await api.put(`/stores/${editingStore.id}`, values);
                showToast("Store updated.");
            } else {
                await api.post("/stores", values);
                showToast("Store added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save store."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(store) {
        const confirmed = await confirmAction({
            title: store.is_active ? "Deactivate store?" : "Activate store?",
            message: store.is_active
                ? `Deactivate ${store.name}? It won't be selectable for new items.`
                : `Activate ${store.name}?`,
            confirmLabel: store.is_active ? "Deactivate" : "Activate",
            danger: store.is_active,
        });

        if (!confirmed) return;

        setBusyId(store.id);
        setError("");

        try {
            const action = store.is_active ? "deactivate" : "activate";
            await api.post(`/stores/${store.id}/${action}`);
            showToast(store.is_active ? "Store deactivated." : "Store activated.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update store status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(store) {
        const confirmed = await confirmAction({
            title: "Delete store?",
            message: `Delete ${store.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(store.id);
        setError("");

        try {
            await api.delete(`/stores/${store.id}`);
            showToast("Store deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete store.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Stores"
            subtitle="Manage store branches/locations."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Stores</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new store
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
                                stores.map((store) => (
                                    <tr
                                        key={store.id}
                                        data-toggle
                                        className={[
                                            expandedIds.has(store.id) ? "tenant-row--expanded" : "",
                                            pressedId === store.id ? "tenant-row--pressed" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => toggleExpanded(store.id)}
                                        {...pressHandlers(store.id)}
                                    >
                                        <td data-label="ID">{store.id}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{store.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Contact">
                                            <div className="tenant-cell">
                                                <strong>{store.contact_person || "—"}</strong>
                                                <span>{store.phone || "—"}</span>
                                            </div>
                                        </td>
                                        <td data-label="Address">{store.address || "—"}</td>
                                        <td data-label="Active">
                                            <input
                                                type="checkbox"
                                                checked={store.is_active}
                                                disabled={busyId === store.id}
                                                onChange={() => toggleActive(store)}
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title={store.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
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
                                                    onClick={() => openEditModal(store)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    disabled={busyId === store.id}
                                                    onClick={() => handleDelete(store)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && stores.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        No stores yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingStore ? "Edit store" : "Add new store"} onClose={closeModal}>
                    <StoreForm
                        initialValues={editingStore}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingStore ? "Save changes" : "Add store"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Stores;
