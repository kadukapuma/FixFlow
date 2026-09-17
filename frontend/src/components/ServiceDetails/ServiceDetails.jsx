import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import StatusBadge from "../StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../StatusBadge/serviceStatusMeta";
import Modal from "../Modal/Modal";
import DateActionForm from "../DateActionForm/DateActionForm";
import PdfViewerModal from "../PdfViewerModal/PdfViewerModal";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";

const EMPTY_PAYMENT_FORM = { amount: "", method: "cash", paid_at: "", note: "" };

function ServiceDetails({ serviceId, onUpdated }) {
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [payments, setPayments] = useState([]);
    const [price, setPrice] = useState("");
    const [advance, setAdvance] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [delivering, setDelivering] = useState(false);
    const [deliverModalOpen, setDeliverModalOpen] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
    const [paymentError, setPaymentError] = useState("");
    const [recordingPayment, setRecordingPayment] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const [serviceResponse, workResponse, paymentsResponse] = await Promise.all([
                    api.get(`/services/${serviceId}`),
                    api.get("/work", { params: { service_id: serviceId } }),
                    api.get(`/services/${serviceId}/payments`),
                ]);

                if (cancelled) return;

                setService(serviceResponse.data);
                setWorkEntries(workResponse.data);
                setPayments(paymentsResponse.data);

                const workTotal = workResponse.data.reduce((sum, entry) => sum + Number(entry.cost), 0);
                setPrice(serviceResponse.data.price != null ? String(serviceResponse.data.price) : workTotal.toFixed(2));
                setAdvance(serviceResponse.data.advance_amount != null ? String(serviceResponse.data.advance_amount) : "");
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load service details."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [serviceId]);

    const workTotal = workEntries.reduce((sum, entry) => sum + Number(entry.cost), 0);
    const paidTotal = payments.reduce((sum, entry) => sum + Number(entry.amount), 0);

    async function handleRecordPayment(event) {
        event.preventDefault();
        setRecordingPayment(true);
        setPaymentError("");

        try {
            const response = await api.post(`/services/${serviceId}/payments`, {
                amount: paymentForm.amount,
                method: paymentForm.method,
                paid_at: paymentForm.paid_at || undefined,
                note: paymentForm.note || undefined,
            });
            setPayments((prev) => [response.data.payment, ...prev]);
            setPaymentForm(EMPTY_PAYMENT_FORM);
            showToast("Payment recorded.");
        } catch (err) {
            setPaymentError(getErrorMessage(err, "Unable to record payment."));
        } finally {
            setRecordingPayment(false);
        }
    }

    async function handleSavePrice(event) {
        event.preventDefault();

        const hadPrice = service.price != null;
        const changed = Number(service.price) !== Number(price);

        if (hadPrice && changed) {
            const confirmed = await confirmAction({
                title: "Overwrite price?",
                message: `This service already has a price of Rs. ${service.price}. Overwrite it with Rs. ${price}?`,
                confirmLabel: "Overwrite",
                danger: true,
            });
            if (!confirmed) return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await api.put(`/services/${serviceId}/price`, {
                price,
                advance_amount: advance === "" ? null : advance,
            });
            setService(response.data.service);
            showToast("Price saved.");
            onUpdated(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save price."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeliver(deliveredDate) {
        setDelivering(true);
        setError("");

        try {
            const response = await api.post(`/services/${serviceId}/deliver`, { delivered_date: deliveredDate });
            setService(response.data.service);
            showToast("Service marked as delivered.");
            setDeliverModalOpen(false);
            onUpdated(response.data.service);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to mark as delivered."));
        } finally {
            setDelivering(false);
        }
    }

    if (loading) {
        return <p className="wizard-hint">Loading...</p>;
    }

    if (!service) {
        return (
            <p className="tenant-alert" role="alert">
                {error || "Service not found."}
            </p>
        );
    }

    return (
        <div>
            <div className="tenant-card__head">
                <h2>Details{service.ref_no ? ` · ${service.ref_no}` : ""}</h2>
                <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />
            </div>

            <div className="detail-grid">
                <div>
                    <span className="detail-grid__label">Customer</span>
                    <strong>{service.customer?.name}</strong>
                    <span>{service.customer?.nic}</span>
                </div>
                <div>
                    <span className="detail-grid__label">Item</span>
                    <strong>{service.item?.name}</strong>
                    <span>
                        {service.item?.model || "—"}
                        {service.item?.serial_number ? ` · ${service.item.serial_number}` : ""}
                    </span>
                </div>
                <div>
                    <span className="detail-grid__label">Technician</span>
                    <strong>{service.employee?.name}</strong>
                </div>
                {service.commission_type && (
                    <div>
                        <span className="detail-grid__label">Technician commission</span>
                        <strong>
                            {service.commission_amount != null
                                ? `Rs. ${service.commission_amount} earned`
                                : service.commission_type === "percentage"
                                ? `${service.commission_value}% of price`
                                : `Rs. ${service.commission_value}`}
                        </strong>
                        {service.commission_amount != null && (
                            <span>Paid out from the Commissions tab, not here.</span>
                        )}
                    </div>
                )}
                <div>
                    <span className="detail-grid__label">Fault</span>
                    <strong>{service.fault || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Note</span>
                    <strong>{service.note || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Service date</span>
                    <strong>{service.service_date || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Started</span>
                    <strong>{service.started_date || "—"}</strong>
                </div>
                <div>
                    <span className="detail-grid__label">Completed</span>
                    <strong>{service.completed_date || "—"}</strong>
                </div>
                {service.delivered_date && (
                    <div>
                        <span className="detail-grid__label">Delivered</span>
                        <strong>{service.delivered_date}</strong>
                    </div>
                )}
            </div>

            <div className="tenant-card__head">
                <h2>Work log</h2>
            </div>

            <div className="tenant-table-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {workEntries.map((entry) => (
                            <tr key={entry.id}>
                                <td data-label="Description">{entry.description || "—"}</td>
                                <td data-label="Cost">Rs. {entry.cost}</td>
                            </tr>
                        ))}

                        {workEntries.length === 0 && (
                            <tr>
                                <td colSpan={2} className="tenant-table-empty">
                                    No work logged.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>
                                <strong>Work total</strong>
                            </td>
                            <td>
                                <strong>Rs. {workTotal.toFixed(2)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className="tenant-card__head">
                <h2>Customer payments received</h2>
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
                        {payments.map((entry) => (
                            <tr key={entry.id}>
                                <td data-label="Date">{entry.paid_at}</td>
                                <td data-label="Amount">Rs. {entry.amount}</td>
                                <td data-label="Method">{entry.method}</td>
                                <td data-label="Note">{entry.note || "—"}</td>
                            </tr>
                        ))}

                        {payments.length === 0 && (
                            <tr>
                                <td colSpan={4} className="tenant-table-empty">
                                    No payments recorded.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>
                                <strong>Paid</strong>
                            </td>
                            <td colSpan={3}>
                                <strong>Rs. {paidTotal.toFixed(2)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            <form className="tenant-form tenant-form--2col" onSubmit={handleRecordPayment}>
                <label>
                    Amount
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                        required
                    />
                </label>

                <label>
                    Method
                    <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
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
                        value={paymentForm.paid_at}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, paid_at: e.target.value }))}
                    />
                </label>

                <label>
                    Note
                    <input
                        value={paymentForm.note}
                        onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                        placeholder="Optional"
                    />
                </label>

                {paymentError && (
                    <p className="tenant-alert tenant-form__error" role="alert">
                        {paymentError}
                    </p>
                )}

                <div className="tenant-form__actions">
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={recordingPayment}>
                        {recordingPayment ? "Recording..." : "Record customer payment"}
                    </button>
                </div>
            </form>

            {service.status === "completed" && (
                <form className="tenant-form tenant-form--1col" onSubmit={handleSavePrice}>
                    <label>
                        Final price
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Advance received
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={advance}
                            onChange={(e) => setAdvance(e.target.value)}
                            placeholder="Optional, e.g. 500.00"
                        />
                    </label>

                    {price !== "" && !Number.isNaN(Number(price)) && (
                        <p className="wizard-hint">
                            Balance due: Rs. {(Number(price) - paidTotal).toFixed(2)}
                        </p>
                    )}

                    {error && (
                        <p className="tenant-alert tenant-form__error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="tenant-form__actions">
                        {service.price != null && (
                            <button
                                type="button"
                                className="tenant-btn tenant-btn--ghost"
                                disabled={delivering}
                                onClick={() => setDeliverModalOpen(true)}
                            >
                                Mark as delivered
                            </button>
                        )}
                        <button type="submit" className="tenant-btn tenant-btn--primary" disabled={saving}>
                            {saving ? "Saving..." : "Save price"}
                        </button>
                    </div>
                </form>
            )}

            {deliverModalOpen && (
                <Modal title="Mark as delivered" onClose={() => setDeliverModalOpen(false)}>
                    <DateActionForm
                        label="Delivered date"
                        submitLabel="Mark as delivered"
                        submitting={delivering}
                        error={error}
                        onSubmit={handleDeliver}
                        onCancel={() => setDeliverModalOpen(false)}
                    />
                </Modal>
            )}

            {service.status === "delivered" && (
                <>
                    <div className="detail-grid">
                        <div>
                            <span className="detail-grid__label">Final price</span>
                            <strong>{service.price != null ? `Rs. ${service.price}` : "—"}</strong>
                        </div>
                        {paidTotal > 0 && (
                            <>
                                <div>
                                    <span className="detail-grid__label">Paid</span>
                                    <strong>Rs. {paidTotal.toFixed(2)}</strong>
                                </div>
                                <div>
                                    <span className="detail-grid__label">Balance due</span>
                                    <strong>Rs. {(Number(service.price ?? 0) - paidTotal).toFixed(2)}</strong>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="tenant-form__actions">
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--primary"
                            onClick={() => setInvoiceOpen(true)}
                        >
                            View Invoice
                        </button>
                    </div>
                </>
            )}

            {invoiceOpen && (
                <PdfViewerModal
                    title={`Invoice — Service #${serviceId}`}
                    pdfUrl={`/services/${serviceId}/invoice`}
                    onClose={() => setInvoiceOpen(false)}
                />
            )}
        </div>
    );
}

export default ServiceDetails;
