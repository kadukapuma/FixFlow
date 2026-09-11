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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const showList = !item && !selected && existingItems.length > 0 && !addingNew;
    const showForm = !item && !selected && (addingNew || (!loadingItems && existingItems.length === 0));
    const nextDisabled = submitting || (!item && !selected && !addingNew && existingItems.length > 0);

    return (
        <div className="wizard-step">
            <div className="wizard-context">
                Customer: <strong>{customer.name}</strong> ({customer.nic})
            </div>

            <form className="tenant-form tenant-form--2col" onSubmit={handleNext}>
                {item ? (
                    <div className="wizard-confirmed wizard-full">
                        <div className="wizard-confirmed__card">
                            <strong>{item.name}</strong>
                            <span>
                                {item.model || "—"} · {item.serial_number || "—"}
                            </span>
                        </div>
                    </div>
                ) : selected ? (
                    <div className="wizard-confirmed wizard-full">
                        <div className="wizard-confirmed__card">
                            <strong>{selected.name}</strong>
                            <span>
                                {selected.model || "—"} · {selected.serial_number || "—"}
                            </span>
                            {selected.status && <StatusBadge status={selected.status} meta={SERVICE_STATUS_META} />}
                        </div>
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            onClick={() => setSelected(null)}
                        >
                            Choose a different item
                        </button>
                    </div>
                ) : (
                    <>
                        {loadingItems && <p className="wizard-hint wizard-full">Loading registered items...</p>}

                        {showList && (
                            <>
                                <p className="wizard-hint wizard-full">Registered items for this customer:</p>
                                <ul className="wizard-results wizard-full">
                                    {existingItems.map((existing) => (
                                        <li key={existing.id}>
                                            <button
                                                type="button"
                                                className="wizard-result"
                                                onClick={() => setSelected(existing)}
                                            >
                                                <strong>{existing.name}</strong>
                                                <span>
                                                    {existing.model || "—"} · {existing.serial_number || "—"}
                                                </span>
                                                {existing.status && (
                                                    <StatusBadge status={existing.status} meta={SERVICE_STATUS_META} />
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                                <button
                                    type="button"
                                    className="tenant-btn tenant-btn--ghost tenant-btn--sm wizard-full"
                                    onClick={() => setAddingNew(true)}
                                >
                                    Register a new item instead
                                </button>
                            </>
                        )}

                        {showForm && (
                            <>
                                {existingItems.length > 0 && (
                                    <p className="wizard-hint wizard-full">Or register a new item:</p>
                                )}
                                <label className="wizard-full">
                                    Item
                                    <input
                                        value={form.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        placeholder="e.g. Laptop — Dell XPS 13"
                                        required
                                    />
                                </label>

                                <label>
                                    Model
                                    <input
                                        value={form.model}
                                        onChange={(e) => updateField("model", e.target.value)}
                                        placeholder="e.g. XPS 13 9310"
                                    />
                                </label>

                                <label>
                                    Serial number
                                    <input
                                        value={form.serial_number}
                                        onChange={(e) => updateField("serial_number", e.target.value)}
                                        placeholder="e.g. SN-482910"
                                    />
                                </label>
                            </>
                        )}
                    </>
                )}

                {error && (
                    <p className="tenant-alert tenant-form__error" role="alert">
                        {error}
                    </p>
                )}

                <div className="tenant-form__actions">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onBack}>
                        Back
                    </button>
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={nextDisabled}>
                        {submitting ? "Saving..." : "Next"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ItemStep;
