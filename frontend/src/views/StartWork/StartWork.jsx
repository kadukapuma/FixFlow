import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import WorkForm from "../../components/WorkForm/WorkForm";
import ServiceProductForm from "../../components/ServiceProductForm/ServiceProductForm";
import DateActionForm from "../../components/DateActionForm/DateActionForm";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import "./StartWork.css";

function StartWork({ shellProps }) {
    const [query, setQuery] = useState("");
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [serviceProducts, setServiceProducts] = useState([]);
    const [editingServiceProduct, setEditingServiceProduct] = useState(null);
    const [error, setError] = useState("");
    const [searching, setSearching] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);

    async function loadWork(serviceId) {
        try {
            const response = await api.get("/work", { params: { service_id: serviceId } });
            setWorkEntries(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load work log."));
        }
    }

    async function loadServiceProducts(serviceId) {
        try {
            const response = await api.get("/service-products", { params: { service_id: serviceId } });
            setServiceProducts(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load products added."));
        }
    }

    async function handleSearch(event) {
        event.preventDefault();

        const q = query.trim();
        if (!q) return;

        setSearching(true);
        setError("");
        setService(null);
        setWorkEntries([]);
        setServiceProducts([]);

        try {
            const response = await api.get("/services/search", { params: { q } });
            setService(response.data);
            loadWork(response.data.id);
            loadServiceProducts(response.data.id);
        } catch (err) {
            setError(getErrorMessage(err, "Service not found."));
        } finally {
            setSearching(false);
        }
    }

    function closeModal() {
        setModalMode(null);
        setFormError("");
        setEditingServiceProduct(null);
    }

    async function handleStart(startedDate) {
        setSubmitting(true);
        setFormError("");

        try {
            const response = await api.post(`/services/${service.id}/start`, { started_date: startedDate });
            setService(response.data.service);
            showToast("Service started.");
            closeModal();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to start service."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleComplete(completedDate) {
        setSubmitting(true);
        setFormError("");

        try {
            const response = await api.post(`/services/${service.id}/complete`, { completed_date: completedDate });
            setService(response.data.service);
            showToast("Service marked as completed.");
            closeModal();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to complete service."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleWorkSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            await api.post("/work", { service_id: service.id, ...values });
            showToast("Work entry saved.");
            closeModal();
            loadWork(service.id);
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save work entry."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleServiceProductSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            if (editingServiceProduct) {
                await api.put(`/service-products/${editingServiceProduct.id}`, values);
                showToast("Product updated.");
            } else {
                await api.post("/service-products", { service_id: service.id, ...values });
                showToast("Product added.");
            }
            closeModal();
            loadServiceProducts(service.id);
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save product."));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleServiceProductDelete(row) {
        const confirmed = await confirmAction({
            title: "Remove product?",
            message: `Remove ${row.product?.name || "this product"} from this service?`,
            confirmLabel: "Remove",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(row.id);
        setError("");

        try {
            await api.delete(`/service-products/${row.id}`);
            showToast("Product removed.");
            loadServiceProducts(service.id);
        } catch (err) {
            const message = getErrorMessage(err, "Unable to remove product.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Start Work"
            subtitle="Find a service by ID or reference number to start and log work."
            error={error}
        >
            <section className="tenant-card">
                <form className="start-work-search" onSubmit={handleSearch}>
                    <label className="start-work-search__field">
                        <span>Service ID or Ref No</span>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g. 12 or JOB-2026-001"
                            required
                        />
                    </label>
                    <button className="tenant-btn tenant-btn--primary" type="submit" disabled={searching}>
                        {searching ? "Searching..." : "Search"}
                    </button>
                </form>
            </section>

            {service && (
                <section className="tenant-card">
                    <div className="tenant-card__head">
                        <h2>
                            Service #{service.id}
                            {service.ref_no ? ` · ${service.ref_no}` : ""}
                        </h2>
                        <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />
                    </div>

                    <div className="detail-grid">
                        <div>
                            <span className="detail-grid__label">Customer</span>
                            <strong>{service.customer?.name}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Item</span>
                            <strong>{service.item?.name}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Technician</span>
                            <strong>{service.employee?.name}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Fault</span>
                            <strong>{service.fault || "—"}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Service date</span>
                            <strong>{service.service_date || "—"}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Started</span>
                            <strong>{service.started_date || "—"}</strong>
                        </div>
                    </div>

                    <div className="tenant-form__actions">
                        {service.status === "pending" && (
                            <button
                                className="tenant-btn tenant-btn--primary"
                                type="button"
                                onClick={() => setModalMode("start")}
                            >
                                Start
                            </button>
                        )}

                        {service.status === "in_progress" && (
                            <>
                                <button
                                    className="tenant-btn tenant-btn--ghost"
                                    type="button"
                                    onClick={() => setModalMode("work")}
                                >
                                    Update
                                </button>
                                <button
                                    className="tenant-btn tenant-btn--ghost"
                                    type="button"
                                    onClick={() => {
                                        setEditingServiceProduct(null);
                                        setModalMode("product");
                                    }}
                                >
                                    Add product
                                </button>
                                <button
                                    className="tenant-btn tenant-btn--primary"
                                    type="button"
                                    onClick={() => setModalMode("complete")}
                                >
                                    Complete
                                </button>
                            </>
                        )}
                    </div>
                </section>
            )}

            {service && service.status !== "pending" && (
                <section className="tenant-card">
                    <div className="tenant-card__head">
                        <h2>Work log</h2>
                    </div>

                    <div className="tenant-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Cost</th>
                                    <th>Logged</th>
                                </tr>
                            </thead>
                            <tbody>
                                {workEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td data-label="Description">{entry.description || "—"}</td>
                                        <td data-label="Cost">Rs. {entry.cost}</td>
                                        <td data-label="Logged">{new Date(entry.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}

                                {workEntries.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="tenant-table-empty">
                                            No work logged yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {service && service.status !== "pending" && (
                <section className="tenant-card">
                    <div className="tenant-card__head">
                        <h2>Products added</h2>
                    </div>

                    <div className="tenant-table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Qty</th>
                                    <th>Unit price</th>
                                    <th>Line total</th>
                                    {service.status === "in_progress" && <th>Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {serviceProducts.map((row) => (
                                    <tr key={row.id}>
                                        <td data-label="Product">{row.product?.name || "—"}</td>
                                        <td data-label="Qty">{row.quantity}</td>
                                        <td data-label="Unit price">Rs. {row.unit_price}</td>
                                        <td data-label="Line total">Rs. {row.line_total}</td>
                                        {service.status === "in_progress" && (
                                            <td data-label="Actions">
                                                <div className="tenant-table-actions">
                                                    <button
                                                        className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingServiceProduct(row);
                                                            setModalMode("product");
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                        type="button"
                                                        disabled={busyId === row.id}
                                                        onClick={() => handleServiceProductDelete(row)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}

                                {serviceProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={service.status === "in_progress" ? 5 : 4} className="tenant-table-empty">
                                            No products added yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {modalMode === "work" && (
                <Modal title="Log work" onClose={closeModal}>
                    <WorkForm
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleWorkSubmit}
                        onCancel={closeModal}
                    />
                </Modal>
            )}

            {modalMode === "product" && (
                <Modal title={editingServiceProduct ? "Edit product" : "Add product"} onClose={closeModal}>
                    <ServiceProductForm
                        initialValues={editingServiceProduct}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleServiceProductSubmit}
                        onCancel={closeModal}
                        submitLabel={editingServiceProduct ? "Save changes" : "Add product"}
                    />
                </Modal>
            )}

            {modalMode === "start" && (
                <Modal title="Start service" onClose={closeModal}>
                    <DateActionForm
                        label="Start date"
                        submitLabel="Start"
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleStart}
                        onCancel={closeModal}
                    />
                </Modal>
            )}

            {modalMode === "complete" && (
                <Modal title="Complete service" onClose={closeModal}>
                    <DateActionForm
                        label="Completed date"
                        submitLabel="Complete"
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleComplete}
                        onCancel={closeModal}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default StartWork;
