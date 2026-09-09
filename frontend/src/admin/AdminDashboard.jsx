import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../api";

function statusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

const ACTIONABLE_STATUSES = ["pending", "failed"];

function AdminDashboard({ onLoggedOut }) {
    const [companies, setCompanies] = useState([]);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const pollRef = useRef(null);

    useEffect(() => {
        loadCompanies();

        return () => clearTimeout(pollRef.current);
    }, []);

    async function loadCompanies() {
        try {
            const response = await api.get("/admin/companies");
            setCompanies(response.data);

            clearTimeout(pollRef.current);

            // Provisioning happens in a background job, so keep refreshing
            // until every in-flight approval has settled into a final state.
            if (response.data.some((company) => company.status === "provisioning")) {
                pollRef.current = setTimeout(loadCompanies, 2000);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load companies."));
        }
    }

    async function approve(company) {
        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/approve`);
            await loadCompanies();
        } catch (err) {
            setError(getErrorMessage(err, "Approval failed."));
        } finally {
            setBusyId(null);
        }
    }

    async function reject(company) {
        const reason = window.prompt("Reason for rejection (optional):") || undefined;

        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/reject`, { reason });
            await loadCompanies();
        } catch (err) {
            setError(getErrorMessage(err, "Rejection failed."));
        } finally {
            setBusyId(null);
        }
    }

    function logout() {
        localStorage.removeItem("admin_token");
        setAuthToken(null);
        onLoggedOut();
    }

    return (
        <div style={{ padding: "40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h1>Company registrations</h1>
                <button onClick={logout}>Log out</button>
            </div>

            {error && <p role="alert">{error}</p>}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th align="left">Company</th>
                        <th align="left">Subdomain</th>
                        <th align="left">Owner</th>
                        <th align="left">Status</th>
                        <th align="left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {companies.map((company) => (
                        <tr key={company.id}>
                            <td>{company.name}</td>
                            <td>{company.subdomain}</td>
                            <td>
                                {company.owner_name} <br />
                                {company.owner_email}
                            </td>
                            <td>
                                {statusLabel(company.status)}
                                {company.status === "provisioning" && " ..."}
                                {company.status === "failed" && company.provisioning_error && (
                                    <p role="alert" style={{ margin: "4px 0 0", fontSize: 12 }}>
                                        {company.provisioning_error}
                                    </p>
                                )}
                            </td>
                            <td>
                                {ACTIONABLE_STATUSES.includes(company.status) && (
                                    <>
                                        <button disabled={busyId === company.id} onClick={() => approve(company)}>
                                            {company.status === "failed" ? "Retry" : "Approve"}
                                        </button>
                                        <button disabled={busyId === company.id} onClick={() => reject(company)}>
                                            Reject
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminDashboard;
