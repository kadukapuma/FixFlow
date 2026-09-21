import { useEffect, useState } from "react";
import api from "../../api";
import LineItemsEditor from "./LineItemsEditor";
import { computeLineTotal } from "./purchaseFormUtils";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function PurchaseForm({ prefilledPo, submitting, error, onSubmit, onCancel }) {
    const [suppliers, setSuppliers] = useState([]);
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);
    const [openOrders, setOpenOrders] = useState([]);

    const [purchaseOrderId, setPurchaseOrderId] = useState(() => prefilledPo?.id || "");
    const [supplierId, setSupplierId] = useState(() => prefilledPo?.supplier_id || "");
    const [storeId, setStoreId] = useState(() => prefilledPo?.store_id || "");
    const [purchaseDate, setPurchaseDate] = useState(getTodayString);
    const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
    const [note, setNote] = useState(() => prefilledPo?.note || "");

    const [items, setItems] = useState(() => {
        if (prefilledPo?.items && prefilledPo.items.length > 0) {
            return prefilledPo.items.map((i) => ({
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

        api.get("/purchase-orders", { params: { all: 1, status: "ordered" } })
            .then((res) => {
                if (!cancelled) setOpenOrders(res.data);
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, []);

    async function handlePoSelect(poId) {
        setPurchaseOrderId(poId);
        if (!poId) return;

        try {
            const res = await api.get(`/purchase-orders/${poId}`);
            const po = res.data;
            if (po.supplier_id) setSupplierId(po.supplier_id);
            if (po.store_id) setStoreId(po.store_id);
            if (po.note) setNote(po.note);
            if (po.items && po.items.length > 0) {
                setItems(
                    po.items.map((i) => ({
                        product_id: i.product_id,
                        quantity: i.quantity,
                        unit_cost: i.unit_cost,
                        discount_type: i.discount_type || "percent",
                        discount_value: i.discount_value || 0,
                        line_total: computeLineTotal(i),
                    }))
                );
            }
        } catch {
            // keep current form values if fetch fails
        }
    }

    function handleSubmit(e) {
        e.preventDefault();

        const payload = {
            supplier_id: Number(supplierId),
            store_id: Number(storeId),
            purchase_order_id: purchaseOrderId ? Number(purchaseOrderId) : null,
            purchase_date: purchaseDate,
            supplier_invoice_no: supplierInvoiceNo.trim() || null,
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
        Boolean(storeId) &&
        items.length > 0 &&
        items.every((i) => Boolean(i.product_id) && Number(i.quantity) > 0 && Number(i.unit_cost) >= 0);

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label className="pf-field-full">
                Receive from Purchase Order (Optional)
                <select
                    value={purchaseOrderId}
                    onChange={(e) => handlePoSelect(e.target.value)}
                >
                    <option value="">Direct purchase (no purchase order)</option>
                    {openOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                            {po.ref_no || `PO #${po.id}`} — {po.supplier?.name || "Supplier"} ({po.order_date})
                        </option>
                    ))}
                </select>
            </label>

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
                Receiving Store *
                <select
                    value={storeId}
                    onChange={(e) => setStoreId(e.target.value)}
                    required
                >
                    <option value="" disabled>
                        Select receiving store...
                    </option>
                    {stores.map((st) => (
                        <option key={st.id} value={st.id}>
                            {st.name}
                        </option>
                    ))}
                </select>
            </label>

            <label>
                Purchase Date *
                <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    required
                />
            </label>

            <label>
                Supplier Invoice No.
                <input
                    type="text"
                    maxLength={100}
                    placeholder="e.g. INV-2026-084"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                />
            </label>

            <label className="pf-field-full">
                Notes
                <input
                    type="text"
                    maxLength={500}
                    placeholder="Optional notes regarding this stock receipt"
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
                    {submitting ? "Receiving Stock..." : "Record & Receive Purchase"}
                </button>
            </div>
        </form>
    );
}

export default PurchaseForm;
