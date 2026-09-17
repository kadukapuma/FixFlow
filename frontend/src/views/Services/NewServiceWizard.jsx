import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import Modal from "../../components/Modal/Modal";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import { showToast } from "../../lib/toast";
import CustomerStep from "./CustomerStep";
import ItemStep from "./ItemStep";
import ServiceDetailsStep from "./ServiceDetailsStep";
import ReceivedItemsStep from "./ReceivedItemsStep";

const STEPS = [
    { key: 1, label: "Customer", desc: "Select or register" },
    { key: 2, label: "Device Item", desc: "Select or add item" },
    { key: 3, label: "Service Details", desc: "Diagnostics & terms" },
    { key: 4, label: "Handover Items", desc: "Accessories received" },
];

function NewServiceWizard({ onClose, onCreated }) {
    const [step, setStep] = useState(1);
    const [customer, setCustomer] = useState(null);
    const [item, setItem] = useState(null);
    const [serviceDetails, setServiceDetails] = useState(null);
    const [receivedItemIds, setReceivedItemIds] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [createdService, setCreatedService] = useState(null);
    const [pdfOpen, setPdfOpen] = useState(false);

    function resolveCustomer(newCustomer) {
        if (customer && customer.id !== newCustomer.id) {
            setItem(null);
        }
        setCustomer(newCustomer);
        setStep(2);
    }

    async function handleCustomerNext(payload) {
        setError("");

        if (payload.mode === "existing") {
            resolveCustomer(payload.customer);
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post("/customers", payload.values);
            resolveCustomer(response.data.customer);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save customer."));
        } finally {
            setSubmitting(false);
        }
    }

    function handleChangeCustomer() {
        setCustomer(null);
        setItem(null);
        setError("");
    }

    async function handleItemNext(payload) {
        setError("");

        if (item) {
            setStep(3);
            return;
        }

        if (payload.mode === "existing") {
            setItem(payload.item);
            setStep(3);
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post("/items", { ...payload.values, customer_id: customer.id });
            setItem(response.data.item);
            setStep(3);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save item."));
        } finally {
            setSubmitting(false);
        }
    }

    function handleDetailsNext(values) {
        setError("");
        setServiceDetails(values);
        setStep(4);
    }

    async function handleFinalSubmit(itemIds) {
        setError("");
        setSubmitting(true);

        try {
            const response = await api.post("/services", {
                ref_no: serviceDetails.ref_no,
                item_id: item.id,
                customer_id: customer.id,
                employee_id: serviceDetails.employee_id,
                fault: serviceDetails.fault,
                note: serviceDetails.note,
                status: "pending",
                price: serviceDetails.price === "" ? null : serviceDetails.price,
                advance_amount: serviceDetails.advance_amount === "" ? null : serviceDetails.advance_amount,
                commission_type: serviceDetails.commission_type === "" ? null : serviceDetails.commission_type,
                commission_value: serviceDetails.commission_value === "" ? null : serviceDetails.commission_value,
                service_date: serviceDetails.service_date,
                item_ids: itemIds,
            });
            showToast(`Service #${response.data.service.id} created successfully.`);
            setCreatedService({ ...response.data.service, pdf_url: response.data.pdf_url });
        } catch (err) {
            setError(getErrorMessage(err, "Unable to save service."));
        } finally {
            setSubmitting(false);
        }
    }

    function handleDone() {
        onCreated(createdService);
    }

    if (createdService) {
        return (
            <>
                <Modal title="Service Created Successfully" onClose={handleDone} maxWidth={480}>
                    <div style={{ padding: "8px 0" }}>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: 12,
                                padding: "14px 16px",
                                marginBottom: 16,
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: "50%",
                                    background: "#10b981",
                                    color: "#fff",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                }}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <strong style={{ color: "#065f46", fontSize: 15 }}>
                                    Service #{createdService.id} Booked
                                </strong>
                                <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>
                                    The repair request has been logged into the system.
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: "#6b6b63", marginBottom: 20 }}>
                            You can view, print, or download the customer intake document with full job details and barcodes.
                        </p>

                        <div className="tenant-form__actions" style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                            <button type="button" className="tenant-btn tenant-btn--ghost" onClick={handleDone}>
                                Done
                            </button>
                            <button
                                type="button"
                                className="tenant-btn tenant-btn--primary"
                                onClick={() => setPdfOpen(true)}
                            >
                                View / Print PDF Document
                            </button>
                        </div>
                    </div>
                </Modal>

                {pdfOpen && (
                    <PdfViewerModal
                        title={`Service #${createdService.id}`}
                        pdfUrl={createdService.pdf_url}
                        onClose={() => setPdfOpen(false)}
                    />
                )}
            </>
        );
    }

    const currentStepObj = STEPS.find((s) => s.key === step) || STEPS[0];

    return (
        <Modal
            title="New Service Intake"
            onClose={onClose}
            maxWidth={920}
            className="modal-card--service-wizard"
        >
            <div className="wizard-container">
                {/* Stepper Header */}
                <header className="wizard-header">
                    {/* Desktop Stepper */}
                    <div className="wizard-stepper--desktop">
                        {STEPS.map((s, index) => {
                            const isActive = step === s.key;
                            const isDone = step > s.key;
                            return (
                                <div key={s.key} style={{ display: "flex", alignItems: "center", flex: index < STEPS.length - 1 ? 1 : "none" }}>
                                    <div className={`wizard-step-node ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}>
                                        <div className="wizard-step-bubble">
                                            {isDone ? (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            ) : (
                                                s.key
                                            )}
                                        </div>
                                        <div className="wizard-step-info">
                                            <span className="wizard-step-title">{s.label}</span>
                                            <span className="wizard-step-sub">{s.desc}</span>
                                        </div>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`wizard-step-line ${isDone ? "is-done" : ""}`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile Stepper */}
                    <div className="wizard-stepper--mobile">
                        <div className="wizard-stepper--mobile__top">
                            <div className="wizard-stepper--mobile__badge">
                                <span>Step {step} of 4</span>
                                <span className="wizard-stepper--mobile__step-name">{currentStepObj.label}</span>
                            </div>
                            <span style={{ fontSize: 12, color: "#8c8a80", fontWeight: 600 }}>
                                {Math.round((step / 4) * 100)}%
                            </span>
                        </div>
                        <div className="wizard-stepper--mobile__track">
                            <div
                                className="wizard-stepper--mobile__fill"
                                style={{ width: `${(step / 4) * 100}%` }}
                            />
                        </div>
                    </div>
                </header>

                {/* Step Panes */}
                {step === 1 && (
                    <CustomerStep
                        customer={customer}
                        submitting={submitting}
                        error={error}
                        onNext={handleCustomerNext}
                        onChangeCustomer={handleChangeCustomer}
                        onClose={onClose}
                    />
                )}

                {step === 2 && customer && (
                    <ItemStep
                        customer={customer}
                        item={item}
                        submitting={submitting}
                        error={error}
                        onNext={handleItemNext}
                        onBack={() => setStep(1)}
                    />
                )}

                {step === 3 && customer && item && (
                    <ServiceDetailsStep
                        customer={customer}
                        item={item}
                        initialValues={serviceDetails}
                        submitting={submitting}
                        error={error}
                        onSubmit={handleDetailsNext}
                        onBack={() => setStep(2)}
                    />
                )}

                {step === 4 && customer && item && serviceDetails && (
                    <ReceivedItemsStep
                        customer={customer}
                        item={item}
                        selectedIds={receivedItemIds}
                        onChangeSelectedIds={setReceivedItemIds}
                        submitting={submitting}
                        error={error}
                        onSubmit={handleFinalSubmit}
                        onBack={() => setStep(3)}
                    />
                )}
            </div>
        </Modal>
    );
}

export default NewServiceWizard;
