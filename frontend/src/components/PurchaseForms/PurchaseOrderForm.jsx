import { useState } from "react";
import { StorePicker, SupplierPicker } from "../Picker/presets";
import LineItemsEditor from "./LineItemsEditor";
import { computeLineTotal } from "./purchaseFormUtils";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function PurchaseOrderForm({ initialValues, submitting, error, onSubmit, onCancel }) {
    const [supplierId, setSupplierId] = useState(() => initialValues?.supplier_id || "");
    const [storeId, setStoreId] = useState(() => initialValues?.store_id || "");
    const [orderDate, setOrderDate] = useState(() => initialValues?.order_date || getTodayString());
    const [expectedDate, setExpectedDate] = useState(() => initialValues?.expected_date || "");
    const [note, setNote] = useState(() => initialValues?.note || "");

    const [items, setItems] = useState(() => {
        if (initialValues?.items && initialValues.items.length > 0) {
            return initialValues.items.map((i) => ({
                product_id: i.product_id,
                product: i.product,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
                discount_type: i.discount_type || "percent",
                discount_value: i.discount_value || 0,
                line_total: computeLineTotal(i),
            }));
        }
        return [
            {
                product_id: "",
                quantity: 1,
                unit_cost: 0,
                discount_type: "percent",
                discount_value: 0,
                line_total: 0,
            },
        ];
    });

    function handleSubmit(e) {
        e.preventDefault();

        const payload = {
            supplier_id: Number(supplierId),
            store_id: storeId ? Number(storeId) : null,
            order_date: orderDate,
            expected_date: expectedDate || null,
            note: note.trim() || null,
            items: items.map((i) => ({
                product_id: Number(i.product_id),
                quantity: parseInt(i.quantity, 10),
                unit_cost: parseFloat(i.unit_cost),
                discount_type: i.discount_type || "percent",
                discount_value: parseFloat(i.discount_value || 0),
            })),
        };

        onSubmit(payload);
    }

    const canSubmit =
        Boolean(supplierId) &&
        items.length > 0 &&
        items.every((i) => Boolean(i.product_id) && Number(i.quantity) > 0 && Number(i.unit_cost) >= 0);

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label>
                Supplier *
                <SupplierPicker value={supplierId} onChange={setSupplierId} required />
            </label>

            <label>
                Destination Store
                <StorePicker
                    value={storeId}
                    onChange={setStoreId}
                    emptyLabel="Any / Not assigned"
                />
            </label>

            <label>
                Order Date *
                <input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    required
                />
            </label>

            <label>
                Expected Delivery Date
                <input
                    type="date"
                    min={orderDate}
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                />
            </label>

            <label className="pf-field-full">
                Notes
                <input
                    type="text"
                    maxLength={500}
                    placeholder="Optional order notes or supplier delivery instructions"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </label>

            <LineItemsEditor items={items} onChange={setItems} />

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
                    disabled={submitting || !canSubmit}
                >
                    {submitting ? "Saving..." : initialValues ? "Update Order" : "Create Order"}
                </button>
            </div>
        </form>
    );
}

export default PurchaseOrderForm;
