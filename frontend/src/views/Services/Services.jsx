import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import Modal from "../../components/Modal/Modal";
import ServiceDetails from "../../components/ServiceDetails/ServiceDetails";
import DateActionForm from "../../components/DateActionForm/DateActionForm";
import Pagination from "../../components/Pagination/Pagination";
import { usePressedRow } from "../../lib/usePressedRow";
import { showToast } from "../../lib/toast";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import NewServiceWizard from "./NewServiceWizard";
import "./Services.css";

function Services({ shellProps }) {
    const {
        items: services,
        meta,
        error: loadError,
        search,
        setSearch,
        setPage,
        reload,
    } = usePaginatedResource("/services");
    const [wizardOpen, setWizardOpen] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [pdfService, setPdfService] = useState(null);
    const [startingService, setStartingService] = useState(null);
    const [startError, setStartError] = useState("");
    const [starting, setStarting] = useState(false);
    const { pressedId, pressHandlers } = usePressedRow();

    function handleUpdated() {
        setSelectedId(null);
        reload();
    }

    function handleCreated() {
        setWizardOpen(false);
        reload();
    }

    function closeStartModal() {
        setStartingService(null);
        setStartError("");
    }

    async function handleStart(startedDate) {
        setStarting(true);
        setStartError("");

        try {
            await api.post(`/services/${startingService.id}/start`, { started_date: startedDate });
            showToast("Service started.");
            closeStartModal();
            reload();
        } catch (err) {
            setStartError(getErrorMessage(err, "Unable to start service."));
        } finally {
            setStarting(false);
        }
    }

    return (
        <TenantShell
            {...shellProps}
            title="Services"
            subtitle="Intake and track customer repairs."
            error={loadError}
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
                        <span className="tenant-card__stat">{meta?.total ?? 0} total</span>
                        <span className="tenant-card__stat tenant-card__stat--accent">{meta?.open_count ?? 0} open</span>
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
                                <th>Advance</th>
                                <th>Document</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr
                                    key={service.id}
                                    className={[
                                        "clickable-row",
                                        pressedId === service.id ? "tenant-row--pressed" : "",
                                        selectedId === service.id ? "tenant-row--selected" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => setSelectedId(service.id)}
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
                                    <td data-label="Advance">
                                        {service.advance_amount != null ? `Rs. ${service.advance_amount}` : "—"}
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

                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="tenant-table-empty">
                                        {search.trim() ? "No services match your search." : "No services yet."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
            </section>

            {wizardOpen && <NewServiceWizard onClose={() => setWizardOpen(false)} onCreated={handleCreated} />}

            {selectedId && (
                <Modal
                    title={`Service #${selectedId}`}
                    onClose={() => setSelectedId(null)}
                    maxWidth={1040}
                    className="modal-card--service-details"
                >
                    <ServiceDetails serviceId={selectedId} onUpdated={handleUpdated} />
                </Modal>
            )}

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
