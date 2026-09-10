export const SERVICE_STATUS_META = {
    pending: { label: "Pending", color: "#c8860d", bg: "#fbf0d9" },
    in_progress: { label: "In Progress", color: "#3159c9", bg: "#e2e9fc" },
    completed: { label: "Completed", color: "#1c8a53", bg: "#dcf3e6" },
    delivered: { label: "Delivered", color: "#6b21a8", bg: "#f1e4fb" },
};

export const SERVICE_STATUS_OPTIONS = Object.entries(SERVICE_STATUS_META).map(([value, meta]) => ({
    value,
    label: meta.label,
}));
