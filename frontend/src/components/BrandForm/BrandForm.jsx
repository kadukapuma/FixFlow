import { useState } from "react";

const EMPTY_FORM = { name: "", description: "" };

function BrandForm({ initialValues, submitting, error, onSubmit, onCancel, submitLabel = "Save" }) {
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
                    placeholder="Brand name"
                    required
                />
            </label>

            <label>
                Description
                <textarea
                    value={form.description || ""}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Optional description"
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

export default BrandForm;
