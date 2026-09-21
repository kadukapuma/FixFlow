import { useEffect, useState } from "react";
import api from "../../api";
import Picker from "../Picker/Picker";
import { ProductPicker, StorePicker } from "../Picker/presets";

const ADJUSTMENT_DIRECTIONS = [
    { id: "increase", name: "Increase stock (+)" },
    { id: "decrease", name: "Decrease stock (−)" },
];

function useCurrentStock(productId, storeId) {
    const [result, setResult] = useState({ key: null, stock: null });
    const key = productId && storeId ? `${productId}-${storeId}` : null;

    useEffect(() => {
        if (!key) return;

        let cancelled = false;

        api.get("/stock/levels", { params: { product_id: productId, store_id: storeId } }).then((response) => {
            if (cancelled) return;
            const row = response.data[0];
            setResult({ key, stock: row ? row.current_stock : 0 });
        });

        return () => {
            cancelled = true;
        };
    }, [key, productId, storeId]);

    return key && result.key === key ? result.stock : null;
}

function FormActions({ submitting, disabled, onCancel, submitLabel }) {
    return (
        <div className="tenant-form__actions">
            <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onCancel}>
                Cancel
            </button>
            <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting || disabled}>
                {submitting ? "Saving..." : submitLabel}
            </button>
        </div>
    );
}

function ErrorMessage({ error }) {
    if (!error) return null;

    return (
        <p className="tenant-alert tenant-form__error" role="alert">
            {error}
        </p>
    );
}

function ProductSelect({ value, onChange }) {
    return (
        <label>
            Product
            <ProductPicker value={value} onChange={onChange} required />
        </label>
    );
}

function StoreSelect({ label = "Store", value, onChange, excludeId }) {
    return (
        <label>
            {label}
            <StorePicker
                value={value}
                onChange={onChange}
                excludeIds={excludeId ? [excludeId] : undefined}
                excludedLabel="Same as source store"
                required
            />
        </label>
    );
}

export function OpeningStockForm({ submitting, error, onSubmit, onCancel }) {
    const [productId, setProductId] = useState("");
    const [storeId, setStoreId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit({ product_id: productId, store_id: storeId, quantity, note: note || undefined });
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <ProductSelect value={productId} onChange={setProductId} />
            <StoreSelect value={storeId} onChange={setStoreId} />

            <label>
                Opening quantity
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                />
            </label>

            <label>
                Note
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </label>

            <ErrorMessage error={error} />
            <FormActions submitting={submitting} onCancel={onCancel} submitLabel="Record opening stock" />
        </form>
    );
}

export function StockAdjustmentForm({ submitting, error, onSubmit, onCancel }) {
    const [productId, setProductId] = useState("");
    const [storeId, setStoreId] = useState("");
    const [direction, setDirection] = useState("increase");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");
    const stock = useCurrentStock(productId, storeId);

    const magnitude = Number(quantity || 0);
    const insufficient = direction === "decrease" && stock !== null && magnitude > stock;

    function handleSubmit(event) {
        event.preventDefault();
        if (insufficient) return;
        onSubmit({
            product_id: productId,
            store_id: storeId,
            quantity: direction === "decrease" ? -magnitude : magnitude,
            note: note || undefined,
        });
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <ProductSelect value={productId} onChange={setProductId} />
            <StoreSelect value={storeId} onChange={setStoreId} />

            <label>
                Adjustment
                <Picker options={ADJUSTMENT_DIRECTIONS} value={direction} onChange={setDirection} />
            </label>

            <label>
                Quantity
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                />
            </label>

            <label>
                Reason
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. stock count correction" />
            </label>

            {stock !== null && <p className="tenant-form__hint">Current stock: {stock}</p>}
            {insufficient && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    Only {stock} unit(s) available at this store.
                </p>
            )}

            <ErrorMessage error={error} />
            <FormActions
                submitting={submitting}
                disabled={insufficient}
                onCancel={onCancel}
                submitLabel="Record adjustment"
            />
        </form>
    );
}

export function DamageStockForm({ submitting, error, onSubmit, onCancel }) {
    const [productId, setProductId] = useState("");
    const [storeId, setStoreId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");
    const stock = useCurrentStock(productId, storeId);

    const insufficient = stock !== null && Number(quantity || 0) > stock;

    function handleSubmit(event) {
        event.preventDefault();
        if (insufficient) return;
        onSubmit({ product_id: productId, store_id: storeId, quantity, note });
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <ProductSelect value={productId} onChange={setProductId} />
            <StoreSelect value={storeId} onChange={setStoreId} />

            <label>
                Damaged quantity
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                />
            </label>

            <label>
                Reason
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="What happened to the stock?"
                    required
                />
            </label>

            {stock !== null && <p className="tenant-form__hint">Current stock: {stock}</p>}
            {insufficient && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    Only {stock} unit(s) available at this store.
                </p>
            )}

            <ErrorMessage error={error} />
            <FormActions
                submitting={submitting}
                disabled={insufficient}
                onCancel={onCancel}
                submitLabel="Record damage"
            />
        </form>
    );
}

export function StockTransferForm({ submitting, error, onSubmit, onCancel }) {
    const [productId, setProductId] = useState("");
    const [fromStoreId, setFromStoreId] = useState("");
    const [toStoreId, setToStoreId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [note, setNote] = useState("");
    const stock = useCurrentStock(productId, fromStoreId);

    const insufficient = stock !== null && Number(quantity || 0) > stock;

    function handleFromChange(id) {
        setFromStoreId(id);
        if (String(id) === String(toStoreId)) setToStoreId("");
    }

    function handleSubmit(event) {
        event.preventDefault();
        if (insufficient) return;
        onSubmit({
            product_id: productId,
            from_store_id: fromStoreId,
            to_store_id: toStoreId,
            quantity,
            note: note || undefined,
        });
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <ProductSelect value={productId} onChange={setProductId} />
            <StoreSelect label="From store" value={fromStoreId} onChange={handleFromChange} />
            <StoreSelect
                label="To store"
                value={toStoreId}
                onChange={setToStoreId}
                excludeId={fromStoreId}
            />

            <label>
                Quantity
                <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                />
            </label>

            <label>
                Note
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
            </label>

            {stock !== null && <p className="tenant-form__hint">Available at source store: {stock}</p>}
            {insufficient && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    Only {stock} unit(s) available at the source store.
                </p>
            )}

            <ErrorMessage error={error} />
            <FormActions
                submitting={submitting}
                disabled={insufficient}
                onCancel={onCancel}
                submitLabel="Transfer stock"
            />
        </form>
    );
}
