import { useEffect, useMemo, useRef, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import Sidebar from "../../components/Sidebar/Sidebar";
import StatCard from "../../components/StatCard/StatCard";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import Pagination from "../../components/Pagination/Pagination";
import { STATUS_META } from "../../components/StatusBadge/statusMeta";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import "./AdminDashboard.css";

const ACTIONABLE_STATUSES = ["pending", "failed"];
const FILTERS = ["all", "pending", "provisioning", "approved", "deactivated", "rejected", "failed"];
const EMPTY_COUNTS = { all: 0, pending: 0, provisioning: 0, approved: 0, deactivated: 0, rejected: 0, failed: 0 };

// A company keeps status "approved" while deactivated — is_active is what
// actually blocks their sign-in — so the UI treats it as its own status.
function effectiveStatus(company) {
    return company.status === "approved" && !company.is_active ? "deactivated" : company.status;
}

function relativeTime(value) {
    const diffMs = Date.now() - new Date(value.replace(" ", "T")).getTime();
    const minutes = Math.round(diffMs / 60000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.round(hours / 24);
    return `${days}d ago`;
}

// The chart endpoint returns raw counts per day; the percent bar heights are
// relative to whichever day in the window had the most sign-ups.
function withChartPercents(chart) {
    const max = Math.max(1, ...chart.map((d) => d.count));
    return chart.map((day) => ({ ...day, percent: Math.round((day.count / max) * 100) }));
}

function downloadCsv(companies) {
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

function AdminDashboard({ page, onNavigate, onLoggedOut }) {
    const [filter, setFilter] = useState("all");
    const {
        items: companies,
        meta,
        error: loadError,
        search,
        setSearch,
        setPage,
        reload,
    } = usePaginatedResource("/admin/companies", filter === "all" ? {} : { status: filter });
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [priceDrafts, setPriceDrafts] = useState({});
    const pollRef = useRef(null);

    async function loadStats() {
        try {
            const response = await api.get("/admin/companies/stats");
            setStats(response.data);

            clearTimeout(pollRef.current);

            // Provisioning happens in a background job, so keep refreshing
            // the counts/table until every in-flight approval has settled.
            if (response.data.counts.provisioning > 0) {
                pollRef.current = setTimeout(() => {
                    loadStats();
                    reload();
                }, 2000);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load company stats."));
        }
    }

    useEffect(() => {
        // Same fetch-on-mount pattern used across the admin views.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadStats();
        return () => clearTimeout(pollRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function refreshAll() {
        reload();
        loadStats();
    }

    async function handleExportCsv() {
        try {
            const response = await api.get("/admin/companies", {
                params: {
                    export: 1,
                    ...(filter !== "all" ? { status: filter } : {}),
                    ...(search.trim() ? { search: search.trim() } : {}),
                },
            });
            downloadCsv(response.data);
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to export companies."), "error");
        }
    }

    async function approve(company) {
        const draftPrice = priceDrafts[company.id];

        if (!company.subscription_price && !draftPrice) {
            const message = "Set a monthly subscription price before approving.";
            setError(message);
            showToast(message, "error");
            return;
        }

        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/approve`, {
                subscription_price: company.subscription_price ? undefined : draftPrice,
            });
            showToast(`${company.name} approved.`);
            refreshAll();
        } catch (err) {
            const message = getErrorMessage(err, "Approval failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function savePrice(company) {
        const value = priceDrafts[company.id];
        if (!value) return;

        setBusyId(company.id);
        setError("");

        try {
            await api.put(`/admin/companies/${company.id}/subscription-price`, { subscription_price: value });
            showToast(`Subscription price updated for ${company.name}.`);
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update price.");
            setError(message);
            showToast(message, "error");
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
            showToast(`${company.name} rejected.`);
            refreshAll();
        } catch (err) {
            const message = getErrorMessage(err, "Rejection failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function deactivate(company) {
        const confirmed = await confirmAction({
            title: "Deactivate company?",
            message: `Deactivate ${company.name}? Their team will lose access immediately.`,
            confirmLabel: "Deactivate",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/deactivate`);
            showToast(`${company.name} deactivated.`);
            refreshAll();
        } catch (err) {
            const message = getErrorMessage(err, "Deactivation failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function activate(company) {
        const confirmed = await confirmAction({
            title: "Reactivate company?",
            message: `Reactivate ${company.name}? Their team will be able to sign in again.`,
            confirmLabel: "Reactivate",
        });

        if (!confirmed) return;

        setBusyId(company.id);
        setError("");

        try {
            await api.post(`/admin/companies/${company.id}/activate`);
            showToast(`${company.name} reactivated.`);
            refreshAll();
        } catch (err) {
            const message = getErrorMessage(err, "Reactivation failed.");
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
            key: "refresh",
            title: "Refresh companies",
            onClick: refreshAll,
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            key: "registrations",
            title: "Registrations",
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
            ),
        },
        {
            key: "receipts",
            title: "Receipts",
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

    const counts = stats?.counts ?? EMPTY_COUNTS;
    const chart = useMemo(() => withChartPercents(stats?.chart ?? []), [stats]);
    const needsAttention = counts.rejected + counts.failed;

    return (
        <div className="admin-dashboard">
            <Sidebar items={sidebarItems} footerLabel={adminEmail} onLogout={logout} />

            <div className="admin-dashboard__main">
                <header className="admin-header">
                    <div>
                        <h1>Company Approvals</h1>
                        <p>Review tenant sign-ups and manage provisioning.</p>
                    </div>

                    <div className="admin-header__actions">
                        <button className="admin-btn admin-btn--ghost" type="button" onClick={handleExportCsv}>
                            Export CSV
                        </button>
                        <button className="admin-btn admin-btn--primary" type="button" onClick={refreshAll}>
                            Refresh
                        </button>
                    </div>
                </header>

                {(error || loadError) && (
                    <p className="admin-alert" role="alert">
                        {error || loadError}
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
                                            <th align="left">Monthly price</th>
                                            <th align="left">Status</th>
                                            <th align="left">Registered</th>
                                            <th align="left">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {companies.map((company) => (
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
                                                <td data-label="Monthly price">
                                                    <div className="admin-table-card__actions">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="admin-price-input"
                                                            placeholder="Not set"
                                                            value={priceDrafts[company.id] ?? company.subscription_price ?? ""}
                                                            onChange={(e) =>
                                                                setPriceDrafts((prev) => ({ ...prev, [company.id]: e.target.value }))
                                                            }
                                                        />
                                                        {priceDrafts[company.id] !== undefined &&
                                                            priceDrafts[company.id] !== (company.subscription_price ?? "") && (
                                                                <button
                                                                    className="admin-btn admin-btn--ghost admin-btn--sm"
                                                                    disabled={busyId === company.id}
                                                                    onClick={() => savePrice(company)}
                                                                    type="button"
                                                                >
                                                                    Save
                                                                </button>
                                                            )}
                                                    </div>
                                                </td>
                                                <td data-label="Status">
                                                    <StatusBadge status={effectiveStatus(company)} />
                                                    {company.status === "failed" && company.provisioning_error && (
                                                        <p className="admin-table-card__error">{company.provisioning_error}</p>
                                                    )}
                                                </td>
                                                <td data-label="Registered">{company.created_at ? relativeTime(company.created_at) : "—"}</td>
                                                <td data-label="Actions">
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

                                        {companies.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="admin-table-card__empty">
                                                    No registrations match this view.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <Pagination meta={meta} onPageChange={setPage} />
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
