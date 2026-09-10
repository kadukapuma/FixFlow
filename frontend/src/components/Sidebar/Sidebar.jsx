import { useState } from "react";
import BrandMark from "../BrandMark/BrandMark";
import "./Sidebar.css";

function readStoredExpanded() {
    try {
        return localStorage.getItem("sidebar_expanded") === "1";
    } catch {
        return false;
    }
}

function Sidebar({ items = [], footerLabel, onLogout }) {
    const [expanded, setExpanded] = useState(readStoredExpanded);
    const initial = (footerLabel || "?").trim().charAt(0).toUpperCase();

    function toggleExpanded() {
        setExpanded((prev) => {
            const next = !prev;
            try {
                localStorage.setItem("sidebar_expanded", next ? "1" : "0");
            } catch {
                // ignore — expand state just won't persist across reloads
            }
            return next;
        });
    }

    return (
        <aside className={`sidebar ${expanded ? "is-expanded" : ""}`}>
            <div className="sidebar__brand">
                <BrandMark size={40} />
                {expanded && <span className="sidebar__brand-name">FixFlow</span>}
            </div>

            <nav className="sidebar__nav">
                {items.map((item) => (
                    <button
                        key={item.key}
                        className={`sidebar__icon ${item.active ? "is-active" : ""}`}
                        title={expanded ? undefined : item.title}
                        type="button"
                        onClick={item.onClick}
                    >
                        {item.icon}
                        {expanded && <span className="sidebar__label">{item.title}</span>}
                    </button>
                ))}
            </nav>

            <div className="sidebar__bottom">
                <button
                    className="sidebar__icon"
                    title={expanded ? undefined : "Expand sidebar"}
                    type="button"
                    onClick={toggleExpanded}
                >
                    <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        style={{ transform: expanded ? "rotate(180deg)" : "none" }}
                    >
                        <path
                            d="M9 6l6 6-6 6"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {expanded && <span className="sidebar__label">Collapse</span>}
                </button>

                <button className="sidebar__icon" title={expanded ? undefined : "Log out"} type="button" onClick={onLogout}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                        <path
                            d="M15 17l5-5-5-5M20 12H9M12 4H5v16h7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {expanded && <span className="sidebar__label">Log out</span>}
                </button>

                <div className="sidebar__profile" title={expanded ? undefined : footerLabel}>
                    <div className="sidebar__avatar">{initial}</div>
                    {expanded && <span className="sidebar__profile-label">{footerLabel}</span>}
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
