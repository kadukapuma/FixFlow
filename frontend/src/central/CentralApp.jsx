import { useState } from "react";
import RegisterForm from "./RegisterForm";
import CompanyLoginForm from "./CompanyLoginForm";

function CentralApp() {
    const [tab, setTab] = useState("login");

    return (
        <div style={{ padding: "40px", maxWidth: 480, margin: "0 auto" }}>
            <h1>FixFlow</h1>

            <nav>
                <button onClick={() => setTab("login")} disabled={tab === "login"}>
                    Log in
                </button>
                <button onClick={() => setTab("register")} disabled={tab === "register"}>
                    Register a company
                </button>
            </nav>

            <hr />

            {tab === "login" ? <CompanyLoginForm /> : <RegisterForm />}
        </div>
    );
}

export default CentralApp;
