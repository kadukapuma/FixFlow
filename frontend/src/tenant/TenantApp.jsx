import { useEffect, useLayoutEffect, useState } from "react";
import api, { setAuthToken } from "../api";
import { confirmAction } from "../lib/confirm";
import { usePageParam } from "../lib/usePageParam";
import TenantLogin from "../views/TenantLogin/TenantLogin";
import TenantDashboard from "../views/TenantDashboard/TenantDashboard";
import Customers from "../views/Customers/Customers";
import Employees from "../views/Employees/Employees";
import Categories from "../views/Categories/Categories";
import Brands from "../views/Brands/Brands";
import Stores from "../views/Stores/Stores";
import Suppliers from "../views/Suppliers/Suppliers";
import Products from "../views/Products/Products";
import ReceivedItems from "../views/ReceivedItems/ReceivedItems";
import Services from "../views/Services/Services";
import StartWork from "../views/StartWork/StartWork";
import Completed from "../views/Completed/Completed";
import Delivered from "../views/Delivered/Delivered";
import Commissions from "../views/Commissions/Commissions";
import Accounts from "../views/Accounts/Accounts";
import Stock from "../views/Stock/Stock";
import StockRecords from "../views/Stock/StockRecords";
import PurchaseOrders from "../views/Purchase/PurchaseOrders";
import Purchases from "../views/Purchase/Purchases";
import SupplierPayments from "../views/Purchase/SupplierPayments";
import PurchaseReturns from "../views/Purchase/PurchaseReturns";
import CompanySettings from "../views/CompanySettings/CompanySettings";
import Subscription from "../views/Subscription/Subscription";

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

const CATEGORIES_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const BRANDS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="m20 10-8.3-8.3a2 2 0 0 0-1.4-.6H5a2 2 0 0 0-2 2v5.3c0 .5.2 1 .6 1.4L11.9 18a2 2 0 0 0 2.8 0L20 12.8a2 2 0 0 0 0-2.8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path d="M7 7h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
);

const STORES_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 9.5 4.5 4h15L21 9.5M3 9.5a2.5 2.5 0 0 0 5 0M8 9.5a2.5 2.5 0 0 0 5 0M13 9.5a2.5 2.5 0 0 0 5 0M18 9.5a2.5 2.5 0 0 0 3 0M5 9.5V20h14V9.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const SUPPLIERS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 7h11v9H3V7ZM14 10h4l3 3v3h-7v-6ZM6.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.5 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PRODUCTS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3ZM3.5 7.3v9.4L12 21l8.5-4.3V7.3M12 11.6V21"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const MASTER_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const RECEIVED_ITEMS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5ZM4 8.5v7L12 20l8-4.5v-7M12 13v7"
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

const SETTINGS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.05a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.05a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.05a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const SUBSCRIPTION_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 6.5h18M3 6.5v11a1.5 1.5 0 0 0 1.5 1.5h15a1.5 1.5 0 0 0 1.5-1.5v-11M3 6.5l1.5-3h15l1.5 3M7 15h4"
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

const STOCK_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 9l9-5 9 5v10l-9 5-9-5V9ZM3 9l9 5 9-5M12 14v10M7.5 6.5l9 5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const FINANCE_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 7.5A2.5 2.5 0 0 1 5.5 5H19a2 2 0 0 1 2 2v2M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M3 7.5A2.5 2.5 0 0 0 5.5 10H21v4h-3.5a2 2 0 1 1 0-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const ACCOUNTS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M4 4h16v4H4V4ZM4 10h16M4 10v10h16V10M8 14h3M8 17h3M13 14h3M13 17h3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const COMMISSIONS_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 3 5 3 5 1.1 5 3-2.2 3-5 3-5-1.1-5-3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const STOCK_PAGES = [
    { key: "stock-levels", title: "Stock Levels" },
    { key: "stock-opening", title: "Opening Stock", type: "opening" },
    { key: "stock-adjustment", title: "Stock Adjustment", type: "adjustment" },
    { key: "stock-damage", title: "Damaged Stock", type: "damage" },
    { key: "stock-transfer", title: "Stock Transfer", type: "transfer" },
];

const PURCHASE_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6ZM3 6h18M16 10a4 4 0 0 1-8 0"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const PURCHASE_PAGES = [
    { key: "purchase-orders", title: "Purchase Orders" },
    { key: "purchases", title: "Purchases" },
    { key: "supplier-payments", title: "Supplier Payments" },
    { key: "purchase-returns", title: "Purchase Returns" },
];

