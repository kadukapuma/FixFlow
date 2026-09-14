/**
 * Resolve the tenant subdomain from the current hostname, or null when the
 * page is being served from the root/central domain.
 *
 * company01.localhost      -> "company01"
 * localhost / 127.0.0.1    -> null
 * 192.168.1.8              -> null (raw IP, e.g. opening the dev server from a phone on the LAN)
 * acme.fixflow.com         -> "acme"
 * fixflow.com              -> null
 *
 * VITE_ROOT_DOMAIN (set at build time in production) names the exact
 * central/root host explicitly, e.g. "fixflow.kreethya.com". This matters
 * when the root itself has 3+ labels: without it, the label-counting
 * fallback below would mistake the central site's own hostname for a
 * tenant subdomain (host.split(".").length >= 3 would already be true for
 * the root domain itself).
 */
const IPV4_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const ROOT_DOMAIN = import.meta.env.VITE_ROOT_DOMAIN || null;

export function getSubdomain() {
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1" || IPV4_PATTERN.test(host)) {
        return null;
    }

    if (host.endsWith(".localhost")) {
        return host.slice(0, -".localhost".length) || null;
    }

    if (ROOT_DOMAIN) {
        if (host === ROOT_DOMAIN) {
            return null;
        }

        if (host.endsWith("." + ROOT_DOMAIN)) {
            return host.slice(0, -(ROOT_DOMAIN.length + 1)) || null;
        }

        return null;
    }

    const parts = host.split(".");

    if (parts.length >= 3) {
        return parts[0];
    }

    return null;
}

/**
 * Build the URL for a given subdomain on the current domain/port.
 */
export function subdomainUrl(subdomain, path = "/") {
    const { protocol, hostname, port } = window.location;

    let root;

    if (IPV4_PATTERN.test(hostname)) {
        // A raw IP can't take a subdomain label directly — DNS has no way to
        // resolve "acme.192.168.1.8". Route through nip.io's wildcard DNS
        // instead: "acme.192.168.1.8.nip.io" resolves straight back to
        // 192.168.1.8, so this is how a phone on the LAN reaches a tenant
        // after logging in from the IP-addressed central page.
        root = `${hostname}.nip.io`;
    } else if (ROOT_DOMAIN) {
        root = ROOT_DOMAIN;
    } else {
        // Strip any existing subdomain label from the current hostname so we
        // always build "<subdomain>.<root>", not "<subdomain>.<subdomain>.<root>".
        const currentSubdomain = getSubdomain();
        root = currentSubdomain ? hostname.slice(currentSubdomain.length + 1) : hostname;
    }

    const portPart = port ? `:${port}` : "";

    return `${protocol}//${subdomain}.${root}${portPart}${path}`;
}
