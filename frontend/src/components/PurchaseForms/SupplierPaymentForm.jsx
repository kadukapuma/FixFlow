import { useEffect, useState } from "react";
import api from "../../api";
import Picker from "../Picker/Picker";
import { PurchasePicker } from "../Picker/presets";
import { PAYMENT_METHODS } from "../../lib/options";

const PAYMENT_KINDS = [
    { id: "payment", name: "Payment to Supplier" },
    { id: "refund", name: "Refund from Supplier" },
];

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

// A balance owed to the supplier defaults to a payment of that amount; a credit
// balance defaults to a refund. Settled purchases leave the form as it is.
function defaultsFor(purchase) {
    const balance = Number(purchase.balance);
    if (balance < -0.005) return { kind: "refund", amount: Math.abs(balance).toFixed(2) };
    if (balance > 0.005) return { kind: "payment", amount: balance.toFixed(2) };
    return null;
}

function SupplierPaymentForm({
    initialPurchaseId = null,
    submitting,
    error,
    onSubmit,
    onCancel,
}) {
    const [selectedPurchaseId, setSelectedPurchaseId] = useState(() =>
        initialPurchaseId ? String(initialPurchaseId) : ""
    );
    const [activePurchase, setActivePurchase] = useState(null);
    const [kind, setKind] = useState("payment");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [paidAt, setPaidAt] = useState(getTodayString);
    const [note, setNote] = useState("");

    useEffect(() => {
        if (!initialPurchaseId) return;

        let cancelled = false;

        api.get("/purchases", { params: { all: 1, payable: 1, ids: initialPurchaseId } })
            .then((res) => {
                const match = res.data[0];
                if (cancelled || !match) return;

                setActivePurchase(match);
                const defaults = defaultsFor(match);
                if (defaults) {
                    setKind(defaults.kind);
                    setAmount(defaults.amount);
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [initialPurchaseId]);

    function handlePurchaseSelect(id, purchase) {
        setSelectedPurchaseId(id);
        setActivePurchase(purchase);

        const defaults = purchase && defaultsFor(purchase);
        if (defaults) {
            setKind(defaults.kind);
            setAmount(defaults.amount);
        }
    }

    function handleSubmit(e) {
        e.preventDefault();

        const payload = {
            purchase_id: Number(selectedPurchaseId),
            kind,
            amount: parseFloat(amount),
            method,
            paid_at: paidAt,
            note: note.trim() || null,
        };

        onSubmit(payload);
    }

    const currentBalance = activePurchase ? Number(activePurchase.balance) : 0;
    const isCredit = currentBalance < -0.005;

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleSubmit}>
            <label className="pf-field-full">
                Select Purchase *
                <PurchasePicker
                    mode="payable"
                    value={selectedPurchaseId}
                    onChange={handlePurchaseSelect}
                    required
                />
            </label>

            {activePurchase && (
                <div
                    className="pf-field-full"
                    style={{
                        padding: "10px 14px",
                        background: isCredit ? "rgba(170, 59, 255, 0.08)" : "#fbfaf6",
                        border: "1px solid #eeece3",
                        borderRadius: 8,
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                    }}
                >
                    <span>
                        Supplier: <strong>{activePurchase.supplier_name}</strong> | Total:{" "}
                        <strong>Rs. {Number(activePurchase.total).toFixed(2)}</strong>
                    </span>
                    <span>
                        {isCredit ? (
                            <span style={{ color: "#aa3bff", fontWeight: 700 }}>
                                Supplier owes credit: Rs. {Math.abs(currentBalance).toFixed(2)}
                            </span>
                        ) : (
                            <span style={{ color: "#c22b3a", fontWeight: 700 }}>
                                Balance due: Rs. {currentBalance.toFixed(2)}
                            </span>
                        )}
                    </span>
                </div>
            )}

            <label>
                Transaction Kind *
                <Picker options={PAYMENT_KINDS} value={kind} onChange={setKind} />
            </label>

            <label>
                Amount (Rs.) *
                <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                />
            </label>

            <label>
                Payment Method *
                <Picker options={PAYMENT_METHODS} value={method} onChange={setMethod} />
            </label>

            <label>
                Payment Date *
                <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    required
                />
            </label>

            <label className="pf-field-full">
                Notes
                <input
                    type="text"
                    maxLength={255}
                    placeholder="Reference, transaction code, or bank receipt details"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                />
            </label>

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
                    disabled={submitting || !selectedPurchaseId || !(parseFloat(amount) > 0)}
                >
                    {submitting ? "Recording..." : kind === "refund" ? "Record Refund" : "Record Payment"}
                </button>
            </div>
        </form>
    );
}

export default SupplierPaymentForm;
