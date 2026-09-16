import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { RECEIPT_STATUS_META } from "../../components/StatusBadge/statusMeta";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import Modal from "../../components/Modal/Modal";
import FileUploadField from "../../components/FileUploadField/FileUploadField";
import { showToast } from "../../lib/toast";
import "./Subscription.css";

function formatDate(value) {
    if (!value) return "—";
    return new Date(value.replace(" ", "T")).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function Subscription({ shellProps }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [file, setFile] = useState(null);
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [viewingReceipt, setViewingReceipt] = useState(null);
    const [imageObjectUrl, setImageObjectUrl] = useState(null);
    const fileInputRef = useRef(null);
    const imageObjectUrlRef = useRef(null);

    useEffect(() => {
        load();
        return () => {
            if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
        };
    }, []);

    async function load() {
        try {
            const response = await api.get("/company/subscription");
            setData(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load subscription details."));
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        if (!file) return;

        setSubmitting(true);
        setError("");

        const payload = new FormData();
        payload.append("file", file);
        if (amount) payload.append("amount", amount);
        if (note) payload.append("note", note);

        try {
            await api.post("/company/subscription/receipts", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            showToast("Receipt uploaded. An admin will review it shortly.");
            setFile(null);
            setAmount("");
            setNote("");
            if (fileInputRef.current) fileInputRef.current.value = "";
            await load();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to upload receipt.");
            setError(message);
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    }

    async function openReceipt(receipt) {
        if (receipt.is_pdf) {
            setViewingReceipt(receipt);
            return;
        }

        try {
            const response = await api.get(`/company/subscription/receipts/${receipt.id}`, {
                responseType: "blob",
            });

            if (imageObjectUrlRef.current) URL.revokeObjectURL(imageObjectUrlRef.current);
            const url = URL.createObjectURL(response.data);
            imageObjectUrlRef.current = url;
            setImageObjectUrl(url);
            setViewingReceipt(receipt);
        } catch (err) {
            showToast(getErrorMessage(err, "Unable to load receipt."), "error");
        }
    }

    function closeViewer() {
        setViewingReceipt(null);
        if (imageObjectUrlRef.current) {
            URL.revokeObjectURL(imageObjectUrlRef.current);
            imageObjectUrlRef.current = null;
        }
        setImageObjectUrl(null);
    }

    const status = data?.status;

    return (
        <TenantShell {...shellProps} title="Subscription" subtitle="Manage your monthly plan and payment receipts." error={error}>
            {loading ? (
                <p className="subscription__loading">Loading...</p>
            ) : (
                <>
                    {status === "grace" && (
                        <p className="subscription-banner subscription-banner--warning" role="alert">
                            Your subscription payment is due. Upload a receipt before{" "}
                            <strong>{formatDate(data.grace_ends_at)}</strong> to avoid losing access.
                        </p>
                    )}

                    {status === "expired" && (
                        <p className="subscription-banner subscription-banner--danger" role="alert">
                            Your subscription has expired. Upload a receipt so an admin can reactivate your account.
                        </p>
                    )}

                    <section className="tenant-card detail-grid">
                        <div>
                            <span className="detail-grid__label">Monthly price</span>
                            <strong>{data.subscription_price ? `${data.subscription_price}` : "Not set"}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Active until</span>
                            <strong>{formatDate(data.active_until)}</strong>
                        </div>
                        <div>
                            <span className="detail-grid__label">Grace period ends</span>
                            <strong>{formatDate(data.grace_ends_at)}</strong>
                        </div>
                    </section>

                    <section className="tenant-card">
                        <div className="tenant-card__head">
                            <h2>Upload payment receipt</h2>
                        </div>

                        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
                            <div className="subscription__file-field">
                                <span className="subscription__file-label">Receipt file (image or PDF)</span>
                                <FileUploadField
                                    id="subscription-receipt-upload"
                                    ref={fileInputRef}
                                    accept="image/*,application/pdf"
                                    onChange={setFile}
                                    fileName={file?.name}
                                    hint="Click to upload or drag an image/PDF"
                                    required
                                />
                            </div>

                            <label>
                                Amount paid (optional)
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </label>

                            <label className="subscription__full">
                                Note (optional)
                                <input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Transaction reference, bank, etc."
                                />
                            </label>

                            <div className="tenant-form__actions">
                                <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting || !file}>
                                    {submitting ? "Uploading..." : "Upload receipt"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="tenant-card">
                        <div className="tenant-card__head">
                            <h2>Receipt history</h2>
                        </div>

                        <div className="tenant-table-scroll">
                            <table>
                                <thead>
                                    <tr>
                                        <th align="left">Uploaded</th>
                                        <th align="left">Amount</th>
                                        <th align="left">Note</th>
                                        <th align="left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.receipts.map((receipt) => (
                                        <tr
                                            key={receipt.id}
                                            className={receipt.has_file ? "clickable-row" : ""}
                                            onClick={receipt.has_file ? () => openReceipt(receipt) : undefined}
                                        >
                                            <td data-label="Uploaded">{formatDate(receipt.created_at)}</td>
                                            <td data-label="Amount">{receipt.amount ?? "—"}</td>
                                            <td data-label="Note">{receipt.note ?? "—"}</td>
                                            <td data-label="Status">
                                                <StatusBadge status={receipt.status} meta={RECEIPT_STATUS_META} />
                                                {!receipt.has_file && <p className="subscription-receipt-error">File removed by admin</p>}
                                                {receipt.status === "rejected" && receipt.rejection_reason && (
                                                    <p className="subscription-receipt-error">{receipt.rejection_reason}</p>
                                                )}
                                            </td>
                                        </tr>
                                    ))}

                                    {data.receipts.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="tenant-table-empty">
                                                No receipts uploaded yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}

            {viewingReceipt?.is_pdf && (
                <PdfViewerModal
                    title="Payment receipt"
                    pdfUrl={`/company/subscription/receipts/${viewingReceipt.id}`}
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
        </TenantShell>
    );
}

export default Subscription;
