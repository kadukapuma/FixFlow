import { useEffect, useRef, useState } from "react";
import api, { getErrorMessage } from "../../api";
import TenantShell from "../../components/TenantShell/TenantShell";
import PdfViewerModal from "../../components/PdfViewerModal/PdfViewerModal";
import { showToast } from "../../lib/toast";
import "./CompanySettings.css";

const EMPTY_FORM = { address: "", phone: "", terms_and_conditions: "" };

function CompanySettings({ shellProps }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [logoObjectUrl, setLogoObjectUrl] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [previewData, setPreviewData] = useState(null);
    const fileInputRef = useRef(null);
    const logoObjectUrlRef = useRef(null);

    useEffect(() => {
        load();

        // Revoke whichever logo blob URL is current when the page unmounts.
        return () => {
            if (logoObjectUrlRef.current) URL.revokeObjectURL(logoObjectUrlRef.current);
        };
    }, []);

    // A plain <img src> can't carry the Sanctum bearer token, so the logo is
    // fetched through the authenticated API and shown as a blob URL instead.
    async function refreshLogo(hasLogo) {
        if (logoObjectUrlRef.current) {
            URL.revokeObjectURL(logoObjectUrlRef.current);
            logoObjectUrlRef.current = null;
        }

        if (!hasLogo) {
            setLogoObjectUrl(null);
            return;
        }

        try {
            const response = await api.get("/company/logo", { responseType: "blob" });
            const url = URL.createObjectURL(response.data);
            logoObjectUrlRef.current = url;
            setLogoObjectUrl(url);
        } catch {
            setLogoObjectUrl(null);
        }
    }

    async function load() {
        try {
            const response = await api.get("/company/settings");
            setForm({
                address: response.data.address || "",
                phone: response.data.phone || "",
                terms_and_conditions: response.data.terms_and_conditions || "",
            });
            await refreshLogo(response.data.has_logo);
        } catch (err) {
            setError(getErrorMessage(err, "Unable to load company settings."));
        } finally {
            setLoading(false);
        }
    }

    function updateField(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleLogoChange(event) {
        const file = event.target.files?.[0] || null;
        setLogoFile(file);
        setLogoPreview(file ? URL.createObjectURL(file) : null);
    }

    function buildFormData() {
        const payload = new FormData();
        payload.append("address", form.address || "");
        payload.append("phone", form.phone || "");
        payload.append("terms_and_conditions", form.terms_and_conditions || "");
        if (logoFile) payload.append("logo", logoFile);
        return payload;
    }

    function handlePreview() {
        setPreviewData(buildFormData());
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setError("");

        const payload = buildFormData();

        try {
            const response = await api.post("/company/settings", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            await refreshLogo(response.data.has_logo);
            setLogoFile(null);
            setLogoPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            showToast("Company settings saved.");
        } catch (err) {
            const message = getErrorMessage(err, "Unable to save company settings.");
            setError(message);
            showToast(message, "error");
        } finally {
            setSubmitting(false);
        }
    }

    const displayedLogo = logoPreview || logoObjectUrl;

    return (
        <TenantShell
            {...shellProps}
            title="Company Settings"
            subtitle="Set up your branding — this is used on every service PDF handed to customers."
            error={error}
        >
            <section className="tenant-card">
                {loading ? (
                    <p className="company-settings__loading">Loading...</p>
                ) : (
                    <form className="tenant-form company-settings__form" onSubmit={handleSubmit}>
                        <div className="company-settings__logo">
                            <div className="company-settings__logo-preview">
                                {displayedLogo ? (
                                    <img src={displayedLogo} alt="Company logo" />
                                ) : (
                                    <span>No logo</span>
                                )}
                            </div>
                            <label className="company-settings__logo-field">
                                Company logo
                                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoChange} />
                            </label>
                        </div>

                        <label className="company-settings__full">
                            Address
                            <textarea
                                rows={3}
                                value={form.address}
                                onChange={(e) => updateField("address", e.target.value)}
                                placeholder="Shop address shown on the PDF"
                            />
                        </label>

                        <label>
                            Phone
                            <input
                                value={form.phone}
                                onChange={(e) => updateField("phone", e.target.value)}
                                placeholder="07X XXX XXXX"
                            />
                        </label>

                        <label className="company-settings__full">
                            Terms &amp; conditions
                            <textarea
                                rows={8}
                                value={form.terms_and_conditions}
                                onChange={(e) => updateField("terms_and_conditions", e.target.value)}
                                placeholder={
                                    "One clause per line — each line is numbered automatically on the PDF, e.g.\n" +
                                    "Please mention the service number while inquiring.\n" +
                                    "Repaired items will be given back only on surrender of the service note.\n" +
                                    "The company is not responsible for items not collected within 30 days."
                                }
                            />
                            <span className="company-settings__hint">
                                Each line becomes a numbered clause on the printed service note.
                            </span>
                        </label>

                        <div className="tenant-form__actions">
                            <button type="button" className="tenant-btn tenant-btn--ghost" onClick={handlePreview}>
                                Preview PDF
                            </button>
                            <button type="submit" className="tenant-btn tenant-btn--primary" disabled={submitting}>
                                {submitting ? "Saving..." : "Save settings"}
                            </button>
                        </div>
                    </form>
                )}
            </section>

            {previewData && (
                <PdfViewerModal
                    title="Service PDF preview"
                    pdfUrl="/company/settings/preview"
                    method="post"
                    data={previewData}
                    onClose={() => setPreviewData(null)}
                />
            )}
        </TenantShell>
    );
}

export default CompanySettings;
