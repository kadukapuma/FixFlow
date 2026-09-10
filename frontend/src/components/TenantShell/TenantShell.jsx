import Sidebar from "../Sidebar/Sidebar";
import "./TenantShell.css";

function TenantShell({ sidebarItems, footerLabel, onLogout, title, subtitle, actions, error, children }) {
    return (
        <div className="tenant-shell">
            <Sidebar items={sidebarItems} footerLabel={footerLabel} onLogout={onLogout} />

            <div className="tenant-shell__main">
                <header className="tenant-header">
                    <div>
                        <h1>{title}</h1>
                        {subtitle && <p>{subtitle}</p>}
                    </div>

                    {actions && <div className="tenant-header__actions">{actions}</div>}
                </header>

                {error && (
                    <p className="tenant-alert" role="alert">
                        {error}
                    </p>
                )}

                {children}
            </div>
        </div>
    );
}

export default TenantShell;
