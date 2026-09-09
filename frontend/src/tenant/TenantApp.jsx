import { useEffect, useState } from "react";
import { setAuthToken } from "../api";
import TenantLogin from "../views/TenantLogin/TenantLogin";
import TenantDashboard from "./TenantDashboard";

function TenantApp() {
    const [token, setToken] = useState(() => localStorage.getItem("tenant_token"));

    useEffect(() => {
        setAuthToken(token);
    }, [token]);

    if (!token) {
        return <TenantLogin onLoggedIn={() => setToken(localStorage.getItem("tenant_token"))} />;
    }

    return <TenantDashboard onLoggedOut={() => setToken(null)} />;
}

export default TenantApp;
