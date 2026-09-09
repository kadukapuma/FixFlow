import { useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import AuthCard from "../../components/AuthCard/AuthCard";

function TenantLogin({ onLoggedIn }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setSubmitting(true);
        setError("");

        try {
            const response = await api.post("/login", { email, password });

            localStorage.setItem("tenant_token", response.data.token);
            setAuthToken(response.data.token);
            onLoggedIn();
        } catch (err) {
            setError(getErrorMessage(err, "Invalid credentials."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthCard title="Log in" subtitle="Sign in to your FixFlow workspace.">
            <form onSubmit={handleSubmit}>
                <label>
                    Email
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="username"
                        autoFocus
                        required
                    />
                </label>

                <label>
                    Password
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </label>

                {error && (
                    <p className="auth-error" role="alert">
                        {error}
                    </p>
                )}

                <button type="submit" disabled={submitting} className="auth-submit">
                    {submitting ? "Logging in..." : "Log in"}
                </button>
            </form>
        </AuthCard>
    );
}

export default TenantLogin;
