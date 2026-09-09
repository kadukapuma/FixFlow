import { STATUS_META } from "./statusMeta";
import "./StatusBadge.css";

function StatusBadge({ status }) {
    const meta = STATUS_META[status] ?? { label: status, color: "#5f6169", bg: "#e7e7e4" };

    return (
        <span className="status-badge" style={{ color: meta.color, background: meta.bg }}>
            <i style={{ background: meta.color }} />
            {meta.label}
        </span>
    );
}

export default StatusBadge;
