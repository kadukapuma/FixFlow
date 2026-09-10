import { useState } from "react";

const EMPTY_FORM = { name: "", model: "", serial_number: "" };

function ItemStep({ customer, item, submitting, error, onNext, onBack }) {
    const [form, setForm] = useState(EMPTY_FORM);

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleNext(event) {
        event.preventDefault();
        onNext(item ? null : form);
    }

    return (
        <div className="wizard-step">
            <div className="wizard-context">
                Customer: <strong>{customer.name}</strong> ({customer.nic})
            </div>

            <form className="tenant-form tenant-form--2col" onSubmit={handleNext}>
                {item ? (
                    <div className="wizard-confirmed wizard-full">
                        <div className="wizard-confirmed__card">
                            <strong>{item.name}</strong>
                            <span>
                                {item.model || "—"} · {item.serial_number || "—"}
                            </span>
                        </div>
                    </div>
                ) : (
                    <>
                        <label className="wizard-full">
                            Item
                            <input
                                value={form.name}
                                onChange={(e) => updateField("name", e.target.value)}
                                placeholder="e.g. Laptop — Dell XPS 13"
                                required
                            />
                        </label>

                        <label>
                            Model
                            <input
                                value={form.model}
                                onChange={(e) => updateField("model", e.target.value)}
                                placeholder="e.g. XPS 13 9310"
                            />
                        </label>

                        <label>
                            Serial number
                            <input
                                value={form.serial_number}
                                onChange={(e) => updateField("serial_number", e.target.value)}
                                placeholder="e.g. SN-482910"
                            />
                        </label>
                    </>
                )}

                {error && (
                    <p className="tenant-alert tenant-form__error" role="alert">
                        {error}
                    </p>
                )}

                <div className="tenant-form__actions">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onBack}>
                        Back
                    </button>
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                        {submitting ? "Saving..." : "Next"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ItemStep;
