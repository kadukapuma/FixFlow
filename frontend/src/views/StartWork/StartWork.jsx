import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import WorkForm from "../../components/WorkForm/WorkForm";
import DateActionForm from "../../components/DateActionForm/DateActionForm";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import "./StartWork.css";

function StartWork({ shellProps }) {
    const [query, setQuery] = useState("");
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [error, setError] = useState("");
    const [searching, setSearching] = useState(false);
    const [modalMode, setModalMode] = useState(null);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);

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

        const q = query.trim();
        if (!q) return;

        setSearching(true);
        setError("");
        setService(null);
        setWorkEntries([]);

        try {
            const response = await api.get("/services/search", { params: { q } });
            setService(response.data);
            loadWork(response.data.id);
        } catch (err) {
            setError(getErrorMessage(err, "Service not found."));
        } finally {
            setSearching(false);
        }
    }

    function closeModal() {
        setModalMode(null);
        setFormError("");
    }

    async function handleStart(startedDate) {
        setSubmitting(true);
        setFormError("");

        try {
            const response = await api.post(`/services/${service.id}/start`, { started_date: startedDate });
            setService(response.data.service);
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
            closeModal();
            loadWork(service.id);
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save work entry."));
        } finally {
            setSubmitting(false);
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
                    <label>
                        Service ID or Ref No
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
