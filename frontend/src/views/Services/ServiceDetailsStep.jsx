import { useEffect, useState } from "react";
import api from "../../api";
import { SERVICE_STATUS_OPTIONS } from "../../components/StatusBadge/serviceStatusMeta";

const EMPTY_FORM = { employee_id: "", fault: "", note: "", status: "pending", price: "" };

function ServiceDetailsStep({ customer, item, submitting, error, onSubmit, onBack }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        api.get("/employees").then((response) => {
            setEmployees(response.data.filter((employee) => employee.is_active));
        });
    }, []);

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <div className="wizard-step">
            <div className="wizard-context">
                <strong>{customer.name}</strong> ({customer.nic}) — {item.name}
            </div>

            <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
                <label>
                    Technician
                    <select value={form.employee_id} onChange={(e) => updateField("employee_id", e.target.value)} required>
                        <option value="" disabled>
                            Select an employee
                        </option>
                        {employees.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                                {employee.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Status
                    <select value={form.status} onChange={(e) => updateField("status", e.target.value)} required>
                        {SERVICE_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="wizard-full">
                    Fault
                    <input
                        value={form.fault}
                        onChange={(e) => updateField("fault", e.target.value)}
                        placeholder="What's wrong with it?"
                    />
                </label>

                <label className="wizard-full">
                    Note
                    <input value={form.note} onChange={(e) => updateField("note", e.target.value)} placeholder="Optional note" />
                </label>

                <label>
                    Price
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={(e) => updateField("price", e.target.value)}
                        placeholder="0.00"
                    />
                </label>

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
                        {submitting ? "Saving..." : "Save service"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ServiceDetailsStep;
