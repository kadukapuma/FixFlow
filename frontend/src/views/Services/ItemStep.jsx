import { useEffect, useState } from "react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../../components/StatusBadge/serviceStatusMeta";

const EMPTY_FORM = { name: "", model: "", serial_number: "" };

function ItemStep({ customer, item, submitting, error, onNext, onBack }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [existingItems, setExistingItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [selected, setSelected] = useState(null);
    const [addingNew, setAddingNew] = useState(false);

    useEffect(() => {
        if (item) {
            return undefined;
        }

        let cancelled = false;
        setLoadingItems(true);

        api.get(`/customers/${customer.id}/items`)
            .then((response) => {
                if (!cancelled) {
                    setExistingItems(response.data);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingItems(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [customer.id, item]);

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleNext(event) {
        event.preventDefault();

        if (item) {
            onNext(null);
            return;
        }

        if (selected) {
            onNext({ mode: "existing", item: selected });
            return;
        }

        onNext({ mode: "new", values: form });
    }

    const hasItems = existingItems.length > 0;
    const showList = !item && !selected && hasItems && !addingNew;
    const showForm = !item && !selected && (addingNew || (!loadingItems && !hasItems));
    const nextDisabled = submitting || (!item && !selected && !addingNew && hasItems);

    return (
        <form className="wizard-form-container" onSubmit={handleNext}>
            <div className="wizard-body">
                {/* Context Bar */}
                <div className="wizard-context-bar">
                    <span className="wizard-context-chip">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        Customer: <strong>{customer.name}</strong> ({customer.nic})
                    </span>
                    {customer.phone && (
                        <>
                            <span className="wizard-context-divider">•</span>
                            <span>Phone: {customer.phone}</span>
                        </>
                    )}
                </div>

                {item ? (
                    <div className="wizard-confirmed">
                        <div className="wizard-confirmed__card">
                            <strong>{item.name}</strong>
                            <span>
                                Model: {item.model || "—"} · Serial: {item.serial_number || "—"}
                            </span>
                        </div>
                    </div>
                ) : selected ? (
                    <div className="wizard-confirmed">
                        <div className="wizard-confirmed__card">
                            <strong>{selected.name}</strong>
                            <span>
                                Model: {selected.model || "—"} · Serial: {selected.serial_number || "—"}
                            </span>
                            {selected.status && (
                                <div style={{ marginTop: 4 }}>
                                    <StatusBadge status={selected.status} meta={SERVICE_STATUS_META} />
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            onClick={() => setSelected(null)}
                        >
                            Choose different item
                        </button>
                    </div>
                ) : (
                    <>
                        {loadingItems && <p className="wizard-hint">Loading registered items...</p>}

                        {showList && (
                            <>
                                <p className="wizard-hint" style={{ marginBottom: 10 }}>
                                    Select an item already registered for this customer:
                                </p>
                                <div className="wizard-item-grid">
                                    {existingItems.map((existing) => (
                                        <button
                                            key={existing.id}
                                            type="button"
                                            className={`wizard-item-card ${selected?.id === existing.id ? "is-selected" : ""}`}
                                            onClick={() => setSelected(existing)}
                                        >
                                            <div className="wizard-item-card__radio" />
                                            <div className="wizard-item-card__info">
                                                <span className="wizard-item-card__name">{existing.name}</span>
                                                <span className="wizard-item-card__sub">
                                                    {existing.model ? `Model: ${existing.model}` : "No model"}
                                                    {existing.serial_number ? ` · S/N: ${existing.serial_number}` : ""}
                                                </span>
                                                {existing.status && (
                                                    <div style={{ marginTop: 4 }}>
                                                        <StatusBadge status={existing.status} meta={SERVICE_STATUS_META} />
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ textAlign: "center", margin: "14px 0" }}>
                                    <button
                                        type="button"
                                        className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                        onClick={() => setAddingNew(true)}
                                    >
                                        + Register a new item for this customer
                                    </button>
                                </div>
                            </>
                        )}

                        {showForm && (
                            <div className="wizard-section-card" style={{ marginTop: 4 }}>
                                <div className="wizard-section-card__title">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <rect x="2" y="3" width="20" height="14" rx="2" />
                                        <line x1="8" y1="21" x2="16" y2="21" />
                                        <line x1="12" y1="17" x2="12" y2="21" />
                                    </svg>
                                    <span>Register New Device / Item</span>
                                </div>

                                <label>
                                    Device / Item Name *
                                    <input
                                        value={form.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        placeholder="e.g. Laptop — Dell XPS 13, iPhone 14 Pro, Samsung TV"
                                        required
                                    />
                                </label>

                                <div className="wizard-field-row">
                                    <label>
                                        Model / Variation
                                        <input
                                            value={form.model}
                                            onChange={(e) => updateField("model", e.target.value)}
                                            placeholder="e.g. XPS 13 9310"
                                        />
                                    </label>

                                    <label>
                                        Serial Number
                                        <input
                                            value={form.serial_number}
                                            onChange={(e) => updateField("serial_number", e.target.value)}
                                            placeholder="e.g. SN-892104"
                                        />
                                    </label>
                                </div>

                                {hasItems && (
                                    <div style={{ marginTop: 6 }}>
                                        <button
                                            type="button"
                                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                            onClick={() => setAddingNew(false)}
                                        >
                                            ← Select from existing items instead
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {error && (
                    <p className="tenant-alert" role="alert" style={{ marginTop: 12 }}>
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
                <span className="wizard-footer__step-text">Step 2 of 4</span>
                <div className="wizard-footer__right">
                    <button
                        type="submit"
                        className="tenant-btn tenant-btn--primary"
                        disabled={nextDisabled}
                    >
                        {submitting ? "Saving..." : "Next: Service Details →"}
                    </button>
                </div>
            </div>
        </form>
    );
}

export default ItemStep;
