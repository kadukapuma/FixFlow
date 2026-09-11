import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ServiceDetails from "../../components/ServiceDetails/ServiceDetails";
import { matchesServiceQuery } from "../../lib/serviceSearch";
import { usePressedRow } from "../../lib/usePressedRow";

function Delivered({ shellProps }) {
    const [services, setServices] = useState([]);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState("");
    const { pressedId, pressHandlers } = usePressedRow();

    async function loadServices() {
        try {
            const response = await api.get("/services", { params: { status: "delivered" } });
            setServices(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load delivered services."));
        }
    }

    useEffect(() => {
        // Same fetch-on-mount pattern as Services.jsx.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadServices();
    }, []);

    function handleUpdated() {
        setSelectedId(null);
        loadServices();
    }

    const visibleServices = services.filter((service) => matchesServiceQuery(service, search));

    return (
        <TenantShell {...shellProps} title="Delivered" subtitle="Repairs picked up by the customer." error={error}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Delivered services</h2>
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
                                <th>Technician</th>
                                <th>Delivered date</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleServices.map((service) => (
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
                                    <td data-label="Item">{service.item?.name}</td>
                                    <td data-label="Technician">{service.employee?.name}</td>
                                    <td data-label="Delivered date" className="mobile-summary">{service.delivered_date || "—"}</td>
                                    <td data-label="Price">
                                        {service.price != null ? `Rs. ${service.price}` : "—"}
                                    </td>
                                </tr>
                            ))}

                            {visibleServices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        {services.length === 0 ? "No delivered services yet." : "No services match your search."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedId && (
                <Modal title={`Service #${selectedId}`} onClose={() => setSelectedId(null)} maxWidth={640}>
                    <ServiceDetails serviceId={selectedId} onUpdated={handleUpdated} />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Delivered;
