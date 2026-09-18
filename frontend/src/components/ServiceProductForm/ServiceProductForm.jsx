import { useEffect, useState } from "react";
import api from "../../api";

function ServiceProductForm({ initialValues, submitting, error, onSubmit, onCancel, submitLabel = "Add product" }) {
    const isEditing = Boolean(initialValues?.id);
    const [products, setProducts] = useState([]);
    const [productId, setProductId] = useState(initialValues?.product_id ? String(initialValues.product_id) : "");
    const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 1));
    const [unitPrice, setUnitPrice] = useState(
        initialValues?.unit_price != null ? String(initialValues.unit_price) : ""
    );

    useEffect(() => {
        api.get("/products", { params: { all: 1 } }).then((response) => {
            setProducts(response.data.filter((product) => product.is_active));
        });
    }, []);

    const selectedProduct =
        (isEditing ? initialValues?.product : null) ||
        products.find((product) => String(product.id) === String(productId));

    function handleProductChange(id) {
        setProductId(id);
        const product = products.find((p) => String(p.id) === String(id));
        setUnitPrice(product?.sale_price != null ? String(product.sale_price) : "");
    }

    const floor = selectedProduct?.border_price != null ? Number(selectedProduct.border_price) : null;
    const belowFloor = floor !== null && unitPrice !== "" && Number(unitPrice) < floor;
    const lineTotal = (Number(quantity || 0) * Number(unitPrice || 0)).toFixed(2);

    function handleSubmit(event) {
        event.preventDefault();
        if (belowFloor) return;
        onSubmit({
            product_id: productId,
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
                    <select value={productId} onChange={(e) => handleProductChange(e.target.value)} required>
                        <option value="" disabled>
                            Select a product
                        </option>
                        {products.map((product) => (
                            <option key={product.id} value={product.id}>
                                {product.name}
                            </option>
                        ))}
                    </select>
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
                <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting || belowFloor}>
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default ServiceProductForm;
