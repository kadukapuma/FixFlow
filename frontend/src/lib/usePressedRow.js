import { useCallback, useState } from "react";

/**
 * Tracks which row is currently being touched/clicked so it can get a
 * highlight class. Driven by Pointer Events (not CSS :active) because
 * mobile Safari only honors :active on elements with a listener bound
 * directly to them — React's delegated onClick doesn't qualify, so the
 * highlight would silently fail to appear on real phones.
 */
export function usePressedRow() {
    const [pressedId, setPressedId] = useState(null);

    const pressHandlers = useCallback(
        (id) => ({
            onPointerDown: () => setPressedId(id),
            onPointerUp: () => setPressedId((current) => (current === id ? null : current)),
            onPointerLeave: () => setPressedId((current) => (current === id ? null : current)),
            onPointerCancel: () => setPressedId((current) => (current === id ? null : current)),
        }),
        []
    );

    return { pressedId, pressHandlers };
}
