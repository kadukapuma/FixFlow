import { useEffect, useMemo, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import Sidebar from "../../components/Sidebar/Sidebar";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import "../AdminDashboard/AdminDashboard.css";
import "./AdminDangerZone.css";

function effectiveStatus(company) {
    return company.status === "approved" && !company.is_active ? "deactivated" : company.status;
}

function AdminDangerZone({ page, onNavigate, onLoggedOut }) {
    const [companies, setCompanies] = useState([]);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [search, setSearch] = useState("");

    async function load() {
        try {
            const response = await api.get("/admin/companies");
            setCompanies(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load companies."));
        }
    }

    useEffect(() => {
        // Same fetch-on-mount pattern as elsewhere in the admin views.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, []);

    async function deleteCompany(company) {
        const confirmed = await confirmAction({
            title: "Delete company?",
            message: `This will permanently delete ${company.name}'s account, all of their data, and their database. This action cannot be undone.`,
            confirmLabel: "Delete forever",
            danger: true,
        });

        if (!confirmed) return;

        const typed = window.prompt(`Type "${company.subdomain}" to confirm permanent deletion:`);

        if (typed?.trim().toLowerCase() !== company.subdomain.toLowerCase()) {
            showToast("Deletion cancelled — subdomain didn't match.", "error");
            return;
        }

        setBusyId(company.id);
        setError("");

        try {
            await api.delete(`/admin/companies/${company.id}`);
            showToast(`${company.name} was permanently deleted.`);
            await load();
        } catch (err) {
            const message = getErrorMessage(err, "Deletion failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function logout() {
        const confirmed = await confirmAction({
            title: "Log out?",
            message: "You'll need to log in again to access the admin dashboard.",
            confirmLabel: "Log out",
            danger: true,
        });

        if (!confirmed) return;

        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_info");
        setAuthToken(null);
        onLoggedOut();
    }

    const sidebarItems = [
        {
            key: "dashboard",
            title: "Dashboard",
            active: page === "dashboard",
            onClick: () => onNavigate?.("dashboard"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            key: "receipts",
            title: "Receipts",
            active: page === "receipts",
            onClick: () => onNavigate?.("receipts"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM8 8h8M8 12h8M8 16h5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            key: "danger-zone",
            title: "Danger Zone",
            active: page === "danger-zone",
            onClick: () => onNavigate?.("danger-zone"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M12 3 2 20h20L12 3ZM12 9v5M12 17.5h.01"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
    ];

    const adminEmail = useMemo(() => {
        try {
            const info = JSON.parse(localStorage.getItem("admin_info"));
            return info?.email || info?.name || "admin";
        } catch {
            return "admin";
        }
    }, []);

    const visibleCompanies = useMemo(() => {
        if (!search.trim()) return companies;
        const q = search.trim().toLowerCase();
        return companies.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.subdomain.toLowerCase().includes(q) ||
                c.owner_email.toLowerCase().includes(q)
        );
    }, [companies, search]);

    return (
        <div className="admin-dashboard">
            <Sidebar items={sidebarItems} footerLabel={adminEmail} onLogout={logout} />

            <div className="admin-dashboard__main">
                <header className="admin-header">
                    <div>
                        <h1>Danger Zone</h1>
                        <p>Permanently delete a company, its data, and its database. These actions cannot be undone.</p>
                    </div>
                </header>

                {error && (
                    <p className="admin-alert" role="alert">
                        {error}
                    </p>
                )}

                <section className="admin-table-card admin-danger-zone">
                    <div className="admin-table-card__head">
                        <h2>All companies</h2>
                        <input
                            type="search"
                            placeholder="Search company, subdomain, or owner..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="admin-table-card__scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th align="left">Company</th>
                                    <th align="left">Owner</th>
                                    <th align="left">Status</th>
                                    <th align="left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleCompanies.map((company) => (
                                    <tr key={company.id}>
                                        <td data-label="Company">
                                            <div className="admin-company-cell">
                                                <strong>{company.name}</strong>
                                                <span>{company.subdomain}</span>
                                            </div>
                                        </td>
                                        <td data-label="Owner">
                                            <div className="admin-company-cell">
                                                <strong>{company.owner_name}</strong>
                                                <span>{company.owner_email}</span>
                                            </div>
                                        </td>
                                        <td data-label="Status">
                                            <StatusBadge status={effectiveStatus(company)} />
                                        </td>
                                        <td data-label="Actions">
                                            <div className="admin-table-card__actions">
                                                <button
                                                    className="admin-btn admin-btn--danger admin-btn--sm"
                                                    disabled={busyId === company.id}
                                                    onClick={() => deleteCompany(company)}
                                                    type="button"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {visibleCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="admin-table-card__empty">
                                            No companies match this view.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default AdminDangerZone;
