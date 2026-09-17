import "./TableSkeleton.css";

// Cycle of realistic widths so the skeleton placeholder looks natural and organic
const WIDTH_CYCLE = ["75%", "55%", "82%", "48%", "68%", "90%", "60%", "40%"];

function TableSkeleton({
    columns = 4,
    rows = 5,
    hasActions = false,
    hasBadges = false,
    mobileSummaryCols,
    className = "",
}) {
    const rowList = Array.from({ length: rows });
    const colCount = typeof columns === "number" ? columns : columns.length;

    // Determine which columns are visible in the collapsed mobile card view
    const isMobileSummary = (colIndex) => {
        if (Array.isArray(mobileSummaryCols)) {
            return mobileSummaryCols.includes(colIndex);
        }
        if (colCount <= 3) return true;
        if (colIndex === 0 || colIndex === 1) return true;
        if (hasBadges && colIndex === colCount - 2) return true;
        if (hasActions && colIndex === colCount - 1 && colCount <= 6) return true;
        if (!hasBadges && !hasActions && colIndex === 2) return true;
        return false;
    };

    return (
        <>
            {rowList.map((_, rowIndex) => (
                <tr
                    key={`skeleton-row-${rowIndex}`}
                    className={`skeleton-row ${className}`.trim()}
                    aria-hidden="true"
                >
                    {Array.from({ length: colCount }).map((__, colIndex) => {
                        const isFirst = colIndex === 0;
                        const isLast = colIndex === colCount - 1;
                        const widthKey = (rowIndex * 3 + colIndex) % WIDTH_CYCLE.length;
                        const width = WIDTH_CYCLE[widthKey];
                        const isSummary = isMobileSummary(colIndex);

                        return (
                            <td
                                key={`skeleton-col-${colIndex}`}
                                className={`skeleton-td ${isSummary ? "mobile-summary" : ""}`.trim()}
                            >
                                {isFirst ? (
                                    <div className="skeleton-cell-stacked">
                                        <div
                                            className="skeleton-bone skeleton-bone--bold"
                                            style={{ width: "70%" }}
                                        />
                                        <div
                                            className="skeleton-bone skeleton-bone--sub"
                                            style={{ width: "45%" }}
                                        />
                                    </div>
                                ) : isLast && hasActions ? (
                                    <div className="skeleton-cell-actions">
                                        <div className="skeleton-bone skeleton-bone--btn" />
                                    </div>
                                ) : hasBadges && colIndex === colCount - 2 ? (
                                    <div className="skeleton-bone skeleton-bone--badge" />
                                ) : (
                                    <div
                                        className="skeleton-bone"
                                        style={{ width }}
                                    />
                                )}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </>
    );
}

export default TableSkeleton;
