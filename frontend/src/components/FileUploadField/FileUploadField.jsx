import { forwardRef, useState } from "react";
import "./FileUploadField.css";

const UPLOAD_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

/**
 * Drag-and-drop-capable file picker styled to match the tenant design
 * language (dashed rounded box, lime accent) instead of the browser's bare
 * native `<input type="file">` chrome. `onChange` receives the File directly
 * (or null), not an input change event.
 */
const FileUploadField = forwardRef(function FileUploadField(
    { id, accept, onChange, fileName, hint = "Click to upload or drag and drop", required },
    ref
) {
    const [dragActive, setDragActive] = useState(false);

    function syncNativeInput(file, container) {
        const input = container?.querySelector("input[type='file']");
        if (!input) return;

        // Keeps the underlying <input>'s own FileList in sync with a dropped
        // file, so native `required` validation and any `ref.current.value`
        // reset the parent form does after submit keep working as before.
        try {
            const transfer = new DataTransfer();
            transfer.items.add(file);
            input.files = transfer.files;
        } catch {
            // DataTransfer construction isn't supported in every browser —
            // onChange still fires below, it just won't reflect in the
            // native input's FileList.
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        setDragActive(false);
        const file = event.dataTransfer.files?.[0] || null;
        if (file) syncNativeInput(file, event.currentTarget);
        onChange(file);
    }

    return (
        <label
            htmlFor={id}
            className={`file-upload ${dragActive ? "is-drag" : ""}`}
            onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
        >
            <input
                ref={ref}
                id={id}
                type="file"
                accept={accept}
                required={required}
                className="file-upload__input"
                onChange={(event) => onChange(event.target.files?.[0] || null)}
            />
            <span className="file-upload__icon">{UPLOAD_ICON}</span>
            <span className="file-upload__text">
                {fileName ? <strong>{fileName}</strong> : hint}
            </span>
        </label>
    );
});

export default FileUploadField;