function TenantApp() {
    const [token, setToken] = useState(() => localStorage.getItem("tenant_token"));
    const [page, setPage] = usePageParam("dashboard");
    const [company, setCompany] = useState(null);
    const [prefilledPo, setPrefilledPo] = useState(null);

    useLayoutEffect(() => {
        setAuthToken(token);
    }, [token]);

    useEffect(() => {
        if (!token) return;

        api.get("/company")
            .then((response) => setCompany(response.data))
            .catch(() => {});
    }, [token]);

    async function logout() {
        const confirmed = await confirmAction({
            title: "Log out?",
            message: "You'll need to log in again to access your workspace.",
            confirmLabel: "Log out",
            danger: true,
        });

        if (!confirmed) return;

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
                key: "master",
                title: "Master",
                active: [
                    "customers",
                    "employees",
                    "categories",
                    "brands",
                    "stores",
                    "suppliers",
                    "products",
                    "received-items",
                ].includes(page),
                icon: MASTER_ICON,
                children: [
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
                        key: "categories",
                        title: "Categories",
                        active: page === "categories",
                        onClick: () => setPage("categories"),
                        icon: CATEGORIES_ICON,
                    },
                    {
                        key: "brands",
                        title: "Brands",
                        active: page === "brands",
                        onClick: () => setPage("brands"),
                        icon: BRANDS_ICON,
                    },
                    {
                        key: "stores",
                        title: "Stores",
                        active: page === "stores",
                        onClick: () => setPage("stores"),
                        icon: STORES_ICON,
                    },
                    {
                        key: "suppliers",
                        title: "Suppliers",
                        active: page === "suppliers",
                        onClick: () => setPage("suppliers"),
                        icon: SUPPLIERS_ICON,
                    },
                    {
                        key: "products",
                        title: "Products",
                        active: page === "products",
                        onClick: () => setPage("products"),
                        icon: PRODUCTS_ICON,
                    },
                    {
                        key: "received-items",
                        title: "Received Items",
                        active: page === "received-items",
                        onClick: () => setPage("received-items"),
                        icon: RECEIVED_ITEMS_ICON,
                    },
                ],
            },
            {
                key: "stock",
                title: "Stock",
                active: STOCK_PAGES.some((item) => item.key === page),
                icon: STOCK_ICON,
                children: STOCK_PAGES.map((item) => ({
                    key: item.key,
                    title: item.title,
                    active: page === item.key,
                    onClick: () => setPage(item.key),
                    icon: STOCK_ICON,
                })),
            },
            {
                key: "purchases-group",
                title: "Purchases",
                active: PURCHASE_PAGES.some((item) => item.key === page),
                icon: PURCHASE_ICON,
                children: PURCHASE_PAGES.map((item) => ({
                    key: item.key,
                    title: item.title,
                    active: page === item.key,
                    onClick: () => setPage(item.key),
                    icon: PURCHASE_ICON,
                })),
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
            {
                key: "finance",
                title: "Finance",
                active: ["commissions", "accounts", "subscription"].includes(page),
                icon: FINANCE_ICON,
                children: [
                    {
                        key: "commissions",
                        title: "Commissions",
                        active: page === "commissions",
                        onClick: () => setPage("commissions"),
                        icon: COMMISSIONS_ICON,
                    },
                    {
                        key: "accounts",
                        title: "Accounts",
                        active: page === "accounts",
                        onClick: () => setPage("accounts"),
                        icon: ACCOUNTS_ICON,
                    },
                    {
                        key: "subscription",
                        title: "Subscription",
                        active: page === "subscription",
                        onClick: () => setPage("subscription"),
                        icon: SUBSCRIPTION_ICON,
                    },
                ],
            },
            {
                key: "settings",
                title: "Settings",
                active: page === "settings",
                onClick: () => setPage("settings"),
                icon: SETTINGS_ICON,
            },
        ],
        footerLabel: company?.company,
        onLogout: logout,
        mobilePrimaryKeys: ["dashboard", "services", "start-work", "completed"],
    };

    if (page === "customers") {
        return <Customers shellProps={shellProps} />;
    }

    if (page === "employees") {
        return <Employees shellProps={shellProps} />;
    }

    if (page === "categories") {
        return <Categories shellProps={shellProps} />;
    }

    if (page === "brands") {
        return <Brands shellProps={shellProps} />;
    }

    if (page === "stores") {
        return <Stores shellProps={shellProps} />;
    }

    if (page === "suppliers") {
        return <Suppliers shellProps={shellProps} />;
    }

    if (page === "products") {
        return <Products shellProps={shellProps} />;
    }

    if (page === "received-items") {
        return <ReceivedItems shellProps={shellProps} />;
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

    if (page === "commissions") {
        return <Commissions shellProps={shellProps} />;
    }

    if (page === "stock-levels") {
        return <Stock shellProps={shellProps} />;
    }

    const stockRecordType = STOCK_PAGES.find((item) => item.key === page)?.type;
    if (stockRecordType) {
        return <StockRecords key={stockRecordType} shellProps={shellProps} type={stockRecordType} />;
    }

    if (page === "purchase-orders") {
        return (
            <PurchaseOrders
                shellProps={shellProps}
                onReceiveToPurchase={(po) => {
                    setPrefilledPo(po);
                    setPage("purchases");
                }}
            />
        );
    }

    if (page === "purchases") {
        return (
            <Purchases
                shellProps={shellProps}
                prefilledPo={prefilledPo}
                onClearPrefilledPo={() => setPrefilledPo(null)}
            />
        );
    }

    if (page === "supplier-payments") {
        return <SupplierPayments shellProps={shellProps} />;
    }

    if (page === "purchase-returns") {
        return <PurchaseReturns shellProps={shellProps} />;
    }

    if (page === "accounts") {
        return <Accounts shellProps={shellProps} />;
    }

    if (page === "settings") {
        return <CompanySettings shellProps={shellProps} />;
    }

    if (page === "subscription") {
        return <Subscription shellProps={shellProps} />;
    }

    return <TenantDashboard shellProps={shellProps} company={company} />;
}

export default TenantApp;
