import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import StatCard from "../../components/StatCard/StatCard";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";
import "./TenantDashboard.css";

const STATUS_ORDER = ["pending", "in_progress", "completed", "delivered"];

function formatMoney(value) {
    return `Rs. ${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function TenantDashboard({ shellProps, company }) {
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState("");

    async function loadSummary() {
        try {
            const response = await api.get("/dashboard/summary");
            setSummary(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load dashboard data."));
        }
    }

    useEffect(() => {
        // Same fetch-on-mount pattern as Employees/Services; the compiler linter
        // only flags it on smaller files — see Services.jsx for detail.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadSummary();
    }, []);

    const chart = summary?.revenue_last_7_days ?? [];
    const maxChartValue = Math.max(1, ...chart.map((day) => day.total));
    const totalServices = summary?.totals?.services ?? 0;

    return (
        <TenantShell {...shellProps} title="Dashboard" subtitle="Your business at a glance." error={error}>
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

            {summary && (
                <>
                    <section className="tenant-stat-row">
                        <StatCard
                            variant="dark"
                            label="Revenue"
                            value={formatMoney(summary.revenue)}
                            hint="From delivered services"
                        />
                        <StatCard
                            variant="light"
                            label="Cost"
                            value={formatMoney(summary.cost)}
                            hint="Work cost on delivered services"
                        />
                        <StatCard
                            variant="lime"
                            label="Profit"
                            value={formatMoney(summary.profit)}
                            hint="Revenue minus cost"
                        />
                    </section>

                    <div className="tenant-dashboard-row">
                        <section className="tenant-card tenant-dashboard-row__main">
                            <div className="tenant-card__head">
                                <h2>Revenue, last 7 days</h2>
                            </div>

                            <div className="tenant-chart">
                                {chart.map((day) => (
                                    <div className="tenant-chart-bar" key={day.date}>
                                        {day.total > 0 && (
                                            <span className="tenant-chart-bar__value">{formatMoney(day.total)}</span>
                                        )}
                                        <div className="tenant-chart-bar__track">
                                            <div
                                                className="tenant-chart-bar__fill"
                                                style={{ height: `${Math.max((day.total / maxChartValue) * 100, 4)}%` }}
                                            />
                                        </div>
                                        <span className="tenant-chart-bar__label">{day.label}</span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <aside className="tenant-card tenant-dashboard-row__side">
                            <div className="tenant-card__head">
                                <h2>Pipeline</h2>
                            </div>

                            <div className="tenant-breakdown">
                                {STATUS_ORDER.map((status) => {
                                    const meta = SERVICE_STATUS_META[status];
                                    const count = summary.status_counts[status] ?? 0;
                                    const percent = totalServices ? Math.round((count / totalServices) * 100) : 0;

                                    return (
                                        <div className="tenant-breakdown__item" key={status}>
                                            <div className="tenant-breakdown__item-head">
                                                <span>
                                                    <i style={{ background: meta.color }} />
                                                    {meta.label}
                                                </span>
                                                <strong>{count}</strong>
                                            </div>
                                            <div className="tenant-breakdown__track">
                                                <div
                                                    className="tenant-breakdown__fill"
                                                    style={{ width: `${percent}%`, background: meta.color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>
                    </div>

                    <div className="tenant-dashboard-row">
                        <section className="tenant-card tenant-dashboard-row__main">
                            <div className="tenant-card__head">
                                <h2>Top technicians</h2>
                            </div>

                            <div className="tenant-table-scroll">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Technician</th>
                                            <th>Delivered</th>
                                            <th>Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.top_employees.map((employee) => (
                                            <tr key={employee.id}>
                                                <td data-label="Technician">
                                                    <strong>{employee.name}</strong>
                                                </td>
                                                <td data-label="Delivered">{employee.services_delivered}</td>
                                                <td data-label="Revenue">{formatMoney(employee.revenue)}</td>
                                            </tr>
                                        ))}

                                        {summary.top_employees.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="tenant-table-empty">
                                                    No delivered services yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <aside className="tenant-card tenant-dashboard-row__side">
                            <div className="tenant-card__head">
                                <h2>Totals</h2>
                            </div>

                            <div className="tenant-totals">
                                <div>
                                    <span>Customers</span>
                                    <strong>{summary.totals.customers}</strong>
                                </div>
                                <div>
                                    <span>Employees</span>
                                    <strong>{summary.totals.employees}</strong>
                                </div>
                                <div>
                                    <span>Services</span>
                                    <strong>{summary.totals.services}</strong>
                                </div>
                                <div>
                                    <span>Total work cost (all jobs)</span>
                                    <strong>{formatMoney(summary.total_work_cost)}</strong>
                                </div>
                            </div>
                        </aside>
                    </div>
                </>
            )}
        </TenantShell>
    );
}

export default TenantDashboard;
