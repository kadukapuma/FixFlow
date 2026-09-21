import { useEffect, useState } from "react";
import api from "../../api";

function useProductsAndStores() {
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);

    useEffect(() => {
        api.get("/products", { params: { all: 1 } }).then((response) => {
            setProducts(response.data.filter((product) => product.is_active));
        });
        api.get("/stores", { params: { all: 1 } }).then((response) => {
            setStores(response.data.filter((store) => store.is_active));
        });
    }, []);

    return { products, stores };
}

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

function ProductSelect({ products, value, onChange }) {
    return (
        <label>
            Product
            <select value={value} onChange={(e) => onChange(e.target.value)} required>
                <option value="" disabled>
                    Select a product
                </option>
                {products.map((product) => (
                    <option key={product.id} value={product.id}>
                        {product.name}
                    </option>
                ))}
            </select>
        </label>
    );
}

function StoreSelect({ label = "Store", stores, value, onChange, excludeId }) {
    return (
        <label>
            {label}
            <select value={value} onChange={(e) => onChange(e.target.value)} required>
                <option value="" disabled>
                    Select a store
                </option>
                {stores
                    .filter((store) => String(store.id) !== String(excludeId))
                    .map((store) => (
                        <option key={store.id} value={store.id}>
                            {store.name}
                        </option>
                    ))}
            </select>
        </label>
    );
}

export function OpeningStockForm({ submitting, error, onSubmit, onCancel }) {
    const { products, stores } = useProductsAndStores();
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
            <ProductSelect products={products} value={productId} onChange={setProductId} />
            <StoreSelect stores={stores} value={storeId} onChange={setStoreId} />

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
    const { products, stores } = useProductsAndStores();
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
            <ProductSelect products={products} value={productId} onChange={setProductId} />
            <StoreSelect stores={stores} value={storeId} onChange={setStoreId} />

            <label>
                Adjustment
                <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                    <option value="increase">Increase stock (+)</option>
                    <option value="decrease">Decrease stock (−)</option>
                </select>
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
    const { products, stores } = useProductsAndStores();
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
            <ProductSelect products={products} value={productId} onChange={setProductId} />
            <StoreSelect stores={stores} value={storeId} onChange={setStoreId} />

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
    const { products, stores } = useProductsAndStores();
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
            <ProductSelect products={products} value={productId} onChange={setProductId} />
            <StoreSelect label="From store" stores={stores} value={fromStoreId} onChange={handleFromChange} />
            <StoreSelect
                label="To store"
                stores={stores}
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
