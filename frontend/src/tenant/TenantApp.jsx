import { useEffect, useState } from "react";
import api, { setAuthToken } from "../api";
import TenantLogin from "../views/TenantLogin/TenantLogin";
import TenantDashboard from "../views/TenantDashboard/TenantDashboard";
import Customers from "../views/Customers/Customers";
import Employees from "../views/Employees/Employees";
import Services from "../views/Services/Services";
import StartWork from "../views/StartWork/StartWork";
import Completed from "../views/Completed/Completed";
import Delivered from "../views/Delivered/Delivered";

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

const CUSTOMERS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
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

const SERVICES_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L21 6l-3-3-3.3 3.3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const START_WORK_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M5 3l14 9-14 9V3ZM19 3v18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const COMPLETED_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M20 6 9 17l-5-5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const DELIVERED_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7ZM3 8.5 12 13l9-4.5M12 13v7"
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
                key: "customers",
                title: "Customers",
                active: page === "customers",
                onClick: () => setPage("customers"),
                icon: CUSTOMERS_ICON,
            },
            {
                key: "employees",
                title: "Employees",
                active: page === "employees",
                onClick: () => setPage("employees"),
                icon: EMPLOYEES_ICON,
            },
            {
                key: "services",
                title: "Services",
                active: page === "services",
                onClick: () => setPage("services"),
                icon: SERVICES_ICON,
            },
            {
                key: "start-work",
                title: "Start Work",
                active: page === "start-work",
                onClick: () => setPage("start-work"),
                icon: START_WORK_ICON,
            },
            {
                key: "completed",
                title: "Completed",
                active: page === "completed",
                onClick: () => setPage("completed"),
                icon: COMPLETED_ICON,
            },
            {
                key: "delivered",
                title: "Delivered",
                active: page === "delivered",
                onClick: () => setPage("delivered"),
                icon: DELIVERED_ICON,
            },
        ],
        footerLabel: company?.company,
        onLogout: logout,
    };

    if (page === "customers") {
        return <Customers shellProps={shellProps} />;
    }

    if (page === "employees") {
        return <Employees shellProps={shellProps} />;
    }

    if (page === "services") {
        return <Services shellProps={shellProps} />;
    }

    if (page === "start-work") {
        return <StartWork shellProps={shellProps} />;
    }

    if (page === "completed") {
        return <Completed shellProps={shellProps} />;
    }

    if (page === "delivered") {
        return <Delivered shellProps={shellProps} />;
    }

    return <TenantDashboard shellProps={shellProps} company={company} />;
}

export default TenantApp;
