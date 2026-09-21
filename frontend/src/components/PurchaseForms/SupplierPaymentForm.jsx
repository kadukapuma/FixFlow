import { useEffect, useMemo, useState } from "react";
import api from "../../api";

function getTodayString() {
    return new Date().toISOString().slice(0, 10);
}

function SupplierPaymentForm({
    initialPurchaseId = null,
    submitting,
    error,
    onSubmit,
    onCancel,
}) {
    const [purchases, setPurchases] = useState([]);
    const [selectedPurchaseId, setSelectedPurchaseId] = useState(() =>
        initialPurchaseId ? String(initialPurchaseId) : ""
    );
    const [kind, setKind] = useState("payment");
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState("cash");
    const [paidAt, setPaidAt] = useState(getTodayString);
    const [note, setNote] = useState("");

    useEffect(() => {
        let cancelled = false;

        api.get("/purchases", { params: { all: 1, payable: 1 } })
            .then((res) => {
                if (cancelled) return;
                setPurchases(res.data);

                if (initialPurchaseId) {
                    const match = res.data.find((p) => p.id === Number(initialPurchaseId));
                    if (match) {
                        const bal = Number(match.balance);
                        if (bal < -0.005) {
                            setKind("refund");
                            setAmount(Math.abs(bal).toFixed(2));
                        } else if (bal > 0.005) {
                            setKind("payment");
                            setAmount(bal.toFixed(2));
                        }
                    }
                }
            })
            .catch(() => {});

        return () => {
            cancelled = true;
        };
    }, [initialPurchaseId]);

    const activePurchase = useMemo(() => {
        return purchases.find((p) => p.id === Number(selectedPurchaseId)) || null;
    }, [purchases, selectedPurchaseId]);

    function handlePurchaseSelect(id) {
        setSelectedPurchaseId(id);
        const p = purchases.find((row) => row.id === Number(id));
        if (p) {
            const bal = Number(p.balance);
            if (bal < -0.005) {
                setKind("refund");
                setAmount(Math.abs(bal).toFixed(2));
            } else if (bal > 0.005) {
                setKind("payment");
                setAmount(bal.toFixed(2));
            }
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
                <select
                    value={selectedPurchaseId}
                    onChange={(e) => handlePurchaseSelect(e.target.value)}
                    required
                >
                    <option value="" disabled>
                        Choose purchase with balance...
                    </option>
                    {purchases.map((p) => {
                        const bal = Number(p.balance);
                        return (
                            <option key={p.id} value={p.id}>
                                {p.ref_no || `#${p.id}`} — {p.supplier_name} ({p.purchase_date}) —{" "}
                                {bal < 0 ? `Credit: Rs. ${Math.abs(bal).toFixed(2)}` : `Due: Rs. ${bal.toFixed(2)}`}
                            </option>
                        );
                    })}
                </select>
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
                <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    required
                >
                    <option value="payment">Payment to Supplier</option>
                    <option value="refund">Refund from Supplier</option>
                </select>
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
                <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    required
                >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                </select>
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
