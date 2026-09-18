import { useState } from "react";

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
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            {hasBalance ? (
                <>
                    <label>
                        Amount received from customer
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </label>

                    <label>
                        Payment method
                        <select value={method} onChange={(e) => setMethod(e.target.value)}>
                            <option value="cash">Cash</option>
                            <option value="bank">Bank</option>
                            <option value="upi">UPI</option>
                            <option value="card">Card</option>
                            <option value="other">Other</option>
                        </select>
                    </label>

                    {changeToGive > 0 && (
                        <p className="tenant-form__hint">
                            Change to give: Rs. {changeToGive.toFixed(2)} (only Rs. {Number(balanceDue).toFixed(2)} will be recorded as payment)
                        </p>
                    )}

                    {changeToGive === 0 && remainingAfter > 0 && (
                        <p className="tenant-form__hint">
                            Remaining balance after delivery: Rs. {remainingAfter.toFixed(2)}
                        </p>
                    )}

                    {changeToGive === 0 && remainingAfter === 0 && enteredAmount > 0 && (
                        <p className="tenant-form__hint">Balance will be fully settled.</p>
                    )}
                </>
            ) : (
                <p className="tenant-form__hint">Balance already settled — nothing left to collect.</p>
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
                <p className="tenant-alert tenant-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions">
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Mark as delivered"}
                </button>
            </div>
        </form>
    );
}

export default DeliverPaymentForm;
