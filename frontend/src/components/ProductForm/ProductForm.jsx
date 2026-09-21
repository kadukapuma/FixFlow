import { useState } from "react";
import { BrandPicker, CategoryPicker } from "../Picker/presets";

const EMPTY_FORM = {
    name: "",
    category_id: "",
    brand_id: "",
    purchase_price: "",
    sale_price: "",
    border_price: "",
};

function ProductForm({ initialValues, submitting, error, onSubmit, onCancel, submitLabel = "Save" }) {
    const [form, setForm] = useState({
        ...EMPTY_FORM,
        ...initialValues,
        category_id: initialValues?.category_id ?? "",
        brand_id: initialValues?.brand_id ?? "",
    });

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(event) {
        event.preventDefault();
        onSubmit(form);
    }

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label>
                Name
                <input
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Product name"
                    required
                />
            </label>

            <label>
                Category
                <CategoryPicker
                    value={form.category_id}
                    selected={initialValues?.category}
                    onChange={(id) => updateField("category_id", id)}
                    emptyLabel="No category"
                />
            </label>

            <label>
                Brand
                <BrandPicker
                    value={form.brand_id}
                    selected={initialValues?.brand}
                    onChange={(id) => updateField("brand_id", id)}
                    emptyLabel="No brand"
                />
            </label>

            <label>
                Purchase price
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchase_price || ""}
                    onChange={(e) => updateField("purchase_price", e.target.value)}
                    placeholder="0.00"
                />
            </label>

            <label>
                Sale price
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price || ""}
                    onChange={(e) => updateField("sale_price", e.target.value)}
                    placeholder="0.00"
                />
            </label>

            <label>
                Border price
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.border_price || ""}
                    onChange={(e) => updateField("border_price", e.target.value)}
                    placeholder="0.00"
                />
            </label>

            {error && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions">
                <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onCancel}>
                    Cancel
                </button>
                <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                    {submitting ? "Saving..." : submitLabel}
                </button>
            </div>
        </form>
    );
}

export default ProductForm;
