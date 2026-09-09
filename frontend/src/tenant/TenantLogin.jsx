import { useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../api";

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
        <form onSubmit={handleSubmit} style={{ maxWidth: 360, margin: "40px auto" }}>
            <h1>Log in</h1>

            <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>

            <label>
                Password
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
            </label>

            {error && <p role="alert">{error}</p>}

            <button type="submit" disabled={submitting}>
                {submitting ? "Logging in..." : "Log in"}
            </button>
        </form>
    );
}

export default TenantLogin;
