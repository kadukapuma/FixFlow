import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ReceivedItemForm from "../../components/ReceivedItemForm/ReceivedItemForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";

function ReceivedItems({ shellProps }) {
    const {
        items: receivedItems,
        meta,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/received-items");
    const [error, setError] = useState("");
    const [editingItem, setEditingItem] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    function openAddModal() {
        setEditingItem(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(item) {
        setEditingItem(item);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingItem(null);
    }

    async function handleSubmit(values) {
        if (editingItem) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingItem.item_name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingItem) {
                await api.put(`/received-items/${editingItem.id}`, values);
                showToast("Item updated.");
            } else {
                await api.post("/received-items", values);
                showToast("Item added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save item."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(item) {
        const confirmed = await confirmAction({
            title: "Delete item?",
            message: `Delete ${item.item_name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(item.id);
        setError("");

        try {
            await api.delete(`/received-items/${item.id}`);
            showToast("Item deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete item.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Received Items"
            subtitle="Manage the predefined list of items customers can hand over with a device."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Received Items</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new item
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table">
                        <thead>
                            <tr>
                                <th>Item name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {receivedItems.map((item) => (
                                <tr
                                    key={item.id}
                                    className={pressedId === item.id ? "tenant-row--pressed" : ""}
                                    {...pressHandlers(item.id)}
                                >
                                    <td data-label="Item name" className="mobile-summary">
                                        <strong>{item.item_name}</strong>
                                    </td>
                                    <td data-label="Actions" className="mobile-summary">
                                        <div className="tenant-table-actions">
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                onClick={() => openEditModal(item)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                disabled={busyId === item.id}
                                                onClick={() => handleDelete(item)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {receivedItems.length === 0 && (
                                <tr>
                                    <td colSpan={2} className="tenant-table-empty">
                                        No items yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingItem ? "Edit item" : "Add new item"} onClose={closeModal}>
                    <ReceivedItemForm
                        initialValues={editingItem}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingItem ? "Save changes" : "Add item"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default ReceivedItems;
