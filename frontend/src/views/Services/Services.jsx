import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import Modal from "../../components/Modal/Modal";
import DateActionForm from "../../components/DateActionForm/DateActionForm";
import { matchesServiceQuery } from "../../lib/serviceSearch";
import { usePressedRow } from "../../lib/usePressedRow";
import { showToast } from "../../lib/toast";
import NewServiceWizard from "./NewServiceWizard";
import "./Services.css";

function Services({ shellProps }) {
    const [services, setServices] = useState([]);
    const [error, setError] = useState("");
    const [wizardOpen, setWizardOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [pdfService, setPdfService] = useState(null);
    const [startingService, setStartingService] = useState(null);
    const [startError, setStartError] = useState("");
    const [starting, setStarting] = useState(false);
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

    async function loadServices() {
        try {
            const response = await api.get("/services");
            setServices(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load services."));
        }
    }

    useEffect(() => {
        // Same fetch-on-mount pattern as Employees/TenantDashboard; the compiler
        // linter only flags it here because it bails out of analyzing larger files.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadServices();
    }, []);

    function handleCreated() {
        setWizardOpen(false);
        loadServices();
    }

    function closeStartModal() {
        setStartingService(null);
        setStartError("");
    }

    async function handleStart(startedDate) {
        setStarting(true);
        setStartError("");

        try {
            const response = await api.post(`/services/${startingService.id}/start`, { started_date: startedDate });
            setServices((prev) =>
                prev.map((service) => (service.id === response.data.service.id ? response.data.service : service))
            );
            showToast("Service started.");
            closeStartModal();
        } catch (err) {
            setStartError(getErrorMessage(err, "Unable to start service."));
        } finally {
            setStarting(false);
        }
    }

    const openCount = services.filter((service) => service.status !== "delivered").length;
    const visibleServices = services.filter((service) => matchesServiceQuery(service, search));

    return (
        <TenantShell
            {...shellProps}
            title="Services"
            subtitle="Intake and track customer repairs."
            error={error}
            actions={
                <button className="tenant-btn tenant-btn--primary" type="button" onClick={() => setWizardOpen(true)}>
                    New service
                </button>
            }
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Services</h2>
                        <span className="tenant-card__stat">{services.length} total</span>
                        <span className="tenant-card__stat tenant-card__stat--accent">{openCount} open</span>
                    </div>
                    <input
                        type="search"
                        placeholder="Search ID, ref no, customer, item..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Service ID</th>
                                <th>Customer</th>
                                <th>Item</th>
                                <th>Fault</th>
                                <th>Technician</th>
                                <th>Service date</th>
                                <th>Status</th>
                                <th>Price</th>
                                <th>Document</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleServices.map((service) => (
                                <tr
                                    key={service.id}
                                    data-toggle
                                    className={[
                                        expandedIds.has(service.id) ? "tenant-row--expanded" : "",
                                        pressedId === service.id ? "tenant-row--pressed" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => toggleExpanded(service.id)}
                                    {...pressHandlers(service.id)}
                                >
                                    <td data-label="Service ID" className="mobile-summary">
                                        <div className="tenant-cell">
                                            <strong>#{service.id}</strong>
                                            {service.ref_no && <span>{service.ref_no}</span>}
                                        </div>
                                    </td>
                                    <td data-label="Customer" className="mobile-summary">
                                        <div className="tenant-cell">
                                            <strong>{service.customer?.name}</strong>
                                            <span>{service.customer?.nic}</span>
                                        </div>
                                    </td>
                                    <td data-label="Item">
                                        <div className="tenant-cell">
                                            <strong>{service.item?.name}</strong>
                                            <span>
                                                {service.item?.model || "—"}
                                                {service.item?.serial_number ? ` · ${service.item.serial_number}` : ""}
                                            </span>
                                        </div>
                                    </td>
                                    <td data-label="Fault">{service.fault || "—"}</td>
                                    <td data-label="Technician">{service.employee?.name}</td>
                                    <td data-label="Service date">{service.service_date || "—"}</td>
                                    <td data-label="Status" className="mobile-summary">
                                        <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />
                                    </td>
                                    <td data-label="Price">
                                        {service.price != null ? `Rs. ${service.price}` : "—"}
                                    </td>
                                    <td data-label="Document">
                                        <div className="tenant-table-actions">
                                            {service.status === "pending" && (
                                                <button
                                                    type="button"
                                                    className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setStartingService(service);
                                                    }}
                                                    onPointerDown={(e) => e.stopPropagation()}
                                                >
                                                    Start Service
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPdfService(service);
                                                }}
                                                onPointerDown={(e) => e.stopPropagation()}
                                            >
                                                View PDF
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {visibleServices.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="tenant-table-empty">
                                        {services.length === 0 ? "No services yet." : "No services match your search."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {wizardOpen && <NewServiceWizard onClose={() => setWizardOpen(false)} onCreated={handleCreated} />}

            {pdfService && (
                <PdfViewerModal
                    title={`Service #${pdfService.id}`}
                    pdfUrl={`/services/${pdfService.id}/pdf`}
                    onClose={() => setPdfService(null)}
                />
            )}

            {startingService && (
                <Modal title={`Start service #${startingService.id}`} onClose={closeStartModal}>
                    <DateActionForm
                        label="Start date"
                        submitLabel="Start"
                        submitting={starting}
                        error={startError}
                        onSubmit={handleStart}
                        onCancel={closeStartModal}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Services;
