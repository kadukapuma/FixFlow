/**
 * Resolve the tenant subdomain from the current hostname, or null when the
 * page is being served from the root/central domain.
 *
 * company01.localhost      -> "company01"
 * localhost / 127.0.0.1    -> null
 * 192.168.1.8              -> null (raw IP, e.g. opening the dev server from a phone on the LAN)
 * acme.fixflow.com         -> "acme"
 * fixflow.com              -> null
 */
const IPV4_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export function getSubdomain() {
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1" || IPV4_PATTERN.test(host)) {
        return null;
    }

    if (host.endsWith(".localhost")) {
        return host.slice(0, -".localhost".length) || null;
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

    // Strip any existing subdomain label from the current hostname so we
    // always build "<subdomain>.<root>", not "<subdomain>.<subdomain>.<root>".
    const currentSubdomain = getSubdomain();
    const root = currentSubdomain
        ? hostname.slice(currentSubdomain.length + 1)
        : hostname;

    const portPart = port ? `:${port}` : "";

    return `${protocol}//${subdomain}.${root}${portPart}${path}`;
}
