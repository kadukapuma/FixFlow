import { useState } from "react";
import api, { getErrorMessage } from "../api";
import { subdomainUrl } from "../lib/tenant";

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
        <form onSubmit={handleSubmit}>
            <h2>Log in to your company</h2>

            <label>
                Company name or subdomain
                <input
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="e.g. acme"
                    required
                />
            </label>

            {error && <p role="alert">{error}</p>}

            <button type="submit" disabled={submitting}>
                {submitting ? "Checking..." : "Continue"}
            </button>
        </form>
    );
}

export default CompanyLoginForm;
