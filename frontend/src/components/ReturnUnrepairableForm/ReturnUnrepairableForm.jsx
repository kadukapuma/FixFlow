import { useState } from "react";
import "./ReturnUnrepairableForm.css";

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function ReturnUnrepairableForm({ service, payments = [], submitting, error, onSubmit, onCancel }) {
    const servicePrice = Number(service?.price ?? 0);

    const totalPaid = payments
        .filter((p) => p.kind !== "refund")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const totalRefunded = payments
        .filter((p) => p.kind === "refund")
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const netPaid = Math.max(0, totalPaid - totalRefunded);

    // If netPaid > servicePrice, shop owes customer a refund
    // If servicePrice > netPaid, customer owes shop
    const refundDue = Math.max(0, netPaid - servicePrice);
    const balanceDue = Math.max(0, servicePrice - netPaid);

    const hasRefund = refundDue > 0;
    const hasBalance = balanceDue > 0;

    const [returnedDate, setReturnedDate] = useState(todayIsoDate());
    const [amount, setAmount] = useState(
        hasRefund ? refundDue.toFixed(2) : hasBalance ? balanceDue.toFixed(2) : ""
    );
    const [method, setMethod] = useState("cash");
    const [note, setNote] = useState(
        hasRefund
            ? "Advance refund on unrepairable item return"
            : hasBalance
            ? "Collected on unrepairable item return"
            : ""
    );

    function handleSubmit(e) {
        e.preventDefault();

        const numericAmount = Number(amount) || 0;
        let action = "none";
        if (hasRefund && numericAmount > 0) {
            action = "refund";
        } else if (hasBalance && numericAmount > 0) {
            action = "collect";
        }

        onSubmit({
            returnedDate,
            action,
            amount: numericAmount,
            method,
            note,
        });
    }

    return (
        <form className="ruf-root" onSubmit={handleSubmit}>
            <div
                className={`ruf-card ${
                    hasRefund
                        ? "ruf-card--refund"
                        : hasBalance
                        ? "ruf-card--collect"
                        : "ruf-card--settled"
                }`}
            >
                <div className="ruf-fin-grid">
                    <div className="ruf-fin-item">
                        <span>Price / Fee</span>
                        <strong>Rs. {servicePrice.toFixed(2)}</strong>
                    </div>
                    <div className="ruf-fin-item">
                        <span>Paid So Far</span>
                        <strong>Rs. {netPaid.toFixed(2)}</strong>
                    </div>
                    <div className="ruf-fin-item">
                        <span>Status</span>
                        <strong>
                            {hasRefund
                                ? "Refund Due"
                                : hasBalance
                                ? "Balance Due"
                                : "Balanced"}
                        </strong>
                    </div>
                </div>

                <div className="ruf-net-banner">
                    {hasRefund ? (
                        <>
                            <span>Refund to Customer:</span>
                            <strong style={{ color: "#e11d48" }}>
                                Rs. {refundDue.toFixed(2)}
                            </strong>
                        </>
                    ) : hasBalance ? (
                        <>
                            <span>Remaining Balance to Collect:</span>
                            <strong style={{ color: "#2563eb" }}>
                                Rs. {balanceDue.toFixed(2)}
                            </strong>
                        </>
                    ) : (
                        <>
                            <span>Financial Status:</span>
                            <strong style={{ color: "#16a34a" }}>Fully Settled (Rs. 0.00)</strong>
                        </>
                    )}
                </div>
            </div>

            {(hasRefund || hasBalance) && (
                <>
                    <div className="ruf-grid-2">
                        <label>
                            <span>
                                {hasRefund
                                    ? "Refund Amount to Disburse (Rs.)"
                                    : "Amount to Collect (Rs.)"}
                            </span>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={hasRefund ? refundDue : undefined}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </label>

                        <label>
                            <span>Payment Method</span>
                            <select value={method} onChange={(e) => setMethod(e.target.value)}>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="upi">UPI</option>
                                <option value="card">Card</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                    </div>

                    <label>
                        <span>Note</span>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Optional note"
                        />
                    </label>
                </>
            )}

            <label>
                <span>Return Date (Handover)</span>
                <input
                    type="date"
                    value={returnedDate}
                    onChange={(e) => setReturnedDate(e.target.value)}
                    required
                />
            </label>

            {error && (
                <p className="tenant-alert" role="alert">
                    {error}
                </p>
            )}

            <div className="ruf-actions">
                <button
                    type="button"
                    className="tenant-btn tenant-btn--ghost"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="tenant-btn tenant-btn--primary"
                    disabled={submitting}
                >
                    {submitting
                        ? "Saving..."
                        : hasRefund
                        ? `Refund Rs. ${Number(amount || 0).toFixed(2)} & Return Device`
                        : hasBalance
                        ? `Collect Rs. ${Number(amount || 0).toFixed(2)} & Return Device`
                        : "Confirm Return to Customer"}
                </button>
            </div>
        </form>
    );
}

export default ReturnUnrepairableForm;
