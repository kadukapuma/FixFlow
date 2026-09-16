import { useMemo, useState } from "react";
import api, { getErrorMessage, setAuthToken } from "../../api";
import Sidebar from "../../components/Sidebar/Sidebar";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { RECEIPT_STATUS_META } from "../../components/StatusBadge/statusMeta";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import Modal from "../../components/Modal/Modal";
import Pagination from "../../components/Pagination/Pagination";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import { usePaginatedResource } from "../../lib/usePaginatedResource";
import "../AdminDashboard/AdminDashboard.css";

const FILTERS = ["pending", "approved", "rejected", "all"];

function formatDate(value) {
    if (!value) return "—";
    return new Date(value.replace(" ", "T")).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function AdminReceipts({ page, onNavigate, onLoggedOut }) {
    const [filter, setFilter] = useState("pending");
    const {
        items: receipts,
        meta,
        error: loadError,
        setPage,
        reload,
    } = usePaginatedResource("/admin/receipts", filter === "all" ? {} : { status: filter });
    const [error, setError] = useState("");
    const [busyId, setBusyId] = useState(null);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [imageObjectUrl, setImageObjectUrl] = useState(null);

    async function approve(receipt) {
        const confirmed = await confirmAction({
            title: "Approve receipt?",
            message: `Approve this receipt from ${receipt.company?.name}? Their subscription will be extended by 30 days.`,
            confirmLabel: "Approve",
        });

        if (!confirmed) return;

        setBusyId(receipt.id);
        setError("");

        try {
            await api.post(`/admin/receipts/${receipt.id}/approve`);
            showToast("Receipt approved. Subscription renewed.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Approval failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function reject(receipt) {
        const reason = window.prompt("Reason for rejection (optional):") || undefined;

        setBusyId(receipt.id);
        setError("");

        try {
            await api.post(`/admin/receipts/${receipt.id}/reject`, { reason });
            showToast("Receipt rejected.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Rejection failed.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function deleteFile(receipt) {
        const confirmed = await confirmAction({
            title: "Delete receipt file?",
            message: `Delete the uploaded file for this receipt from ${receipt.company?.name}? This frees up server storage but keeps the receipt's record. This can't be undone.`,
            confirmLabel: "Delete file",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(receipt.id);
        setError("");

        try {
            await api.delete(`/admin/receipts/${receipt.id}/file`);
            showToast("Receipt file deleted.");
            reload();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete receipt file.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function openReceipt(receipt) {
        if (receipt.is_pdf) {
            setViewingReceipt(receipt);
            return;
        }

        try {
            const response = await api.get(`/admin/receipts/${receipt.id}/file`, { responseType: "blob" });
            setImageObjectUrl(URL.createObjectURL(response.data));
            setViewingReceipt(receipt);
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to load receipt."), "error");
        }
    }

    function closeViewer() {
        setViewingReceipt(null);
        if (imageObjectUrl) URL.revokeObjectURL(imageObjectUrl);
        setImageObjectUrl(null);
    }

    async function logout() {
        const confirmed = await confirmAction({
            title: "Log out?",
            message: "You'll need to log in again to access the admin dashboard.",
            confirmLabel: "Log out",
            danger: true,
        });

        if (!confirmed) return;

        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_info");
        setAuthToken(null);
        onLoggedOut();
    }

    const sidebarItems = [
        {
            key: "dashboard",
            title: "Dashboard",
            active: page === "dashboard",
            onClick: () => onNavigate?.("dashboard"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M3 11.5 12 4l9 7.5M5.5 10v9h13v-9"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            key: "receipts",
            title: "Receipts",
            active: page === "receipts",
            onClick: () => onNavigate?.("receipts"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M6 3h12v18l-3-2-3 2-3-2-3 2V3ZM8 8h8M8 12h8M8 16h5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            key: "danger-zone",
            title: "Danger Zone",
            active: page === "danger-zone",
            onClick: () => onNavigate?.("danger-zone"),
            icon: (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path
                        d="M12 3 2 20h20L12 3ZM12 9v5M12 17.5h.01"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
    ];

    const adminEmail = useMemo(() => {
        try {
            const info = JSON.parse(localStorage.getItem("admin_info"));
            return info?.email || info?.name || "admin";
        } catch {
            return "admin";
        }
    }, []);

    return (
        <div className="admin-dashboard">
            <Sidebar items={sidebarItems} footerLabel={adminEmail} onLogout={logout} />

            <div className="admin-dashboard__main">
                <header className="admin-header">
                    <div>
                        <h1>Subscription Receipts</h1>
                        <p>Review payment receipts uploaded by companies.</p>
                    </div>
                </header>

                {(error || loadError) && (
                    <p className="admin-alert" role="alert">
                        {error || loadError}
                    </p>
                )}

                <div className="admin-tabs">
                    {FILTERS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            className={`admin-tabs__item ${filter === key ? "is-active" : ""}`}
                            onClick={() => setFilter(key)}
                        >
                            {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
                        </button>
                    ))}
                </div>

                <section className="admin-table-card">
                    <div className="admin-table-card__scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th align="left">Company</th>
                                    <th align="left">Amount</th>
                                    <th align="left">Note</th>
                                    <th align="left">Uploaded</th>
                                    <th align="left">Status</th>
                                    <th align="left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {receipts.map((receipt) => (
                                    <tr key={receipt.id}>
                                        <td data-label="Company">
                                            <div className="admin-company-cell">
                                                <strong>{receipt.company?.name}</strong>
                                                <span>{receipt.company?.subdomain}</span>
                                            </div>
                                        </td>
                                        <td data-label="Amount">{receipt.amount ?? "—"}</td>
                                        <td data-label="Note">{receipt.note ?? "—"}</td>
                                        <td data-label="Uploaded">{formatDate(receipt.created_at)}</td>
                                        <td data-label="Status">
                                            <StatusBadge status={receipt.status} meta={RECEIPT_STATUS_META} />
                                            {receipt.status === "rejected" && receipt.rejection_reason && (
                                                <p className="admin-table-card__error">{receipt.rejection_reason}</p>
                                            )}
                                        </td>
                                        <td data-label="Actions">
                                            <div className="admin-table-card__actions">
                                                {receipt.has_file ? (
                                                    <button
                                                        className="admin-btn admin-btn--ghost admin-btn--sm"
                                                        type="button"
                                                        onClick={() => openReceipt(receipt)}
                                                    >
                                                        View
                                                    </button>
                                                ) : (
                                                    <span className="admin-receipts__no-file">File deleted</span>
                                                )}

                                                {receipt.status === "pending" && (
                                                    <>
                                                        <button
                                                            className="admin-btn admin-btn--primary admin-btn--sm"
                                                            disabled={busyId === receipt.id}
                                                            onClick={() => approve(receipt)}
                                                            type="button"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            className="admin-btn admin-btn--ghost admin-btn--sm"
                                                            disabled={busyId === receipt.id}
                                                            onClick={() => reject(receipt)}
                                                            type="button"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}

                                                {receipt.status !== "pending" && receipt.has_file && (
                                                    <button
                                                        className="admin-btn admin-btn--ghost admin-btn--sm"
                                                        disabled={busyId === receipt.id}
                                                        onClick={() => deleteFile(receipt)}
                                                        type="button"
                                                    >
                                                        Delete file
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {receipts.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="admin-table-card__empty">
                                            No receipts match this view.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <Pagination meta={meta} onPageChange={setPage} />
                </section>
            </div>

            {viewingReceipt?.is_pdf && (
                <PdfViewerModal
                    title="Payment receipt"
                    pdfUrl={`/admin/receipts/${viewingReceipt.id}/file`}
                    onClose={closeViewer}
                />
            )}

            {viewingReceipt && !viewingReceipt.is_pdf && imageObjectUrl && (
                <Modal title="Payment receipt" onClose={closeViewer} maxWidth={640}>
                    <div className="subscription-image-modal">
                        <img src={imageObjectUrl} alt="Payment receipt" />
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default AdminReceipts;
