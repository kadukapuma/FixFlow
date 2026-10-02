import { useEffect, useState } from "react";
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

const RESEND_COOLDOWN_SECONDS = 60;

function CompanyRegisterForm() {
    const [form, setForm] = useState(initialForm);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState("details");
    const [otp, setOtp] = useState("");
    const [otpInfo, setOtpInfo] = useState("");
    const [resendCooldown, setResendCooldown] = useState(0);
    const [registered, setRegistered] = useState(false);

    useEffect(() => {
        if (resendCooldown <= 0) return undefined;
        const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    function update(field) {
        return (event) => setForm({ ...form, [field]: event.target.value });
    }

    async function sendOtp() {
        setSubmitting(true);
        setErrors({});
        setMessage("");

        try {
            const response = await api.post("/register-company/send-otp", form);

            setOtpInfo(response.data.message);
            setOtp("");
            setStep("otp");
            setResendCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (error) {
            const fieldErrors = error.response?.data?.errors || {};
            setErrors(fieldErrors);
            setMessage(getErrorMessage(error, "Could not send the verification code."));
            if (Object.keys(fieldErrors).length > 0) setStep("details");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const clientErrors = validate(form);
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            return;
        }

        await sendOtp();
    }

    async function handleVerify(event) {
        event.preventDefault();

        setSubmitting(true);
        setErrors({});
        setMessage("");

        try {
            const response = await api.post("/register-company", { ...form, otp });

            setMessage(response.data.message);
            setForm(initialForm);
            setOtp("");
            setRegistered(true);
        } catch (error) {
            const fieldErrors = error.response?.data?.errors || {};
            setErrors(fieldErrors);
            setMessage(getErrorMessage(error, "Registration failed."));

            // Anything other than a bad code (e.g. the subdomain got taken
            // meanwhile) has to be fixed on the details step.
            if (Object.keys(fieldErrors).some((field) => field !== "otp")) {
                setStep("details");
            }
        } finally {
            setSubmitting(false);
        }
    }

    function backToDetails() {
        setStep("details");
        setErrors({});
        setMessage("");
    }

    function fieldError(field) {
        return errors[field]?.[0];
    }

    function fieldClass(field) {
        const value = form[field];
        if (!value) return "";
        return isFieldValid(field, value, form) ? "field-valid" : "field-invalid";
    }

    if (registered) {
        return (
            <div className="company-register-form__success">
                <p className="auth-success">{message}</p>
            </div>
        );
    }

    if (step === "otp") {
        return (
            <form onSubmit={handleVerify} className="company-register-form">
                <p className="company-register-form__otp-info">{otpInfo}</p>

                <div className="auth-row auth-row--single">
                    <label>
                        Verification code
                        <input
                            value={otp}
                            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="123456"
                            className={`company-register-form__otp-input ${otp.length === 6 ? "field-valid" : ""}`}
                            autoFocus
                            required
                        />
                        {fieldError("otp") && <span className="field-error">{fieldError("otp")}</span>}
                    </label>
                </div>

                {message && !fieldError("otp") && (
                    <p className="auth-error" role="alert">
                        {message}
                    </p>
                )}

                <button type="submit" disabled={submitting || otp.length !== 6} className="auth-submit">
                    {submitting ? "Verifying..." : "Verify & register"}
                </button>

                <div className="company-register-form__otp-actions">
                    <button type="button" className="company-register-form__link" onClick={backToDetails} disabled={submitting}>
                        Change details
                    </button>
                    <button
                        type="button"
                        className="company-register-form__link"
                        onClick={sendOtp}
                        disabled={submitting || resendCooldown > 0}
                    >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                    </button>
                </div>
            </form>
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
                {submitting ? "Sending code..." : "Register my company"}
            </button>
        </form>
    );
}

export default CompanyRegisterForm;
