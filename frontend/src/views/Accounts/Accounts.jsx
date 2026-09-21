import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import TableSkeleton from "../../components/TableSkeleton/TableSkeleton";
import { usePressedRow } from "../../lib/usePressedRow";

function AccountDetail({ accountId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/ledger-accounts/${accountId}`);
                if (!cancelled) setData(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load account statement."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [accountId]);

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading account statement...</span>
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
                        <h3 className="sd-header__item-name">{data.name}</h3>
                        <span className="sd-header__ref-badge">{data.code}</span>
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item" style={{ textTransform: "capitalize" }}>
                            {data.type} account
                        </span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div className="sd-header__finance-btn" style={{ cursor: "default" }}>
                        <span className="sd-header__finance-label">Rs. {Number(data.balance).toFixed(2)}</span>
                        <span className="sd-header__finance-sub">Current balance</span>
                    </div>
                </div>
            </div>

            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div>
                        <h4 className="sd-pane-title">Transaction History</h4>
                        <p className="sd-pane-desc">All journal entries posted to this account</p>
                    </div>

                    <div className="sd-work-total-badge">
                        <span>Entries:</span>
                        <strong>{data.entries.length}</strong>
                    </div>
                </div>

                {data.entries.length > 0 ? (
                    <div className="sd-table-wrap">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Description</th>
                                    <th>Contra account</th>
                                    <th style={{ textAlign: "right" }}>Debit</th>
                                    <th style={{ textAlign: "right" }}>Credit</th>
                                    <th style={{ textAlign: "right" }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{entry.entry_date}</td>
                                        <td className="sd-table__cell-desc">{entry.description || "—"}</td>
                                        <td>{entry.contra_accounts.length > 0 ? entry.contra_accounts.join(", ") : "—"}</td>
                                        <td className="sd-table__cell-cost">
                                            {entry.debit > 0 ? `Rs. ${entry.debit.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            {entry.credit > 0 ? `Rs. ${entry.credit.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="sd-table__cell-cost">Rs. {entry.running_balance.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="sd-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M4 4h16v4H4V4ZM4 10h16M4 10v10h16V10M8 14h3M8 17h3M13 14h3M13 17h3" />
                        </svg>
                        <h5>No transactions yet</h5>
                        <p>Nothing has posted to this account.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function CustomerBalanceDetail({ customerId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/customer-balances/${customerId}`);
                if (!cancelled) setData(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load customer statement."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [customerId]);

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading customer statement...</span>
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
                        <h3 className="sd-header__item-name">{data.name}</h3>
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item sd-header__phone">{data.phone || "—"}</span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div
                        className={`sd-header__finance-btn ${data.balance > 0 ? "sd-header__finance-btn--due" : "sd-header__finance-btn--paid"}`}
                        style={{ cursor: "default" }}
                    >
                        <span className="sd-header__finance-label">Rs. {Number(data.balance).toFixed(2)}</span>
                        <span className="sd-header__finance-sub">Balance due</span>
                    </div>
                </div>
            </div>

            <div className="sd-kpi-bar">
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Billed</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.total_billed).toFixed(2)}</span>
                </div>
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Paid</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.total_paid).toFixed(2)}</span>
                </div>
                <div className={`sd-kpi-card ${data.balance > 0 ? "sd-kpi-card--due" : "sd-kpi-card--paid"}`}>
                    <span className="sd-kpi-card__label">Balance Due</span>
                    <span className="sd-kpi-card__value">
                        {data.balance > 0 ? `Rs. ${Number(data.balance).toFixed(2)}` : "Paid in full"}
                    </span>
                </div>
            </div>

            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div>
                        <h4 className="sd-pane-title">Services</h4>
                        <p className="sd-pane-desc">Every service billed to this customer</p>
                    </div>

                    <div className="sd-work-total-badge">
                        <span>Services:</span>
                        <strong>{data.services.length}</strong>
                    </div>
                </div>

                {data.services.length > 0 ? (
                    <div className="sd-table-wrap">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Ref / ID</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Price</th>
                                    <th style={{ textAlign: "right" }}>Paid</th>
                                    <th style={{ textAlign: "right" }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.services.map((service) => (
                                    <tr key={service.id}>
                                        <td className="sd-table__cell-desc">{service.ref_no || `#${service.id}`}</td>
                                        <td>{service.service_date || "—"}</td>
                                        <td style={{ textTransform: "capitalize" }}>{service.status.replace("_", " ")}</td>
                                        <td className="sd-table__cell-cost">
                                            {service.price != null ? `Rs. ${service.price.toFixed(2)}` : "—"}
                                        </td>
                                        <td className="sd-table__cell-cost">Rs. {service.paid.toFixed(2)}</td>
                                        <td className="sd-table__cell-cost">
                                            {service.balance != null ? `Rs. ${service.balance.toFixed(2)}` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="sd-empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M14.7 6.3a4 4 0 0 1-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 1 5.4-5.4L21 6l-3-3-3.3 3.3Z" />
                        </svg>
                        <h5>No services yet</h5>
                        <p>This customer has no billed services.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function LedgerAccountsSection() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedAccount, setSelectedAccount] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/ledger-accounts");
                if (!cancelled) setAccounts(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load accounts."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            {error && (
                <p className="tenant-alert" role="alert">
                    {error}
                </p>
            )}

            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Ledger accounts</h2>
                        <span className="tenant-card__stat">{accounts.length} total</span>
                    </div>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={4} rows={5} />
                            ) : (
                                accounts.map((account) => (
                                    <tr
                                        key={account.id}
                                        data-toggle
                                        className={pressedId === account.id ? "tenant-row--pressed" : ""}
                                        onClick={() => setSelectedAccount(account)}
                                        {...pressHandlers(account.id)}
                                    >
                                        <td data-label="Code">{account.code}</td>
                                        <td data-label="Name" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{account.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Type" style={{ textTransform: "capitalize" }}>
                                            {account.type}
                                        </td>
                                        <td data-label="Balance">Rs. {Number(account.balance).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}

                            {!loading && accounts.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="tenant-table-empty">
                                        No accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedAccount && (
                <Modal
                    title="Account Statement"
                    onClose={() => setSelectedAccount(null)}
                    maxWidth={820}
                    className="modal-card--account-details"
                >
                    <AccountDetail accountId={selectedAccount.id} />
                </Modal>
            )}
        </>
    );
}

function CustomerBalancesSection() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/customer-balances");
                if (!cancelled) setCustomers(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load customer balances."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <>
            {error && (
                <p className="tenant-alert" role="alert">
                    {error}
                </p>
            )}

            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Customer balances</h2>
                        <span className="tenant-card__stat">{customers.length} with balance due</span>
                    </div>
                </div>

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Phone</th>
                                <th>Total billed</th>
                                <th>Total paid</th>
                                <th>Balance due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={5} rows={5} />
                            ) : (
                                customers.map((customer) => (
                                    <tr
                                        key={customer.customer_id}
                                        data-toggle
                                        className={pressedId === customer.customer_id ? "tenant-row--pressed" : ""}
                                        onClick={() => setSelectedCustomer(customer)}
                                        {...pressHandlers(customer.customer_id)}
                                    >
                                        <td data-label="Customer" className="mobile-summary">
                                            <div className="tenant-cell">
                                                <strong>{customer.name}</strong>
                                            </div>
                                        </td>
                                        <td data-label="Phone">{customer.phone || "—"}</td>
                                        <td data-label="Total billed">Rs. {Number(customer.total_billed).toFixed(2)}</td>
                                        <td data-label="Total paid">Rs. {Number(customer.total_paid).toFixed(2)}</td>
                                        <td data-label="Balance due">
                                            <strong>Rs. {Number(customer.balance).toFixed(2)}</strong>
                                        </td>
                                    </tr>
                                ))
                            )}

                            {!loading && customers.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="tenant-table-empty">
                                        No customers currently owe a balance.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedCustomer && (
                <Modal
                    title="Customer Statement"
                    onClose={() => setSelectedCustomer(null)}
                    maxWidth={820}
                    className="modal-card--account-details"
                >
                    <CustomerBalanceDetail customerId={selectedCustomer.customer_id} />
                </Modal>
            )}
        </>
    );
}

function SupplierBalanceDetail({ supplierId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/supplier-balances/${supplierId}`);
                if (!cancelled) setData(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load supplier statement."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [supplierId]);

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading supplier statement...</span>
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

    const balance = Number(data.balance);
    const hasDue = balance > 0.005;
    const isCredit = balance < -0.005;

    return (
        <div className="sd-root">
            <div className="sd-header">
                <div className="sd-header__main">
                    <div className="sd-header__title-row">
                        <h3 className="sd-header__item-name">{data.name}</h3>
                        {data.contact_person && (
                            <span className="sd-header__ref-badge">{data.contact_person}</span>
                        )}
                    </div>
                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item sd-header__phone">{data.phone || "—"}</span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <div
                        className={`sd-header__finance-btn ${
                            hasDue
                                ? "sd-header__finance-btn--due"
                                : isCredit
                                ? "sd-header__finance-btn--credit"
                                : "sd-header__finance-btn--paid"
                        }`}
                        style={{ cursor: "default" }}
                    >
                        <span className="sd-header__finance-label">
                            {isCredit
                                ? `Credit Rs. ${Math.abs(balance).toFixed(2)}`
                                : `Rs. ${balance.toFixed(2)}`}
                        </span>
                        <span className="sd-header__finance-sub">
                            {hasDue ? "Balance due" : isCredit ? "Supplier credit" : "Settled"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="sd-kpi-bar">
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Purchased</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.total_purchased).toFixed(2)}</span>
                </div>
                <div className="sd-kpi-card">
                    <span className="sd-kpi-card__label">Total Paid</span>
                    <span className="sd-kpi-card__value">Rs. {Number(data.total_paid).toFixed(2)}</span>
                </div>
                <div
                    className={`sd-kpi-card ${
                        hasDue ? "sd-kpi-card--due" : isCredit ? "sd-kpi-card--credit" : "sd-kpi-card--paid"
                    }`}
                >
                    <span className="sd-kpi-card__label">Net Balance</span>
                    <span className="sd-kpi-card__value">
                        {isCredit
                            ? `Credit Rs. ${Math.abs(balance).toFixed(2)}`
                            : hasDue
                            ? `Rs. ${balance.toFixed(2)}`
                            : "Paid in full"}
                    </span>
                </div>
            </div>

            <div className="sd-work-card" style={{ flex: "1 1 auto", minHeight: 0 }}>
                <div className="sd-work-head">
                    <div>
                        <h4 className="sd-pane-title">Purchases</h4>
                        <p className="sd-pane-desc">Every active purchase order billed by this supplier</p>
                    </div>

                    <div className="sd-work-total-badge">
                        <span>Purchases:</span>
                        <strong>{data.purchases.length}</strong>
                    </div>
                </div>

                {data.purchases.length > 0 ? (
                    <div className="sd-table-wrap">
                        <table className="sd-table">
                            <thead>
                                <tr>
                                    <th>Ref / ID</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: "right" }}>Total</th>
                                    <th style={{ textAlign: "right" }}>Returned</th>
                                    <th style={{ textAlign: "right" }}>Paid</th>
                                    <th style={{ textAlign: "right" }}>Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.purchases.map((purchase) => (
                                    <tr key={purchase.id}>
                                        <td className="sd-table__cell-desc">
                                            {purchase.ref_no || `#${purchase.id}`}
                                        </td>
                                        <td>{purchase.purchase_date || "—"}</td>
                                        <td style={{ textTransform: "capitalize" }}>
                                            {purchase.payment_status}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            Rs. {Number(purchase.total).toFixed(2)}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            {purchase.returned > 0
                                                ? `Rs. ${Number(purchase.returned).toFixed(2)}`
                                                : "—"}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            Rs. {Number(purchase.paid).toFixed(2)}
                                        </td>
                                        <td className="sd-table__cell-cost">
                                            <strong
                                                style={{
                                                    color:
                                                        purchase.balance > 0.005
                                                            ? "#c22b3a"
                                                            : purchase.balance < -0.005
                                                            ? "#aa3bff"
                                                            : "#1c8a53",
                                                }}
                                            >
                                                {purchase.balance < -0.005
                                                    ? `Credit Rs. ${Math.abs(purchase.balance).toFixed(2)}`
                                                    : `Rs. ${Number(purchase.balance).toFixed(2)}`}
                                            </strong>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="sd-empty-state">
                        <h5>No purchases recorded</h5>
                        <p>This supplier has no active billed purchases.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function SupplierBalancesSection() {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const { pressedId, pressHandlers } = usePressedRow();

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/supplier-balances");
                if (!cancelled) setSuppliers(response.data);
            } catch (err) {
                if (!cancelled) setError(getErrorMessage(err, "Unable to load supplier balances."));
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, []);

    const totalPayable = suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0);

    return (
        <>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Supplier Balances (Accounts Payable)</h2>
                        <span className="tenant-card__stat">{suppliers.length} suppliers with balance</span>
                    </div>

                    {!loading && suppliers.length > 0 && (
                        <div style={{ fontSize: 13, color: "#6b6b63" }}>
                            Total AP Balance:{" "}
                            <strong style={{ color: totalPayable > 0 ? "#c22b3a" : "#1c8a53", fontSize: 15 }}>
                                Rs. {totalPayable.toFixed(2)}
                            </strong>
                        </div>
                    )}
                </div>

                {error && (
                    <p className="tenant-alert" role="alert">
                        {error}
                    </p>
                )}

                <div className="tenant-table-scroll">
                    <table className="tenant-table--collapsible">
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th style={{ textAlign: "right" }}>Total Purchased</th>
                                <th style={{ textAlign: "right" }}>Total Paid</th>
                                <th style={{ textAlign: "right" }}>Balance Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton columns={6} rows={5} />
                            ) : (
                                suppliers.map((s) => {
                                    const bal = Number(s.balance);
                                    const isCredit = bal < -0.005;

                                    return (
                                        <tr
                                            key={s.supplier_id}
                                            data-toggle
                                            className={pressedId === s.supplier_id ? "tenant-row--pressed" : ""}
                                            onClick={() => setSelectedSupplier(s)}
                                            {...pressHandlers(s.supplier_id)}
                                        >
                                            <td data-label="Supplier" className="mobile-summary">
                                                <div className="tenant-cell">
                                                    <strong>{s.name}</strong>
                                                </div>
                                            </td>
                                            <td data-label="Contact">{s.contact_person || "—"}</td>
                                            <td data-label="Phone">{s.phone || "—"}</td>
                                            <td data-label="Total purchased" style={{ textAlign: "right" }}>
                                                Rs. {Number(s.total_purchased).toFixed(2)}
                                            </td>
                                            <td data-label="Total paid" style={{ textAlign: "right" }}>
                                                Rs. {Number(s.total_paid).toFixed(2)}
                                            </td>
                                            <td data-label="Balance due" style={{ textAlign: "right" }}>
                                                <strong
                                                    style={{
                                                        color: isCredit ? "#aa3bff" : "#c22b3a",
                                                    }}
                                                >
                                                    {isCredit
                                                        ? `Credit: Rs. ${Math.abs(bal).toFixed(2)}`
                                                        : `Rs. ${bal.toFixed(2)}`}
                                                </strong>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}

                            {!loading && suppliers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        No suppliers currently have an outstanding balance or credit.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {selectedSupplier && (
                <Modal
                    title="Supplier Statement"
                    onClose={() => setSelectedSupplier(null)}
                    maxWidth={820}
                    className="modal-card--account-details"
                >
                    <SupplierBalanceDetail supplierId={selectedSupplier.supplier_id} />
                </Modal>
            )}
        </>
    );
}

function Accounts({ shellProps }) {
    const [activeTab, setActiveTab] = useState("ledger");

    return (
        <TenantShell
            {...shellProps}
            title="Accounts"
            subtitle="Chart of accounts, customer balances, and financial activity."
        >
            <div className="tenant-form__actions" style={{ justifyContent: "flex-start", marginBottom: 14 }}>
                <button
                    type="button"
                    className={`tenant-btn tenant-btn--sm ${activeTab === "ledger" ? "tenant-btn--primary" : "tenant-btn--ghost"}`}
                    onClick={() => setActiveTab("ledger")}
                >
                    Ledger Accounts
                </button>
                <button
                    type="button"
                    className={`tenant-btn tenant-btn--sm ${activeTab === "customers" ? "tenant-btn--primary" : "tenant-btn--ghost"}`}
                    onClick={() => setActiveTab("customers")}
                >
                    Customer Balances
                </button>
                <button
                    type="button"
                    className={`tenant-btn tenant-btn--sm ${activeTab === "suppliers" ? "tenant-btn--primary" : "tenant-btn--ghost"}`}
                    onClick={() => setActiveTab("suppliers")}
                >
                    Supplier Balances
                </button>
            </div>

            {activeTab === "ledger" && <LedgerAccountsSection />}
            {activeTab === "customers" && <CustomerBalancesSection />}
            {activeTab === "suppliers" && <SupplierBalancesSection />}
        </TenantShell>
    );
}

export default Accounts;
