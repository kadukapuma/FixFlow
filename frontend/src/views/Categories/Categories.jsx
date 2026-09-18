import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import CategoryForm from "../../components/CategoryForm/CategoryForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";

function Categories({ shellProps }) {
    const {
        items: categories,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/categories");
    const [error, setError] = useState("");
    const [editingCategory, setEditingCategory] = useState(null);
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
        setEditingCategory(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(category) {
        setEditingCategory(category);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingCategory(null);
    }

    async function handleSubmit(values) {
        if (editingCategory) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingCategory.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingCategory) {
                await api.put(`/categories/${editingCategory.id}`, values);
                showToast("Category updated.");
            } else {
                await api.post("/categories", values);
                showToast("Category added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save category."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(category) {
        const confirmed = await confirmAction({
            title: category.is_active ? "Deactivate category?" : "Activate category?",
            message: category.is_active
                ? `Deactivate ${category.name}? It won't be selectable for new items.`
                : `Activate ${category.name}?`,
            confirmLabel: category.is_active ? "Deactivate" : "Activate",
            danger: category.is_active,
        });

        if (!confirmed) return;

        setBusyId(category.id);
        setError("");

        try {
            const action = category.is_active ? "deactivate" : "activate";
            await api.post(`/categories/${category.id}/${action}`);
            showToast(category.is_active ? "Category deactivated." : "Category activated.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update category status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(category) {
        const confirmed = await confirmAction({
            title: "Delete category?",
            message: `Delete ${category.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(category.id);
        setError("");

        try {
            await api.delete(`/categories/${category.id}`);
            showToast("Category deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete category.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Categories"
            subtitle="Manage item categories."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Categories</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new category
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Description</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={5} rows={6} hasActions />
                            ) : (
                                categories.map((category) => (
                                    <tr
                                        key={category.id}
                                        data-toggle
                                        className={[
                                            expandedIds.has(category.id) ? "tenant-row--expanded" : "",
                                            pressedId === category.id ? "tenant-row--pressed" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => toggleExpanded(category.id)}
                                        {...pressHandlers(category.id)}
                                    >
                                        <td data-label="ID">{category.id}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{category.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Description">{category.description || "—"}</td>
                                        <td data-label="Active">
                                            <input
                                                type="checkbox"
                                                checked={category.is_active}
                                                disabled={busyId === category.id}
                                                onChange={() => toggleActive(category)}
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title={category.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
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
                                                    onClick={() => openEditModal(category)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    disabled={busyId === category.id}
                                                    onClick={() => handleDelete(category)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && categories.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="tenant-table-empty">
                                        No categories yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingCategory ? "Edit category" : "Add new category"} onClose={closeModal}>
                    <CategoryForm
                        initialValues={editingCategory}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingCategory ? "Save changes" : "Add category"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Categories;
