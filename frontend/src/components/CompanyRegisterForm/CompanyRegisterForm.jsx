import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import { subdomainUrl } from "../../lib/tenant";
import PasswordInput from "../PasswordInput/PasswordInput";
import "./CompanyRegisterForm.css";

const initialForm = {
    company_name: "",
    subdomain: "",
    owner_name: "",
    owner_email: "",
    owner_mobile: "",
    owner_password: "",
    owner_password_confirmation: "",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_REGEX = /^[0-9+\-\s()]{7,20}$/;

function validate(form) {
    const errors = {};

    if (!EMAIL_REGEX.test(form.owner_email.trim())) {
        errors.owner_email = ["Enter a valid email address."];
    }

    const digitCount = (form.owner_mobile.match(/\d/g) || []).length;
    if (!MOBILE_REGEX.test(form.owner_mobile.trim()) || digitCount < 7) {
        errors.owner_mobile = ["Enter a valid mobile number (at least 7 digits)."];
    }

    return errors;
}

function isFieldValid(field, value, form) {
    switch (field) {
        case "company_name":
        case "owner_name":
            return value.trim().length > 0;
        case "subdomain":
            return /^[a-z0-9-]+$/i.test(value);
        case "owner_email":
            return EMAIL_REGEX.test(value.trim());
        case "owner_mobile": {
            const digitCount = (value.match(/\d/g) || []).length;
            return MOBILE_REGEX.test(value.trim()) && digitCount >= 7;
        }
        case "owner_password":
            return value.length >= 8;
        case "owner_password_confirmation":
            return value.length > 0 && value === form.owner_password;
        default:
            return true;
    }
}

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

        const clientErrors = validate(form);
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

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

    function fieldClass(field) {
        const value = form[field];
        if (!value) return "";
        return isFieldValid(field, value, form) ? "field-valid" : "field-invalid";
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
                    <input
                        value={form.company_name}
                        onChange={update("company_name")}
                        className={fieldClass("company_name")}
                        required
                    />
                    {fieldError("company_name") && <span className="field-error">{fieldError("company_name")}</span>}
                </label>

                <label>
                    Subdomain
                    <input
                        value={form.subdomain}
                        onChange={update("subdomain")}
                        placeholder="acme"
                        className={fieldClass("subdomain")}
                        required
                    />
                    <span className="company-register-form__hint">{previewHost}</span>
                    {fieldError("subdomain") && <span className="field-error">{fieldError("subdomain")}</span>}
                </label>
            </div>

            <div className="auth-row">
                <label>
                    Your name
                    <input
                        value={form.owner_name}
                        onChange={update("owner_name")}
                        className={fieldClass("owner_name")}
                        required
                    />
                    {fieldError("owner_name") && <span className="field-error">{fieldError("owner_name")}</span>}
                </label>

                <label>
                    Your email
                    <input
                        type="email"
                        value={form.owner_email}
                        onChange={update("owner_email")}
                        className={fieldClass("owner_email")}
                        required
                    />
                    {fieldError("owner_email") && <span className="field-error">{fieldError("owner_email")}</span>}
                </label>
            </div>

            <div className="auth-row auth-row--single">
                <label>
                    Mobile number
                    <input
                        type="tel"
                        value={form.owner_mobile}
                        onChange={update("owner_mobile")}
                        placeholder="077 123 4567"
                        className={fieldClass("owner_mobile")}
                        required
                    />
                    {fieldError("owner_mobile") && <span className="field-error">{fieldError("owner_mobile")}</span>}
                </label>
            </div>

            <div className="auth-row">
                <label>
                    Password
                    <PasswordInput
                        value={form.owner_password}
                        onChange={update("owner_password")}
                        className={fieldClass("owner_password")}
                        required
                        minLength={8}
                    />
                    {fieldError("owner_password") && <span className="field-error">{fieldError("owner_password")}</span>}
                </label>

                <label>
                    Confirm password
                    <PasswordInput
                        value={form.owner_password_confirmation}
                        onChange={update("owner_password_confirmation")}
                        className={fieldClass("owner_password_confirmation")}
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
