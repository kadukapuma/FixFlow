import { useState } from "react";
import api, { getErrorMessage } from "../api";

const initialForm = {
    company_name: "",
    subdomain: "",
    owner_name: "",
    owner_email: "",
    owner_password: "",
    owner_password_confirmation: "",
};

function RegisterForm() {
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
            <div>
                <h2>Registration received</h2>
                <p>{message}</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            <h2>Register your service center</h2>

            <label>
                Company name
                <input value={form.company_name} onChange={update("company_name")} required />
            </label>
            {fieldError("company_name") && <p role="alert">{fieldError("company_name")}</p>}

            <label>
                Subdomain
                <input
                    value={form.subdomain}
                    onChange={update("subdomain")}
                    placeholder="e.g. acme"
                    required
                />
            </label>
            {fieldError("subdomain") && <p role="alert">{fieldError("subdomain")}</p>}

            <label>
                Your name
                <input value={form.owner_name} onChange={update("owner_name")} required />
            </label>
            {fieldError("owner_name") && <p role="alert">{fieldError("owner_name")}</p>}

            <label>
                Your email
                <input type="email" value={form.owner_email} onChange={update("owner_email")} required />
            </label>
            {fieldError("owner_email") && <p role="alert">{fieldError("owner_email")}</p>}

            <label>
                Password
                <input
                    type="password"
                    value={form.owner_password}
                    onChange={update("owner_password")}
                    required
                    minLength={8}
                />
            </label>
            {fieldError("owner_password") && <p role="alert">{fieldError("owner_password")}</p>}

            <label>
                Confirm password
                <input
                    type="password"
                    value={form.owner_password_confirmation}
                    onChange={update("owner_password_confirmation")}
                    required
                />
            </label>

            {message && <p role="alert">{message}</p>}

            <button type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Register"}
            </button>
        </form>
    );
}

export default RegisterForm;
