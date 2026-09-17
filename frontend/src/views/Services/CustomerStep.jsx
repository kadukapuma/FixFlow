import { useEffect, useState } from "react";
import api from "../../api";

const EMPTY_FORM = { name: "", nic: "", phone: "", address: "" };

function CustomerStep({ customer, submitting, error, onNext, onChangeCustomer, onClose }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);

    useEffect(() => {
        if (!query.trim()) {
            return undefined;
        }

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
            <div className="wizard-form-container">
                <div className="wizard-body">
                    <div className="wizard-confirmed">
                        <div className="wizard-confirmed__card">
                            <strong>{customer.name}</strong>
                            <span>NIC: {customer.nic}</span>
                            <span>Phone: {customer.phone || "—"}</span>
                            {customer.address && <span>Address: {customer.address}</span>}
                        </div>
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            onClick={onChangeCustomer}
                        >
                            Change customer
                        </button>
                    </div>
                </div>

                <div className="wizard-footer">
                    <div className="wizard-footer__left">
                        <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                    <span className="wizard-footer__step-text">Step 1 of 4</span>
                    <div className="wizard-footer__right">
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--primary"
                            onClick={() => onNext({ mode: "existing", customer })}
                        >
                            Continue with this customer →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form className="wizard-form-container" onSubmit={handleNext}>
            <div className="wizard-body">
                {/* Search existing customer */}
                <div className="wizard-search-box">
                    <svg
                        className="wizard-search-icon"
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelected(null);
                        }}
                        placeholder="Search existing customer by NIC, phone, or name..."
                    />
                </div>

                {searching && <p className="wizard-hint">Searching customers...</p>}

                {visibleResults.length > 0 && (
                    <ul className="wizard-results">
                        {visibleResults.map((result) => (
                            <li key={result.id}>
                                <button
                                    type="button"
                                    className="wizard-result"
                                    onClick={() => handleSelect(result)}
                                >
                                    <div className="wizard-result__main">
                                        <strong>
                                            {result.name}
                                            {result.is_suspended && (
                                                <span className="wizard-suspended-tag">Suspended</span>
                                            )}
                                        </strong>
                                        <span>
                                            NIC: {result.nic} · Phone: {result.phone || "—"}
                                        </span>
                                    </div>
                                    <span className="tenant-btn tenant-btn--ghost tenant-btn--sm" style={{ padding: "4px 10px", fontSize: 12 }}>
                                        Select
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                {selected ? (
                    <div className="wizard-confirmed">
                        <div className="wizard-confirmed__card">
                            <strong>
                                {selected.name}
                                {selected.is_suspended && (
                                    <span className="wizard-suspended-tag">Suspended</span>
                                )}
                            </strong>
                            <span>NIC: {selected.nic}</span>
                            <span>Phone: {selected.phone || "—"}</span>
                            {selected.is_suspended && (
                                <p className="tenant-alert wizard-suspended-warning">
                                    This customer is suspended and cannot be booked for a new service.
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                            onClick={() => setSelected(null)}
                        >
                            Choose someone else
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="wizard-form-divider">
                            <span>Or register new customer</span>
                        </div>

                        <div className="wizard-field-row">
                            <label>
                                Full Name *
                                <input
                                    value={form.name}
                                    onChange={(e) => updateField("name", e.target.value)}
                                    placeholder="e.g. John Doe"
                                    required={!selected}
                                />
                            </label>

                            <label>
                                NIC / ID Number *
                                <input
                                    value={form.nic}
                                    onChange={(e) => updateField("nic", e.target.value)}
                                    placeholder="e.g. 200012345678"
                                    required={!selected}
                                />
                            </label>
                        </div>

                        <div className="wizard-field-row" style={{ marginTop: 10 }}>
                            <label>
                                Phone Number
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => updateField("phone", e.target.value)}
                                    placeholder="e.g. 077 123 4567"
                                />
                            </label>

                            <label>
                                Address
                                <input
                                    value={form.address}
                                    onChange={(e) => updateField("address", e.target.value)}
                                    placeholder="e.g. 123 Main St, City"
                                />
                            </label>
                        </div>
                    </>
                )}

                {error && (
                    <p className="tenant-alert" role="alert" style={{ marginTop: 12 }}>
                        {error}
                    </p>
                )}
            </div>

            <div className="wizard-footer">
                <div className="wizard-footer__left">
                    <button type="button" className="tenant-btn tenant-btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                </div>
                <span className="wizard-footer__step-text">Step 1 of 4</span>
                <div className="wizard-footer__right">
                    <button
                        type="submit"
                        className="tenant-btn tenant-btn--primary"
                        disabled={submitting || selected?.is_suspended}
                    >
                        {submitting ? "Saving..." : "Next: Device Item →"}
                    </button>
                </div>
            </div>
        </form>
    );
}

export default CustomerStep;
