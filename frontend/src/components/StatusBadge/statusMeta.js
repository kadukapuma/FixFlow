export const STATUS_META = {
    pending: { label: "Pending", color: "#c8860d", bg: "#fbf0d9" },
    provisioning: { label: "Provisioning", color: "#3159c9", bg: "#e2e9fc" },
    approved: { label: "Approved", color: "#1c8a53", bg: "#dcf3e6" },
    deactivated: { label: "Deactivated", color: "#475569", bg: "#e2e6ec" },
    rejected: { label: "Rejected", color: "#5f6169", bg: "#e7e7e4" },
    failed: { label: "Failed", color: "#c22b3a", bg: "#fadfe1" },
};

// Receipt status uses its own tiny lookup (values overlap with STATUS_META
// but the keys — "pending"/"approved"/"rejected" — mean something different
// here: a receipt's review state, not a company's provisioning state).
export const RECEIPT_STATUS_META = {
    pending: { label: "Pending", color: "#c8860d", bg: "#fbf0d9" },
    approved: { label: "Approved", color: "#1c8a53", bg: "#dcf3e6" },
    rejected: { label: "Rejected", color: "#c22b3a", bg: "#fadfe1" },
};
