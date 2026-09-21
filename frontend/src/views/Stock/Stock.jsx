import { useCallback, useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import { usePressedRow } from "../../lib/usePressedRow";

const TYPE_LABELS = {
    opening: "Opening stock",
    adjustment: "Adjustment",
    damage: "Damage",
    transfer_out: "Transfer out",
    transfer_in: "Transfer in",
    service_consumption: "Used on service",
    service_restock: "Returned from service",
};

function StockMovementsDetail({ productId, storeId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/stock/movements", {
                    params: { product_id: productId, store_id: storeId },
                });
                if (!cancelled) setData(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load stock history."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [productId, storeId]);

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading stock history...</span>
            </div>
        );
    }

    if (error) {
        return (
            <p className="tenant-alert" role="alert">
                {error}
            </p>
        );
    }

    if (!data) return null;

    return (
        <div className="sd-root">
            <div className="sd-header">
                <div className="sd-header__main">
                    <div className="sd-header__title-row">
                        <h3 className="sd-header__item-name">{data.product_name}</h3>
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item">{data.store_name}</span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div className="sd-header__finance-btn" style={{ cursor: "default" }}>
                        <span className="sd-header__finance-label">{data.current_stock}</span>
                        <span className="sd-header__finance-sub">In stock</span>
                    </div>
                </div>
            </div>

            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div>
                        <h4 className="sd-pane-title">Movement History</h4>
                        <p className="sd-pane-desc">Every stock change recorded for this product at this store</p>
                    </div>

                    <div className="sd-work-total-badge">
                        <span>Movements:</span>
                        <strong>{data.movements.length}</strong>
                    </div>
                </div>

                {data.movements.length > 0 ? (
                    <div className="sd-table-wrap">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Note</th>
                                    <th style={{ textAlign: "right" }}>Quantity</th>
                                    <th style={{ textAlign: "right" }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.movements.map((movement) => (
                                    <tr key={movement.id}>
                                        <td>{movement.created_at}</td>
                                        <td className="sd-table__cell-desc">
                                            {TYPE_LABELS[movement.type] || movement.type}
                                        </td>
                                        <td>{movement.note || "—"}</td>
                                        <td className="sd-table__cell-cost">
                                            {movement.quantity > 0 ? `+${movement.quantity}` : movement.quantity}
                                        </td>
                                        <td className="sd-table__cell-cost">{movement.running_balance}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="sd-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3ZM3.5 7.3v9.4L12 21l8.5-4.3V7.3M12 11.6V21" />
                        </svg>
                        <h5>No movements yet</h5>
                        <p>Nothing has been recorded for this product at this store.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Stock({ shellProps }) {
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selected, setSelected] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    const load = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/stock/levels");
            setLevels(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load stock levels."));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        load();
    }, [load]);

    return (
        <TenantShell
            {...shellProps}
            title="Stock"
            subtitle="Current stock for each product at each store."
            error={error}
        >
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Stock levels</h2>
                        <span className="tenant-card__stat">{levels.length} product/store lines</span>
                    </div>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Store</th>
                                <th>Current stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={3} rows={5} />
                            ) : (
                                levels.map((row) => {
                                    const key = `${row.product_id}-${row.store_id}`;

                                    return (
                                        <tr
                                            key={key}
                                            data-toggle
                                            className={pressedId === key ? "tenant-row--pressed" : ""}
                                            onClick={() => setSelected(row)}
                                            {...pressHandlers(key)}
                                        >
                                            <td data-label="Product" className="mobile-summary">
                                                <div className="tenant-cell">
                                                    <strong>{row.product_name}</strong>
                                                </div>
                                            </td>
                                            <td data-label="Store">{row.store_name}</td>
                                            <td data-label="Current stock">
                                                <strong>{row.current_stock}</strong>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {!loading && levels.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="tenant-table-empty">
                                        No stock recorded yet. Add an opening stock entry to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selected && (
                <Modal
                    title="Stock History"
                    onClose={() => setSelected(null)}
                    maxWidth={820}
                    className="modal-card--account-details"
                >
                    <StockMovementsDetail productId={selected.product_id} storeId={selected.store_id} />
                </Modal>
            )}

        </TenantShell>
    );
}

export default Stock;
