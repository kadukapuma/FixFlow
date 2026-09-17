import { useEffect, useState } from "react";
import api from "../../api";

function ReceivedItemsStep({
    customer,
    item,
    selectedIds,
    onChangeSelectedIds,
    submitting,
    error,
    onSubmit,
    onBack,
}) {
    const [availableItems, setAvailableItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/received-items", { params: { all: 1 } })
            .then((response) => {
                setAvailableItems(response.data);
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    function toggleItem(id) {
        onChangeSelectedIds(
            selectedIds.includes(id) ? selectedIds.filter((existing) => existing !== id) : [...selectedIds, id]
        );
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(selectedIds);
    }

    return (
        <form className="wizard-form-container" onSubmit={handleSubmit}>
            <div className="wizard-body">
                {/* Context Bar */}
                <div className="wizard-context-bar">
                    <span className="wizard-context-chip">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <strong>{customer.name}</strong>
                    </span>
                    <span className="wizard-context-divider">•</span>
                    <span className="wizard-context-chip">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                        <strong>{item.name}</strong>
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#6b6b63" }}>
                        Select any accessories or parts the customer handed over with the device:
                    </p>
                    {selectedIds.length > 0 && (
                        <span className="wizard-received-count-badge">
                            ✓ {selectedIds.length} {selectedIds.length === 1 ? "item" : "items"} selected
                        </span>
                    )}
                </div>

                {loading ? (
                    <p className="wizard-hint">Loading received items checklist...</p>
                ) : availableItems.length > 0 ? (
                    <div className="wizard-received-grid">
                        {availableItems.map((availableItem) => {
                            const isSelected = selectedIds.includes(availableItem.id);
                            return (
                                <div
                                    key={availableItem.id}
                                    className={`wizard-received-chip ${isSelected ? "is-selected" : ""}`}
                                    onClick={() => toggleItem(availableItem.id)}
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === " " || e.key === "Enter") {
                                            e.preventDefault();
                                            toggleItem(availableItem.id);
                                        }
                                    }}
                                >
                                    <div className="wizard-received-chip__box">
                                        {isSelected && (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                    <span>{availableItem.item_name}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "24px 16px", color: "#8c8a80", fontSize: 13, background: "#faf8f2", borderRadius: 10 }}>
                        No received items configured in settings yet. You can still save the service.
                    </div>
                )}

                {error && (
                    <p className="tenant-alert" role="alert" style={{ marginTop: 14 }}>
                        {error}
                    </p>
                )}
            </div>

            <div className="wizard-footer">
                <div className="wizard-footer__left">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onBack}>
                        ← Back
                    </button>
                </div>
                <span className="wizard-footer__step-text">Step 4 of 4</span>
                <div className="wizard-footer__right">
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                        {submitting ? "Saving..." : "Create Service ✓"}
                    </button>
                </div>
            </div>
        </form>
    );
}

export default ReceivedItemsStep;
