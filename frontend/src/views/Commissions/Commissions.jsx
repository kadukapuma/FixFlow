import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import { showToast } from "../../lib/toast";
import { usePressedRow } from "../../lib/usePressedRow";

const EMPTY_PAYOUT_FORM = { amount: "", method: "cash", paid_at: "", note: "" };

function CommissionDetail({ employeeId, onUpdated }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [payoutForm, setPayoutForm] = useState(EMPTY_PAYOUT_FORM);
    const [submitting, setSubmitting] = useState(false);

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
            showToast("Commission payout recorded.");
            setPayoutForm(EMPTY_PAYOUT_FORM);
            await load();
            onUpdated();
        } catch (err) {
            setError(getErrorMessage(err, "Unable to record payout."));
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return <p className="wizard-hint">Loading...</p>;
    }

    if (!data) {
        return (
            <p className="tenant-alert" role="alert">
                {error || "Not found."}
            </p>
        );
    }

    return (
        <div>
            <div className="detail-grid">
                <div>
                    <span className="detail-grid__label">Earned</span>
                    <strong>Rs. {data.total_earned.toFixed(2)}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Paid</span>
                    <strong>Rs. {data.total_paid.toFixed(2)}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Outstanding</span>
                    <strong>Rs. {data.outstanding.toFixed(2)}</strong>
                </div>
            </div>

            <div className="tenant-card__head">
                <h2>Commission-earning services</h2>
            </div>

            <div className="tenant-table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Service</th>
                            <th>Item</th>
                            <th>Completed</th>
                            <th>Commission</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.services.map((service) => (
                            <tr key={service.id}>
                                <td data-label="Service">#{service.id}{service.ref_no ? ` · ${service.ref_no}` : ""}</td>
                                <td data-label="Item">{service.item?.name || "—"}</td>
                                <td data-label="Completed">{service.completed_date || "—"}</td>
                                <td data-label="Commission">Rs. {service.commission_amount}</td>
                            </tr>
                        ))}

                        {data.services.length === 0 && (
                            <tr>
                                <td colSpan={4} className="tenant-table-empty">
                                    No commission-earning services yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="tenant-card__head">
                <h2>Payout history</h2>
            </div>

            <div className="tenant-table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Method</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.payouts.map((payout) => (
                            <tr key={payout.id}>
                                <td data-label="Date">{payout.paid_at}</td>
                                <td data-label="Amount">Rs. {payout.amount}</td>
                                <td data-label="Method">{payout.method}</td>
                                <td data-label="Note">{payout.note || "—"}</td>
                            </tr>
                        ))}

                        {data.payouts.length === 0 && (
                            <tr>
                                <td colSpan={4} className="tenant-table-empty">
                                    No payouts recorded yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {data.outstanding > 0 && (
                <form className="tenant-form tenant-form--2col" onSubmit={handlePayout}>
                    <label>
                        Amount
                        <input
                            type="number"
                            min="0.01"
                            max={data.outstanding}
                            step="0.01"
                            value={payoutForm.amount}
                            onChange={(e) => setPayoutForm((prev) => ({ ...prev, amount: e.target.value }))}
                            required
                        />
                    </label>

                    <label>
                        Method
                        <select
                            value={payoutForm.method}
                            onChange={(e) => setPayoutForm((prev) => ({ ...prev, method: e.target.value }))}
                        >
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                        </select>
                    </label>

                    <label>
                        Date
                        <input
                            type="date"
                            value={payoutForm.paid_at}
                            onChange={(e) => setPayoutForm((prev) => ({ ...prev, paid_at: e.target.value }))}
                        />
                    </label>

                    <label>
                        Note
                        <input
                            value={payoutForm.note}
                            onChange={(e) => setPayoutForm((prev) => ({ ...prev, note: e.target.value }))}
                            placeholder="Optional"
                        />
                    </label>

                    {error && (
                        <p className="tenant-alert tenant-form__error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="tenant-form__actions">
                        <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                            {submitting ? "Recording..." : "Record payout"}
                        </button>
                    </div>
                </form>
            )}
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
                            {rows.map((row) => (
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
                            ))}

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
                <Modal title="Commission statement" onClose={() => setSelectedId(null)} maxWidth={640}>
                    <CommissionDetail employeeId={selectedId} onUpdated={load} />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Commissions;
