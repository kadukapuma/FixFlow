let handler = null;

/**
 * Promise-based replacement for window.confirm(), styled to match the app.
 * ConfirmDialogHost (mounted once in App.jsx) renders the actual dialog.
 */
export function confirmAction({
    title = "Are you sure?",
    message = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
} = {}) {
    return new Promise((resolve) => {
        if (!handler) {
            resolve(window.confirm(message || title));
            return;
        }

        handler({ title, message, confirmLabel, cancelLabel, danger, resolve });
    });
}

export function registerConfirmHandler(fn) {
    handler = fn;
    return () => {
        handler = null;
    };
}
