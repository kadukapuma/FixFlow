import { useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import BrandMark from "../../components/BrandMark/BrandMark";
import "./AdminLogin.css";

function AdminLogin({ onLoggedIn }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        setSubmitting(true);
        setError("");

        try {
            const response = await api.post("/admin/login", { email, password });

            localStorage.setItem("admin_token", response.data.token);
            localStorage.setItem("admin_info", JSON.stringify(response.data.admin ?? {}));
            setAuthToken(response.data.token);
            onLoggedIn();
        } catch (err) {
            setError(getErrorMessage(err, "Invalid credentials."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="admin-login">
            <div className="admin-login__card">
                <div className="admin-login__brand">
                    <BrandMark size={44} />
                    <span>FixFlow</span>
                </div>

                <h1>Admin sign in</h1>
                <p className="admin-login__subtitle">Manage tenant registrations and approvals.</p>

                <form onSubmit={handleSubmit} className="admin-login__form">
                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@fixflow.com"
                            autoComplete="username"
                            required
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            required
                        />
                    </label>

                    {error && (
                        <p className="admin-login__error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={submitting} className="admin-login__submit">
                        {submitting ? "Signing in..." : "Log in"}
                    </button>
                </form>

                <p className="admin-login__footnote">Restricted access · Admins only</p>
            </div>
        </div>
    );
}

export default AdminLogin;
