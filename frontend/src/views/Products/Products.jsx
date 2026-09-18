import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ProductForm from "../../components/ProductForm/ProductForm";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";

function formatPrice(value) {
    if (value === null || value === undefined || value === "") return "—";
    return `Rs. ${Number(value).toFixed(2)}`;
}

function Products({ shellProps }) {
    const {
        items: products,
        meta,
        loading,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/products");
    const [error, setError] = useState("");
    const [editingProduct, setEditingProduct] = useState(null);
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
        setEditingProduct(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(product) {
        setEditingProduct(product);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingProduct(null);
    }

    async function handleSubmit(values) {
        if (editingProduct) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingProduct.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            const payload = {
                ...values,
                category_id: values.category_id || null,
                brand_id: values.brand_id || null,
                purchase_price: values.purchase_price || null,
                sale_price: values.sale_price || null,
                border_price: values.border_price || null,
            };

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, payload);
                showToast("Product updated.");
            } else {
                await api.post("/products", payload);
                showToast("Product added.");
            }

            closeModal();
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save product."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(product) {
        const confirmed = await confirmAction({
            title: product.is_active ? "Deactivate product?" : "Activate product?",
            message: product.is_active
                ? `Deactivate ${product.name}? It won't be selectable for new sales.`
                : `Activate ${product.name}?`,
            confirmLabel: product.is_active ? "Deactivate" : "Activate",
            danger: product.is_active,
        });

        if (!confirmed) return;

        setBusyId(product.id);
        setError("");

        try {
            const action = product.is_active ? "deactivate" : "activate";
            await api.post(`/products/${product.id}/${action}`);
            showToast(product.is_active ? "Product deactivated." : "Product activated.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update product status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(product) {
        const confirmed = await confirmAction({
            title: "Delete product?",
            message: `Delete ${product.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(product.id);
        setError("");

        try {
            await api.delete(`/products/${product.id}`);
            showToast("Product deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete product.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Products"
            subtitle="Manage stock items, pricing, category and brand."
            error={error || loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Products</h2>
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new product
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Brand</th>
                                <th>Purchase price</th>
                                <th>Sale price</th>
                                <th>Border price</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={9} rows={6} hasActions />
                            ) : (
                                products.map((product) => (
                                    <tr
                                        key={product.id}
                                        data-toggle
                                        className={[
                                            expandedIds.has(product.id) ? "tenant-row--expanded" : "",
                                            pressedId === product.id ? "tenant-row--pressed" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => toggleExpanded(product.id)}
                                        {...pressHandlers(product.id)}
                                    >
                                        <td data-label="ID">{product.id}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{product.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Category">{product.category?.name || "—"}</td>
                                        <td data-label="Brand">{product.brand?.name || "—"}</td>
                                        <td data-label="Purchase price">{formatPrice(product.purchase_price)}</td>
                                        <td data-label="Sale price">{formatPrice(product.sale_price)}</td>
                                        <td data-label="Border price">{formatPrice(product.border_price)}</td>
                                        <td data-label="Active">
                                            <input
                                                type="checkbox"
                                                checked={product.is_active}
                                                disabled={busyId === product.id}
                                                onChange={() => toggleActive(product)}
                                                onClick={(e) => e.stopPropagation()}
                                                onPointerDown={(e) => e.stopPropagation()}
                                                title={product.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
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
                                                    onClick={() => openEditModal(product)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                    type="button"
                                                    disabled={busyId === product.id}
                                                    onClick={() => handleDelete(product)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="tenant-table-empty">
                                        No products yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {modalOpen && (
                <Modal title={editingProduct ? "Edit product" : "Add new product"} onClose={closeModal}>
                    <ProductForm
                        initialValues={editingProduct}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingProduct ? "Save changes" : "Add product"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Products;
