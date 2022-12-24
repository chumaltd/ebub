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

export const get_body = (state, key) => {
    return state[key]?._body;
}
