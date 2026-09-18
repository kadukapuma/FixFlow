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
        return <TableSkeleton columns={5} rows={5} />;
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
        <div>
            <div className="tenant-cell" style={{ marginBottom: 16 }}>
                <strong>
                    {data.code} · {data.name}
                </strong>
                <span>
                    Balance: Rs. {Number(data.balance).toFixed(2)} ({data.type})
                </span>
            </div>

            <div className="tenant-table-scroll">
                <table className="tenant-table--collapsible">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Contra account</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.entries.map((entry) => (
                            <tr key={entry.id}>
                                <td data-label="Date">{entry.entry_date}</td>
                                <td data-label="Description">{entry.description || "—"}</td>
                                <td data-label="Contra account">
                                    {entry.contra_accounts.length > 0 ? entry.contra_accounts.join(", ") : "—"}
                                </td>
                                <td data-label="Debit">{entry.debit > 0 ? `Rs. ${entry.debit.toFixed(2)}` : "—"}</td>
                                <td data-label="Credit">{entry.credit > 0 ? `Rs. ${entry.credit.toFixed(2)}` : "—"}</td>
                                <td data-label="Balance">Rs. {entry.running_balance.toFixed(2)}</td>
                            </tr>
                        ))}

                        {data.entries.length === 0 && (
                            <tr>
                                <td colSpan={6} className="tenant-table-empty">
                                    No transactions yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Accounts({ shellProps }) {
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
        <TenantShell
            {...shellProps}
            title="Accounts"
            subtitle="Chart of accounts and financial activity."
            error={error}
        >
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
                    title={`${selectedAccount.code} · ${selectedAccount.name}`}
                    onClose={() => setSelectedAccount(null)}
                >
                    <AccountDetail accountId={selectedAccount.id} />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Accounts;
