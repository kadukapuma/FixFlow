import { useLayoutEffect, useState } from "react";
import { setAuthToken } from "../api";
import { usePageParam } from "../lib/usePageParam";
import AdminLogin from "../views/AdminLogin/AdminLogin";
import AdminDashboard from "../views/AdminDashboard/AdminDashboard";
import AdminReceipts from "../views/AdminReceipts/AdminReceipts";

function AdminApp() {
    const [token, setToken] = useState(() => localStorage.getItem("admin_token"));
    const [page, setPage] = usePageParam("dashboard");

    useLayoutEffect(() => {
        setAuthToken(token);
    }, [token]);

    if (!token) {
        return <AdminLogin onLoggedIn={() => setToken(localStorage.getItem("admin_token"))} />;
    }

    if (page === "receipts") {
        return <AdminReceipts page={page} onNavigate={setPage} onLoggedOut={() => setToken(null)} />;
    }

    return <AdminDashboard page={page} onNavigate={setPage} onLoggedOut={() => setToken(null)} />;
}

export default AdminApp;
