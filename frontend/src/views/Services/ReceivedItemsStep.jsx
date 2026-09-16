import { useEffect, useState } from "react";
import api from "../../api";

function ReceivedItemsStep({ customer, item, submitting, error, onSubmit, onBack }) {
    const [availableItems, setAvailableItems] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        api.get("/received-items", { params: { all: 1 } }).then((response) => {
            setAvailableItems(response.data);
        });
    }, []);

    function toggleItem(id) {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((existing) => existing !== id) : [...prev, id]));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(selectedIds);
    }

    return (
        <div className="wizard-step">
            <div className="wizard-context">
                <strong>{customer.name}</strong> ({customer.nic}) — {item.name}
            </div>

            <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
                <p>Select any items the customer handed over with the device.</p>

                <div className="tenant-checkbox-list">
                    {availableItems.map((availableItem) => (
                        <label key={availableItem.id} className="tenant-checkbox-list__item">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(availableItem.id)}
                                onChange={() => toggleItem(availableItem.id)}
                            />
                            {availableItem.item_name}
                        </label>
                    ))}

                    {availableItems.length === 0 && <p>No received items have been set up yet.</p>}
                </div>

                {error && (
                    <p className="tenant-alert tenant-form__error" role="alert">
                        {error}
                    </p>
                )}

                <div className="tenant-form__actions">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onBack}>
                        Back
                    </button>
                    <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                        {submitting ? "Saving..." : "Save service"}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ReceivedItemsStep;
