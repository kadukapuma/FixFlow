import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import "./TenantDashboard.css";

const EMPTY_FORM = { name: "", nic: "", phone: "", address: "" };

function TenantDashboard({ shellProps, company }) {
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            const response = await api.get("/customers");
            setCustomers(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load customers."));
        }
    }

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleAddCustomer(event) {
        event.preventDefault();

        setSubmitting(true);
        setError("");

        try {
            await api.post("/customers", form);
            setForm(EMPTY_FORM);
            loadCustomers();
        } catch (err) {
            setError(getErrorMessage(err, "Unable to create customer."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <TenantShell {...shellProps} title="Dashboard" subtitle="Your workspace overview." error={error}>
            {company && (
                <section className="tenant-card tenant-company-card">
                    <div>
                        <span className="tenant-company-card__label">Company</span>
                        <strong>{company.company}</strong>
                    </div>
                    <div>
                        <span className="tenant-company-card__label">Subdomain</span>
                        <strong>{company.subdomain}</strong>
                    </div>
                    <div>
                        <span className="tenant-company-card__label">Database</span>
                        <strong>{company.database}</strong>
                    </div>
                </section>
            )}

            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Add customer</h2>
                </div>

                <form className="tenant-form" onSubmit={handleAddCustomer}>
                    <label>
                        Name
                        <input
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            placeholder="Customer name"
                            required
                        />
                    </label>

                    <label>
                        NIC
                        <input
                            value={form.nic}
                            onChange={(e) => updateField("nic", e.target.value)}
                            placeholder="National ID number"
                            required
                        />
                    </label>

                    <label>
                        Phone
                        <input
                            value={form.phone}
                            onChange={(e) => updateField("phone", e.target.value)}
                            placeholder="07X XXX XXXX"
                        />
                    </label>

                    <label>
                        Address
                        <input
                            value={form.address}
                            onChange={(e) => updateField("address", e.target.value)}
                            placeholder="Street, city"
                        />
                    </label>

                    <button className="tenant-btn tenant-btn--primary" type="submit" disabled={submitting}>
                        {submitting ? "Adding..." : "Add customer"}
                    </button>
                </form>
            </section>

            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Customers</h2>
                </div>

                <div className="tenant-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>NIC</th>
                                <th>Phone</th>
                                <th>Address</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{customer.name}</strong>
                                        </div>
                                    </td>
                                    <td>{customer.nic}</td>
                                    <td>{customer.phone || "—"}</td>
                                    <td>{customer.address || "—"}</td>
                                </tr>
                            ))}

                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="tenant-table-empty">
                                        No customers yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </TenantShell>
    );
}

export default TenantDashboard;
