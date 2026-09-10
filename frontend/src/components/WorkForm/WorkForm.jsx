import { useState } from "react";
import "./WorkForm.css";

function WorkForm({ submitting, error, onSubmit, onCancel }) {
    const [description, setDescription] = useState("");
    const [cost, setCost] = useState("0");

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({ description, cost });
    }

    return (
        <form className="tenant-form work-form" onSubmit={handleSubmit}>
            <label>
                Description
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What work was done?"
                />
            </label>

            <label>
                Cost
                <input type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
            </label>

            {error && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions">
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                </button>
            </div>
        </form>
    );
}

export default WorkForm;
