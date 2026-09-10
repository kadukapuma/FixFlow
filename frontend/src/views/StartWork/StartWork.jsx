import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import WorkForm from "../../components/WorkForm/WorkForm";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import "./StartWork.css";

function StartWork({ shellProps }) {
    const [query, setQuery] = useState("");
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [error, setError] = useState("");
    const [searching, setSearching] = useState(false);
    const [starting, setStarting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [completing, setCompleting] = useState(false);

    async function loadWork(serviceId) {
        try {
            const response = await api.get("/work", { params: { service_id: serviceId } });
            setWorkEntries(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load work log."));
        }
    }

    async function handleSearch(event) {
        event.preventDefault();

        const id = query.trim();
        if (!id) return;

        setSearching(true);
        setError("");
        setService(null);
        setWorkEntries([]);

        try {
            const response = await api.get(`/services/${id}`);
            setService(response.data);
            loadWork(response.data.id);
        } catch (err) {
            setError(getErrorMessage(err, "Service not found."));
        } finally {
            setSearching(false);
        }
    }

    async function handleStart() {
        setStarting(true);
        setError("");

        try {
            const response = await api.post(`/services/${service.id}/start`);
            setService(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to start service."));
        } finally {
            setStarting(false);
        }
    }

    async function handleComplete() {
        setCompleting(true);
        setError("");

        try {
            const response = await api.post(`/services/${service.id}/complete`);
            setService(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to complete service."));
        } finally {
            setCompleting(false);
        }
    }

    async function handleWorkSubmit(values) {
        setSubmitting(true);
        setFormError("");

        try {
            await api.post("/work", { service_id: service.id, ...values });
            setModalOpen(false);
            loadWork(service.id);
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save work entry."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TenantShell {...shellProps} title="Start Work" subtitle="Find a service by ID to start and log work." error={error}>
            <section className="tenant-card">
                <form className="start-work-search" onSubmit={handleSearch}>
                    <label>
                        Service ID
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g. 12"
                            inputMode="numeric"
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
                        <h2>Service #{service.id}</h2>
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
                    </div>

                    <div className="tenant-form__actions">
                        {service.status === "pending" && (
                            <button
                                className="tenant-btn tenant-btn--primary"
                                type="button"
                                disabled={starting}
                                onClick={handleStart}
                            >
                                {starting ? "Starting..." : "Start"}
                            </button>
                        )}

                        {service.status === "in_progress" && (
                            <>
                                <button className="tenant-btn tenant-btn--ghost" type="button" onClick={() => setModalOpen(true)}>
                                    Update
                                </button>
                                <button
                                    className="tenant-btn tenant-btn--primary"
                                    type="button"
                                    disabled={completing}
                                    onClick={handleComplete}
                                >
                                    {completing ? "Completing..." : "Complete"}
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
                                        <td>{entry.description || "—"}</td>
                                        <td>Rs. {entry.cost}</td>
                                        <td>{new Date(entry.created_at).toLocaleString()}</td>
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

            {modalOpen && (
                <Modal title="Log work" onClose={() => setModalOpen(false)}>
                    <WorkForm
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleWorkSubmit}
                        onCancel={() => setModalOpen(false)}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default StartWork;
