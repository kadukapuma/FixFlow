import { useCallback, useEffect, useState } from "react";

function readPage(defaultPage) {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") || defaultPage;
}

// Keeps the active "page" in the URL (as a ?page= query param) so a
// refresh or a back/forward navigation lands back on the same view
// instead of always resetting to defaultPage.
export function usePageParam(defaultPage) {
    const [page, setPageState] = useState(() => readPage(defaultPage));

    useEffect(() => {
        function onPopState() {
            setPageState(readPage(defaultPage));
        }

        window.addEventListener("popstate", onPopState);
        return () => window.removeEventListener("popstate", onPopState);
    }, [defaultPage]);

    const setPage = useCallback(
        (next) => {
            setPageState(next);

            const params = new URLSearchParams(window.location.search);
            if (next === defaultPage) {
                params.delete("page");
            } else {
                params.set("page", next);
            }

            const query = params.toString();
            const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
            window.history.pushState({ page: next }, "", url);
        },
        [defaultPage]
    );

    return [page, setPage];
}
