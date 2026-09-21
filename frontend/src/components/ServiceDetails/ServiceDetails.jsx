import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import StatusBadge from "../StatusBadge/StatusBadge";
import { SERVICE_STATUS_META } from "../StatusBadge/serviceStatusMeta";
import Modal from "../Modal/Modal";
import DeliverPaymentForm from "../DeliverPaymentForm/DeliverPaymentForm";
import UnrepairableForm from "../UnrepairableForm/UnrepairableForm";
import ReturnUnrepairableForm from "../ReturnUnrepairableForm/ReturnUnrepairableForm";
import PdfViewerModal from "../PdfViewerModal/PdfViewerModal";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";
import "./ServiceDetails.css";

const EMPTY_PAYMENT_FORM = {
    amount: "",
    method: "cash",
    paid_at: "",
    note: "",
};

const STATUS_LEVELS = {
    pending: 1,
    in_progress: 2,
    completed: 3,
    delivered: 4,
    unrepairable: 3,
    returned_unrepairable: 4,
};

function commissionLabel(service) {
    if (service.commission_amount != null) {
        return `Rs. ${Number(service.commission_amount).toFixed(2)} earned`;
    }

    if (service.commission_type === "percentage") {
        return `${service.commission_value}% of price`;
    }

    return `Rs. ${Number(service.commission_value || 0).toFixed(2)}`;
}

