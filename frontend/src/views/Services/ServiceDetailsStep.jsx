import { useEffect, useState } from "react";
import api from "../../api";

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

function ServiceDetailsStep({ customer, item, submitting, error, onSubmit, onBack }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        api.get("/employees", { params: { all: 1 } }).then((response) => {
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
                    Reference number
                    <input
                        value={form.ref_no}
                        onChange={(e) => updateField("ref_no", e.target.value)}
                        placeholder="Optional, e.g. job card no."
                    />
                </label>

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
                    Service date
                    <input
                        type="date"
                        value={form.service_date}
                        onChange={(e) => updateField("service_date", e.target.value)}
                        required
                    />
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

                <label>
                    Advance received
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.advance_amount}
                        onChange={(e) => updateField("advance_amount", e.target.value)}
                        placeholder="Optional, e.g. 500.00"
                    />
                </label>

                <label>
                    Technician commission
                    <select
                        value={form.commission_type}
                        onChange={(e) => updateField("commission_type", e.target.value)}
                    >
                        <option value="">None</option>
                        <option value="flat">Flat amount</option>
                        <option value="percentage">Percentage of price</option>
                    </select>
                </label>

                {form.commission_type && (
                    <label>
                        {form.commission_type === "percentage" ? "Commission (%)" : "Commission (₹)"}
                        <input
                            type="number"
                            min="0"
                            max={form.commission_type === "percentage" ? "100" : undefined}
                            step="0.01"
                            value={form.commission_value}
                            onChange={(e) => updateField("commission_value", e.target.value)}
                            placeholder={form.commission_type === "percentage" ? "e.g. 10" : "e.g. 200.00"}
                            required
                        />
                    </label>
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
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ServiceDetailsStep;
