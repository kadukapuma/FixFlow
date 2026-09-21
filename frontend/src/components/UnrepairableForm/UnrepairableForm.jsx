import { useState } from "react";
import Picker from "../Picker/Picker";
import "./UnrepairableForm.css";

const DISPOSITIONS = [
    { id: "restock", name: "🔄 Restock (Return to Store shelf)" },
    { id: "write_off", name: "⚠️ Cannot Restock (Shop Write-off / Loss)" },
    { id: "charge", name: "💵 Cannot Restock (Charge Customer)" },
];

function todayIsoDate() {
    return new Date().toISOString().slice(0, 10);
}

function UnrepairableForm({ serviceProducts = [], submitting, error, onSubmit, onCancel }) {
    const [reason, setReason] = useState("");
    const [date, setDate] = useState(todayIsoDate());
    const [inspectionFee, setInspectionFee] = useState("0.00");

    // Map each service product ID to disposition: 'restock' | 'write_off' | 'charge'
    const [dispositions, setDispositions] = useState(() => {
        const initial = {};
        serviceProducts.forEach((sp) => {
            initial[sp.id] = "restock";
        });
        return initial;
    });

    function handleDispositionChange(id, value) {
        setDispositions((prev) => ({
            ...prev,
            [id]: value,
        }));
    }

    const numericFee = Math.max(0, Number(inspectionFee) || 0);

    const chargedPartsTotal = serviceProducts.reduce((sum, sp) => {
        if (dispositions[sp.id] === "charge") {
            return sum + Number(sp.line_total ?? (sp.quantity * sp.unit_price) ?? 0);
        }
        return sum;
    }, 0);

    const finalCustomerPrice = numericFee + chargedPartsTotal;

    function handleSubmit(e) {
        e.preventDefault();
        onSubmit({
            reason: reason.trim(),
            date,
            inspectionFee: numericFee,
            partsDisposition: dispositions,
        });
    }

    return (
        <form className="uf-root" onSubmit={handleSubmit}>
            <label>
                <span>Reason why item cannot be repaired *</span>
                <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. PCB damaged beyond economical repair, mainboard cracked, replacement part discontinued..."
                    required
                />
            </label>

            <div className="uf-grid-2">
                <label>
                    <span>Date declared unrepairable</span>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                    />
                </label>

                <label>
                    <span>Diagnostic / Inspection fee (Rs.)</span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={inspectionFee}
                        onChange={(e) => setInspectionFee(e.target.value)}
                        placeholder="0.00"
                    />
                </label>
            </div>

            {serviceProducts.length > 0 && (
                <div className="uf-parts-card">
                    <div className="uf-parts-title">
                        <span>Attached Spare Parts ({serviceProducts.length})</span>
                        <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "#64748b" }}>
                            Select what happens to each item
                        </span>
                    </div>

                    <div className="uf-parts-table-wrap">
                        <table className="uf-parts-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Store</th>
                                    <th>Qty</th>
                                    <th>Price</th>
                                    <th>Disposition Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceProducts.map((sp) => {
                                    const currentDisp = dispositions[sp.id] || "restock";
                                    return (
                                        <tr key={sp.id}>
                                            <td>
                                                <strong>{sp.product?.name || "Product"}</strong>
                                            </td>
                                            <td>{sp.store?.name || "—"}</td>
                                            <td>{sp.quantity}</td>
                                            <td>Rs. {Number(sp.line_total ?? (sp.quantity * sp.unit_price)).toFixed(2)}</td>
                                            <td>
                                                <Picker
                                                    className={`uf-select-disposition uf-select-disposition--${currentDisp}`}
                                                    options={DISPOSITIONS}
                                                    value={currentDisp}
                                                    onChange={(disposition) =>
                                                        handleDispositionChange(sp.id, disposition)
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="uf-legend">
                        <div>• <strong>Restock</strong>: Returned to store inventory (+qty), COGS reversed. Customer is not billed.</div>
                        <div>• <strong>Shop Write-off</strong>: Consumed/ruined during diagnosis. Stays deducted, cost moved to Write-offs account (5200). Shop absorbs loss.</div>
                        <div>• <strong>Charge Customer</strong>: Part stays installed or customer keeps it. Billed on customer invoice.</div>
                    </div>
                </div>
            )}

            <div className="uf-summary-card">
                <div className="uf-summary-row">
                    <span>Diagnostic / Inspection fee:</span>
                    <span>Rs. {numericFee.toFixed(2)}</span>
                </div>
                {chargedPartsTotal > 0 && (
                    <div className="uf-summary-row">
                        <span>Parts charged to customer:</span>
                        <span>Rs. {chargedPartsTotal.toFixed(2)}</span>
                    </div>
                )}
                <div className="uf-summary-row uf-summary-row--total">
                    <span>Final Service Price:</span>
                    <span>Rs. {finalCustomerPrice.toFixed(2)}</span>
                </div>
            </div>

            {error && (
                <p className="tenant-alert" role="alert">
                    {error}
                </p>
            )}

            <div className="uf-actions">
                <button
                    type="button"
                    className="tenant-btn tenant-btn--ghost"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="tenant-btn tenant-btn--danger"
                    disabled={submitting}
                >
                    {submitting ? "Processing..." : "Confirm Unrepairable"}
                </button>
            </div>
        </form>
    );
}

export default UnrepairableForm;
