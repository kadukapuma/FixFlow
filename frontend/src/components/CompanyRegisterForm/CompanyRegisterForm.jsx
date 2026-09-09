import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import { subdomainUrl } from "../../lib/tenant";
import "./CompanyRegisterForm.css";

const initialForm = {
    company_name: "",
    subdomain: "",
    owner_name: "",
    owner_email: "",
    owner_password: "",
    owner_password_confirmation: "",
};

function CompanyRegisterForm() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    function update(field) {
        return (event) => setForm({ ...form, [field]: event.target.value });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setSubmitting(true);
        setErrors({});
        setMessage("");

        try {
            const response = await api.post("/register-company", form);

            setMessage(response.data.message);
            setForm(initialForm);
        } catch (error) {
            setErrors(error.response?.data?.errors || {});
            setMessage(getErrorMessage(error, "Registration failed."));
        } finally {
            setSubmitting(false);
        }
    }

    function fieldError(field) {
        return errors[field]?.[0];
    }

    if (message && Object.keys(errors).length === 0) {
        return (
            <div className="company-register-form__success">
                <p className="auth-success">{message}</p>
            </div>
        );
    }

    const previewHost = subdomainUrl(form.subdomain || "yourcompany", "").replace(/^https?:\/\//, "").replace(/\/$/, "");

    return (
        <form onSubmit={handleSubmit} className="company-register-form">
            <div className="auth-row">
                <label>
                    Company name
                    <input value={form.company_name} onChange={update("company_name")} required />
                    {fieldError("company_name") && <span className="field-error">{fieldError("company_name")}</span>}
                </label>

                <label>
                    Subdomain
                    <input value={form.subdomain} onChange={update("subdomain")} placeholder="acme" required />
                    <span className="company-register-form__hint">{previewHost}</span>
                    {fieldError("subdomain") && <span className="field-error">{fieldError("subdomain")}</span>}
                </label>
            </div>

            <div className="auth-row">
                <label>
                    Your name
                    <input value={form.owner_name} onChange={update("owner_name")} required />
                    {fieldError("owner_name") && <span className="field-error">{fieldError("owner_name")}</span>}
                </label>

                <label>
                    Your email
                    <input type="email" value={form.owner_email} onChange={update("owner_email")} required />
                    {fieldError("owner_email") && <span className="field-error">{fieldError("owner_email")}</span>}
                </label>
            </div>

            <div className="auth-row">
                <label>
                    Password
                    <input
                        type="password"
                        value={form.owner_password}
                        onChange={update("owner_password")}
                        required
                        minLength={8}
                    />
                    {fieldError("owner_password") && <span className="field-error">{fieldError("owner_password")}</span>}
                </label>

                <label>
                    Confirm password
                    <input
                        type="password"
                        value={form.owner_password_confirmation}
                        onChange={update("owner_password_confirmation")}
                        required
                    />
                </label>
            </div>

            {message && (
                <p className="auth-error" role="alert">
                    {message}
                </p>
            )}

            <button type="submit" disabled={submitting} className="auth-submit">
                {submitting ? "Submitting..." : "Register my company"}
            </button>
        </form>
    );
}

export default CompanyRegisterForm;
