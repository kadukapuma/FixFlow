/**
 * Client-side filter for a loaded services list — matches by ID, ref no,
 * customer, item (incl. model/serial), technician, fault, or any lifecycle date.
 */
export function matchesServiceQuery(service, rawQuery) {
    const query = rawQuery.trim().toLowerCase();

    if (!query) return true;

    const haystack = [
        service.id,
        service.ref_no,
        service.customer?.name,
        service.customer?.nic,
        service.item?.name,
        service.item?.model,
        service.item?.serial_number,
        service.employee?.name,
        service.fault,
        service.service_date,
        service.started_date,
        service.completed_date,
        service.delivered_date,
    ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLowerCase();

    return haystack.includes(query);
}
