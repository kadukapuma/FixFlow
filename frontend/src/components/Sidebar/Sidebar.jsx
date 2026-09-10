import BrandMark from "../BrandMark/BrandMark";
import "./Sidebar.css";

function Sidebar({ items = [], footerLabel, onLogout }) {
    const initial = (footerLabel || "?").trim().charAt(0).toUpperCase();

    return (
        <aside className="sidebar">
            <BrandMark size={40} />

            <nav className="sidebar__nav">
                {items.map((item) => (
                    <button
                        key={item.key}
                        className={`sidebar__icon ${item.active ? "is-active" : ""}`}
                        title={item.title}
                        type="button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                    </button>
                ))}
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

                <div className="sidebar__avatar" title={footerLabel}>
                    {initial}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
