import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ServiceDetails from "../../components/ServiceDetails/ServiceDetails";

function Delivered({ shellProps }) {
    const [services, setServices] = useState([]);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);

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

    return (
        <TenantShell {...shellProps} title="Delivered" subtitle="Repairs picked up by the customer." error={error}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Delivered services</h2>
                </div>

                <div className="tenant-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Service ID</th>
                                <th>Customer</th>
                                <th>Item</th>
                                <th>Technician</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr key={service.id} className="clickable-row" onClick={() => setSelectedId(service.id)}>
                                    <td>
                                        <strong>#{service.id}</strong>
                                    </td>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{service.customer?.name}</strong>
                                            <span>{service.customer?.nic}</span>
                                        </div>
                                    </td>
                                    <td>{service.item?.name}</td>
                                    <td>{service.employee?.name}</td>
                                    <td>{service.price != null ? `Rs. ${service.price}` : "—"}</td>
                                </tr>
                            ))}

                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="tenant-table-empty">
                                        No delivered services yet.
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
