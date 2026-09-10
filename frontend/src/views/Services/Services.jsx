import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import { matchesServiceQuery } from "../../lib/serviceSearch";
import NewServiceWizard from "./NewServiceWizard";
import "./Services.css";

function Services({ shellProps }) {
    const [services, setServices] = useState([]);
    const [error, setError] = useState("");
    const [wizardOpen, setWizardOpen] = useState(false);
    const [search, setSearch] = useState("");

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
                    <table>
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
                            </tr>
                        </thead>
                        <tbody>
                            {visibleServices.map((service) => (
                                <tr key={service.id}>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>#{service.id}</strong>
                                            {service.ref_no && <span>{service.ref_no}</span>}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{service.customer?.name}</strong>
                                            <span>{service.customer?.nic}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{service.item?.name}</strong>
                                            <span>
                                                {service.item?.model || "—"}
                                                {service.item?.serial_number ? ` · ${service.item.serial_number}` : ""}
                                            </span>
                                        </div>
                                    </td>
                                    <td>{service.fault || "—"}</td>
                                    <td>{service.employee?.name}</td>
                                    <td>{service.service_date || "—"}</td>
                                    <td>
                                        <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />
                                    </td>
                                    <td>{service.price != null ? `Rs. ${service.price}` : "—"}</td>
                                </tr>
                            ))}

                            {visibleServices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="tenant-table-empty">
                                        {services.length === 0 ? "No services yet." : "No services match your search."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {wizardOpen && <NewServiceWizard onClose={() => setWizardOpen(false)} onCreated={handleCreated} />}
        </TenantShell>
    );
}

export default Services;
