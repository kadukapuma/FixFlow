import "./App.css";
import { getSubdomain } from "./lib/tenant";
import CentralApp from "./central/CentralApp";
import AdminApp from "./admin/AdminApp";
import TenantApp from "./tenant/TenantApp";

function App() {
    const subdomain = getSubdomain();

    if (subdomain) {
        return <TenantApp />;
    }

    if (window.location.pathname.startsWith("/admin")) {
        return <AdminApp />;
    }

    return <CentralApp />;
}

export default App;
