import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../api";

const DEFAULT_PER_PAGE = 15;
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Fetches one page of a Laravel paginate() endpoint, with a debounced search
 * box and extra filter params sent to the server — so "search" and "filter"
 * always match against the full dataset, not just whatever page is loaded.
 */
export function usePaginatedResource(url, extraParams = {}, perPage = DEFAULT_PER_PAGE) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [items, setItems] = useState([]);
    const [meta, setMeta] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [reloadToken, setReloadToken] = useState(0);

    const extraKey = JSON.stringify(extraParams);

    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(id);
    }, [search]);

    // A new search term or filter invalidates whatever page we were on.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [debouncedSearch, extraKey]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            try {
                const response = await api.get(url, {
                    params: {
                        page,
                        per_page: perPage,
                        ...(debouncedSearch ? { search: debouncedSearch } : {}),
                        ...JSON.parse(extraKey),
                    },
                });
                if (cancelled) return;
                const { data, ...rest } = response.data;
                setItems(data);
                setMeta(rest);
                setError("");
            } catch (err) {
                if (cancelled) return;
                setError(getErrorMessage(err, "Unable to load data."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        // Same fetch-on-dependency-change pattern used across the admin/tenant views.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [url, page, perPage, debouncedSearch, extraKey, reloadToken]);

    return {
        items,
        meta,
        loading,
        error,
        search,
        setSearch,
        page,
        setPage,
        reload: () => setReloadToken((t) => t + 1),
    };
}
