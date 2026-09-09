import { useEffect, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../api";

function TenantDashboard({ onLoggedOut }) {
    const [company, setCompany] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [newCustomerName, setNewCustomerName] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        loadCompany();
        loadCustomers();
    }, []);

    async function loadCompany() {
        try {
            const response = await api.get("/company");
            setCompany(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load company"));
        }
    }

    async function loadCustomers() {
        try {
            const response = await api.get("/customers");
            setCustomers(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load customers"));
        }
    }

    async function handleAddCustomer(event) {
        event.preventDefault();

        try {
            await api.post("/customers", { name: newCustomerName });
            setNewCustomerName("");
            loadCustomers();
        } catch (err) {
            setError(getErrorMessage(err, "Unable to create customer"));
        }
    }

    function logout() {
        localStorage.removeItem("tenant_token");
        setAuthToken(null);
        onLoggedOut();
    }

    return (
        <div style={{ padding: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>FixFlow</h1>
                <button onClick={logout}>Log out</button>
            </div>

            {error && <p role="alert">{error}</p>}

            {company && (
                <div>
                    <h2>{company.company}</h2>
                    <p>Subdomain: {company.subdomain}</p>
                    <p>Database: {company.database}</p>
                </div>
            )}

            <hr />

            <h2>Customers</h2>

            <form onSubmit={handleAddCustomer}>
                <input
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                    placeholder="Customer name"
                    required
                />
                <button type="submit">Add customer</button>
            </form>

            {customers.map((customer) => (
                <div key={customer.id}>{customer.name}</div>
            ))}
        </div>
    );
}

export default TenantDashboard;
