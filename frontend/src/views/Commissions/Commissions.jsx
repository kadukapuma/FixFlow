import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import Picker from "../../components/Picker/Picker";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import { showToast } from "../../lib/toast";
import { PAYMENT_METHODS } from "../../lib/options";
import { usePressedRow } from "../../lib/usePressedRow";

import "./CommissionDetail.css";

const EMPTY_PAYOUT_FORM = { amount: "", method: "cash", paid_at: "", note: "" };

function CommissionDetail({ employeeId, onUpdated }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payoutForm, setPayoutForm] = useState(EMPTY_PAYOUT_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState("services");

    async function load() {
        setLoading(true);
        setError("");

        try {
            const response = await api.get(`/commissions/${employeeId}`);
            setData(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load commission statement."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);

    async function handlePayout(event) {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            await api.post(`/commissions/${employeeId}/payouts`, {
                amount: payoutForm.amount,
                method: payoutForm.method,
                paid_at: payoutForm.paid_at || undefined,
                note: payoutForm.note || undefined,
            });
            showToast("Commission payout recorded successfully.");
            setPayoutForm(EMPTY_PAYOUT_FORM);
            await load();
            if (onUpdated) onUpdated();
            setActiveTab("history");
        } catch (err) {
            setError(getErrorMessage(err, "Unable to record payout."));
        } finally {
            setSubmitting(false);
        }
    }

    function fillFullBalance() {
        if (data?.outstanding > 0) {
            setPayoutForm((prev) => ({
                ...prev,
                amount: String(data.outstanding),
            }));
        }
    }

    if (loading) {
        return (
            <div className="cd-loading-state">
                <div className="cd-spinner" />
                <span>Loading commission statement...</span>
            </div>
        );
    }

    if (!data) {
        return (
            <p className="tenant-alert" role="alert">
                {error || "Commission statement not found."}
            </p>
        );
    }

    const outstanding = Number(data.outstanding || 0);
    const isDue = outstanding > 0;

    return (
        <div className="cd-root">
            {error && (
                <p className="tenant-alert" role="alert" style={{ marginBottom: 4 }}>
                    {error}
                </p>
            )}

            {/* UNIFIED HERO HEADER */}
            <header className="cd-header">
                <div className="cd-header__main">
                    <div className="cd-header__title-row">
                        <h3 className="cd-header__name">
                            {data.employee?.name || "Technician"}
                        </h3>
                        <span className="cd-header__role-badge">Technician</span>
                        <span className="cd-header__id-tag">ID #{employeeId}</span>
                    </div>

                    <div className="cd-header__meta">
                        {data.employee?.phone && (
                            <span className="cd-header__meta-item">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                </svg>
                                <a href={`tel:${data.employee.phone}`} style={{ color: "inherit" }}>
                                    {data.employee.phone}
                                </a>
                            </span>
                        )}

                        {data.employee?.phone && <span className="cd-header__meta-divider">•</span>}

                        <span className="cd-header__meta-item">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>{data.services?.length || 0} completed services</span>
                        </span>
                    </div>
                </div>

                <div className="cd-header__aside">
                    <button
                        type="button"
                        className={`cd-header__balance-btn ${
                            isDue ? "cd-header__balance-btn--due" : "cd-header__balance-btn--settled"
                        }`}
                        onClick={() => setActiveTab("payout")}
                        title="Click to manage payout"
                    >
                        <span className="cd-header__balance-label">
                            {isDue ? `Rs. ${outstanding.toFixed(2)}` : "Settled"}
                        </span>
                        <span className="cd-header__balance-sub">
                            {isDue ? "Outstanding Due →" : "Fully paid"}
                        </span>
                    </button>
                </div>
            </header>

            {/* KPI METRIC CARDS */}
            <div className="cd-kpi-bar">
                <div className="cd-kpi-card">
                    <span className="cd-kpi-card__label">Total Commission Earned</span>
                    <span className="cd-kpi-card__value">
                        Rs. {Number(data.total_earned || 0).toFixed(2)}
                    </span>
                </div>

                <div className="cd-kpi-card">
                    <span className="cd-kpi-card__label">Total Payouts Paid</span>
                    <span className="cd-kpi-card__value">
                        Rs. {Number(data.total_paid || 0).toFixed(2)}
                    </span>
                </div>

                <div
                    className={`cd-kpi-card cd-kpi-card--clickable ${
                        isDue ? "cd-kpi-card--due" : "cd-kpi-card--settled"
                    }`}
                    onClick={() => setActiveTab("payout")}
                    title="Click to record payout"
                >
                    <span className="cd-kpi-card__label">Outstanding Balance</span>
                    <span className="cd-kpi-card__value">
                        {isDue ? `Rs. ${outstanding.toFixed(2)}` : "Rs. 0.00 (Settled)"}
                    </span>
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <nav className="cd-nav-tabs" aria-label="Commission Statement Tabs">
                <button
                    type="button"
                    className={`cd-nav-tab ${activeTab === "services" ? "cd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("services")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="7" width="20" height="14" rx="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    <span>Earned Services</span>
                    {data.services?.length > 0 && (
                        <span className="cd-tab-badge">{data.services.length}</span>
                    )}
                </button>

                <button
                    type="button"
                    className={`cd-nav-tab ${activeTab === "history" ? "cd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Payout History</span>
                    {data.payouts?.length > 0 && (
                        <span className="cd-tab-badge">{data.payouts.length}</span>
                    )}
                </button>

                <button
                    type="button"
                    className={`cd-nav-tab ${activeTab === "payout" ? "cd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("payout")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>Record Payout</span>
                    {isDue && (
                        <span className="cd-tab-badge cd-tab-badge--due">Due</span>
                    )}
                </button>
            </nav>

            {/* TAB CONTENT PANELS */}
            <div className="cd-content-area">
                {/* TAB 1: EARNED SERVICES */}
                {activeTab === "services" && (
                    <div className="cd-tab-pane">
                        <div className="cd-card">
                            <div className="cd-card-head">
                                <div>
                                    <h4 className="cd-pane-title">Commission-Earning Services</h4>
                                    <p className="cd-pane-desc">
                                        Completed services assigned to this technician with commission rules
                                    </p>
                                </div>
                                <div className="cd-total-badge">
                                    <span>Total Earned:</span>
                                    <strong>Rs. {Number(data.total_earned || 0).toFixed(2)}</strong>
                                </div>
                            </div>

                            {data.services?.length > 0 ? (
                                <div className="cd-table-wrap">
                                    <table className="cd-table">
                                        <thead>
                                            <tr>
                                                <th>Service Ref</th>
                                                <th>Device Item</th>
                                                <th>Customer</th>
                                                <th>Completed</th>
                                                <th style={{ textAlign: "right" }}>Price</th>
                                                <th style={{ textAlign: "right" }}>Commission</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.services.map((service) => (
                                                <tr key={service.id}>
                                                    <td>
                                                        <strong>#{service.id}</strong>
                                                        {service.ref_no && (
                                                            <span className="cd-table__cell-sub">
                                                                {" "}· {service.ref_no}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>{service.item?.name || "—"}</td>
                                                    <td>{service.customer?.name || "—"}</td>
                                                    <td className="cd-table__cell-sub">
                                                        {service.completed_date || "—"}
                                                    </td>
                                                    <td style={{ textAlign: "right", color: "#6b6b63" }}>
                                                        {service.price != null
                                                            ? `Rs. ${Number(service.price).toFixed(2)}`
                                                            : "—"}
                                                    </td>
                                                    <td className="cd-table__cell-amount">
                                                        Rs. {Number(service.commission_amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={5}>Total Commission Sum</td>
                                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                                    Rs. {Number(data.total_earned || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="cd-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <rect x="2" y="7" width="20" height="14" rx="2" />
                                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                    </svg>
                                    <h5>No commission services recorded</h5>
                                    <p>This technician has not earned commissions on completed services yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 2: PAYOUT HISTORY */}
                {activeTab === "history" && (
                    <div className="cd-tab-pane">
                        <div className="cd-card">
                            <div className="cd-card-head">
                                <div>
                                    <h4 className="cd-pane-title">Disbursement & Payout History</h4>
                                    <p className="cd-pane-desc">
                                        Record of all payments and advances disbursed to this technician
                                    </p>
                                </div>
                                <div className="cd-total-badge">
                                    <span>Total Paid Out:</span>
                                    <strong>Rs. {Number(data.total_paid || 0).toFixed(2)}</strong>
                                </div>
                            </div>

                            {data.payouts?.length > 0 ? (
                                <div className="cd-table-wrap">
                                    <table className="cd-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Method</th>
                                                <th>Note / Reference</th>
                                                <th style={{ textAlign: "right" }}>Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.payouts.map((payout) => (
                                                <tr key={payout.id}>
                                                    <td>{payout.paid_at || "—"}</td>
                                                    <td>
                                                        <span className="cd-method-pill">
                                                            {payout.method}
                                                        </span>
                                                    </td>
                                                    <td className="cd-table__cell-sub">
                                                        {payout.note || "—"}
                                                    </td>
                                                    <td className="cd-table__cell-amount">
                                                        Rs. {Number(payout.amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3}>Total Disbursements</td>
                                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                                    Rs. {Number(data.total_paid || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="cd-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <h5>No payouts recorded</h5>
                                    <p>No commission disbursements have been registered for this technician yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 3: RECORD PAYOUT */}
                {activeTab === "payout" && (
                    <div className="cd-tab-pane">
                        <div className="cd-payout-panel">
                            {isDue ? (
                                <>
                                    <div className="cd-outstanding-banner">
                                        <div className="cd-outstanding-banner__text">
                                            <span className="cd-outstanding-banner__label">
                                                Outstanding Commission Balance
                                            </span>
                                            <span className="cd-outstanding-banner__amount">
                                                Rs. {outstanding.toFixed(2)}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            className="cd-quick-pay-btn"
                                            onClick={fillFullBalance}
                                        >
                                            Pay Full Balance
                                        </button>
                                    </div>

                                    <form className="cd-payout-form" onSubmit={handlePayout}>
                                        <div className="cd-form-grid">
                                            <label>
                                                Payout Amount (Rs.)
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    max={outstanding}
                                                    step="0.01"
                                                    value={payoutForm.amount}
                                                    onChange={(e) =>
                                                        setPayoutForm((prev) => ({
                                                            ...prev,
                                                            amount: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </label>

                                            <label>
                                                Payment Method
                                                <Picker
                                                    options={PAYMENT_METHODS}
                                                    value={payoutForm.method}
                                                    onChange={(method) =>
                                                        setPayoutForm((prev) => ({ ...prev, method }))
                                                    }
                                                />
                                            </label>

                                            <label>
                                                Payout Date
                                                <input
                                                    type="date"
                                                    value={payoutForm.paid_at}
                                                    onChange={(e) =>
                                                        setPayoutForm((prev) => ({
                                                            ...prev,
                                                            paid_at: e.target.value,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <label>
                                                Notes / Reference
                                                <input
                                                    value={payoutForm.note}
                                                    onChange={(e) =>
                                                        setPayoutForm((prev) => ({
                                                            ...prev,
                                                            note: e.target.value,
                                                        }))
                                                    }
                                                    placeholder="e.g. Receipt #104"
                                                />
                                            </label>
                                        </div>

                                        {error && (
                                            <p className="tenant-alert" role="alert">
                                                {error}
                                            </p>
                                        )}

                                        <div className="cd-form-actions">
                                            <button
                                                type="submit"
                                                className="tenant-btn tenant-btn--primary"
                                                disabled={submitting}
                                            >
                                                {submitting ? "Recording Payout..." : "Record Commission Payout"}
                                            </button>
                                        </div>
                                    </form>
                                </>
                            ) : (
                                <div className="cd-settled-banner">
                                    <div className="cd-settled-banner__icon">✓</div>
                                    <div className="cd-settled-banner__content">
                                        <h5>Commission Account Fully Settled</h5>
                                        <p>
                                            All earned commissions have been paid out in full. There is no outstanding balance due for this technician at this time.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Commissions({ shellProps }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    async function load() {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/commissions");
            setRows(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load commissions."));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, []);

    return (
        <TenantShell
            {...shellProps}
            title="Commissions"
            subtitle="Technician commission earned, paid, and outstanding."
            error={error}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Technicians</h2>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Technician</th>
                                <th>Earned</th>
                                <th>Paid</th>
                                <th>Outstanding</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={4} rows={5} />
                            ) : (
                                rows.map((row) => (
                                    <tr
                                        key={row.employee_id}
                                        className={[
                                            "clickable-row",
                                            pressedId === row.employee_id ? "tenant-row--pressed" : "",
                                            selectedId === row.employee_id ? "tenant-row--selected" : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                        onClick={() => setSelectedId(row.employee_id)}
                                        {...pressHandlers(row.employee_id)}
                                    >
                                        <td data-label="Technician" className="mobile-summary">
                                            <strong>{row.name}</strong>
                                        </td>
                                        <td data-label="Earned">Rs. {row.total_earned.toFixed(2)}</td>
                                        <td data-label="Paid">Rs. {row.total_paid.toFixed(2)}</td>
                                        <td data-label="Outstanding">Rs. {row.outstanding.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}

                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="tenant-table-empty">
                                        No commissions earned yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedId && (
                <Modal
                    title="Commission Statement"
                    onClose={() => setSelectedId(null)}
                    maxWidth={920}
                    className="modal-card--commission-details"
                >
                    <CommissionDetail employeeId={selectedId} onUpdated={load} />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Commissions;