function ServiceDetails({ serviceId, onUpdated }) {
    const [service, setService] = useState(null);
    const [workEntries, setWorkEntries] = useState([]);
    const [serviceProducts, setServiceProducts] = useState([]);
    const [payments, setPayments] = useState([]);

    const [price, setPrice] = useState("");
    const [advance, setAdvance] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [deliverModalOpen, setDeliverModalOpen] = useState(false);
    const [unrepairableModalOpen, setUnrepairableModalOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [markingUnrepairable, setMarkingUnrepairable] = useState(false);
    const [returning, setReturning] = useState(false);
    const [invoiceOpen, setInvoiceOpen] = useState(false);

    const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
    const [paymentError, setPaymentError] = useState("");
    const [recordingPayment, setRecordingPayment] = useState(false);

    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const [serviceResponse, workResponse, serviceProductsResponse, paymentsResponse] = await Promise.all([
                    api.get(`/services/${serviceId}`),
                    api.get("/work", {
                        params: { service_id: serviceId },
                    }),
                    api.get("/service-products", {
                        params: { service_id: serviceId },
                    }),
                    api.get(`/services/${serviceId}/payments`),
                ]);

                if (cancelled) return;

                const loadedService = serviceResponse.data;
                const loadedWork = workResponse.data || [];
                const loadedServiceProducts = serviceProductsResponse.data || [];
                const loadedPayments = paymentsResponse.data || [];

                setService(loadedService);
                setWorkEntries(loadedWork);
                setServiceProducts(loadedServiceProducts);
                setPayments(loadedPayments);

                const loadedWorkTotal = loadedWork.reduce(
                    (sum, entry) => sum + Number(entry.cost || 0),
                    0
                );
                const loadedProductsTotal = loadedServiceProducts.reduce(
                    (sum, entry) => sum + Number(entry.line_total ?? entry.quantity * entry.unit_price),
                    0
                );
                const loadedCombinedTotal = loadedWorkTotal + loadedProductsTotal;

                setPrice(
                    loadedService.price != null
                        ? String(loadedService.price)
                        : loadedCombinedTotal > 0
                        ? loadedCombinedTotal.toFixed(2)
                        : ""
                );

                setAdvance(
                    loadedService.advance_amount != null
                        ? String(loadedService.advance_amount)
                        : ""
                );
            } catch (err) {
                if (!cancelled) {
                    setError(getErrorMessage(err, "Unable to load service details."));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [serviceId]);

    const workTotal = workEntries.reduce(
        (sum, entry) => sum + Number(entry.cost || 0),
        0
    );

    const productsTotal = serviceProducts.reduce(
        (sum, entry) => sum + Number(entry.line_total ?? entry.quantity * entry.unit_price),
        0
    );

    const paidTotal = payments.reduce((sum, entry) => {
        const amt = Number(entry.amount || 0);
        return entry.kind === "refund" ? sum - amt : sum + amt;
    }, 0);

    const balanceDue =
        service?.price != null
            ? Math.max(0, Number(service.price) - paidTotal)
            : null;

    async function handleRecordPayment(event) {
        event.preventDefault();
        setRecordingPayment(true);
        setPaymentError("");

        try {
            const response = await api.post(`/services/${serviceId}/payments`, {
                amount: paymentForm.amount,
                method: paymentForm.method,
                paid_at: paymentForm.paid_at || undefined,
                note: paymentForm.note || undefined,
            });

            setPayments((prev) => [response.data.payment, ...prev]);
            setPaymentForm(EMPTY_PAYMENT_FORM);
            showToast("Payment recorded successfully.");
        } catch (err) {
            setPaymentError(getErrorMessage(err, "Unable to record payment."));
        } finally {
            setRecordingPayment(false);
        }
    }

    async function handleSavePrice(event) {
        event.preventDefault();

        if (!service) return;

        const hadPrice = service.price != null;
        const changed = Number(service.price) !== Number(price);

        if (hadPrice && changed) {
            const confirmed = await confirmAction({
                title: "Overwrite price?",
                message: `This service already has a price of Rs. ${Number(service.price).toFixed(2)}. Overwrite it with Rs. ${Number(price).toFixed(2)}?`,
                confirmLabel: "Overwrite",
                danger: true,
            });

            if (!confirmed) return;
        }

        setSaving(true);
        setError("");

        try {
            const response = await api.put(`/services/${serviceId}/price`, {
                price,
                advance_amount: advance === "" ? null : advance,
            });

            setService(response.data.service);
            showToast("Price updated successfully.");

            if (onUpdated) {
                onUpdated(response.data.service);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save price."));
        } finally {
            setSaving(false);
        }
    }

    async function handleDeliverWithPayment({ amount, method, deliveredDate }) {
        setDelivering(true);
        setError("");

        const amountToRecord = Math.min(Number(amount) || 0, balanceDue ?? 0);

        try {
            if (amountToRecord > 0) {
                const paymentResponse = await api.post(`/services/${serviceId}/payments`, {
                    amount: amountToRecord,
                    method,
                    paid_at: deliveredDate,
                    note: "Collected at delivery",
                });

                setPayments((prev) => [paymentResponse.data.payment, ...prev]);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to record payment."));
            setDelivering(false);
            return;
        }

        try {
            const response = await api.post(`/services/${serviceId}/deliver`, {
                delivered_date: deliveredDate,
            });

            setService(response.data.service);
            showToast("Service marked as delivered.");
            setDeliverModalOpen(false);

            if (onUpdated) {
                onUpdated(response.data.service);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to mark as delivered."));
        } finally {
            setDelivering(false);
        }
    }

    async function handleMarkUnrepairable({ reason, date, inspectionFee, partsDisposition }) {
        setMarkingUnrepairable(true);
        setError("");

        try {
            const response = await api.post(`/services/${serviceId}/unrepairable`, {
                unrepairable_reason: reason,
                unrepairable_date: date,
                inspection_fee: inspectionFee,
                parts_disposition: partsDisposition,
            });

            setService(response.data.service);
            setPrice(String(response.data.service.price ?? "0.00"));
            showToast("Service marked as unrepairable.");
            setUnrepairableModalOpen(false);

            // Reload products
            const spRes = await api.get("/service-products", { params: { service_id: serviceId } });
            setServiceProducts(spRes.data || []);

            if (onUpdated) {
                onUpdated(response.data.service);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to mark service as unrepairable."));
        } finally {
            setMarkingUnrepairable(false);
        }
    }

    async function handleReturnUnrepairable({ returnedDate, action, amount, method, note }) {
        setReturning(true);
        setError("");

        try {
            const response = await api.post(`/services/${serviceId}/return-unrepairable`, {
                returned_date: returnedDate,
                action,
                refund_amount: action === "refund" ? amount : undefined,
                refund_method: action === "refund" ? method : undefined,
                refund_note: action === "refund" ? note : undefined,
                collect_amount: action === "collect" ? amount : undefined,
                collect_method: action === "collect" ? method : undefined,
                collect_note: action === "collect" ? note : undefined,
            });

            setService(response.data.service);
            showToast("Item returned to customer.");
            setReturnModalOpen(false);

            // Reload payments
            const paymentsRes = await api.get(`/services/${serviceId}/payments`);
            setPayments(paymentsRes.data || []);

            if (onUpdated) {
                onUpdated(response.data.service);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Unable to process customer return."));
        } finally {
            setReturning(false);
        }
    }

    if (loading) {
        return (
            <div className="sd-loading-state">
                <div className="sd-spinner" />
                <span>Loading service details...</span>
            </div>
        );
    }

    if (!service) {
        return (
            <p className="tenant-alert" role="alert">
                {error || "Service not found."}
            </p>
        );
    }

    const isUnrepairableFlow = service.status === "unrepairable" || service.status === "returned_unrepairable";
    const currentLevel = isUnrepairableFlow
        ? service.status === "returned_unrepairable" ? 4 : 3
        : STATUS_LEVELS[service.status] || 1;

    const timelineSteps = [
        {
            key: "booked",
            level: 1,
            label: "Booked",
            date: service.service_date,
            isDone: currentLevel >= 1,
            isCurrent: currentLevel === 1,
            description: "Service created and registered",
        },
        {
            key: "started",
            level: 2,
            label: "Work Started",
            date: service.started_date || (currentLevel >= 2 ? "In progress" : "Pending"),
            isDone: currentLevel >= 2,
            isCurrent: currentLevel === 2,
            description: service.employee?.name ? `Assigned to ${service.employee.name}` : "Work in progress",
        },
        isUnrepairableFlow
            ? {
                key: "unrepairable",
                level: 3,
                label: "Unrepairable",
                date: service.unrepairable_date || "Declared unrepairable",
                isDone: currentLevel >= 3,
                isCurrent: currentLevel === 3,
                description: service.unrepairable_reason ? `Reason: ${service.unrepairable_reason}` : "Item cannot be repaired",
            }
            : {
                key: "completed",
                level: 3,
                label: "Completed",
                date: service.completed_date || (currentLevel >= 3 ? "Completed" : "Pending"),
                isDone: currentLevel >= 3,
                isCurrent: currentLevel === 3,
                description: "Repairs finished & ready for billing",
            },
        isUnrepairableFlow
            ? {
                key: "returned",
                level: 4,
                label: "Returned",
                date: service.returned_date || (currentLevel >= 4 ? "Returned" : "Awaiting customer pickup"),
                isDone: currentLevel >= 4,
                isCurrent: currentLevel === 4,
                description: "Handed over to customer unrepaired",
            }
            : {
                key: "delivered",
                level: 4,
                label: "Delivered",
                date: service.delivered_date || (currentLevel >= 4 ? "Delivered" : "Pending"),
                isDone: currentLevel >= 4,
                isCurrent: currentLevel === 4,
                description: "Handed over to customer",
            },
    ];

    return (
        <div className="sd-root">
            {error && (
                <p className="tenant-alert" role="alert" style={{ marginBottom: 12 }}>
                    {error}
                </p>
            )}

            {/* UNIFIED HERO HEADER */}
            <header className="sd-header">
                <div className="sd-header__main">
                    <div className="sd-header__title-row">
                        <h3 className="sd-header__item-name">
                            {service.item?.name || "Service Item"}
                        </h3>
                        <span className="sd-header__ref-badge">
                            {service.ref_no ? service.ref_no : `#${service.id}`}
                        </span>
                        {service.ref_no && (
                            <span className="sd-header__id-tag">
                                ID #{service.id}
                            </span>
                        )}
                    </div>

                    <div className="sd-header__meta">
                        <span className="sd-header__meta-item" title="Customer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                            <strong>{service.customer?.name || "Unknown Customer"}</strong>
                            {service.customer?.phone && (
                                <span className="sd-header__phone">
                                    · {service.customer.phone}
                                </span>
                            )}
                        </span>

                        <span className="sd-header__meta-divider">•</span>

                        <span className="sd-header__meta-item" title="Technician">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span>Tech: <strong>{service.employee?.name || "Unassigned"}</strong></span>
                        </span>
                    </div>
                </div>

                <div className="sd-header__aside">
                    <StatusBadge status={service.status} meta={SERVICE_STATUS_META} />

                    <button
                        type="button"
                        className={`sd-header__finance-btn ${
                            balanceDue && balanceDue > 0
                                ? "sd-header__finance-btn--due"
                                : "sd-header__finance-btn--paid"
                        }`}
                        onClick={() => setActiveTab("billing")}
                        title="Click to manage pricing and payments"
                    >
                        <span className="sd-header__finance-label">
                            {service.price != null
                                ? `Rs. ${Number(service.price).toFixed(2)}`
                                : "Price Pending"}
                        </span>
                        <span className="sd-header__finance-sub">
                            {service.price != null
                                ? balanceDue > 0
                                    ? `Due: Rs. ${balanceDue.toFixed(2)}`
                                    : "Paid in full"
                                : "Set price →"}
                        </span>
                    </button>
                </div>
            </header>

            {/* TAB NAVIGATION BAR */}
            <nav className="sd-nav-tabs" aria-label="Service Details Tabs">
                <button
                    type="button"
                    className={`sd-nav-tab ${activeTab === "overview" ? "sd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18" />
                        <path d="M15 9h3" />
                        <path d="M15 15h3" />
                    </svg>
                    <span>Overview</span>
                </button>

                <button
                    type="button"
                    className={`sd-nav-tab ${activeTab === "timeline" ? "sd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("timeline")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Lifecycle</span>
                    <span className="sd-tab-indicator sd-tab-indicator--step">
                        {currentLevel}/4
                    </span>
                </button>

                <button
                    type="button"
                    className={`sd-nav-tab ${activeTab === "work" ? "sd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("work")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    <span>Line Items</span>
                    {workEntries.length > 0 && (
                        <span className="sd-tab-indicator">
                            {workEntries.length}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    className={`sd-nav-tab ${activeTab === "billing" ? "sd-nav-tab--active" : ""}`}
                    onClick={() => setActiveTab("billing")}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                    </svg>
                    <span>Billing & Payments</span>
                    {payments.length > 0 && (
                        <span className={`sd-tab-indicator ${balanceDue > 0 ? "sd-tab-indicator--due" : "sd-tab-indicator--paid"}`}>
                            {payments.length}
                        </span>
                    )}
                </button>
            </nav>

            {/* TAB CONTENT PANELS */}
            <div className="sd-content-area">
                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                    <div className="sd-tab-pane sd-tab-pane--overview">
                        <div className="sd-overview-grid">
                            {/* CARD 1: DEVICE & ACCESSORIES */}
                            <div className="sd-card">
                                <div className="sd-card__head">
                                    <h4 className="sd-card__title">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="2" y="3" width="20" height="14" rx="2" />
                                            <line x1="8" y1="21" x2="16" y2="21" />
                                            <line x1="12" y1="17" x2="12" y2="21" />
                                        </svg>
                                        Device & Accessories
                                    </h4>
                                </div>
                                <div className="sd-card__body">
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Item Name</span>
                                        <span className="sd-data-row__value">{service.item?.name || "—"}</span>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Model & Serial</span>
                                        <span className="sd-data-row__value">
                                            {service.item?.model || "—"}
                                            {service.item?.serial_number ? ` · ${service.item.serial_number}` : ""}
                                        </span>
                                    </div>
                                    <div className="sd-data-row sd-data-row--tags">
                                        <span className="sd-data-row__label">Handed-over Items</span>
                                        {service.received_items && service.received_items.length > 0 ? (
                                            <div className="sd-tag-list">
                                                {service.received_items.map((ri) => (
                                                    <span key={ri.id} className="sd-tag">
                                                        ✓ {ri.item_name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="sd-data-row__sub">None recorded</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CARD 2: CUSTOMER & STAFF */}
                            <div className="sd-card">
                                <div className="sd-card__head">
                                    <h4 className="sd-card__title">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                            <circle cx="12" cy="7" r="4" />
                                        </svg>
                                        Customer & Staff
                                    </h4>
                                </div>
                                <div className="sd-card__body">
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Customer Name</span>
                                        <span className="sd-data-row__value">{service.customer?.name || "—"}</span>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">NIC Number</span>
                                        <span className="sd-data-row__value">{service.customer?.nic || "—"}</span>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Phone Number</span>
                                        <span className="sd-data-row__value">
                                            {service.customer?.phone ? (
                                                <a href={`tel:${service.customer.phone}`} className="sd-link">
                                                    {service.customer.phone}
                                                </a>
                                            ) : (
                                                "—"
                                            )}
                                        </span>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Assigned Technician</span>
                                        <span className="sd-data-row__value sd-data-row__value--highlight">
                                            {service.employee?.name || "Unassigned"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* CARD 3: ISSUE & SERVICE INFO */}
                            <div className="sd-card">
                                <div className="sd-card__head">
                                    <h4 className="sd-card__title">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        Issue & Service Info
                                    </h4>
                                </div>
                                <div className="sd-card__body">
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Reported Fault</span>
                                        <div className="sd-fault-box">
                                            {service.fault || "None specified"}
                                        </div>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Service Date</span>
                                        <span className="sd-data-row__value">{service.service_date || "—"}</span>
                                    </div>
                                    <div className="sd-data-row">
                                        <span className="sd-data-row__label">Internal Remarks</span>
                                        <span className="sd-data-row__sub">
                                            {service.note || "No internal notes recorded"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 2: LIFECYCLE */}
                {activeTab === "timeline" && (
                    <div className="sd-tab-pane sd-tab-pane--timeline">
                        <div className="sd-timeline-container">
                            <div className="sd-timeline-head">
                                <div>
                                    <h4 className="sd-pane-title">Service Lifecycle & Milestones</h4>
                                    <p className="sd-pane-desc">Track step-by-step progress from intake to customer delivery</p>
                                </div>
                                <div className="sd-timeline-status-badge">
                                    <span>Current Status:</span>
                                    <strong>{service.status.replace("_", " ").toUpperCase()}</strong>
                                </div>
                            </div>

                            <div className="sd-timeline">
                                <div className="sd-timeline__line-bg" />
                                <div
                                    className="sd-timeline__line-active"
                                    style={{
                                        width: `${((currentLevel - 1) / (timelineSteps.length - 1)) * 100}%`,
                                    }}
                                />

                                {timelineSteps.map((step) => {
                                    const stepClass = step.isDone
                                        ? "sd-timeline__step--done"
                                        : step.isCurrent
                                        ? "sd-timeline__step--current"
                                        : "sd-timeline__step--pending";

                                    return (
                                        <div key={step.key} className={`sd-timeline__step ${stepClass}`}>
                                            <div className="sd-timeline__node">
                                                {step.isDone ? "✓" : step.level}
                                            </div>
                                            <div className="sd-timeline__info">
                                                <div className="sd-timeline__heading">
                                                    <span className="sd-timeline__label">{step.label}</span>
                                                    <span className="sd-timeline__date">{step.date || "Pending"}</span>
                                                </div>
                                                <span className="sd-timeline__desc">{step.description}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="sd-timeline-footer">
                                <div className="sd-timeline-footer__info">
                                    <span className="sd-timeline-footer__icon">ℹ️</span>
                                    <span>
                                        {service.status === "completed"
                                            ? "Technician work is completed. Service can now be delivered once price and payment are settled."
                                            : service.status === "delivered"
                                            ? `Delivered to customer on ${service.delivered_date || "record"}. Order is finalized.`
                                            : "Service order is currently active. Progress updates automatically as technicians log actions."}
                                    </span>
                                </div>

                                <div className="sd-timeline-footer__actions">
                                    {service.status === "completed" && service.price != null && (
                                        <button
                                            type="button"
                                            className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                            disabled={delivering}
                                            onClick={() => setDeliverModalOpen(true)}
                                        >
                                            Mark as Delivered
                                        </button>
                                    )}
                                    {service.status === "delivered" && (
                                        <button
                                            type="button"
                                            className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                            onClick={() => setInvoiceOpen(true)}
                                        >
                                            View Invoice (PDF)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: WORK LOG */}
                {activeTab === "work" && (
                    <div className="sd-tab-pane sd-tab-pane--work">
                        <div className="sd-work-card">
                            <div className="sd-work-head">
                                <div>
                                    <h4 className="sd-pane-title">Work Performed & Replacement Parts</h4>
                                    <p className="sd-pane-desc">Tasks, repairs, and components logged by assigned technicians</p>
                                </div>

                                <div className="sd-work-total-badge">
                                    <span>Total Work Cost:</span>
                                    <strong>Rs. {workTotal.toFixed(2)}</strong>
                                </div>
                            </div>

                            {workEntries.length > 0 ? (
                                <div className="sd-table-wrap">
                                    <table className="sd-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 48 }}>#</th>
                                                <th>Description / Task</th>
                                                <th style={{ textAlign: "right", width: 140 }}>Cost (Rs.)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workEntries.map((entry, idx) => (
                                                <tr key={entry.id || idx}>
                                                    <td className="sd-table__cell-index">{idx + 1}</td>
                                                    <td className="sd-table__cell-desc">{entry.description || "—"}</td>
                                                    <td className="sd-table__cell-cost">
                                                        Rs. {Number(entry.cost || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={2}>Total Work Cost</td>
                                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                                    Rs. {workTotal.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="sd-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                    </svg>
                                    <h5>No work entries recorded</h5>
                                    <p>Technicians have not logged tasks or spare parts for this service yet.</p>
                                </div>
                            )}
                        </div>

                        <div className="sd-work-card">
                            <div className="sd-work-head">
                                <div>
                                    <h4 className="sd-pane-title">Products Added</h4>
                                    <p className="sd-pane-desc">Catalog items sold as part of this service</p>
                                </div>

                                <div className="sd-work-total-badge">
                                    <span>Total Products Cost:</span>
                                    <strong>Rs. {productsTotal.toFixed(2)}</strong>
                                </div>
                            </div>

                            {serviceProducts.length > 0 ? (
                                <div className="sd-table-wrap">
                                    <table className="sd-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 48 }}>#</th>
                                                <th>Product</th>
                                                <th style={{ textAlign: "right", width: 80 }}>Qty</th>
                                                <th style={{ textAlign: "right", width: 140 }}>Unit Price (Rs.)</th>
                                                <th style={{ textAlign: "right", width: 140 }}>Line Total (Rs.)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {serviceProducts.map((entry, idx) => (
                                                <tr key={entry.id || idx}>
                                                    <td className="sd-table__cell-index">{idx + 1}</td>
                                                    <td className="sd-table__cell-desc">
                                                        {entry.product?.name || "—"}
                                                        {entry.disposition === "restocked" && (
                                                            <span style={{ marginLeft: 8, fontSize: "0.72rem", padding: "2px 6px", borderRadius: 4, background: "#e0f2fe", color: "#0369a1", fontWeight: 600 }}>
                                                                Restocked
                                                            </span>
                                                        )}
                                                        {entry.disposition === "written_off" && (
                                                            <span style={{ marginLeft: 8, fontSize: "0.72rem", padding: "2px 6px", borderRadius: 4, background: "#ffedd5", color: "#c2410c", fontWeight: 600 }}>
                                                                Shop Write-off
                                                            </span>
                                                        )}
                                                        {entry.disposition === "charged" && (
                                                            <span style={{ marginLeft: 8, fontSize: "0.72rem", padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#15803d", fontWeight: 600 }}>
                                                                Billed to Customer
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: "right" }}>{entry.quantity}</td>
                                                    <td className="sd-table__cell-cost">
                                                        Rs. {Number(entry.unit_price || 0).toFixed(2)}
                                                    </td>
                                                    <td className="sd-table__cell-cost">
                                                        Rs. {Number(entry.line_total ?? entry.quantity * entry.unit_price).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={4}>Total Products Cost</td>
                                                <td style={{ textAlign: "right", fontWeight: 700 }}>
                                                    Rs. {productsTotal.toFixed(2)}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ) : (
                                <div className="sd-empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                        <path d="M20.5 7.3 12 3 3.5 7.3 12 11.6l8.5-4.3ZM3.5 7.3v9.4L12 21l8.5-4.3V7.3M12 11.6V21" />
                                    </svg>
                                    <h5>No products added</h5>
                                    <p>No catalog products have been added to this service yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* TAB 4: BILLING & PAYMENTS */}
                {activeTab === "billing" && (
                    <div className="sd-tab-pane sd-tab-pane--billing">
                        {/* KPI METRIC CARDS */}
                        <div className="sd-kpi-bar">
                            <div className="sd-kpi-card">
                                <span className="sd-kpi-card__label">Final Service Price</span>
                                <span className="sd-kpi-card__value">
                                    {service.price != null
                                        ? `Rs. ${Number(service.price).toFixed(2)}`
                                        : service.status === "completed"
                                        ? "Ready to set"
                                        : "Pending completion"}
                                </span>
                            </div>

                            <div className="sd-kpi-card">
                                <span className="sd-kpi-card__label">Total Customer Paid</span>
                                <span className="sd-kpi-card__value">
                                    Rs. {paidTotal.toFixed(2)}
                                </span>
                            </div>

                            <div
                                className={`sd-kpi-card ${
                                    service.price != null
                                        ? balanceDue > 0
                                            ? "sd-kpi-card--due"
                                            : "sd-kpi-card--paid"
                                        : ""
                                }`}
                            >
                                <span className="sd-kpi-card__label">Balance Due</span>
                                <span className="sd-kpi-card__value">
                                    {service.price != null
                                        ? balanceDue > 0
                                            ? `Rs. ${balanceDue.toFixed(2)}`
                                            : "Paid in full"
                                        : "Pending price"}
                                </span>
                            </div>
                        </div>

                        {/* 2-COLUMN SPLIT */}
                        <div className="sd-billing-grid">
                            {/* LEFT COLUMN: PRICING & ACTIONS */}
                            <div className="sd-billing-col">
                                <div className="sd-panel">
                                    <div className="sd-panel__head">
                                        <h4 className="sd-panel__title">Price Settings & Handover</h4>
                                    </div>

                                    {service.status === "completed" ? (
                                        <form className="sd-panel-compact-form" onSubmit={handleSavePrice}>
                                            <div className="sd-form-row">
                                                <label>
                                                    Final Price (Rs.)
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        required
                                                    />
                                                </label>

                                                <label>
                                                    Advance Received (Rs.)
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={advance}
                                                        onChange={(e) => setAdvance(e.target.value)}
                                                        placeholder="e.g. 500.00"
                                                    />
                                                </label>
                                            </div>

                                            {price !== "" && !Number.isNaN(Number(price)) && (
                                                <div className="sd-form-calc-note">
                                                    Expected Balance Due:{" "}
                                                    <strong>
                                                        Rs. {(Number(price) - paidTotal).toFixed(2)}
                                                    </strong>
                                                </div>
                                            )}

                                            <div className="sd-form-actions">
                                                {service.price != null && (
                                                    <button
                                                        type="button"
                                                        className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                        disabled={delivering}
                                                        onClick={() => setDeliverModalOpen(true)}
                                                    >
                                                        Mark as delivered
                                                    </button>
                                                )}

                                                <button
                                                    type="submit"
                                                    className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                    disabled={saving}
                                                >
                                                    {saving ? "Saving..." : "Save price"}
                                                </button>
                                            </div>
                                        </form>
                                    ) : service.status === "delivered" ? (
                                        <div className="sd-delivered-banner">
                                            <div className="sd-delivered-banner__icon">✓</div>
                                            <div className="sd-delivered-banner__text">
                                                <strong>Delivered on {service.delivered_date || "record"}</strong>
                                                <p>This service order is fully settled and handed over.</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                onClick={() => setInvoiceOpen(true)}
                                            >
                                                View Invoice (PDF)
                                            </button>
                                        </div>
                                    ) : service.status === "unrepairable" ? (
                                        <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 8, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                                            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                                                <div style={{ background: "#e11d48", color: "#fff", width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 13, flexShrink: 0 }}>✕</div>
                                                <div style={{ flex: 1 }}>
                                                    <strong style={{ color: "#9f1239", fontSize: "0.92rem" }}>Item Declared Unrepairable</strong>
                                                    <p style={{ margin: "3px 0 0", color: "#881337", fontSize: "0.84rem" }}>
                                                        {service.unrepairable_reason ? `Reason: ${service.unrepairable_reason}` : "Item cannot be repaired."}
                                                        {service.unrepairable_date ? ` (Diagnosed: ${service.unrepairable_date})` : ""}
                                                    </p>
                                                    <div style={{ marginTop: 6, fontSize: "0.84rem", color: "#9f1239" }}>
                                                        Fee / Price: <strong>Rs. {Number(service.price || 0).toFixed(2)}</strong>
                                                        {paidTotal > 0 && <span> · Net Paid: <strong>Rs. {paidTotal.toFixed(2)}</strong></span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: "1px dashed #fecdd3", paddingTop: 8 }}>
                                                <button
                                                    type="button"
                                                    className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                    onClick={() => setReturnModalOpen(true)}
                                                >
                                                    Return to Customer
                                                </button>
                                            </div>
                                        </div>
                                    ) : service.status === "returned_unrepairable" ? (
                                        <div className="sd-delivered-banner" style={{ borderLeftColor: "#64748b" }}>
                                            <div className="sd-delivered-banner__icon" style={{ background: "#64748b" }}>✓</div>
                                            <div className="sd-delivered-banner__text">
                                                <strong>Returned to Customer on {service.returned_date || "record"}</strong>
                                                <p>
                                                    This unrepaired item has been returned and settled.
                                                    {service.unrepairable_reason && ` Reason: ${service.unrepairable_reason}`}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="sd-notice-box">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            <div style={{ flex: 1 }}>
                                                <strong>Service is {service.status === "in_progress" ? "In Progress" : "Pending"}</strong>
                                                <p>
                                                    Final price setup and customer handover are enabled once the technician completes work.
                                                    {service.status === "in_progress" && " You can still record any advance payments from the right."}
                                                </p>
                                                <div style={{ marginTop: 8 }}>
                                                    <button
                                                        type="button"
                                                        className="tenant-btn tenant-btn--danger tenant-btn--sm"
                                                        onClick={() => setUnrepairableModalOpen(true)}
                                                    >
                                                        Mark Unrepairable
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* TECHNICIAN COMMISSION */}
                                {service.commission_type && (
                                    <div className="sd-panel">
                                        <div className="sd-panel__head">
                                            <h4 className="sd-panel__title">Technician Commission</h4>
                                        </div>
                                        <div className="sd-commission-box">
                                            <span>{service.employee?.name || "Technician"}</span>
                                            <strong>{commissionLabel(service)}</strong>
                                        </div>
                                        {service.commission_amount != null && (
                                            <span className="sd-commission-sub">
                                                Paid out and settled from Commissions tab.
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: PAYMENTS & RECORD FORM */}
                            <div className="sd-billing-col">
                                <div className="sd-panel">
                                    <div className="sd-panel__head">
                                        <h4 className="sd-panel__title">Customer Payment History</h4>
                                        <span className="sd-panel__badge">{payments.length} recorded</span>
                                    </div>

                                    {payments.length > 0 ? (
                                        <div className="sd-payment-table-wrap">
                                            <table className="sd-payment-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Method</th>
                                                        <th>Note</th>
                                                        <th style={{ textAlign: "right" }}>Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {payments.map((entry) => (
                                                        <tr key={entry.id}>
                                                            <td>{entry.paid_at || "—"}</td>
                                                            <td>
                                                                <span
                                                                    className="sd-method-badge"
                                                                    style={{
                                                                        background: entry.kind === "refund" ? "#ffe4e6" : undefined,
                                                                        color: entry.kind === "refund" ? "#be123c" : undefined,
                                                                    }}
                                                                >
                                                                    {entry.kind === "refund" ? "Refund · " : ""}
                                                                    {entry.method}
                                                                </span>
                                                            </td>
                                                            <td className="sd-payment-note">{entry.note || "—"}</td>
                                                            <td
                                                                className="sd-payment-amount"
                                                                style={{
                                                                    color: entry.kind === "refund" ? "#e11d48" : undefined,
                                                                }}
                                                            >
                                                                {entry.kind === "refund" ? "- " : ""}Rs.{" "}
                                                                {Number(entry.amount || 0).toFixed(2)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="sd-empty-text">No customer payments recorded yet.</p>
                                    )}
                                </div>

                                {/* RECORD PAYMENT FORM — available from in_progress onward, including
                                    after delivery so a customer can settle a remaining balance later. */}
                                {service.status !== "pending" && (
                                    <div className="sd-panel">
                                        <div className="sd-panel__head">
                                            <h4 className="sd-panel__title">Record Payment</h4>
                                        </div>

                                        <form className="sd-panel-compact-form" onSubmit={handleRecordPayment}>
                                            <div className="sd-form-grid-4">
                                                <label>
                                                    Amount (Rs.)
                                                    <input
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={paymentForm.amount}
                                                        onChange={(e) =>
                                                            setPaymentForm((prev) => ({
                                                                ...prev,
                                                                amount: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </label>

                                                <label>
                                                    Method
                                                    <select
                                                        value={paymentForm.method}
                                                        onChange={(e) =>
                                                            setPaymentForm((prev) => ({
                                                                ...prev,
                                                                method: e.target.value,
                                                            }))
                                                        }
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="bank">Bank</option>
                                                        <option value="upi">UPI</option>
                                                        <option value="card">Card</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </label>

                                                <label>
                                                    Date
                                                    <input
                                                        type="date"
                                                        value={paymentForm.paid_at}
                                                        onChange={(e) =>
                                                            setPaymentForm((prev) => ({
                                                                ...prev,
                                                                paid_at: e.target.value,
                                                            }))
                                                        }
                                                    />
                                                </label>

                                                <label>
                                                    Note
                                                    <input
                                                        value={paymentForm.note}
                                                        onChange={(e) =>
                                                            setPaymentForm((prev) => ({
                                                                ...prev,
                                                                note: e.target.value,
                                                            }))
                                                        }
                                                        placeholder="Optional"
                                                    />
                                                </label>
                                            </div>

                                            {paymentError && (
                                                <p className="tenant-alert" role="alert">
                                                    {paymentError}
                                                </p>
                                            )}

                                            <div className="sd-form-actions">
                                                <button
                                                    type="submit"
                                                    className="tenant-btn tenant-btn--primary tenant-btn--sm"
                                                    disabled={recordingPayment}
                                                >
                                                    {recordingPayment ? "Recording..." : "Record Payment"}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* DELIVERY MODAL */}
            {deliverModalOpen && (
                <Modal title="Mark as delivered" onClose={() => setDeliverModalOpen(false)}>
                    <DeliverPaymentForm
                        balanceDue={balanceDue}
                        submitting={delivering}
                        error={error}
                        onSubmit={handleDeliverWithPayment}
                        onCancel={() => setDeliverModalOpen(false)}
                    />
                </Modal>
            )}

            {/* INVOICE MODAL */}
            {invoiceOpen && (
                <PdfViewerModal
                    title={`Invoice — Service #${serviceId}`}
                    pdfUrl={`/services/${serviceId}/invoice`}
                    onClose={() => setInvoiceOpen(false)}
                />
            )}

            {/* UNREPAIRABLE MODAL */}
            {unrepairableModalOpen && (
                <Modal
                    title={`Mark Service #${serviceId} as Unrepairable`}
                    onClose={() => setUnrepairableModalOpen(false)}
                    maxWidth={680}
                >
                    <UnrepairableForm
                        serviceProducts={serviceProducts}
                        submitting={markingUnrepairable}
                        error={error}
                        onSubmit={handleMarkUnrepairable}
                        onCancel={() => setUnrepairableModalOpen(false)}
                    />
                </Modal>
            )}

            {/* RETURN UNREPAIRABLE MODAL */}
            {returnModalOpen && (
                <Modal
                    title={`Return Unrepaired Item — Service #${serviceId}`}
                    onClose={() => setReturnModalOpen(false)}
                    maxWidth={640}
                >
                    <ReturnUnrepairableForm
                        service={service}
                        payments={payments}
                        submitting={returning}
                        error={error}
                        onSubmit={handleReturnUnrepairable}
                        onCancel={() => setReturnModalOpen(false)}
                    />
                </Modal>
            )}
        </div>
    );
}

export default ServiceDetails;
