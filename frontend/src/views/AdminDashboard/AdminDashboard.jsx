import { useEffect, useMemo, useRef, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import Sidebar from "../../components/Sidebar/Sidebar";
import StatCard from "../../components/StatCard/StatCard";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { STATUS_META } from "../../components/StatusBadge/statusMeta";
import "./AdminDashboard.css";

const ACTIONABLE_STATUSES = ["pending", "failed"];
const FILTERS = ["all", "pending", "provisioning", "approved", "deactivated", "rejected", "failed"];

// A company keeps status "approved" while deactivated — is_active is what
// actually blocks their sign-in — so the UI treats it as its own status.
function effectiveStatus(company) {
    return company.status === "approved" && !company.is_active ? "deactivated" : company.status;
}

function parseDate(value) {
    return new Date(value.replace(" ", "T"));
}

function relativeTime(value) {
    const diffMs = Date.now() - parseDate(value).getTime();
    const minutes = Math.round(diffMs / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

function buildWeekChart(companies) {
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        days.push({ date, count: 0 });
    }

    companies.forEach((company) => {
        if (!company.created_at) return;
        const created = parseDate(company.created_at);

        days.forEach((day) => {
            const sameDay =
                created.getFullYear() === day.date.getFullYear() &&
                created.getMonth() === day.date.getMonth() &&
                created.getDate() === day.date.getDate();
            if (sameDay) day.count += 1;
        });
    });

    const max = Math.max(1, ...days.map((d) => d.count));

    return days.map((day) => ({
        label: day.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        count: day.count,
        percent: Math.round((day.count / max) * 100),
    }));
}

function exportCsv(companies) {
    const header = ["Name", "Subdomain", "Owner", "Email", "Status", "Registered"];
    const rows = companies.map((c) => [
        c.name,
        c.subdomain,
        c.owner_name,
        c.owner_email,
        effectiveStatus(c),
        c.created_at ?? "",
    ]);

    const csv = [header, ...rows]
        .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "company-registrations.csv";
    link.click();
    URL.revokeObjectURL(url);
}

function AdminDashboard({ onLoggedOut }) {
    const [companies, setCompanies] = useState([]);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
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

    async function deactivate(company) {
        if (!window.confirm(`Deactivate ${company.name}? Their team will lose access immediately.`)) {
            return;
        }

        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/deactivate`);
            await loadCompanies();
        } catch (err) {
            setError(getErrorMessage(err, "Deactivation failed."));
        } finally {
            setBusyId(null);
        }
    }

    async function activate(company) {
        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/activate`);
            await loadCompanies();
        } catch (err) {
            setError(getErrorMessage(err, "Reactivation failed."));
        } finally {
            setBusyId(null);
        }
    }

    function logout() {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_info");
        setAuthToken(null);
        onLoggedOut();
    }

    const adminEmail = useMemo(() => {
        try {
            const info = JSON.parse(localStorage.getItem("admin_info"));
            return info?.email || info?.name || "admin";
        } catch {
            return "admin";
        }
    }, []);

    const counts = useMemo(() => {
        const base = {
            all: companies.length,
            pending: 0,
            provisioning: 0,
            approved: 0,
            deactivated: 0,
            rejected: 0,
            failed: 0,
        };
        companies.forEach((c) => {
            const key = effectiveStatus(c);
            base[key] = (base[key] ?? 0) + 1;
        });
        return base;
    }, [companies]);

    const visibleCompanies = useMemo(() => {
        return companies.filter((c) => {
            if (filter !== "all" && effectiveStatus(c) !== filter) return false;
            if (!search.trim()) return true;
            const q = search.trim().toLowerCase();
            return (
                c.name.toLowerCase().includes(q) ||
                c.subdomain.toLowerCase().includes(q) ||
                c.owner_email.toLowerCase().includes(q)
            );
        });
    }, [companies, filter, search]);

    const chart = useMemo(() => buildWeekChart(companies), [companies]);
    const needsAttention = counts.rejected + counts.failed;

    return (
        <div className="admin-dashboard">
            <Sidebar adminEmail={adminEmail} onRefresh={loadCompanies} onLogout={logout} />

            <div className="admin-dashboard__main">
                <header className="admin-header">
                    <div>
                        <h1>Company Approvals</h1>
                        <p>Review tenant sign-ups and manage provisioning.</p>
                    </div>

                    <div className="admin-header__actions">
                        <button className="admin-btn admin-btn--ghost" type="button" onClick={() => exportCsv(visibleCompanies)}>
                            Export CSV
                        </button>
                        <button className="admin-btn admin-btn--primary" type="button" onClick={loadCompanies}>
                            Refresh
                        </button>
                    </div>
                </header>

                {error && (
                    <p className="admin-alert" role="alert">
                        {error}
                    </p>
                )}

                <div className="admin-tabs">
                    {FILTERS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            className={`admin-tabs__item ${filter === key ? "is-active" : ""}`}
                            onClick={() => setFilter(key)}
                        >
                            {key === "all" ? "All" : STATUS_META[key]?.label ?? key}
                            <span>{counts[key] ?? 0}</span>
                        </button>
                    ))}
                </div>

                <div className="admin-content">
                    <div className="admin-content__left">
                        <section className="admin-stat-row">
                            <StatCard
                                variant="dark"
                                label="Total registrations"
                                value={counts.all}
                                hint="All time"
                                dots={{ total: 8, filled: Math.min(8, counts.all) }}
                                icon={
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M4 21V6l8-3 8 3v15M9 21v-6h6v6M9 9h.01M15 9h.01M9 13h.01M15 13h.01"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                }
                            />

                            <StatCard
                                variant="lime"
                                label="Pending review"
                                value={counts.pending}
                                hint={counts.all ? `${Math.round((counts.pending / counts.all) * 100)}% of total` : "0% of total"}
                                dots={{ total: 8, filled: Math.min(8, counts.pending) }}
                                icon={
                                    <svg viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M12 7v5l3 3M21 12a9 9 0 1 1-9-9"
                                            stroke="currentColor"
                                            strokeWidth="1.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                }
                            />

                            <div className="stat-card stat-card--light stat-card--breakdown">
                                <div className="stat-card__top">
                                    <span className="stat-card__icon">
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path
                                                d="M4 19h16M4 15h16M4 11h16M4 7h16"
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </span>
                                    <span className="stat-card__label">Status breakdown</span>
                                </div>

                                <div className="admin-breakdown-grid">
                                    {["provisioning", "approved", "deactivated", "rejected", "failed"].map((key) => (
                                        <div className="admin-breakdown-grid__item" key={key}>
                                            <i style={{ background: STATUS_META[key].color }} />
                                            {STATUS_META[key].label}
                                            <strong>{counts[key] ?? 0}</strong>
                                        </div>
                                    ))}
                                </div>

                                {needsAttention > 0 && (
                                    <p className="admin-breakdown-grid__note">
                                        {needsAttention} {needsAttention === 1 ? "company needs" : "companies need"} attention
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="admin-chart-card">
                            <div className="admin-chart-card__head">
                                <h2>Registrations</h2>
                                <span className="admin-chart-card__legend">
                                    <i /> New sign-ups, last 7 days
                                </span>
                            </div>

                            <div className="admin-chart-card__bars">
                                {chart.map((day) => (
                                    <div className="admin-chart-bar" key={day.label}>
                                        {day.count > 0 && <span className="admin-chart-bar__value">{day.count}</span>}
                                        <div className="admin-chart-bar__track">
                                            <div className="admin-chart-bar__fill" style={{ height: `${Math.max(day.percent, 6)}%` }} />
                                        </div>
                                        <span className="admin-chart-bar__label">{day.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="admin-table-card">
                            <div className="admin-table-card__head">
                                <h2>Registrations</h2>
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
                                            <th align="left">Registered</th>
                                            <th align="left">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleCompanies.map((company) => (
                                            <tr key={company.id}>
                                                <td>
                                                    <div className="admin-company-cell">
                                                        <strong>{company.name}</strong>
                                                        <span>{company.subdomain}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="admin-company-cell">
                                                        <strong>{company.owner_name}</strong>
                                                        <span>{company.owner_email}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <StatusBadge status={effectiveStatus(company)} />
                                                    {company.status === "failed" && company.provisioning_error && (
                                                        <p className="admin-table-card__error">{company.provisioning_error}</p>
                                                    )}
                                                </td>
                                                <td>{company.created_at ? relativeTime(company.created_at) : "—"}</td>
                                                <td>
                                                    {(ACTIONABLE_STATUSES.includes(company.status) ||
                                                        company.status === "approved") && (
                                                        <div className="admin-table-card__actions">
                                                            {ACTIONABLE_STATUSES.includes(company.status) && (
                                                                <>
                                                                    <button
                                                                        className="admin-btn admin-btn--primary admin-btn--sm"
                                                                        disabled={busyId === company.id}
                                                                        onClick={() => approve(company)}
                                                                        type="button"
                                                                    >
                                                                        {company.status === "failed" ? "Retry" : "Approve"}
                                                                    </button>
                                                                    <button
                                                                        className="admin-btn admin-btn--ghost admin-btn--sm"
                                                                        disabled={busyId === company.id}
                                                                        onClick={() => reject(company)}
                                                                        type="button"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </>
                                                            )}

                                                            {company.status === "approved" && company.is_active && (
                                                                <button
                                                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                                                    disabled={busyId === company.id}
                                                                    onClick={() => deactivate(company)}
                                                                    type="button"
                                                                >
                                                                    Deactivate
                                                                </button>
                                                            )}

                                                            {company.status === "approved" && !company.is_active && (
                                                                <button
                                                                    className="admin-btn admin-btn--primary admin-btn--sm"
                                                                    disabled={busyId === company.id}
                                                                    onClick={() => activate(company)}
                                                                    type="button"
                                                                >
                                                                    Reactivate
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}

                                        {visibleCompanies.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="admin-table-card__empty">
                                                    No registrations match this view.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>

                    <aside className="admin-content__right">
                        <div className="admin-side-card admin-side-card--profile">
                            <div className="admin-side-card__avatar">{(adminEmail || "A").charAt(0).toUpperCase()}</div>
                            <strong>{adminEmail}</strong>
                            <span>Administrator</span>
                            <button className="admin-btn admin-btn--ghost admin-btn--sm" type="button" onClick={logout}>
                                Log out
                            </button>
                        </div>

                        <div className="admin-side-card">
                            <h3>Status guide</h3>
                            <ul className="admin-side-card__legend">
                                {Object.entries(STATUS_META).map(([key, meta]) => (
                                    <li key={key}>
                                        <i style={{ background: meta.color }} />
                                        <div>
                                            <strong>{meta.label}</strong>
                                            <span>{statusHint(key)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

function statusHint(status) {
    switch (status) {
        case "pending":
            return "Awaiting admin review";
        case "provisioning":
            return "Tenant database is being created";
        case "approved":
            return "Live and provisioned";
        case "deactivated":
            return "Disabled by an admin, sign-in blocked";
        case "rejected":
            return "Declined by an admin";
        case "failed":
            return "Provisioning failed, can retry";
        default:
            return "";
    }
}

export default AdminDashboard;
