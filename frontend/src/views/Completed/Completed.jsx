import { useState } from "react";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import ServiceDetails from "../../components/ServiceDetails/ServiceDetails";
import Pagination from "../../components/Pagination/Pagination";
import { usePressedRow } from "../../lib/usePressedRow";
import { usePaginatedResource } from "../../lib/usePaginatedResource";

const STATUS_PARAMS = { status: "completed" };

function Completed({ shellProps }) {
    const {
        items: services,
        meta,
        error: loadError,
        search,
        setSearch,
        setPage,
        reload,
    } = usePaginatedResource("/services", STATUS_PARAMS);
    const [selectedId, setSelectedId] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    function handleUpdated() {
        setSelectedId(null);
        reload();
    }

    return (
        <TenantShell
            {...shellProps}
            title="Completed"
            subtitle="Finished repairs ready to finalize and bill."
            error={loadError}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Completed services</h2>
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
                                <th>Completed date</th>
                                <th>Price</th>
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
                                    <td data-label="Item">{service.item?.name}</td>
                                    <td data-label="Technician">{service.employee?.name}</td>
                                    <td data-label="Completed date" className="mobile-summary">{service.completed_date || "—"}</td>
                                    <td data-label="Price">
                                        {service.price != null ? `Rs. ${service.price}` : "—"}
                                    </td>
                                </tr>
                            ))}

                            {services.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        {search.trim() ? "No services match your search." : "No completed services yet."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination meta={meta} onPageChange={setPage} />
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
