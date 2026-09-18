import { useEffect, useLayoutEffect, useRef, useState } from "react";
import BrandMark from "../BrandMark/BrandMark";
import "./Sidebar.css";

const MOBILE_BREAKPOINT = 640;

// Every page view mounts its own <Sidebar>, so navigating between tabs
// unmounts the old one and mounts a fresh instance — which would otherwise
// reset the nav list's scroll position back to the start on every click.
// Stashing it in module scope (survives across those remounts, resets on a
// full page reload) lets the new instance restore exactly where the last
// one left off.
let savedNavScroll = { top: 0, left: 0 };

function readStoredExpanded() {
    try {
        return localStorage.getItem("sidebar_expanded") === "1";
    } catch {
        return false;
    }
}

function useIsMobile(breakpoint) {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.innerWidth <= breakpoint
    );

    useEffect(() => {
        const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, [breakpoint]);

    return isMobile;
}

const MORE_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const CHEVRON_ICON = (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

// A group item (has `children`) is a nav folder, not a page of its own —
// the compact bottom-nav has no room for a nested submenu, so it's flattened
// down to its children there, same as every other leaf item.
function flattenItems(items) {
    return items.flatMap((item) => (item.children ? item.children : [item]));
}

/**
 * `mobilePrimaryKeys`, when given, switches the sidebar to a compact bottom
 * tab bar on phones: only those keys' items get a permanent slot, the rest
 * move behind the "more" toggle, and the avatar itself becomes the log-out
 * control (no separate button). Desktop is untouched either way, and
 * omitting the prop (e.g. the admin sidebar) keeps today's icon-row behavior
 * on mobile too.
 */
function Sidebar({ items = [], footerLabel, onLogout, mobilePrimaryKeys }) {
    const [expanded, setExpanded] = useState(readStoredExpanded);
    const [moreOpen, setMoreOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState({});
    const isMobile = useIsMobile(MOBILE_BREAKPOINT);
    const initial = (footerLabel || "?").trim().charAt(0).toUpperCase();
    const compact = isMobile && Array.isArray(mobilePrimaryKeys) && mobilePrimaryKeys.length > 0;
    const navRef = useRef(null);

    useLayoutEffect(() => {
        const el = navRef.current;
        if (!el) return;
        el.scrollTop = savedNavScroll.top;
        el.scrollLeft = savedNavScroll.left;
    }, []);

    function handleNavScroll() {
        const el = navRef.current;
        if (!el) return;
        savedNavScroll = { top: el.scrollTop, left: el.scrollLeft };
    }

    function isGroupOpen(item) {
        if (item.key in openGroups) return openGroups[item.key];
        return Boolean(item.active);
    }

    function toggleGroup(item) {
        if (!expanded) toggleExpanded();
        setOpenGroups((prev) => ({ ...prev, [item.key]: !isGroupOpen(item) }));
    }

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

    if (compact) {
        const flatItems = flattenItems(items);
        const primaryItems = mobilePrimaryKeys
            .map((key) => flatItems.find((item) => item.key === key))
            .filter(Boolean);
        const secondaryItems = flatItems.filter((item) => !mobilePrimaryKeys.includes(item.key));

        function selectItem(item) {
            setMoreOpen(false);
            item.onClick?.();
        }

        return (
            <aside className="sidebar sidebar--bottom-nav">
                {moreOpen && secondaryItems.length > 0 && (
                    <>
                        <button
                            type="button"
                            className="sidebar__more-backdrop"
                            aria-label="Close menu"
                            onClick={() => setMoreOpen(false)}
                        />
                        <div className="sidebar__more-sheet">
                            <button
                                type="button"
                                className="sidebar__more-profile"
                                onClick={() => {
                                    setMoreOpen(false);
                                    onLogout();
                                }}
                            >
                                <span className="sidebar__avatar">{initial}</span>
                                <span className="sidebar__more-profile-label">{footerLabel}</span>
                                <span className="sidebar__more-profile-logout">Log out</span>
                            </button>

                            {secondaryItems.map((item) => (
                                <button
                                    key={item.key}
                                    type="button"
                                    className={`sidebar__more-item ${item.active ? "is-active" : ""}`}
                                    onClick={() => selectItem(item)}
                                >
                                    {item.icon}
                                    <span>{item.title}</span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                <nav className="sidebar__nav">
                    {primaryItems.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            className={`sidebar__tab ${item.active ? "is-active" : ""}`}
                            onClick={() => selectItem(item)}
                        >
                            {item.icon}
                            <span className="sidebar__tab-label">{item.title}</span>
                        </button>
                    ))}

                    {secondaryItems.length > 0 && (
                        <button
                            type="button"
                            className={`sidebar__tab sidebar__more-toggle ${moreOpen ? "is-open" : ""}`}
                            onClick={() => setMoreOpen((prev) => !prev)}
                        >
                            {MORE_ICON}
                            <span className="sidebar__tab-label">More</span>
                        </button>
                    )}
                </nav>
            </aside>
        );
    }

    return (
        <aside className={`sidebar ${expanded ? "is-expanded" : ""}`}>
            <div className="sidebar__brand">
                <BrandMark size={40} />
                {expanded && <span className="sidebar__brand-name">FixFlow</span>}
            </div>

            <nav className="sidebar__nav" ref={navRef} onScroll={handleNavScroll}>
                {items.map((item) =>
                    item.children ? (
                        <div key={item.key} className="sidebar__group">
                            <button
                                className={`sidebar__icon ${item.active ? "is-active" : ""}`}
                                title={expanded ? undefined : item.title}
                                type="button"
                                onClick={() => toggleGroup(item)}
                            >
                                {item.icon}
                                {expanded && <span className="sidebar__label">{item.title}</span>}
                                {expanded && (
                                    <span className={`sidebar__group-chevron ${isGroupOpen(item) ? "is-open" : ""}`}>
                                        {CHEVRON_ICON}
                                    </span>
                                )}
                            </button>

                            {expanded && isGroupOpen(item) && (
                                <div className="sidebar__group-children">
                                    {item.children.map((child) => (
                                        <button
                                            key={child.key}
                                            className={`sidebar__icon sidebar__icon--child ${child.active ? "is-active" : ""}`}
                                            type="button"
                                            onClick={child.onClick}
                                        >
                                            {child.icon}
                                            <span className="sidebar__label">{child.title}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
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
                    )
                )}
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

                <div className="sidebar__bottom-row">
                    <div className="sidebar__profile" title={expanded ? undefined : footerLabel}>
                        <div className="sidebar__avatar">{initial}</div>
                        {expanded && <span className="sidebar__profile-label">{footerLabel}</span>}
                    </div>

                    <button
                        className="sidebar__icon sidebar__logout-btn"
                        title="Log out"
                        type="button"
                        onClick={onLogout}
                    >
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
                </div>
            </div>
        </aside>
    );
}

export default Sidebar;
