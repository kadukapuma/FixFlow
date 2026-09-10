import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ServiceDetails from "../../components/ServiceDetails/ServiceDetails";

function Completed({ shellProps }) {
    const [services, setServices] = useState([]);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);

    async function loadServices() {
        try {
            const response = await api.get("/services", { params: { status: "completed" } });
            setServices(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load completed services."));
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
        <TenantShell {...shellProps} title="Completed" subtitle="Finished repairs ready to finalize and bill." error={error}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Completed services</h2>
                </div>

                <div className="tenant-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Service ID</th>
                                <th>Customer</th>
                                <th>Item</th>
                                <th>Technician</th>
                                <th>Completed date</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {services.map((service) => (
                                <tr
                                    key={service.id}
                                    className="clickable-row"
                                    onClick={() => setSelectedId(service.id)}
                                >
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
                                    <td>{service.item?.name}</td>
                                    <td>{service.employee?.name}</td>
                                    <td>{service.completed_date || "—"}</td>
                                    <td>{service.price != null ? `Rs. ${service.price}` : "—"}</td>
                                </tr>
                            ))}

                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        No completed services yet.
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

export default Completed;
