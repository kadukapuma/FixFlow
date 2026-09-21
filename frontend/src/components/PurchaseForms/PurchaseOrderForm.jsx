import { useEffect, useState } from "react";
import api from "../../api";
import LineItemsEditor from "./LineItemsEditor";
import { computeLineTotal } from "./purchaseFormUtils";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function PurchaseOrderForm({ initialValues, submitting, error, onSubmit, onCancel }) {
    const [suppliers, setSuppliers] = useState([]);
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);

    const [supplierId, setSupplierId] = useState(() => initialValues?.supplier_id || "");
    const [storeId, setStoreId] = useState(() => initialValues?.store_id || "");
    const [orderDate, setOrderDate] = useState(() => initialValues?.order_date || getTodayString());
    const [expectedDate, setExpectedDate] = useState(() => initialValues?.expected_date || "");
    const [note, setNote] = useState(() => initialValues?.note || "");

    const [items, setItems] = useState(() => {
        if (initialValues?.items && initialValues.items.length > 0) {
            return initialValues.items.map((i) => ({
                product_id: i.product_id,
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

    useEffect(() => {
        let cancelled = false;

        api.get("/suppliers", { params: { all: 1 } })
            .then((res) => {
                if (!cancelled) setSuppliers(res.data.filter((s) => s.is_active));
            })
            .catch(() => {});

        api.get("/stores", { params: { all: 1 } })
            .then((res) => {
                if (!cancelled) setStores(res.data.filter((s) => s.is_active));
            })
            .catch(() => {});

        api.get("/products", { params: { all: 1 } })
            .then((res) => {
                if (!cancelled) setProducts(res.data.filter((p) => p.is_active));
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

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
                <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    required
                >
                    <option value="" disabled>
                        Select supplier...
                    </option>
                    {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.name}
                        </option>
                    ))}
                </select>
            </label>

            <label>
                Destination Store
                <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                >
                    <option value="">Any / Not assigned</option>
                    {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                            {st.name}
                        </option>
                    ))}
                </select>
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

            <LineItemsEditor
                items={items}
                onChange={setItems}
                products={products}
            />

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
