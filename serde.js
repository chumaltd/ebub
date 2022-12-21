
export const enc = async (dataStr, key) => {
    const byteData = (new TextEncoder()).encode(dataStr);
    const aes = {
        name: "AES-GCM",
        iv: crypto.getRandomValues(new Uint8Array(16))
    };
    const result = await crypto.subtle.encrypt(aes, key, byteData);

    const len = aes.iv.byteLength + result.byteLength;
    const buffer = new Uint8Array(len);
    buffer.set(aes.iv, 0);
    buffer.set(new Uint8Array(result), aes.iv.byteLength);

    let byteStr = '';
    for (let i=0; i<len; i++) {
        byteStr += String.fromCharCode(buffer[i]);
    }
    return btoa(byteStr);
}

export const dec_json = async (jsonStr, key) => {
    const json = await dec(jsonStr, key);
    return JSON.parse(json);
}

export const dec = async (dataStr, key) => {
    if (!key?.length) return;

    const byteData = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));
    const aes = {
        name: "AES-GCM",
        iv: byteData.subarray(0, 16)
    };
    const decBuffer = await crypto.subtle.decrypt(aes, key, byteData.subarray(16));
    const byteRes = new Uint8Array(decBuffer);
    return (new TextDecoder()).decode(byteRes);
}

// Fallback to JSON if structuredClone() is not provided.
//
export const deep_copy = (origin) => {
    try {
        return structuredClone(origin);
    } catch(_e) {
        return JSON.parse(JSON.stringify(origin));
    }
}
