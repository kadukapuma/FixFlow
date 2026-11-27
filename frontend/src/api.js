import axios from "axios";
import { getSubdomain } from "./lib/tenant";

/*
 * The API is served from the same host as the frontend, under /api
 * (acme.<VITE_ROOT_DOMAIN>/api), so the backend's IdentifyCompany middleware
 * reads the tenant off the request's own Host header. In production the
 * .htaccess in public/ routes /api/* to Laravel; in dev, Vite's proxy does.
 * Setting VITE_API_ROOT_DOMAIN instead points the API at a separate wildcard
 * domain (acme.<VITE_API_ROOT_DOMAIN>/api) — the old two-domain setup.
 */
function resolveBaseURL() {
    const apiRootDomain = import.meta.env.VITE_API_ROOT_DOMAIN;

    if (!apiRootDomain) {
        return "/api";
    }

    const subdomain = getSubdomain();
    const host = subdomain ? `${subdomain}.${apiRootDomain}` : apiRootDomain;

    return `${window.location.protocol}//${host}/api`;
}

const api = axios.create({
    baseURL: resolveBaseURL(),
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
    },
});

export function setAuthToken(token) {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
}

export function getErrorMessage(error, fallback = "Something went wrong.") {
    return error.response?.data?.message || fallback;
}

// A token can go bad mid-session (e.g. a company is auto-deactivated for a
// lapsed subscription, which revokes every session token). Without this, the
// UI would just keep failing requests silently instead of returning to login.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            const isAdmin = window.location.pathname.startsWith("/admin");

            if (isAdmin) {
                localStorage.removeItem("admin_token");
                localStorage.removeItem("admin_info");
            } else {
                localStorage.removeItem("tenant_token");
            }

            setAuthToken(null);
            window.location.reload();
        }

        return Promise.reject(error);
    }
);

export default api;
