import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import { subdomainUrl } from "../../lib/tenant";
import "./CompanyLoginForm.css";

function CompanyLoginForm() {
    const [company, setCompany] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setSubmitting(true);
        setError("");

        try {
            const response = await api.post("/login-lookup", { company });

            window.location.href = subdomainUrl(response.data.subdomain, "/login");
        } catch (err) {
            setError(getErrorMessage(err, "Unable to find that company."));
            setSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="company-login-form">
            <label>
                Company name or subdomain
                <input
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="e.g. acme"
                    autoFocus
                    required
                />
                <span className="company-login-form__hint">
                    We&apos;ll take you to your company&apos;s sign-in page.
                </span>
            </label>

            {error && (
                <p className="auth-error" role="alert">
                    {error}
                </p>
            )}

            <button type="submit" disabled={submitting} className="auth-submit">
                {submitting ? "Checking..." : "Continue"}
            </button>
        </form>
    );
}

export default CompanyLoginForm;
