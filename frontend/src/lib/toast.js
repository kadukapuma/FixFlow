let listeners = [];
let idCounter = 0;

/**
 * Fire-and-forget toast. Call from anywhere — no provider/context needed,
 * ToastContainer (mounted once in App.jsx) picks it up via subscription.
 */
export function showToast(message, type = "success") {
    const toast = { id: ++idCounter, message, type };
    listeners.forEach((listener) => listener(toast));
    return toast.id;
}

export function subscribeToast(listener) {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter((l) => l !== listener);
    };
}
