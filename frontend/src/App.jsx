import "./App.css";
import { getSubdomain } from "./lib/tenant";
import CentralApp from "./central/CentralApp";
import AdminApp from "./admin/AdminApp";
import TenantApp from "./tenant/TenantApp";
import ToastContainer from "./components/ToastContainer/ToastContainer";
import ConfirmDialogHost from "./components/ConfirmDialogHost/ConfirmDialogHost";

function App() {
    const subdomain = getSubdomain();

    return (
        <>
            {renderApp(subdomain)}
            <ToastContainer />
            <ConfirmDialogHost />
        </>
    );
}

function renderApp(subdomain) {
    if (subdomain) {
        return <TenantApp />;
    }

    if (window.location.pathname.startsWith("/admin")) {
        return <AdminApp />;
    }

    return <CentralApp />;
}

export default App;
