import "./DeterminateBarsLoader.css";

const STAGES = [
    {
        key: "generating",
        name: "Compiling Document",
        subtitle: "Server template & data",
        start: 0,
        end: 45,
    },
    {
        key: "parsing",
        name: "Transfer & Parsing",
        subtitle: "Data stream & PDF engine",
        start: 45,
        end: 70,
    },
    {
        key: "rendering",
        name: "Page Rendering",
        subtitle: "Vector canvas rendering",
        start: 70,
        end: 100,
    },
];

function getStageProgress(overallProgress, start, end) {
    if (overallProgress <= start) return 0;
    if (overallProgress >= end) return 100;
    return Math.min(100, Math.max(0, Math.round(((overallProgress - start) / (end - start)) * 100)));
}

function DeterminateBarsLoader({
    progress = 0,
    statusMessage = "Generating PDF...",
    title = "Document PDF",
    className = "",
}) {
    const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));
    const isComplete = clampedProgress >= 100;

    return (
        <div
            className={`determinate-bars-loader ${isComplete ? "determinate-bars-loader--complete" : ""} ${className}`.trim()}
            role="progressbar"
            aria-valuenow={clampedProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`PDF generation progress: ${clampedProgress}%`}
        >
            {/* Header Row */}
            <div className="dbl-header-row">
                <div className="dbl-header-left">
                    <div className="dbl-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
                            <path
                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="dbl-titles">
                        <span className="dbl-tagline">Generating Document</span>
                        <h3 className="dbl-doc-title">{title}</h3>
                    </div>
                </div>

                <div className="dbl-master-badge" aria-hidden="true">
                    {isComplete ? (
                        <span className="dbl-master-ready">
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
                                <path
                                    d="M3.5 8.5l3 3 6-7"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            Ready
                        </span>
                    ) : (
                        <div className="dbl-master-pill">
                            <span className="dbl-master-val">{clampedProgress}</span>
                            <span className="dbl-master-unit">%</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Master Determinate Progress Bar */}
            <div className="dbl-bar-track">
                <div
                    className="dbl-bar-fill"
                    style={{ width: `${clampedProgress}%` }}
                >
                    <div className="dbl-bar-shimmer" />
                </div>
            </div>

            {/* 3 Stage Cards: Strict Alignment */}
            <div className="dbl-grid-stages">
                {STAGES.map((stage, index) => {
                    const stagePct = getStageProgress(clampedProgress, stage.start, stage.end);
                    const stageDone = stagePct >= 100;
                    const stageActive = stagePct > 0 && !stageDone;

                    return (
                        <div
                            key={stage.key}
                            className={`dbl-card-step ${
                                stageDone
                                    ? "dbl-card-step--done"
                                    : stageActive
                                    ? "dbl-card-step--active"
                                    : "dbl-card-step--pending"
                            }`}
                        >
                            <div className="dbl-step-top">
                                <span
                                    className={`dbl-step-badge ${
                                        stageDone
                                            ? "dbl-step-badge--done"
                                            : stageActive
                                            ? "dbl-step-badge--active"
                                            : "dbl-step-badge--pending"
                                    }`}
                                >
                                    {stageDone ? (
                                        <svg viewBox="0 0 14 14" width="12" height="12" fill="none">
                                            <path
                                                d="M2.8 7.2l3 3 5.4-6.4"
                                                stroke="currentColor"
                                                strokeWidth="2.2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    ) : stageActive ? (
                                        <span className="dbl-step-dot" />
                                    ) : (
                                        index + 1
                                    )}
                                </span>

                                <div className="dbl-step-pct">
                                    <span className="dbl-step-pct-num">{stagePct}</span>
                                    <span className="dbl-step-pct-sym">%</span>
                                </div>
                            </div>

                            <div className="dbl-step-bottom">
                                <span className="dbl-step-name">{stage.name}</span>
                                <span className="dbl-step-sub">{stage.subtitle}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Bar */}
            <div className="dbl-footer-bar">
                <span className="dbl-footer-signal" aria-hidden="true" />
                <p className="dbl-footer-text">{statusMessage}</p>
            </div>
        </div>
    );
}

export default DeterminateBarsLoader;
