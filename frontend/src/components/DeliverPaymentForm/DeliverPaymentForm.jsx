import { useState } from "react";
import Picker from "../Picker/Picker";
import { PAYMENT_METHODS } from "../../lib/options";

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function DeliverPaymentForm({ balanceDue, submitting, error, onSubmit, onCancel }) {
    const hasBalance = Number(balanceDue) > 0;
    const [amount, setAmount] = useState(hasBalance ? Number(balanceDue).toFixed(2) : "");
    const [method, setMethod] = useState("cash");
    const [deliveredDate, setDeliveredDate] = useState(todayIsoDate());

    const enteredAmount = Number(amount) || 0;
    const changeToGive = hasBalance ? Math.max(0, enteredAmount - Number(balanceDue)) : 0;
    const remainingAfter = hasBalance ? Math.max(0, Number(balanceDue) - enteredAmount) : 0;

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({ amount, method, deliveredDate });
    }

    return (
        <form className="sd-panel-compact-form" onSubmit={handleSubmit}>
            {hasBalance ? (
                <>
                    <div className="sd-form-row">
                        <label>
                            Amount received (Rs.)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </label>

                        <label>
                            Method
                            <Picker options={PAYMENT_METHODS} value={method} onChange={setMethod} />
                        </label>
                    </div>

                    {changeToGive > 0 && (
                        <div className="sd-form-calc-note">
                            Change to give: <strong>Rs. {changeToGive.toFixed(2)}</strong> — only Rs.{" "}
                            {Number(balanceDue).toFixed(2)} will be recorded as payment.
                        </div>
                    )}

                    {changeToGive === 0 && remainingAfter > 0 && (
                        <div className="sd-form-calc-note">
                            Remaining balance after delivery: <strong>Rs. {remainingAfter.toFixed(2)}</strong>
                        </div>
                    )}

                    {changeToGive === 0 && remainingAfter === 0 && enteredAmount > 0 && (
                        <div className="sd-form-calc-note">
                            Balance will be <strong>fully settled</strong>.
                        </div>
                    )}
                </>
            ) : (
                <div className="sd-notice-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <div>
                        <strong>Balance already settled</strong>
                        <p>Nothing left to collect — this will just record the delivery date.</p>
                    </div>
                </div>
            )}

            <label>
                Delivered date
                <input
                    type="date"
                    value={deliveredDate}
                    onChange={(e) => setDeliveredDate(e.target.value)}
                    required
                />
            </label>

            {error && (
                <p className="tenant-alert" role="alert">
                    {error}
                </p>
            )}

            <div className="sd-form-actions">
                <button type="button" className="tenant-btn tenant-btn--ghost tenant-btn--sm" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="tenant-btn tenant-btn--primary tenant-btn--sm" disabled={submitting}>
                    {submitting ? "Saving..." : "Mark as delivered"}
                </button>
            </div>
        </form>
    );
}

export default DeliverPaymentForm;
