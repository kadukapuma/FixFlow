import { useEffect, useState } from "react";
import { registerConfirmHandler } from "../../lib/confirm";
import Modal from "../Modal/Modal";
import "./ConfirmDialogHost.css";

function ConfirmDialogHost() {
    const [request, setRequest] = useState(null);

    useEffect(() => {
        return registerConfirmHandler((req) => setRequest(req));
    }, []);

    if (!request) {
        return null;
    }

    function respond(result) {
        request.resolve(result);
        setRequest(null);
    }

    return (
        <Modal title={request.title} onClose={() => respond(false)} maxWidth={420}>
            {request.message && <p className="confirm-dialog__message">{request.message}</p>}

            <div className="tenant-form__actions">
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={() => respond(false)}>
                    {request.cancelLabel}
                </button>
                <button
                    type="button"
                    className={`tenant-btn ${request.danger ? "tenant-btn--danger" : "tenant-btn--primary"}`}
                    onClick={() => respond(true)}
                >
                    {request.confirmLabel}
                </button>
            </div>
        </Modal>
    );
}

export default ConfirmDialogHost;
