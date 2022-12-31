/**
 * Ensure timestamp then dispatch.
 *
 * @type {import("redux").Store}
 * @type {import("redux").Action}
 * @param {Store} store - Redux store object
 * @param {Object} data
 * @param {Action} action - Redux action
 * @param {string} [attr] - timestamp field in the data
 *
 */
export const dispatch_with_ts = (
    store,
    data,
    reducer,
    attr = '_upd'
) => {
    const new_state = data;
    new_state[attr] ||= (new Date()).getTime();
    store.dispatch(reducer(new_state));
}

/**
 * Retrieve contents body from an object wrapped by the action refresh_with_ts()
 *
 * @type {import("redux").Store}
 * @param {Store} store - Redux store object
 * @param {string} key - Key name of the target slice
 *
 */
export const get_body = (state, key) => {
    return state[key]?._body;
}
