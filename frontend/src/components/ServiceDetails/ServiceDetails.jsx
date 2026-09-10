import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import StatusBadge from "../StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../StatusBadge/serviceStatusMeta";
import Modal from "../Modal/Modal";
import DateActionForm from "../DateActionForm/DateActionForm";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";

function ServiceDetails({ serviceId, onUpdated }) {
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [price, setPrice] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [delivering, setDelivering] = useState(false);
    const [deliverModalOpen, setDeliverModalOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const [serviceResponse, workResponse] = await Promise.all([
                    api.get(`/services/${serviceId}`),
                    api.get("/work", { params: { service_id: serviceId } }),
                ]);

                if (cancelled) return;

                setService(serviceResponse.data);
                setWorkEntries(workResponse.data);

                const workTotal = workResponse.data.reduce((sum, entry) => sum + Number(entry.cost), 0);
                setPrice(serviceResponse.data.price != null ? String(serviceResponse.data.price) : workTotal.toFixed(2));
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load service details."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [serviceId]);

    const workTotal = workEntries.reduce((sum, entry) => sum + Number(entry.cost), 0);

    async function handleSavePrice(event) {
        event.preventDefault();

        const hadPrice = service.price != null;
        const changed = Number(service.price) !== Number(price);

        if (hadPrice && changed) {
            const confirmed = await confirmAction({
                title: "Overwrite price?",
                message: `This service already has a price of Rs. ${service.price}. Overwrite it with Rs. ${price}?`,
                confirmLabel: "Overwrite",
                danger: true,
            });
            if (!confirmed) return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await api.put(`/services/${serviceId}/price`, { price });
            setService(response.data.service);
            showToast("Price saved.");
            onUpdated(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save price."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeliver(deliveredDate) {
        setDelivering(true);
        setError("");

        try {
            const response = await api.post(`/services/${serviceId}/deliver`, { delivered_date: deliveredDate });
            setService(response.data.service);
            showToast("Service marked as delivered.");
            setDeliverModalOpen(false);
            onUpdated(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to mark as delivered."));
        } finally {
            setDelivering(false);
        }
    }

    if (loading) {
        return <p className="wizard-hint">Loading...</p>;
    }

    if (!service) {
        return (
            <p className="tenant-alert" role="alert">
                {error || "Service not found."}
            </p>
        );
    }

    return (
        <div>
            <div className="tenant-card__head">
                <h2>Details{service.ref_no ? ` · ${service.ref_no}` : ""}</h2>
                <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />
            </div>

            <div className="detail-grid">
                <div>
                    <span className="detail-grid__label">Customer</span>
                    <strong>{service.customer?.name}</strong>
                    <span>{service.customer?.nic}</span>
                </div>
                <div>
                    <span className="detail-grid__label">Item</span>
                    <strong>{service.item?.name}</strong>
                    <span>
                        {service.item?.model || "—"}
                        {service.item?.serial_number ? ` · ${service.item.serial_number}` : ""}
                    </span>
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
                    <span className="detail-grid__label">Note</span>
                    <strong>{service.note || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Service date</span>
                    <strong>{service.service_date || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Started</span>
                    <strong>{service.started_date || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Completed</span>
                    <strong>{service.completed_date || "—"}</strong>
                </div>
                {service.delivered_date && (
                    <div>
                        <span className="detail-grid__label">Delivered</span>
                        <strong>{service.delivered_date}</strong>
                    </div>
                )}
            </div>

            <div className="tenant-card__head">
                <h2>Work log</h2>
            </div>

            <div className="tenant-table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workEntries.map((entry) => (
                            <tr key={entry.id}>
                                <td>{entry.description || "—"}</td>
                                <td>Rs. {entry.cost}</td>
                            </tr>
                        ))}

                        {workEntries.length === 0 && (
                            <tr>
                                <td colSpan={2} className="tenant-table-empty">
                                    No work logged.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>
                                <strong>Work total</strong>
                            </td>
                            <td>
                                <strong>Rs. {workTotal.toFixed(2)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {service.status === "completed" && (
                <form className="tenant-form tenant-form--1col" onSubmit={handleSavePrice}>
                    <label>
                        Final price
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </label>

                    {error && (
                        <p className="tenant-alert tenant-form__error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="tenant-form__actions">
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost"
                            disabled={delivering}
                            onClick={() => setDeliverModalOpen(true)}
                        >
                            Mark as delivered
                        </button>
                        <button type="submit" className="tenant-btn tenant-btn--primary" disabled={saving}>
                            {saving ? "Saving..." : "Save price"}
                        </button>
                    </div>
                </form>
            )}

            {deliverModalOpen && (
                <Modal title="Mark as delivered" onClose={() => setDeliverModalOpen(false)}>
                    <DateActionForm
                        label="Delivered date"
                        submitLabel="Mark as delivered"
                        submitting={delivering}
                        error={error}
                        onSubmit={handleDeliver}
                        onCancel={() => setDeliverModalOpen(false)}
                    />
                </Modal>
            )}

            {service.status === "delivered" && (
                <div className="detail-grid">
                    <div>
                        <span className="detail-grid__label">Final price</span>
                        <strong>{service.price != null ? `Rs. ${service.price}` : "—"}</strong>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ServiceDetails;
