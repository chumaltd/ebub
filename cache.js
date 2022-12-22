
export const stale_cache = function*(
    target,
    {
        id = null,
        skip_sec = 300,
        margin_sec = 180,
        force = false
    } = {},
    {
        attr = '_upd',
        fallback_id = 0,
        fallback_min = 60,
        dispose_hour = 24,
    } = {}
) {
    const prev_timestamp = target[attr] || 0;
    const now = (new Date()).getTime();
    if (!force && prev_timestamp > now - skip_sec * 1000)
        return false;

    // Set margin against clock difference
    const timestamp = Math.max(0, prev_timestamp - margin_sec * 1000);

    if (force || prev_timestamp < now - dispose_hour * 3600 * 1000) {
        yield {
            id: id !== null ? fallback_id : null,
            timestamp: 0,
            full: true
        };
    } else if (prev_timestamp < now - fallback_min * 60 * 1000) {
        yield {
            id: id !== null ? fallback_id : null,
            timestamp,
            full: false
        };
    } else {
        yield {
            id: id,
            timestamp,
            full: false
        };
    }
}

// Return values without timestamp
//
export const filter_timestamp = (origin, attr = '_upd') => {
    return Object.keys(origin)
        .filter(k => k !== attr)
        .map(k => origin[k])
}
