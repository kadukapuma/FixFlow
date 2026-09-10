import { useState } from "react";

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function DateActionForm({ label, submitting, error, onSubmit, onCancel, submitLabel = "Save" }) {
    const [date, setDate] = useState(todayIsoDate());

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(date);
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <label>
                {label}
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default DateActionForm;
