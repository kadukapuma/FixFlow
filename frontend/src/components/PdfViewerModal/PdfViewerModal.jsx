import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../../api";
import Modal from "../Modal/Modal";
import "./PdfViewerModal.css";

// pdfjs-dist is a large library only needed once a PDF is actually viewed,
// so it's loaded on demand instead of bundled into the main app chunk.
let pdfjsLibPromise = null;
function loadPdfjs() {
    if (!pdfjsLibPromise) {
        pdfjsLibPromise = Promise.all([
            import("pdfjs-dist"),
            import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]).then(([pdfjsLib, workerUrlModule]) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrlModule.default;
            return pdfjsLib;
        });
    }
    return pdfjsLibPromise;
}

function filenameFromTitle(title) {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return `${slug || "document"}.pdf`;
}

// Renders every page of the loaded PDF onto its own <canvas>, sized to fit
// the container's current width — this is what makes it work reliably on
// mobile, where browsers generally can't render a PDF inside an <iframe>.
async function renderPages(pdfDoc, container) {
    // Measured from the parent, not the container itself: the container is
    // styled display:none while empty (see CSS), and we're about to empty it
    // right here, so reading its own clientWidth at this point would be 0.
    const containerWidth = container.parentElement.clientWidth - 16;
    container.innerHTML = "";
    const outputScale = window.devicePixelRatio || 1;

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
        const page = await pdfDoc.getPage(pageNumber);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.className = "pdf-viewer__page";
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        container.appendChild(canvas);

        const context = canvas.getContext("2d");
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        // eslint-disable-next-line no-await-in-loop
        await page.render({ canvasContext: context, viewport, transform }).promise;
    }
}

function PdfViewerModal({ title, pdfUrl, method = "get", data = null, onClose }) {
    const [downloadUrl, setDownloadUrl] = useState(null);
    const [error, setError] = useState("");
    const [rendering, setRendering] = useState(true);
    const pagesRef = useRef(null);
    const pdfDocRef = useRef(null);
    const loadingTaskRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        let blobUrl = null;

        const request =
            method === "post"
                ? api.post(pdfUrl, data, { responseType: "arraybuffer" })
                : api.get(pdfUrl, { responseType: "arraybuffer" });

        Promise.all([request, loadPdfjs()])
            .then(async ([response, pdfjsLib]) => {
                if (cancelled) return;

                blobUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
                setDownloadUrl(blobUrl);

                // destroy() lives on the loading task, not the resolved
                // PDFDocumentProxy — keep a ref to it so cleanup can call it.
                const loadingTask = pdfjsLib.getDocument({ data: response.data.slice(0) });
                loadingTaskRef.current = loadingTask;
                const pdfDoc = await loadingTask.promise;
                if (cancelled) {
                    loadingTask.destroy();
                    return;
                }

                pdfDocRef.current = pdfDoc;
                await renderPages(pdfDoc, pagesRef.current);
                if (!cancelled) setRendering(false);
            })
            .catch((err) => {
                if (!cancelled) {
                    setRendering(false);
                    setError(getErrorMessage(err, "Unable to load the PDF."));
                }
            });

        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            loadingTaskRef.current?.destroy();
        };
        // Fetch/render once on mount — a fresh modal instance is created per preview/view request.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-render at the new width on resize/orientation-change (debounced, and
    // skipped while a render is already in flight to avoid two loops racing
    // over the same container).
    useEffect(() => {
        let debounceTimer = null;
        let renderInFlight = false;
        let rerenderQueued = false;

        async function runRender() {
            if (!pdfDocRef.current || !pagesRef.current) return;

            if (renderInFlight) {
                rerenderQueued = true;
                return;
            }

            renderInFlight = true;
            do {
                rerenderQueued = false;
                // eslint-disable-next-line no-await-in-loop
                await renderPages(pdfDocRef.current, pagesRef.current);
            } while (rerenderQueued);
            renderInFlight = false;
        }

        function handleResize() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(runRender, 200);
        }

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
            clearTimeout(debounceTimer);
        };
    }, []);

    function handleOpen() {
        if (downloadUrl) window.open(downloadUrl, "_blank", "noopener");
    }

    return (
        <Modal title={title} onClose={onClose} maxWidth={820}>
            <div className="pdf-viewer">
                {error && (
                    <p className="tenant-alert" role="alert">
                        {error}
                    </p>
                )}

                {!error && rendering && <p className="pdf-viewer__loading">Loading PDF...</p>}

                <div ref={pagesRef} className="pdf-viewer__pages" hidden={!!error} />

                {!error && !rendering && (
                    <div className="pdf-viewer__actions">
                        <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                            Close
                        </button>
                        <button type="button" className="tenant-btn tenant-btn--ghost" onClick={handleOpen}>
                            Print
                        </button>
                        <a
                            className="tenant-btn tenant-btn--primary"
                            href={downloadUrl}
                            download={filenameFromTitle(title)}
                        >
                            Download
                        </a>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default PdfViewerModal;
