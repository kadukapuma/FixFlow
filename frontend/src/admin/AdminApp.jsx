import { useEffect, useState } from "react";
import { setAuthToken } from "../api";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

function AdminApp() {
    const [token, setToken] = useState(() => localStorage.getItem("admin_token"));

    useEffect(() => {
        setAuthToken(token);
    }, [token]);

    if (!token) {
        return <AdminLogin onLoggedIn={() => setToken(localStorage.getItem("admin_token"))} />;
    }

    return <AdminDashboard onLoggedOut={() => setToken(null)} />;
}

export default AdminApp;
