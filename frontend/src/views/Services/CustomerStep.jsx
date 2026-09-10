import { useEffect, useState } from "react";
import api from "../../api";

const EMPTY_FORM = { name: "", nic: "", phone: "", address: "" };

function CustomerStep({ customer, submitting, error, onNext, onChangeCustomer }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        if (!query.trim()) {
            return undefined;
        }

        // Debounced-search loading flag — the standard react.dev pattern for
        // effect-driven fetches; flagged only because this file is small enough
        // for the compiler linter to fully analyze (see Services.jsx for detail).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSearching(true);

        const timeout = setTimeout(() => {
            api.get("/customers/search", { params: { q: query.trim() } })
                .then((response) => setResults(response.data))
                .finally(() => setSearching(false));
        }, 300);

        return () => clearTimeout(timeout);
    }, [query]);

    const visibleResults = query.trim() ? results : [];

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSelect(result) {
        setSelected(result);
        setResults([]);
        setQuery("");
    }

    function handleNext(event) {
        event.preventDefault();

        if (selected?.is_suspended) {
            return;
        }

        if (selected) {
            onNext({ mode: "existing", customer: selected });
        } else {
            onNext({ mode: "new", values: form });
        }
    }

    if (customer) {
        return (
            <div className="wizard-confirmed">
                <div className="wizard-confirmed__card">
                    <strong>{customer.name}</strong>
                    <span>{customer.nic}</span>
                    <span>{customer.phone || "—"}</span>
                </div>
                <button type="button" className="tenant-btn tenant-btn--ghost tenant-btn--sm" onClick={onChangeCustomer}>
                    Change customer
                </button>
            </div>
        );
    }

    return (
        <form className="tenant-form tenant-form--2col" onSubmit={handleNext}>
            <label className="wizard-full">
                Search existing customer
                <input
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSelected(null);
                    }}
                    placeholder="Search by NIC, phone, or name"
                />
            </label>

            {searching && <p className="wizard-hint wizard-full">Searching...</p>}

            {visibleResults.length > 0 && (
                <ul className="wizard-results wizard-full">
                    {visibleResults.map((result) => (
                        <li key={result.id}>
                            <button type="button" className="wizard-result" onClick={() => handleSelect(result)}>
                                <strong>
                                    {result.name}
                                    {result.is_suspended && <span className="wizard-suspended-tag">Suspended</span>}
                                </strong>
                                <span>
                                    {result.nic} · {result.phone || "—"}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {selected ? (
                <div className="wizard-confirmed wizard-full">
                    <div className="wizard-confirmed__card">
                        <strong>
                            {selected.name}
                            {selected.is_suspended && <span className="wizard-suspended-tag">Suspended</span>}
                        </strong>
                        <span>{selected.nic}</span>
                        <span>{selected.phone || "—"}</span>
                        {selected.is_suspended && (
                            <p className="tenant-alert wizard-suspended-warning">
                                This customer is suspended and can&apos;t be booked for a new service.
                            </p>
                        )}
                    </div>
                    <button type="button" className="tenant-btn tenant-btn--ghost tenant-btn--sm" onClick={() => setSelected(null)}>
                        Choose someone else
                    </button>
                </div>
            ) : (
                <>
                    <p className="wizard-hint wizard-full">Or add a new customer:</p>

                    <label>
                        Name
                        <input value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
                    </label>

                    <label>
                        NIC
                        <input value={form.nic} onChange={(e) => updateField("nic", e.target.value)} required />
                    </label>

                    <label>
                        Phone
                        <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                    </label>

                    <label>
                        Address
                        <input value={form.address} onChange={(e) => updateField("address", e.target.value)} />
                    </label>
                </>
            )}

            {error && (
                <p className="tenant-alert tenant-form__error" role="alert">
                    {error}
                </p>
            )}

            <div className="tenant-form__actions">
                <button
                    type="submit"
                    className="tenant-btn tenant-btn--primary"
                    disabled={submitting || selected?.is_suspended}
                >
                    {submitting ? "Saving..." : "Next"}
                </button>
            </div>
        </form>
    );
}

export default CustomerStep;
