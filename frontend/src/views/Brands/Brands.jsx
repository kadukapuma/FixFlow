import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import BrandForm from "../../components/BrandForm/BrandForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";

function Brands({ shellProps }) {
    const {
        items: brands,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/brands");
    const [error, setError] = useState("");
    const [editingBrand, setEditingBrand] = useState(null);
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
        setEditingBrand(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(brand) {
        setEditingBrand(brand);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingBrand(null);
    }

    async function handleSubmit(values) {
        if (editingBrand) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingBrand.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingBrand) {
                await api.put(`/brands/${editingBrand.id}`, values);
                showToast("Brand updated.");
            } else {
                await api.post("/brands", values);
                showToast("Brand added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save brand."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(brand) {
        const confirmed = await confirmAction({
            title: brand.is_active ? "Deactivate brand?" : "Activate brand?",
            message: brand.is_active
                ? `Deactivate ${brand.name}? It won't be selectable for new items.`
                : `Activate ${brand.name}?`,
            confirmLabel: brand.is_active ? "Deactivate" : "Activate",
            danger: brand.is_active,
        });

        if (!confirmed) return;

        setBusyId(brand.id);
        setError("");

        try {
            const action = brand.is_active ? "deactivate" : "activate";
            await api.post(`/brands/${brand.id}/${action}`);
            showToast(brand.is_active ? "Brand deactivated." : "Brand activated.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update brand status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(brand) {
        const confirmed = await confirmAction({
            title: "Delete brand?",
            message: `Delete ${brand.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(brand.id);
        setError("");

        try {
            await api.delete(`/brands/${brand.id}`);
            showToast("Brand deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete brand.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Brands"
            subtitle="Manage item brands."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Brands</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new brand
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
                                brands.map((brand) => (
                                    <tr
                                        key={brand.id}
                                        data-toggle
                                        className={[
                                            expandedIds.has(brand.id) ? "tenant-row--expanded" : "",
                                            pressedId === brand.id ? "tenant-row--pressed" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => toggleExpanded(brand.id)}
                                        {...pressHandlers(brand.id)}
                                    >
                                        <td data-label="ID">{brand.id}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{brand.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Description">{brand.description || "—"}</td>
                                        <td data-label="Active">
                                            <input
                                                type="checkbox"
                                                checked={brand.is_active}
                                                disabled={busyId === brand.id}
                                                onChange={() => toggleActive(brand)}
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title={brand.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
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
                                                    onClick={() => openEditModal(brand)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    disabled={busyId === brand.id}
                                                    onClick={() => handleDelete(brand)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && brands.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="tenant-table-empty">
                                        No brands yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingBrand ? "Edit brand" : "Add new brand"} onClose={closeModal}>
                    <BrandForm
                        initialValues={editingBrand}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingBrand ? "Save changes" : "Add brand"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Brands;
