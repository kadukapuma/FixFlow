import { useState } from "react";
import Picker from "../../components/Picker/Picker";
import { EmployeePicker } from "../../components/Picker/presets";

const COMMISSION_TYPES = [
    { id: "flat", name: "Flat Amount (Rs.)" },
    { id: "percentage", name: "Percentage (%)" },
];

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
    employee_id: "",
    fault: "",
    note: "",
    price: "",
    advance_amount: "",
    commission_type: "",
    commission_value: "",
    service_date: todayIsoDate(),
    ref_no: "",
};

function ServiceDetailsStep({ customer, item, initialValues, submitting, error, onSubmit, onBack }) {
    const [form, setForm] = useState(initialValues || EMPTY_FORM);

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    // Live financial computations
    const priceNum = Number(form.price) || 0;
    const advanceNum = Number(form.advance_amount) || 0;
    const balanceDue = Math.max(0, priceNum - advanceNum);

    // Live commission computation preview
    let calculatedCommission = null;
    if (form.commission_type === "flat" && form.commission_value) {
        calculatedCommission = Number(form.commission_value) || 0;
    } else if (form.commission_type === "percentage" && form.commission_value && priceNum > 0) {
        calculatedCommission = (priceNum * (Number(form.commission_value) || 0)) / 100;
    }

    return (
        <form className="wizard-form-container" onSubmit={handleSubmit}>
            <div className="wizard-body">
                {/* Context Bar */}
                <div className="wizard-context-bar">
                    <span className="wizard-context-chip">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <strong>{customer.name}</strong>
                    </span>
                    <span className="wizard-context-divider">•</span>
                    <span className="wizard-context-chip">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <strong>{item.name}</strong>
                        {item.model && <span>({item.model})</span>}
                    </span>
                </div>

                {/* 2-Column Balanced Desktop Layout */}
                <div className="wizard-details-layout">
                    {/* COLUMN 1: Service & Diagnostics */}
                    <div className="wizard-section-card">
                        <div className="wizard-section-card__title">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>Service & Diagnostics</span>
                        </div>

                        <div className="wizard-field-row">
                            <label>
                                Reference #
                                <input
                                    value={form.ref_no}
                                    onChange={(e) => updateField("ref_no", e.target.value)}
                                    placeholder="e.g. JOB-1049"
                                />
                            </label>

                            <label>
                                Service Date *
                                <input
                                    type="date"
                                    value={form.service_date}
                                    onChange={(e) => updateField("service_date", e.target.value)}
                                    required
                                />
                            </label>
                        </div>

                        <label>
                            Assigned Technician *
                            <EmployeePicker
                                value={form.employee_id}
                                selected={initialValues?.employee}
                                onChange={(id) => updateField("employee_id", id)}
                                required
                            />
                        </label>

                        <label>
                            Reported Fault / Problem *
                            <textarea
                                value={form.fault}
                                onChange={(e) => updateField("fault", e.target.value)}
                                placeholder="Describe the reported issue or repair required..."
                                rows={2}
                                style={{ resize: "vertical", fontFamily: "inherit", fontSize: 13 }}
                                required
                            />
                        </label>

                        <label>
                            Internal Service Note
                            <input
                                value={form.note}
                                onChange={(e) => updateField("note", e.target.value)}
                                placeholder="Customer notes, passcode, physical condition, etc."
                            />
                        </label>
                    </div>

                    {/* COLUMN 2: Pricing & Commission */}
                    <div className="wizard-section-card">
                        <div className="wizard-section-card__title">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="1" x2="12" y2="23" />
                                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                            </svg>
                            <span>Financials & Commission</span>
                        </div>

                        <div className="wizard-field-row">
                            <label>
                                Price (Rs.)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price}
                                    onChange={(e) => updateField("price", e.target.value)}
                                    placeholder="0.00"
                                />
                            </label>

                            <label>
                                Advance Paid (Rs.)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.advance_amount}
                                    onChange={(e) => updateField("advance_amount", e.target.value)}
                                    placeholder="0.00"
                                />
                            </label>
                        </div>

                        {/* Live Financial Summary */}
                        <div className="wizard-financial-summary">
                            <span className="wizard-financial-summary__label">Balance Due at Delivery:</span>
                            <span
                                className={`wizard-financial-summary__amount ${
                                    balanceDue > 0 ? "wizard-financial-summary__amount--due" : "wizard-financial-summary__amount--settled"
                                }`}
                            >
                                Rs. {balanceDue.toFixed(2)}
                            </span>
                        </div>

                        <div className="wizard-field-row" style={{ marginTop: 2 }}>
                            <label>
                                Commission Type
                                <Picker
                                    options={COMMISSION_TYPES}
                                    value={form.commission_type}
                                    onChange={(type) => updateField("commission_type", type)}
                                    emptyLabel="No commission"
                                />
                            </label>

                            {form.commission_type ? (
                                <label>
                                    {form.commission_type === "percentage" ? "Rate (%)" : "Amount (Rs.)"}
                                    <input
                                        type="number"
                                        min="0"
                                        max={form.commission_type === "percentage" ? "100" : undefined}
                                        step="0.01"
                                        value={form.commission_value}
                                        onChange={(e) => updateField("commission_value", e.target.value)}
                                        placeholder={form.commission_type === "percentage" ? "e.g. 15" : "e.g. 500"}
                                        required
                                    />
                                </label>
                            ) : (
                                <div style={{ display: "flex", alignItems: "center", paddingTop: 18, color: "#9b9a8f", fontSize: 12 }}>
                                    Standard technician rate
                                </div>
                            )}
                        </div>

                        {calculatedCommission != null && (
                            <div className="wizard-commission-calc">
                                <span>Technician Commission Earnings:</span>
                                <strong>Rs. {calculatedCommission.toFixed(2)}</strong>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <p className="tenant-alert" role="alert" style={{ marginTop: 12 }}>
                        {error}
                    </p>
                )}
            </div>

            <div className="wizard-footer">
                <div className="wizard-footer__left">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onBack}>
                        ← Back
                    </button>
                </div>
                <span className="wizard-footer__step-text">Step 3 of 4</span>
                <div className="wizard-footer__right">
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                        Next: Handover Items →
                    </button>
                </div>
            </div>
        </form>
    );
}

export default ServiceDetailsStep;
