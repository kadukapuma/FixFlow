import { useEffect, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import Modal from "../../components/Modal/Modal";
import EmployeeForm from "../../components/EmployeeForm/EmployeeForm";
import { showToast } from "../../lib/toast";
import { confirmAction } from "../../lib/confirm";

function Employees({ shellProps }) {
    const [employees, setEmployees] = useState([]);
    const [error, setError] = useState("");
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [formError, setFormError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    async function loadEmployees() {
        try {
            const response = await api.get("/employees");
            setEmployees(response.data);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load employees."));
        }
    }

    function openAddModal() {
        setEditingEmployee(null);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(employee) {
        setEditingEmployee(employee);
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
        setEditingEmployee(null);
    }

    async function handleSubmit(values) {
        if (editingEmployee) {
            const confirmed = await confirmAction({
                title: "Save changes?",
                message: `Save changes to ${editingEmployee.name}?`,
                confirmLabel: "Save",
            });
            if (!confirmed) return;
        }

        setSubmitting(true);
        setFormError("");

        try {
            if (editingEmployee) {
                await api.put(`/employees/${editingEmployee.id}`, values);
                showToast("Employee updated.");
            } else {
                await api.post("/employees", values);
                showToast("Employee added.");
            }

            closeModal();
            loadEmployees();
        } catch (err) {
            setFormError(getErrorMessage(err, "Unable to save employee."));
        } finally {
            setSubmitting(false);
        }
    }

    async function toggleActive(employee) {
        const confirmed = await confirmAction({
            title: employee.is_active ? "Deactivate employee?" : "Activate employee?",
            message: employee.is_active
                ? `Deactivate ${employee.name}? They won't be assignable to new services.`
                : `Activate ${employee.name}?`,
            confirmLabel: employee.is_active ? "Deactivate" : "Activate",
            danger: employee.is_active,
        });

        if (!confirmed) return;

        setBusyId(employee.id);
        setError("");

        try {
            const action = employee.is_active ? "deactivate" : "activate";
            await api.post(`/employees/${employee.id}/${action}`);
            showToast(employee.is_active ? "Employee deactivated." : "Employee activated.");
            loadEmployees();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to update employee status.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    async function handleDelete(employee) {
        const confirmed = await confirmAction({
            title: "Delete employee?",
            message: `Delete ${employee.name}? This can't be undone.`,
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        setBusyId(employee.id);
        setError("");

        try {
            await api.delete(`/employees/${employee.id}`);
            showToast("Employee deleted.");
            loadEmployees();
        } catch (err) {
            const message = getErrorMessage(err, "Unable to delete employee.");
            setError(message);
            showToast(message, "error");
        } finally {
            setBusyId(null);
        }
    }

    return (
        <TenantShell {...shellProps} title="Employees" subtitle="Manage your service center staff." error={error}>
            <section className="tenant-card">
                <div className="tenant-card__head">
                    <div className="tenant-card__title-group">
                        <h2>Employees</h2>
                        <span className="tenant-card__stat">{employees.length} total</span>
                    </div>
                    <button className="tenant-btn tenant-btn--primary" type="button" onClick={openAddModal}>
                        Add new employee
                    </button>
                </div>

                <div className="tenant-table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>NIC</th>
                                <th>Contact</th>
                                <th>Address</th>
                                <th>Date of birth</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map((employee) => (
                                <tr key={employee.id}>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{employee.name}</strong>
                                        </div>
                                    </td>
                                    <td>{employee.nic}</td>
                                    <td>
                                        <div className="tenant-cell">
                                            <strong>{employee.phone || "—"}</strong>
                                            <span>{employee.email || "—"}</span>
                                        </div>
                                    </td>
                                    <td>{employee.address || "—"}</td>
                                    <td>{employee.dob || "—"}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={employee.is_active}
                                            disabled={busyId === employee.id}
                                            onChange={() => toggleActive(employee)}
                                            title={employee.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
                                        />
                                    </td>
                                    <td>
                                        <div className="tenant-table-actions">
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                onClick={() => openEditModal(employee)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="tenant-btn tenant-btn--ghost tenant-btn--sm"
                                                type="button"
                                                disabled={busyId === employee.id}
                                                onClick={() => handleDelete(employee)}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {employees.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="tenant-table-empty">
                                        No employees yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {modalOpen && (
                <Modal title={editingEmployee ? "Edit employee" : "Add new employee"} onClose={closeModal}>
                    <EmployeeForm
                        initialValues={editingEmployee}
                        submitting={submitting}
                        error={formError}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        submitLabel={editingEmployee ? "Save changes" : "Add employee"}
                    />
                </Modal>
            )}
        </TenantShell>
    );
}

export default Employees;
