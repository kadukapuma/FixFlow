export function computeLineTotal(item) {
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const unitCost = Math.max(0, parseFloat(item.unit_cost) || 0);
    const gross = qty * unitCost;

    const discountVal = Math.max(0, parseFloat(item.discount_value) || 0);
    let net;

    if (item.discount_type === "percent") {
        net = gross - gross * (discountVal / 100);
    } else {
        net = gross - discountVal;
    }

    return Math.max(0, Math.round(net * 100) / 100);
}
