import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import CustomerForm from "../../components/CustomerForm/CustomerForm";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";

function Customers({ shellProps }) {
    const [customers, setCustomers] = useState([]);
    const [error, setError] = useState("");
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            const response = await api.get("/customers");
            setCustomers(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load customers."));
        }
    }

    function openEditModal(customer) {
        setEditingCustomer(customer);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingCustomer(null);
    }

    async function handleSubmit(values) {
        const confirmed = await confirmAction({
            title: "Save changes?",
            message: `Save changes to ${editingCustomer.name}?`,
            confirmLabel: "Save",
        });
        if (!confirmed) return;

        setSubmitting(true);
        setFormError("");

        try {
            await api.put(`/customers/${editingCustomer.id}`, values);
            showToast("Customer updated.");
            closeModal();
            loadCustomers();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save customer."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleSuspended(customer) {
        const confirmed = await confirmAction({
            title: customer.is_suspended ? "Reinstate customer?" : "Suspend customer?",
            message: customer.is_suspended
                ? `Reinstate ${customer.name}? They'll be able to book new services again.`
                : `Suspend ${customer.name}? They won't be able to book new services.`,
            confirmLabel: customer.is_suspended ? "Reinstate" : "Suspend",
            danger: !customer.is_suspended,
        });

        if (!confirmed) return;

        setBusyId(customer.id);
        setError("");

        try {
            const action = customer.is_suspended ? "unsuspend" : "suspend";
            await api.post(`/customers/${customer.id}/${action}`);
            showToast(customer.is_suspended ? "Customer reinstated." : "Customer suspended.");
            loadCustomers();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update customer status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(customer) {
        const confirmed = await confirmAction({
            title: "Delete customer?",
            message: `Delete ${customer.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(customer.id);
        setError("");

        try {
            await api.delete(`/customers/${customer.id}`);
            showToast("Customer deleted.");
            loadCustomers();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete customer.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell {...shellProps} title="Customers" subtitle="Everyone who has used your service center." error={error}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <h2>Customers</h2>
                </div>

                <div className="tenant-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>NIC</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Suspended</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer) => (
                                <tr key={customer.id}>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{customer.name}</strong>
                                        </div>
                                    </td>
                                    <td>{customer.nic}</td>
                                    <td>{customer.phone || "—"}</td>
                                    <td>{customer.address || "—"}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={customer.is_suspended}
                                            disabled={busyId === customer.id}
                                            onChange={() => toggleSuspended(customer)}
                                            title={
                                                customer.is_suspended
                                                    ? "Suspended — click to reinstate"
                                                    : "Active — click to suspend"
                                            }
                                        />
                                    </td>
                                    <td>
                                        <div className="tenant-table-actions">
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                onClick={() => openEditModal(customer)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                disabled={busyId === customer.id}
                                                onClick={() => handleDelete(customer)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="tenant-table-empty">
                                        No customers yet. Customers are added when a new service is created.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {modalOpen && (
                <Modal title="Edit customer" onClose={closeModal}>
                    <CustomerForm
                        initialValues={editingCustomer}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel="Save changes"
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Customers;
