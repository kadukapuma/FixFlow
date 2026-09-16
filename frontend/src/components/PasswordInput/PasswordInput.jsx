import { useState } from "react";
import "./PasswordInput.css";

const EYE_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
);

const EYE_OFF_ICON = (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
        <path
            d="M3 3l18 18M10.58 10.58a3 3 0 0 0 4.24 4.24M9.36 5.24A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a13.5 13.5 0 0 1-3.16 4.06M6.6 6.6C4.14 8.14 2 12 2 12s3.6 7 10 7c1.36 0 2.6-.24 3.7-.66"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

function PasswordInput({ value, onChange, ...rest }) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="password-field">
            <input type={visible ? "text" : "password"} value={value} onChange={onChange} {...rest} />
            <button
                type="button"
                className="password-field__toggle"
                onClick={() => setVisible((prev) => !prev)}
                tabIndex={-1}
                aria-label={visible ? "Hide password" : "Show password"}
            >
                {visible ? EYE_OFF_ICON : EYE_ICON}
            </button>
        </div>
    );
}

export default PasswordInput;
