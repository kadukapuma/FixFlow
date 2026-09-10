import { useEffect } from "react";
import "./Modal.css";

function Modal({ title, onClose, children, maxWidth = 600 }) {
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === "Escape") onClose();
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth }} onClick={(event) => event.stopPropagation()}>
                <div className="modal-card__head">
                    <h2>{title}</h2>
                    <button className="modal-card__close" type="button" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <div className="modal-card__body">{children}</div>
            </div>
        </div>
    );
}

export default Modal;
