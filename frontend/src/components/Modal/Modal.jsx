import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const activeModalStack = [];

function Modal({
    title,
    onClose,
    children,
    maxWidth = 600,
    className = "",
    closeOnBackdrop = false,
}) {
    const [depth, setDepth] = useState(0);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        activeModalStack.push(onCloseRef);
        setDepth(activeModalStack.length - 1);

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                const topRef = activeModalStack[activeModalStack.length - 1];
                if (topRef === onCloseRef) {
                    onCloseRef.current?.();
                }
            }
        }

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            const idx = activeModalStack.lastIndexOf(onCloseRef);
            if (idx !== -1) {
                activeModalStack.splice(idx, 1);
            }
        };
    }, []);

    const zIndex = 100 + depth * 10;

    const modalContent = (
        <div
            className="modal-overlay"
            style={{ zIndex }}
            onClick={closeOnBackdrop ? onClose : undefined}
        >
            <div
                className={`modal-card ${className}`.trim()}
                style={{ maxWidth }}
                onClick={(event) => event.stopPropagation()}
            >
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

    return createPortal(modalContent, document.body);
}

export default Modal;

