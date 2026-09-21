import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../../api";
import Pagination from "../Pagination/Pagination";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import "./Picker.css";

const PER_PAGE = 6;
// A short fixed list (payment methods, statuses...) reads better in full than
// behind a search box and page buttons.
const STATIC_PAGINATE_ABOVE = 8;
const REMOTE_MIN_WIDTH = 340;
const STATIC_MIN_WIDTH = 240;
const PANEL_GAP = 4;
const PANEL_MARGIN = 8;
const PANEL_HEIGHT_ESTIMATE = 440;

const CHEVRON_ICON = (
    <svg viewBox="0 0 10 6" width="10" height="6" fill="none" aria-hidden="true">
        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const SEARCH_ICON = (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
        <path
            d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

const defaultLabel = (item) => item.name;
const defaultSubtitle = (item) => item.subtitle ?? "";

function computePosition(triggerEl, minWidth) {
    const rect = triggerEl.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, minWidth), window.innerWidth - PANEL_MARGIN * 2);
    const left = Math.max(PANEL_MARGIN, Math.min(rect.left, window.innerWidth - width - PANEL_MARGIN));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < PANEL_HEIGHT_ESTIMATE && rect.top > spaceBelow;

    return openUp
        ? { left, width, bottom: window.innerHeight - rect.top + PANEL_GAP }
        : { left, width, top: rect.bottom + PANEL_GAP };
}

// Client-side twin of usePaginatedResource for a fixed `options` array, so the
// panel renders the same way whichever kind of source it has.
function useStaticSource(options) {
    const [search, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);
    const paged = options.length > STATIC_PAGINATE_ABOVE;

    const term = search.trim().toLowerCase();
    const matches = term
        ? options.filter((option) => `${option.name} ${option.subtitle ?? ""}`.toLowerCase().includes(term))
        : options;
    const perPage = paged ? PER_PAGE : Math.max(matches.length, 1);
    const lastPage = Math.max(1, Math.ceil(matches.length / perPage));
    const currentPage = Math.min(page, lastPage);
    const start = (currentPage - 1) * perPage;
    const items = matches.slice(start, start + perPage);

    return {
        items,
        meta: paged
            ? {
                  current_page: currentPage,
                  last_page: lastPage,
                  total: matches.length,
                  from: matches.length ? start + 1 : 0,
                  to: start + items.length,
              }
            : null,
        loading: false,
        error: "",
        search,
        setSearch: (value) => {
            setSearchTerm(value);
            setPage(1);
        },
        setPage,
        showSearch: paged,
    };
}

function PickerList({
    source,
    value,
    hasValue,
    emptyLabel,
    excludeIds,
    excludedLabel,
    getLabel,
    getSubtitle,
    searchPlaceholder,
    onSelect,
}) {
    const { items, meta, loading, error, search, setSearch, setPage, showSearch } = source;

    return (
        <>
            {showSearch && (
                <div className="picker__search">
                    {SEARCH_ICON}
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        autoFocus
                    />
                </div>
            )}

            <ul className={`picker__list ${loading ? "is-loading" : ""}`} role="listbox">
                {emptyLabel && (
                    <li role="option" aria-selected={!hasValue}>
                        <button
                            type="button"
                            className={`picker__option ${!hasValue ? "is-selected" : ""}`}
                            onClick={() => onSelect(null)}
                        >
                            <span className="picker__option-name">{emptyLabel}</span>
                        </button>
                    </li>
                )}

                {!error &&
                    items.map((item) => {
                        const selected = String(item.id) === String(value);
                        const taken = !selected && excludeIds.has(String(item.id));
                        const subtitle = taken ? excludedLabel : getSubtitle(item);

                        return (
                            <li key={item.id} role="option" aria-selected={selected}>
                                <button
                                    type="button"
                                    className={`picker__option ${selected ? "is-selected" : ""}`}
                                    disabled={taken}
                                    onClick={() => onSelect(item)}
                                >
                                    <span className="picker__option-name">{getLabel(item)}</span>
                                    {subtitle && <span className="picker__option-meta">{subtitle}</span>}
                                </button>
                            </li>
                        );
                    })}
            </ul>

            {error && <p className="picker__message picker__message--error">{error}</p>}
            {!error && loading && items.length === 0 && <p className="picker__message">Loading...</p>}
            {!error && !loading && items.length === 0 && (
                <p className="picker__message">{search.trim() ? "No results match your search." : "Nothing to show."}</p>
            )}

            <Pagination meta={meta} onPageChange={setPage} />
        </>
    );
}

function RemoteList({ endpoint, params, ...rest }) {
    const source = usePaginatedResource(endpoint, params, PER_PAGE);
    return <PickerList source={{ ...source, showSearch: true }} {...rest} />;
}

function StaticList({ options, ...rest }) {
    return <PickerList source={useStaticSource(options)} {...rest} />;
}

