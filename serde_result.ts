import { Result, Ok, Err } from 'ts-results-es';

export type SerdeErrorKind =
    | 'json.stringify'
    | 'json.parse'
    | 'crypto.encrypt'
    | 'crypto.decrypt'
    | 'crypto.digest'
    | 'crypto.import_key'
    | 'encode.base64'
    | 'decode.base64'
    | 'encode.text'
    | 'decode.text'
    | 'storage.key'
    | 'storage.access'
    | 'storage.write'
    | 'storage.quota'
    | 'clone';

export interface SerdeError {
    kind: SerdeErrorKind;
    message: string;
    cause?: Error;
}

const toErr = (kind: SerdeErrorKind, e: unknown): SerdeError => ({
    kind,
    message: e instanceof Error ? e.message : String(e),
    cause: e instanceof Error ? e : undefined,
});

/**
 * Save encrypted JSON into localStorage/sessionStorage.
 * `storage_key_name` must be a non-empty string; otherwise Err storage.key.
 * Accessing the storage reference and the setItem write are wrapped separately:
 *   - storage.access  : the global localStorage/sessionStorage reference threw
 *   - storage.quota   : setItem threw QuotaExceededError
 *   - storage.write   : setItem threw any other error
 */
export const try_save_encrypted = async (
    data: unknown,
    storage_key_name: string,
    crypto_key: CryptoKey,
    { useLocalStorage = true }: { useLocalStorage?: boolean } = {}
): Promise<Result<boolean, SerdeError>> => {
    if (typeof storage_key_name !== 'string' || !storage_key_name.length) {
        return Err({
            kind: 'storage.key',
            message: 'storage_key_name must be a non-empty string',
        });
    }

    let str: string;
    try {
        str = JSON.stringify(data);
    } catch (e) {
        return Err(toErr('json.stringify', e));
    }

    const enc_result = await try_enc(str, crypto_key);
    if (enc_result.isErr()) return enc_result;
    const storable = enc_result.value;

    let storage: Storage;
    try {
        storage = useLocalStorage ? localStorage : sessionStorage;
    } catch (e) {
        return Err(toErr('storage.access', e));
    }

    try {
        storage.setItem(storage_key_name, storable);
    } catch (e) {
        const name = e instanceof Error ? e.name : '';
        const isQuota = name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
        return Err(toErr(isQuota ? 'storage.quota' : 'storage.write', e));
    }
    return Ok(true);
};

/**
 * Encrypt a string with AES-GCM and return base64.
 */
export const try_enc = async (
    dataStr: string,
    key: CryptoKey
): Promise<Result<string, SerdeError>> => {
    if (typeof dataStr !== 'string' || !dataStr.length) {
        return Err({
            kind: 'encode.text',
            message: 'dataStr must be a non-empty string',
        });
    }

    let byteData: Uint8Array;
    try {
        byteData = (new TextEncoder()).encode(dataStr);
    } catch (e) {
        return Err(toErr('encode.text', e));
    }

    const aes = {
        name: 'AES-GCM',
        iv: crypto.getRandomValues(new Uint8Array(16)),
    };

    let result: ArrayBuffer;
    try {
        result = await crypto.subtle.encrypt(aes, key, byteData as BufferSource);
    } catch (e) {
        return Err(toErr('crypto.encrypt', e));
    }

    const len = aes.iv.byteLength + result.byteLength;
    const buffer = new Uint8Array(len);
    buffer.set(aes.iv, 0);
    buffer.set(new Uint8Array(result), aes.iv.byteLength);

    let byteStr = '';
    for (let i = 0; i < len; i++) {
        byteStr += String.fromCharCode(buffer[i]);
    }

    try {
        return Ok(btoa(byteStr));
    } catch (e) {
        return Err(toErr('encode.base64', e));
    }
};

/**
 * Decrypt and JSON.parse. Returns Ok(undefined) when key is missing,
 * Ok(null) when decrypted payload is empty (matches serde.js behavior).
 */
export const try_dec_json = async (
    encrypted_json: string,
    key: CryptoKey
): Promise<Result<unknown, SerdeError>> => {
    const dec_result = await try_dec(encrypted_json, key);
    if (dec_result.isErr()) return dec_result;
    const json = dec_result.value;
    if (!json?.length) return Ok(null);

    try {
        return Ok(JSON.parse(json));
    } catch (e) {
        return Err(toErr('json.parse', e));
    }
};

/**
 * Decrypt base64-encoded AES-GCM ciphertext. Returns Ok(undefined) when key is missing.
 */
export const try_dec = async (
    dataStr: string,
    key: CryptoKey
): Promise<Result<string | undefined, SerdeError>> => {
    let byteData: Uint8Array;
    try {
        byteData = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));
    } catch (e) {
        return Err(toErr('decode.base64', e));
    }

    const aes = {
        name: 'AES-GCM',
        iv: byteData.subarray(0, 16),
    };

    let decBuffer: ArrayBuffer;
    try {
        decBuffer = await crypto.subtle.decrypt(aes, key, byteData.subarray(16) as BufferSource);
    } catch (e) {
        return Err(toErr('crypto.decrypt', e));
    }

    const byteRes = new Uint8Array(decBuffer);
    try {
        return Ok((new TextDecoder()).decode(byteRes));
    } catch (e) {
        return Err(toErr('decode.text', e));
    }
};

/**
 * Derive an AES-GCM CryptoKey from a string passphrase or raw Uint8Array digest.
 * Returns Ok(null) when input is empty/invalid (matches serde.js behavior).
 */
export const try_key_gen = async (
    key: Uint8Array | string
): Promise<Result<CryptoKey, SerdeError>> => {
    let digest: Uint8Array | ArrayBuffer | undefined;
    if (key instanceof Uint8Array) {
        digest = key;
    } else if (typeof key === 'string' && key.length) {
        let encoded: Uint8Array;
        try {
            encoded = (new TextEncoder()).encode(key);
        } catch (e) {
            return Err(toErr('encode.text', e));
        }
        try {
            digest = await crypto.subtle.digest({ name: 'SHA-256' }, encoded as BufferSource);
        } catch (e) {
            return Err(toErr('crypto.digest', e));
        }
    }
    if (!digest) return Err({ kind: "encode.text", message: "invalid key" });

    try {
        const k = await crypto.subtle.importKey(
            'raw',
            digest as BufferSource,
            { name: 'AES-GCM' },
            false,
            ['encrypt', 'decrypt']
        );
        return Ok(k);
    } catch (e) {
        return Err(toErr('crypto.import_key', e));
    }
};

/**
 * Deep clone via structuredClone with JSON.parse(JSON.stringify) fallback.
 */
export const try_deep_copy = <T>(origin: T): Result<T, SerdeError> => {
    try {
        return Ok(structuredClone(origin));
    } catch (_e) {
        try {
            return Ok(JSON.parse(JSON.stringify(origin)));
        } catch (e) {
            return Err(toErr('clone', e));
        }
    }
};
