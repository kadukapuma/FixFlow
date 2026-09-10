import { useEffect, useState } from "react";
import api, { setAuthToken } from "../api";
import TenantLogin from "../views/TenantLogin/TenantLogin";
import TenantDashboard from "../views/TenantDashboard/TenantDashboard";
import Employees from "../views/Employees/Employees";

const DASHBOARD_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const EMPLOYEES_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.36M14.5 3.6a3.5 3.5 0 0 1 0 6.8M10 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

function TenantApp() {
    const [token, setToken] = useState(() => localStorage.getItem("tenant_token"));
    const [page, setPage] = useState("dashboard");
    const [company, setCompany] = useState(null);

    useEffect(() => {
        setAuthToken(token);
    }, [token]);

    useEffect(() => {
        if (!token) return;

        api.get("/company")
            .then((response) => setCompany(response.data))
            .catch(() => {});
    }, [token]);

    function logout() {
        localStorage.removeItem("tenant_token");
        setAuthToken(null);
        setToken(null);
    }

    if (!token) {
        return <TenantLogin onLoggedIn={() => setToken(localStorage.getItem("tenant_token"))} />;
    }

    const shellProps = {
        sidebarItems: [
            {
                key: "dashboard",
                title: "Dashboard",
                active: page === "dashboard",
                onClick: () => setPage("dashboard"),
                icon: DASHBOARD_ICON,
            },
            {
                key: "employees",
                title: "Employees",
                active: page === "employees",
                onClick: () => setPage("employees"),
                icon: EMPLOYEES_ICON,
            },
        ],
        footerLabel: company?.company,
        onLogout: logout,
    };

    if (page === "employees") {
        return <Employees shellProps={shellProps} />;
    }

    return <TenantDashboard shellProps={shellProps} company={company} />;
}

export default TenantApp;
