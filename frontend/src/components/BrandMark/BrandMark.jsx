import "./BrandMark.css";

function BrandMark({ size = 40 }) {
    return (
        <div className="brand-mark" style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size * 0.46} height={size * 0.46} fill="none">
                <path d="M12 5v14M5 12h14" stroke="#ddfb5e" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
        </div>
    );
}

export default BrandMark;
