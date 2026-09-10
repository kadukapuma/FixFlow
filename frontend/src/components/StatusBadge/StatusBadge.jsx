import { STATUS_META } from "./statusMeta";
import "./StatusBadge.css";

function StatusBadge({ status, meta = STATUS_META }) {
    const entry = meta[status] ?? { label: status, color: "#5f6169", bg: "#e7e7e4" };

    return (
        <span className="status-badge" style={{ color: entry.color, background: entry.bg }}>
            <i style={{ background: entry.color }} />
            {entry.label}
        </span>
    );
}

export default StatusBadge;
