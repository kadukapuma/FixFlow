import Picker from "./Picker";

// Ready-made pickers for the system's records. Each one only fixes the
// endpoint, labels and placeholder; everything else is Picker's props
// (value, onChange, required, emptyLabel, variant...).

const ACTIVE_ONLY = { active: 1 };
const OPEN_ORDERS = { status: "ordered" };
const PAYABLE = { payable: 1 };
const RETURNABLE = { returnable: 1 };

const money = (amount) => `Rs. ${Number(amount).toFixed(2)}`;
const purchaseLabel = (p) => `${p.ref_no || `#${p.id}`}${p.supplier_name ? ` — ${p.supplier_name}` : ""}`;

function payableSubtitle(p) {
    const balance = Number(p.balance);
    return `${p.purchase_date} · ${balance < 0 ? `Credit: ${money(Math.abs(balance))}` : `Due: ${money(balance)}`}`;
}

export function ProductPicker(props) {
    return (
        <Picker
            endpoint="/products"
            params={ACTIVE_ONLY}
            placeholder="Select a product"
            searchPlaceholder="Search by product, category or brand..."
            getSubtitle={(product) => [product.category?.name, product.brand?.name].filter(Boolean).join(" · ")}
            {...props}
        />
    );
}

export function StorePicker(props) {
    return (
        <Picker
            endpoint="/stores"
            params={ACTIVE_ONLY}
            placeholder="Select a store"
            searchPlaceholder="Search stores..."
            {...props}
        />
    );
}

export function SupplierPicker(props) {
    return (
        <Picker
            endpoint="/suppliers"
            params={ACTIVE_ONLY}
            placeholder="Select supplier..."
            searchPlaceholder="Search suppliers..."
            {...props}
        />
    );
}

export function CategoryPicker(props) {
    return (
        <Picker
            endpoint="/categories"
            params={ACTIVE_ONLY}
            placeholder="Select a category"
            searchPlaceholder="Search categories..."
            {...props}
        />
    );
}

export function BrandPicker(props) {
    return (
        <Picker
            endpoint="/brands"
            params={ACTIVE_ONLY}
            placeholder="Select a brand"
            searchPlaceholder="Search brands..."
            {...props}
        />
    );
}

export function EmployeePicker(props) {
    return (
        <Picker
            endpoint="/employees"
            params={ACTIVE_ONLY}
            placeholder="Select technician"
            searchPlaceholder="Search employees..."
            {...props}
        />
    );
}

/** `mode` is "payable" (purchases with a balance) or "returnable" (purchases with items left to return). */
export function PurchasePicker({ mode, ...props }) {
    const payable = mode === "payable";

    return (
        <Picker
            endpoint="/purchases"
            params={payable ? PAYABLE : RETURNABLE}
            placeholder={payable ? "Choose purchase with balance..." : "Choose eligible purchase..."}
            searchPlaceholder="Search by reference, invoice or supplier..."
            getLabel={purchaseLabel}
            getSubtitle={payable ? payableSubtitle : (p) => `${p.purchase_date} · Total: ${money(p.total)}`}
            {...props}
        />
    );
}

export function PurchaseOrderPicker(props) {
    return (
        <Picker
            endpoint="/purchase-orders"
            params={OPEN_ORDERS}
            placeholder="Select purchase order"
            searchPlaceholder="Search by reference or supplier..."
            getLabel={(po) => `${po.ref_no || `PO #${po.id}`}${po.supplier_name ? ` — ${po.supplier_name}` : ""}`}
            getSubtitle={(po) => `${po.order_date} · ${money(po.total)}`}
            {...props}
        />
    );
}
