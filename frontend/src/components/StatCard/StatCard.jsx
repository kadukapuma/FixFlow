import "./StatCard.css";

function StatCard({ icon, label, value, hint, variant = "dark", size = "md", dots }) {
    return (
        <div className={`stat-card stat-card--${variant} ${size === "sm" ? "stat-card--sm" : ""}`}>
            <div className="stat-card__top">
                <span className="stat-card__icon">{icon}</span>
                <span className="stat-card__label">{label}</span>
            </div>

            <div className="stat-card__value">{value}</div>

            {hint && <div className="stat-card__hint">{hint}</div>}

            {dots && (
                <div className="stat-card__dots">
                    {Array.from({ length: dots.total }).map((_, i) => (
                        <span key={i} className={i < dots.filled ? "is-filled" : ""} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default StatCard;
