import { useEffect, useState } from "react";
import { subscribeToast } from "../../lib/toast";
import "./ToastContainer.css";

const AUTO_DISMISS_MS = 4000;

function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        return subscribeToast((toast) => {
            setToasts((prev) => [...prev, toast]);

            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, AUTO_DISMISS_MS);
        });
    }, []);

    function dismiss(id) {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="toast-stack">
            {toasts.map((toast) => (
                <div key={toast.id} className={`toast toast--${toast.type}`}>
                    <span>{toast.message}</span>
                    <button type="button" className="toast__close" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
                            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}

export default ToastContainer;
