
export const stale_cache = function*(
    target,
    {
        id = null,
        skip_sec = 300,
        margin_sec = 180,
        force = false
    },
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

    const fetch_ts = Math.max(0, prev_timestamp - margin_sec * 1000);
    if (prev_timestamp < now - dispose_hour * 3600 * 1000) {
        yield { id: fallback_id, timestamp: 0, full: true };
    } else if (prev_timestamp < now - fallback_min * 60 * 1000) {
        yield { id: fallback_id, timestamp: fetch_ts, full: false };
    } else {
        yield { id, timestamp: fetch_ts, full: false };
    }
}

// Return values without timestamp
//
export const filter_timestamp = (origin, attr = '_upd') => {
    return Object.keys(origin)
        .filter(k => k !== attr)
        .map(k => origin[k])
}
