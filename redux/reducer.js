
// Prefer original if payload has _upd field, like serialized data.
// If API results doesn't have _upd, filled with this function.
export const refresh_with_ts = (_state, action) => {
    const new_state = action.payload;
    new_state._upd ||= (new Date()).getTime();
    return new_state;
}

export const refresh = (_state, action) => action.payload;

export const append = (state, action) => {
    return {
        ...state,
        ...action.payload
    }
}
