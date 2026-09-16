import "./Pagination.css";

function buildPageWindow(current, last) {
    const delta = 1;
    const range = [];

    for (let i = Math.max(1, current - delta); i <= Math.min(last, current + delta); i++) {
        range.push(i);
    }

    if (range[0] > 1) {
        if (range[0] > 2) range.unshift("gap-start");
        range.unshift(1);
    }

    if (range[range.length - 1] < last) {
        if (range[range.length - 1] < last - 1) range.push("gap-end");
        range.push(last);
    }

    return range;
}

function Pagination({ meta, onPageChange }) {
    if (!meta || !meta.last_page || meta.total === 0) return null;

    const { current_page: currentPage, last_page: lastPage, total, from, to } = meta;

    if (lastPage <= 1) {
        return (
            <div className="pagination">
                <span className="pagination__summary">
                    {total} {total === 1 ? "result" : "results"}
                </span>
            </div>
        );
    }

    const pages = buildPageWindow(currentPage, lastPage);

    return (
        <div className="pagination">
            <span className="pagination__summary">
                {from}–{to} of {total}
            </span>

            <div className="pagination__controls">
                <button
                    type="button"
                    className="pagination__btn"
                    disabled={currentPage <= 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    Prev
                </button>

                {pages.map((p) =>
                    typeof p === "number" ? (
                        <button
                            key={p}
                            type="button"
                            className={`pagination__page ${p === currentPage ? "is-active" : ""}`}
                            onClick={() => onPageChange(p)}
                        >
                            {p}
                        </button>
                    ) : (
                        <span key={p} className="pagination__gap">
                            …
                        </span>
                    )
                )}

                <button
                    type="button"
                    className="pagination__btn"
                    disabled={currentPage >= lastPage}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default Pagination;
