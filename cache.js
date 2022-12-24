/**
 *
 * @param {Object} target - Object with timestamp
 * @param {Object} [options] - Same as stale_cache()
 * @param {Object} [defaults] - Same as stale_cache()
 * @return {boolean}
 */
export const cache_expired = (target, options = {}, defaults = {}) => {
    const res = stale_cache(target, options, defaults)
          .next();
    return !res.done;
}

/**
 * Check object timestamp and returns conditional parameters
 *
 * @param {Object} target - Object with timestamp
 * @param {Object} [options]
 * @param {any} [options.id] - If target data is fresh, returns itself.
 * @param {number} [options.skip_sec] - Duration before expire in seconds.
 * @param {number} [options.margin_sec] - Margin subtracting from object timestamp.
 * @param {boolean} [options.force] - If true, always regard target as expired
 * @param {Object} [defaults]
 * @param {string} [defaults.attr] - Timestamp attribute inside target object
 * @param {any} [defaults.fallback_id] - Stale object returns this instead of options.id
 * @param {number} [defaults.fallback_min] - Duration before using fallback ID in minutes.
 * @param {number} [defaults.dispose_hour] - Duration before returning timestamp 0 in hours.
 * @return {Object} [response]
 * @return {any} [response.id]
 * @return {number} [response.timestamp]
 * @return {boolean} [response.full]
 */
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
