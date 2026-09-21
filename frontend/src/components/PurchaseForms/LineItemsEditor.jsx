import { useMemo } from "react";
import { computeLineTotal } from "./purchaseFormUtils";
import "./PurchaseForms.css";

function LineItemsEditor({ items, onChange, products = [] }) {
    const selectedProductIds = useMemo(() => {
        return new Set(items.map((i) => Number(i.product_id)).filter(Boolean));
    }, [items]);

    function handleItemChange(index, field, value) {
        const next = items.map((item, idx) => {
            if (idx !== index) return item;

            const updated = { ...item, [field]: value };

            if (field === "product_id") {
                const prod = products.find((p) => p.id === Number(value));
                if (prod) {
                    const defaultCost =
                        prod.purchase_price != null && Number(prod.purchase_price) > 0
                            ? Number(prod.purchase_price)
                            : prod.average_cost != null && Number(prod.average_cost) > 0
                            ? Number(prod.average_cost)
                            : 0;
                    updated.unit_cost = defaultCost;
                }
            }

            updated.line_total = computeLineTotal(updated);
            return updated;
        });

        onChange(next);
    }

    function addLine() {
        // Pick first available product that isn't already selected
        const available = products.find((p) => !selectedProductIds.has(p.id));
        const defaultProdId = available ? available.id : "";
        const defaultCost = available
            ? Number(available.purchase_price || available.average_cost || 0)
            : 0;

        const newItem = {
            product_id: defaultProdId,
            quantity: 1,
            unit_cost: defaultCost,
            discount_type: "percent",
            discount_value: 0,
            line_total: defaultCost,
        };

        onChange([...items, newItem]);
    }

    function removeLine(index) {
        if (items.length <= 1) return;
        onChange(items.filter((_, idx) => idx !== index));
    }

    const totals = useMemo(() => {
        let units = 0;
        let gross = 0;
        let net = 0;

        for (const item of items) {
            const q = Math.max(1, parseInt(item.quantity, 10) || 1);
            const cost = Math.max(0, parseFloat(item.unit_cost) || 0);
            const lineGross = q * cost;
            const lineNet = computeLineTotal(item);

            units += q;
            gross += lineGross;
            net += lineNet;
        }

        const discount = Math.max(0, gross - net);

        return {
            itemsCount: items.length,
            units,
            gross: Math.round(gross * 100) / 100,
            discount: Math.round(discount * 100) / 100,
            net: Math.round(net * 100) / 100,
        };
    }, [items]);

    return (
        <div className="pf-lines-section">
            <div className="pf-lines-header">
                <h3 className="pf-lines-title">Line Items ({items.length})</h3>
                <button
                    type="button"
                    className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                    onClick={addLine}
                >
                    + Add item
                </button>
            </div>

            <div className="pf-lines-table-wrap">
                <table className="pf-lines-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: 190 }}>Product</th>
                            <th style={{ width: 85 }}>Quantity</th>
                            <th style={{ width: 110 }}>Unit Cost (Rs.)</th>
                            <th style={{ width: 140 }}>Discount</th>
                            <th style={{ width: 110, textAlign: "right" }}>Total (Rs.)</th>
                            <th style={{ width: 40 }} />
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            const currentProdId = Number(item.product_id);

                            return (
                                <tr key={index}>
                                    <td>
                                        <select
                                            className="pf-input-compact"
                                            value={item.product_id}
                                            onChange={(e) =>
                                                handleItemChange(index, "product_id", e.target.value)
                                            }
                                            required
                                        >
                                            <option value="" disabled>
                                                Select product...
                                            </option>
                                            {products.map((prod) => {
                                                const disabled =
                                                    selectedProductIds.has(prod.id) &&
                                                    prod.id !== currentProdId;
                                                return (
                                                    <option
                                                        key={prod.id}
                                                        value={prod.id}
                                                        disabled={disabled}
                                                    >
                                                        {prod.name}
                                                        {disabled ? " (already added)" : ""}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            className="pf-input-compact"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                handleItemChange(index, "quantity", e.target.value)
                                            }
                                            required
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="pf-input-compact"
                                            value={item.unit_cost}
                                            onChange={(e) =>
                                                handleItemChange(index, "unit_cost", e.target.value)
                                            }
                                            required
                                        />
                                    </td>
                                    <td>
                                        <div className="pf-discount-group">
                                            <button
                                                type="button"
                                                className="pf-discount-toggle"
                                                title="Click to toggle between percentage (%) and fixed amount (Rs.)"
                                                onClick={() =>
                                                    handleItemChange(
                                                        index,
                                                        "discount_type",
                                                        item.discount_type === "percent" ? "amount" : "percent"
                                                    )
                                                }
                                            >
                                                {item.discount_type === "percent" ? "%" : "Rs."}
                                            </button>
                                            <input
                                                type="number"
                                                min="0"
                                                step={item.discount_type === "percent" ? "0.5" : "0.01"}
                                                max={item.discount_type === "percent" ? "100" : undefined}
                                                className="pf-input-compact"
                                                value={item.discount_value}
                                                onChange={(e) =>
                                                    handleItemChange(index, "discount_value", e.target.value)
                                                }
                                            />
                                        </div>
                                    </td>
                                    <td className="pf-line-total">
                                        Rs. {Number(item.line_total || 0).toFixed(2)}
                                    </td>
                                    <td>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                className="pf-btn-remove"
                                                title="Remove line"
                                                onClick={() => removeLine(index)}
                                            >
                                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor">
                                                    <path d="M18 6 6 18M6 6l12 12" strokeWidth="2" strokeLinecap="round" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="pf-summary-bar">
                <div className="pf-summary-item">
                    <span>Units:</span>
                    <strong>{totals.units}</strong>
                </div>
                <div className="pf-summary-item">
                    <span>Gross:</span>
                    <strong>Rs. {totals.gross.toFixed(2)}</strong>
                </div>
                {totals.discount > 0 && (
                    <div className="pf-summary-item">
                        <span>Discount:</span>
                        <strong style={{ color: "#c22b3a" }}>-Rs. {totals.discount.toFixed(2)}</strong>
                    </div>
                )}
                <div className="pf-summary-item pf-summary-item--total">
                    <span>Net Total:</span>
                    <strong>Rs. {totals.net.toFixed(2)}</strong>
                </div>
            </div>
        </div>
    );
}

export default LineItemsEditor;
