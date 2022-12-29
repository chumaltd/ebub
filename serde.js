/**
 *
 * Save encrypted JSON into localStorage/sessionStorage.
 * This function throws on WebCrypto errors by design.
 *
 */
export const save_encrypted = async (
    data,
    storage_key_name,
    crypto_key,
    {
        useLocalStorage = true
    } = {}
) => {
    if(!storage_key_name?.length) return false;

    const storable = await enc(JSON.stringify(data), crypto_key);
    useLocalStorage
        ? localStorage.setItem(storage_key_name, storable)
        : sessionStorage.setItem(storage_key_name, storable);
    return true;
}

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
    if (!key) return;

    const json = await dec(jsonStr, key);
    return json.length ? JSON.parse(json) : null;
}

export const dec = async (dataStr, key) => {
    if (!key) return;

    const byteData = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));
    const aes = {
        name: "AES-GCM",
        iv: byteData.subarray(0, 16)
    };
    const decBuffer = await crypto.subtle.decrypt(aes, key, byteData.subarray(16));
    const byteRes = new Uint8Array(decBuffer);
    return (new TextDecoder()).decode(byteRes);
}

/**
 *
 * @param {Uint8Array | string} keyGen
 * @return {CryptoKey}
 */
export const key_gen = async (key) => {
    let digest;
    if (key instanceof Uint8Array) {
        digest = key;
    } else if (key?.length) {
        digest = await crypto.subtle.digest(
            { name: 'SHA-256' },
            (new TextEncoder()).encode(key)
        );
    }
    if (!digest) return null;

    return await crypto.subtle.importKey(
        'raw',
        digest,
        { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
    );
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
