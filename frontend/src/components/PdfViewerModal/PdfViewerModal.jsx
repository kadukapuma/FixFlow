import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../../api";
import Modal from "../Modal/Modal";
import "./PdfViewerModal.css";

function PdfViewerModal({ title, pdfUrl, method = "get", data = null, onClose }) {
    const [objectUrl, setObjectUrl] = useState(null);
    const [error, setError] = useState("");
    const iframeRef = useRef(null);

    useEffect(() => {
        let currentUrl = null;
        let cancelled = false;

        const request =
            method === "post"
                ? api.post(pdfUrl, data, { responseType: "blob" })
                : api.get(pdfUrl, { responseType: "blob" });

        request
            .then((response) => {
                if (cancelled) return;
                currentUrl = URL.createObjectURL(response.data);
                setObjectUrl(currentUrl);
            })
            .catch((err) => {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load the PDF."));
            });

        return () => {
            cancelled = true;
            if (currentUrl) URL.revokeObjectURL(currentUrl);
        };
        // Fetch once on mount — a fresh modal instance is created per preview/view request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handlePrint() {
        iframeRef.current?.contentWindow?.print();
    }

    return (
        <Modal title={title} onClose={onClose} maxWidth={820}>
            <div className="pdf-viewer">
                {error && (
                    <p className="tenant-alert" role="alert">
                        {error}
                    </p>
                )}

                {!error && !objectUrl && <p className="pdf-viewer__loading">Loading PDF...</p>}

                {objectUrl && (
                    <>
                        <iframe ref={iframeRef} src={objectUrl} title={title} className="pdf-viewer__frame" />
                        <div className="pdf-viewer__actions">
                            <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                                Close
                            </button>
                            <button type="button" className="tenant-btn tenant-btn--primary" onClick={handlePrint}>
                                Print
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}

export default PdfViewerModal;
