import BrandMark from "../BrandMark/BrandMark";
import "./Sidebar.css";

function Sidebar({ adminEmail, onRefresh, onLogout }) {
    const initial = (adminEmail || "A").trim().charAt(0).toUpperCase();

    return (
        <aside className="sidebar">
            <BrandMark size={40} />

            <nav className="sidebar__nav">
                <button className="sidebar__icon is-active" title="Dashboard" type="button">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                            d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <button className="sidebar__icon" title="Refresh companies" type="button" onClick={onRefresh}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                            d="M20 11a8 8 0 1 0-2.34 5.66M20 5v6h-6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <button className="sidebar__icon" title="Registrations" type="button">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                            d="M4 6h16M4 12h16M4 18h10"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                        />
                    </svg>
                </button>
            </nav>

            <div className="sidebar__bottom">
                <button className="sidebar__icon" title="Log out" type="button" onClick={onLogout}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                            d="M15 17l5-5-5-5M20 12H9M12 4H5v16h7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <div className="sidebar__avatar" title={adminEmail}>
                    {initial}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
