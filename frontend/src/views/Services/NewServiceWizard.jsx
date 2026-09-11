import { useState } from "react";
import api, { getErrorMessage } from "../../api";
import Modal from "../../components/Modal/Modal";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import { showToast } from "../../lib/toast";
import CustomerStep from "./CustomerStep";
import ItemStep from "./ItemStep";
import ServiceDetailsStep from "./ServiceDetailsStep";

const STEPS = [
    { key: 1, label: "Customer" },
    { key: 2, label: "Item" },
    { key: 3, label: "Details" },
];

function NewServiceWizard({ onClose, onCreated }) {
    const [step, setStep] = useState(1);
    const [customer, setCustomer] = useState(null);
    const [item, setItem] = useState(null);
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

    async function handleServiceSubmit(values) {
        setError("");
        setSubmitting(true);

        try {
            const response = await api.post("/services", {
                ref_no: values.ref_no,
                item_id: item.id,
                customer_id: customer.id,
                employee_id: values.employee_id,
                fault: values.fault,
                note: values.note,
                status: "pending",
                price: values.price === "" ? null : values.price,
                service_date: values.service_date,
            });
            showToast(`Service #${response.data.service.id} created.`);
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
                <Modal title="Service created" onClose={handleDone} maxWidth={480}>
                    <div className="wizard-step">
                        <p>
                            Service <strong>#{createdService.id}</strong> was created successfully. You can view and
                            print the customer's service document now, or later from the services list.
                        </p>
                        <div className="tenant-form__actions">
                            <button type="button" className="tenant-btn tenant-btn--ghost" onClick={handleDone}>
                                Done
                            </button>
                            <button
                                type="button"
                                className="tenant-btn tenant-btn--primary"
                                onClick={() => setPdfOpen(true)}
                            >
                                View / Print PDF
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

    return (
        <Modal title="New service" onClose={onClose} maxWidth={640}>
            <div className="wizard-steps">
                {STEPS.map((s) => (
                    <div
                        key={s.key}
                        className={`wizard-steps__item ${
                            step === s.key ? "is-active" : step > s.key ? "is-done" : ""
                        }`}
                    >
                        <span>{s.key}</span>
                        {s.label}
                    </div>
                ))}
            </div>

            {step === 1 && (
                <CustomerStep
                    customer={customer}
                    submitting={submitting}
                    error={error}
                    onNext={handleCustomerNext}
                    onChangeCustomer={handleChangeCustomer}
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
                    submitting={submitting}
                    error={error}
                    onSubmit={handleServiceSubmit}
                    onBack={() => setStep(2)}
                />
            )}
        </Modal>
    );
}

export default NewServiceWizard;