function PickerPanel({ position, triggerRef, onClose, endpoint, params, options, ...listProps }) {
    const panelRef = useRef(null);

    useEffect(() => {
        function handlePointerDown(event) {
            if (panelRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
            onClose();
        }

        // The panel is position: fixed, so it would drift away from its trigger
        // if anything behind it scrolls or the viewport changes.
        function handleScroll(event) {
            if (!panelRef.current?.contains(event.target)) onClose();
        }

        // Capture phase, so a surrounding Modal doesn't also close on this Escape.
        function handleKeyDown(event) {
            if (event.key !== "Escape") return;
            event.stopPropagation();
            onClose();
            triggerRef.current?.focus();
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("scroll", handleScroll, true);
        window.addEventListener("resize", onClose);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("scroll", handleScroll, true);
            window.removeEventListener("resize", onClose);
        };
    }, [onClose, triggerRef]);

    return createPortal(
        <div ref={panelRef} className="picker__panel" style={position}>
            {options ? (
                <StaticList options={options} {...listProps} />
            ) : (
                <RemoteList endpoint={endpoint} params={params} {...listProps} />
            )}
        </div>,
        document.body
    );
}

/**
 * Searchable, paginated replacement for a <select>. Give it either an `endpoint`
 * (a Laravel paginate() list that understands ?search=, fetched only once the
 * picker is opened) or a fixed `options` array of `{ id, name, subtitle? }`.
 *
 * `onChange(value, item)` mirrors `e.target.value` for a select: `value` is the
 * chosen id as a string, or "" when the `emptyLabel` row is chosen. `item` is
 * the full record (null when cleared) for callers that need more than the id.
 * `selected` supplies the record for a pre-filled `value`; without it the label
 * is looked up from the endpoint. `excludeIds` disables ids used elsewhere, noting `excludedLabel` on them.
 */
function Picker({
    value,
    onChange,
    endpoint,
    params,
    options,
    selected = null,
    getLabel = defaultLabel,
    getSubtitle = defaultSubtitle,
    excludeIds,
    excludedLabel = "Already added",
    emptyLabel,
    placeholder = "Select...",
    searchPlaceholder = "Search...",
    required = false,
    disabled = false,
    variant = "form",
    className = "",
}) {
    const triggerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState(null);
    const [picked, setPicked] = useState(null);
    const [fetched, setFetched] = useState(null);

    const close = useCallback(() => setOpen(false), []);
    const taken = useMemo(() => new Set([...(excludeIds ?? [])].map(String)), [excludeIds]);
    const hasValue = value !== "" && value !== null && value !== undefined;

    const item =
        [selected, picked, fetched].find((candidate) => candidate && String(candidate.id) === String(value)) ??
        options?.find((option) => String(option.id) === String(value)) ??
        null;

    // A pre-filled value we hold no record for (e.g. editing an existing row)
    // still needs its name shown.
    useEffect(() => {
        if (!endpoint || !hasValue || item) return;

        let cancelled = false;

        api.get(endpoint, { params: { ids: value, per_page: 1 } })
            .then((response) => {
                if (!cancelled) setFetched((response.data.data ?? response.data)[0] ?? null);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [endpoint, value, hasValue, item]);

    const label = item ? getLabel(item) : hasValue ? `#${value}` : (emptyLabel ?? "");

    function toggle() {
        if (open) {
            close();
            return;
        }
        setPosition(computePosition(triggerRef.current, options ? STATIC_MIN_WIDTH : REMOTE_MIN_WIDTH));
        setOpen(true);
    }

    function handleSelect(chosen) {
        if (chosen) setPicked(chosen);
        onChange(chosen ? String(chosen.id) : "", chosen);
        close();
        triggerRef.current?.focus();
    }

    return (
        <div className={`picker picker--${variant} ${className}`.trim()}>
            <button
                ref={triggerRef}
                type="button"
                className="picker__trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
                onClick={toggle}
            >
                <span className={label ? "picker__value" : "picker__placeholder"}>{label || placeholder}</span>
                {CHEVRON_ICON}
            </button>

            {/* A button can't be `required`, so mirror the value into a hidden input
                to keep the browser's native "please fill out this field" check. */}
            {required && (
                <input
                    className="picker__native"
                    tabIndex={-1}
                    aria-hidden="true"
                    required
                    value={hasValue ? String(value) : ""}
                    onChange={() => {}}
                />
            )}

            {open && (
                <PickerPanel
                    position={position}
                    triggerRef={triggerRef}
                    onClose={close}
                    endpoint={endpoint}
                    params={params}
                    options={options}
                    value={value}
                    hasValue={hasValue}
                    emptyLabel={emptyLabel}
                    excludeIds={taken}
                    excludedLabel={excludedLabel}
                    getLabel={getLabel}
                    getSubtitle={getSubtitle}
                    searchPlaceholder={searchPlaceholder}
                    onSelect={handleSelect}
                />
            )}
        </div>
    );
}

export default Picker;
