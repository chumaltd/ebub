
// Prefer original if payload has _upd field, like serialized data.
// If API results doesn't have _upd, filled with this function.
export const refresh_with_ts = (_state, action) => {
    let body = action.payload;
    if (typeof body === 'object' && !Array.isArray(body)) {
        body ||= {}; // null conversion
        body._upd ||= (new Date()).getTime();
        return body;
    } else if (typeof body === 'undefined') {
        throw new Error('Reject undefined');
    } else {
        return {
            _upd: (new Date()).getTime(),
            _body: body
        };
    }
}

export const refresh = (_state, action) => action.payload;


export const append = (state, action) => {
    return {
        ...state,
        ...action.payload
    }
}
