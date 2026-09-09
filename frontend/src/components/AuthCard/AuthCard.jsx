import BrandMark from "../BrandMark/BrandMark";
import "./AuthCard.css";

function AuthCard({ title, subtitle, footnote, maxWidth = 440, children }) {
    return (
        <div className="auth-shell">
            <aside className="auth-shell__brand-panel">
                <div className="auth-shell__brand-panel-inner">
                    <div className="auth-shell__brand">
                        <BrandMark size={44} />
                        <span>FixFlow</span>
                    </div>

                    <h2>Run your service center without the spreadsheets.</h2>
                    <p>
                        One workspace for approvals, technicians, and every customer job — built for
                        multi-location teams.
                    </p>

                    <ul className="auth-shell__features">
                        <li>
                            <i /> Approvals and provisioning in minutes
                        </li>
                        <li>
                            <i /> A dashboard built for every technician
                        </li>
                        <li>
                            <i /> Your own subdomain, ready instantly
                        </li>
                    </ul>
                </div>
            </aside>

            <div className="auth-shell__form-panel">
                <div className="auth-shell__card" style={{ maxWidth }}>
                    <div className="auth-shell__brand">
                        <BrandMark size={40} />
                        <span>FixFlow</span>
                    </div>

                    <h1>{title}</h1>
                    {subtitle && <p className="auth-shell__subtitle">{subtitle}</p>}

                    {children}

                    {footnote && <p className="auth-shell__footnote">{footnote}</p>}
                </div>
            </div>
        </div>
    );
}

export default AuthCard;
