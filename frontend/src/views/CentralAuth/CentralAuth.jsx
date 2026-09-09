import { useState } from "react";
import AuthCard from "../../components/AuthCard/AuthCard";
import CompanyLoginForm from "../../components/CompanyLoginForm/CompanyLoginForm";
import CompanyRegisterForm from "../../components/CompanyRegisterForm/CompanyRegisterForm";
import "./CentralAuth.css";

const COPY = {
    login: {
        title: "Welcome back",
        subtitle: "Find your company workspace to sign in.",
    },
    register: {
        title: "Register your company",
        subtitle: "Set up a new FixFlow workspace for your service center.",
    },
};

function CentralAuth() {
    const [tab, setTab] = useState("login");
    const copy = COPY[tab];

    return (
        <AuthCard title={copy.title} subtitle={copy.subtitle} footnote="Powered by FixFlow">
            <div className="central-auth-tabs">
                <button
                    type="button"
                    className={tab === "login" ? "is-active" : ""}
                    onClick={() => setTab("login")}
                >
                    Log in
                </button>
                <button
                    type="button"
                    className={tab === "register" ? "is-active" : ""}
                    onClick={() => setTab("register")}
                >
                    Register a company
                </button>
            </div>

            {tab === "login" ? <CompanyLoginForm /> : <CompanyRegisterForm />}
        </AuthCard>
    );
}

export default CentralAuth;
