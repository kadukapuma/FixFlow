import { useEffect, useState } from "react";
import api from "../../api";
import { ProductPicker, StorePicker } from "../Picker/presets";

function ServiceProductForm({ initialValues, submitting, error, onSubmit, onCancel, submitLabel = "Add product" }) {
    const isEditing = Boolean(initialValues?.id);
    const [productId, setProductId] = useState(initialValues?.product_id ? String(initialValues.product_id) : "");
    const [pickedProduct, setPickedProduct] = useState(null);
    const [pickedStore, setPickedStore] = useState(null);
    const [storeId, setStoreId] = useState(initialValues?.store_id ? String(initialValues.store_id) : "");
    const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 1));
    const [unitPrice, setUnitPrice] = useState(
        initialValues?.unit_price != null ? String(initialValues.unit_price) : ""
    );
    const [stockResult, setStockResult] = useState({ key: null, stock: null });

    const stockKey = productId && storeId ? `${productId}-${storeId}` : null;

    useEffect(() => {
        if (!stockKey) return;

        let cancelled = false;

        api.get("/stock/levels", { params: { product_id: productId, store_id: storeId } }).then((response) => {
            if (cancelled) return;
            const row = response.data[0];
            setStockResult({ key: stockKey, stock: row ? row.current_stock : 0 });
        });

        return () => {
            cancelled = true;
        };
    }, [stockKey, productId, storeId]);

    const availableStock = stockKey && stockResult.key === stockKey ? stockResult.stock : null;

    const selectedProduct = (isEditing ? initialValues?.product : null) || pickedProduct;

    const selectedStore = (isEditing ? initialValues?.store : null) || pickedStore;

    function handleStoreChange(id, store) {
        setStoreId(id);
        setPickedStore(store);
    }

    function handleProductChange(id, product) {
        setProductId(id);
        setPickedProduct(product);
        setUnitPrice(product.sale_price != null ? String(product.sale_price) : "");
    }

    const floor = selectedProduct?.border_price != null ? Number(selectedProduct.border_price) : null;
    const belowFloor = floor !== null && unitPrice !== "" && Number(unitPrice) < floor;
    const lineTotal = (Number(quantity || 0) * Number(unitPrice || 0)).toFixed(2);

    // The backend only re-validates the *delta* on an update, so when editing,
    // this line's own already-consumed quantity counts as available too.
    const effectiveAvailable =
        availableStock !== null ? availableStock + (isEditing ? Number(initialValues?.quantity ?? 0) : 0) : null;
    const insufficientStock = effectiveAvailable !== null && Number(quantity || 0) > effectiveAvailable;

    function handleSubmit(event) {
        event.preventDefault();
        if (belowFloor || insufficientStock) return;
        onSubmit({
            product_id: productId,
            store_id: storeId,
            quantity: quantity || 1,
            unit_price: unitPrice,
        });
    }

    return (
        <form className="tenant-form tenant-form--1col" onSubmit={handleSubmit}>
            <label>
                Product
                {isEditing ? (
                    <input value={selectedProduct?.name || ""} disabled />
                ) : (
                    <ProductPicker value={productId} onChange={handleProductChange} required />
                )}
            </label>

            <label>
                Store
                {isEditing ? (
                    <input value={selectedStore?.name || ""} disabled />
                ) : (
                    <StorePicker value={storeId} onChange={handleStoreChange} required />
                )}
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
                Unit price
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    required
                />
            </label>

            {effectiveAvailable !== null && (
                <p className="tenant-form__hint">
                    {effectiveAvailable} in stock at {selectedStore?.name}
                </p>
            )}

            {insufficientStock && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    Only {effectiveAvailable} unit(s) available at this store.
                </p>
            )}

            {floor !== null && <p className="tenant-form__hint">Minimum allowed: Rs. {floor.toFixed(2)}</p>}

            {belowFloor && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    Unit price can't be less than Rs. {floor.toFixed(2)} for this product.
                </p>
            )}

            <p className="tenant-form__hint">Line total: Rs. {lineTotal}</p>

            {error && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions">
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onCancel}>
                    Cancel
                </button>
                <button
                    type="submit"
                    className="tenant-btn tenant-btn--primary"
                    disabled={submitting || belowFloor || insufficientStock}
                >
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default ServiceProductForm;
