import { useState } from "react";

const EMPTY_FORM = { name: "", nic: "", phone: "", address: "" };

function CustomerForm({ initialValues, submitting, error, onSubmit, onCancel, submitLabel = "Save" }) {
    const [form, setForm] = useState({ ...EMPTY_FORM, ...initialValues });

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label>
                Name
                <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Customer name"
                    required
                />
            </label>

            <label>
                NIC
                <input
                    value={form.nic}
                    onChange={(e) => updateField("nic", e.target.value)}
                    placeholder="National ID number"
                    required
                />
            </label>

            <label>
                Phone
                <input
                    value={form.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="07X XXX XXXX"
                />
            </label>

            <label>
                Address
                <input
                    value={form.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Street, city"
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
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default CustomerForm;
