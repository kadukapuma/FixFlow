import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import { PurchasePicker } from "../Picker/presets";
import "./PurchaseForms.css";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function PurchaseReturnForm({
    initialPurchaseId = null,
    submitting,
    error,
    onSubmit,
    onCancel,
}) {
    const [selectedPurchaseId, setSelectedPurchaseId] = useState(() =>
        initialPurchaseId ? String(initialPurchaseId) : ""
    );
    const [purchaseDetails, setPurchaseDetails] = useState(null);
    const [storeStockMap, setStoreStockMap] = useState({});
    const [returnDate, setReturnDate] = useState(getTodayString);
    const [reason, setReason] = useState("");
    const [returnQuantities, setReturnQuantities] = useState({});
    const [loadingDetails, setLoadingDetails] = useState(false);

    function handlePurchaseSelect(id) {
        setSelectedPurchaseId(id);
        if (!id) {
            setPurchaseDetails(null);
            setReturnQuantities({});
            setStoreStockMap({});
        }
    }

    useEffect(() => {
        if (!selectedPurchaseId) return;

        let cancelled = false;

        async function loadPurchase() {
            setLoadingDetails(true);
            try {
                const res = await api.get(`/purchases/${selectedPurchaseId}`);
                if (cancelled) return;
                const p = res.data;
                setPurchaseDetails(p);

                // Fetch stock on hand for this store
                if (p.store_id) {
                    try {
                        const stockRes = await api.get("/stock/levels", {
                            params: { store_id: p.store_id },
                        });
                        const map = {};
                        for (const row of stockRes.data) {
                            map[row.product_id] = row.current_stock;
                        }
                        if (!cancelled) setStoreStockMap(map);
                    } catch {
                        // ignore stock level lookup error
                    }
                }

                // Initialize return quantities to 0
                const initialQty = {};
                for (const item of p.items) {
                    initialQty[item.id] = 0;
                }
                if (!cancelled) setReturnQuantities(initialQty);
            } catch {
                // ignore
            } finally {
                if (!cancelled) setLoadingDetails(false);
            }
        }

        loadPurchase();

        return () => {
            cancelled = true;
        };
    }, [selectedPurchaseId]);

    function handleQtyChange(itemId, val, maxReturnable, onHand) {
        const parsed = parseInt(val, 10);
        const max = Math.max(0, Math.min(maxReturnable, onHand));
        const clamped = isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, max));
        setReturnQuantities((prev) => ({ ...prev, [itemId]: clamped }));
    }

    const calculatedSummary = useMemo(() => {
        if (!purchaseDetails) return { count: 0, units: 0, total: 0, itemsPayload: [] };

        let units = 0;
        let total = 0;
        const itemsPayload = [];

        for (const item of purchaseDetails.items) {
            const qty = returnQuantities[item.id] || 0;
            if (qty > 0) {
                units += qty;
                // Net value per unit from purchase line
                const lineNetPerUnit = item.line_total / item.quantity;
                const lineReturnValue = Math.round(qty * lineNetPerUnit * 100) / 100;
                total += lineReturnValue;
                itemsPayload.push({
                    purchase_item_id: item.id,
                    quantity: qty,
                });
            }
        }

        return {
            count: itemsPayload.length,
            units,
            total: Math.round(total * 100) / 100,
            itemsPayload,
        };
    }, [purchaseDetails, returnQuantities]);

    function handleSubmit(e) {
        e.preventDefault();

        if (calculatedSummary.itemsPayload.length === 0) return;

        const payload = {
            purchase_id: Number(selectedPurchaseId),
            store_id: purchaseDetails?.store_id || null,
            return_date: returnDate,
            reason: reason.trim() || null,
            items: calculatedSummary.itemsPayload,
        };

        onSubmit(payload);
    }

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label className="pf-field-full">
                Select Purchase to Return *
                <PurchasePicker
                    mode="returnable"
                    value={selectedPurchaseId}
                    onChange={handlePurchaseSelect}
                    required
                />
            </label>

            <label>
                Return Date *
                <input
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                />
            </label>

            <label>
                Reason for Return
                <input
                    type="text"
                    maxLength={500}
                    placeholder="e.g. Defective batch, incorrect specification, damaged in transit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                />
            </label>

            {loadingDetails && (
                <p className="pf-field-full" style={{ color: "#6b6b63", fontSize: 13 }}>
                    Loading purchase items & store stock...
                </p>
            )}

            {purchaseDetails && !loadingDetails && (
                <div className="pf-lines-section pf-field-full">
                    <div className="pf-lines-header">
                        <h3 className="pf-lines-title">
                            Items to Return (Store: {purchaseDetails.store?.name || "Store"})
                        </h3>
                    </div>

                    <div className="pf-lines-table-wrap">
                        <table className="pf-lines-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Purchased</th>
                                    <th>Returned</th>
                                    <th>Returnable</th>
                                    <th>Store Stock</th>
                                    <th style={{ width: 90 }}>Return Qty</th>
                                    <th style={{ textAlign: "right" }}>Return Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchaseDetails.items.map((item) => {
                                    const onHand = storeStockMap[item.product_id] ?? 0;
                                    const returnable = item.returnable_quantity;
                                    const maxAllowed = Math.max(0, Math.min(returnable, onHand));
                                    const currentReturnQty = returnQuantities[item.id] || 0;
                                    const lineNetPerUnit = item.line_total / item.quantity;
                                    const currentLineValue =
                                        Math.round(currentReturnQty * lineNetPerUnit * 100) / 100;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`pf-return-row ${currentReturnQty > 0 ? "pf-return-row--active" : ""}`}
                                        >
                                            <td>
                                                <strong>{item.product_name}</strong>
                                            </td>
                                            <td>{item.quantity}</td>
                                            <td>{item.returned_quantity}</td>
                                            <td>
                                                <strong>{returnable}</strong>
                                            </td>
                                            <td>
                                                <span
                                                    className={`pf-stock-badge ${onHand < returnable ? "pf-stock-badge--low" : ""}`}
                                                >
                                                    {onHand} in store
                                                </span>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={maxAllowed}
                                                    step="1"
                                                    className="pf-input-compact"
                                                    value={currentReturnQty || ""}
                                                    placeholder="0"
                                                    disabled={maxAllowed === 0}
                                                    onChange={(e) =>
                                                        handleQtyChange(
                                                            item.id,
                                                            e.target.value,
                                                            returnable,
                                                            onHand
                                                        )
                                                    }
                                                />
                                            </td>
                                            <td className="pf-line-total">
                                                Rs. {currentLineValue.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="pf-summary-bar">
                        <div className="pf-summary-item">
                            <span>Items returning:</span>
                            <strong>{calculatedSummary.count}</strong>
                        </div>
                        <div className="pf-summary-item">
                            <span>Total units:</span>
                            <strong>{calculatedSummary.units}</strong>
                        </div>
                        <div className="pf-summary-item pf-summary-item--total">
                            <span>Total Return Value:</span>
                            <strong>Rs. {calculatedSummary.total.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <p className="tenant-alert tenant-form__error pf-field-full" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions pf-field-full">
                <button
                    type="button"
                    className="tenant-btn tenant-btn--ghost"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="tenant-btn tenant-btn--primary"
                    disabled={submitting || calculatedSummary.itemsPayload.length === 0}
                >
                    {submitting ? "Processing Return..." : "Record Purchase Return"}
                </button>
            </div>
        </form>
    );
}

export default PurchaseReturnForm;
