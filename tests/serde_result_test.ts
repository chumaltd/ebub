import { assertEquals, assert } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import {
    try_save_encrypted,
    try_enc,
    try_dec_json,
    try_key_gen,
    try_deep_copy,
} from '../serde_result.ts';

Deno.test("try_key_gen returns Err(encode.text) for invalid input", async () => {
    const r1 = await try_key_gen("");
    assert(r1.isErr());
    assertEquals(r1.error.kind, "encode.text");

    // @ts-expect-error - intentionally passing null to verify runtime fallback
    const r2 = await try_key_gen(null);
    assert(r2.isErr());
    assertEquals(r2.error.kind, "encode.text");
});

Deno.test("try_key_gen returns Ok(CryptoKey) for non-empty string", async () => {
    const r = await try_key_gen("some_test_phrase");
    assert(r.isOk());
    assert(r.value instanceof CryptoKey);
});

Deno.test("try_enc rejects empty or non-string dataStr with Err encode.text", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;

    const r1 = await try_enc("", key);
    assert(r1.isErr());
    assertEquals(r1.error.kind, 'encode.text');

    // @ts-expect-error - intentionally passing non-string
    const r2 = await try_enc(null, key);
    assert(r2.isErr());
    assertEquals(r2.error.kind, 'encode.text');

    // @ts-expect-error - intentionally passing non-string
    const r3 = await try_enc(42, key);
    assert(r3.isErr());
    assertEquals(r3.error.kind, 'encode.text');
});

Deno.test("try_enc + try_dec_json roundtrip", async () => {
    const key_r = await try_key_gen("roundtrip_phrase");
    assert(key_r.isOk());
    const key = key_r.value as CryptoKey;

    const original = { a: 1, b: "x", c: [2, 3] };
    const enc_r = await try_enc(JSON.stringify(original), key);
    assert(enc_r.isOk());

    const dec_r = await try_dec_json(enc_r.value, key);
    assert(dec_r.isOk());
    assertEquals(dec_r.value, original);
});

Deno.test("try_dec_json with wrong key returns Err crypto.decrypt", async () => {
    const k1 = (await try_key_gen("phraseA")).unwrap() as CryptoKey;
    const k2 = (await try_key_gen("phraseB")).unwrap() as CryptoKey;
    const enc_r = await try_enc("hello", k1);
    assert(enc_r.isOk());

    const dec_r = await try_dec_json(enc_r.value, k2);
    assert(dec_r.isErr());
    assertEquals(dec_r.error.kind, 'crypto.decrypt');
});

Deno.test("try_dec_json over malformed base64 returns Err decode.base64", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    const dec_r = await try_dec_json("not!!!base64@@@", key);
    assert(dec_r.isErr());
    assertEquals(dec_r.error.kind, 'decode.base64');
});

Deno.test("try_deep_copy clones a plain object", () => {
    const src = { a: 1, b: [2, 3], c: { d: "x" } };
    const r = try_deep_copy(src);
    assert(r.isOk());
    assertEquals(r.value, src);
    assert(r.value !== src);
});

Deno.test("try_save_encrypted with empty key name returns Err storage.key", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    const r = await try_save_encrypted({ a: 1 }, "", key);
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.key');
});

Deno.test("try_save_encrypted with non-string key name returns Err storage.key", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    // @ts-expect-error - intentionally passing non-string
    const r1 = await try_save_encrypted({ a: 1 }, null, key);
    assert(r1.isErr());
    assertEquals(r1.error.kind, 'storage.key');

    // @ts-expect-error - intentionally passing non-string
    const r2 = await try_save_encrypted({ a: 1 }, 42, key);
    assert(r2.isErr());
    assertEquals(r2.error.kind, 'storage.key');
});

const swap_local_storage = (descriptor: PropertyDescriptor) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
    return () => {
        if (original) Object.defineProperty(globalThis, 'localStorage', original);
        else delete (globalThis as Record<string, unknown>).localStorage;
    };
};

Deno.test("try_save_encrypted classifies localStorage reference error as storage.access", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    const restore = swap_local_storage({
        get() {
            const e = new Error("storage disabled");
            e.name = "SecurityError";
            throw e;
        },
    });
    try {
        const r = await try_save_encrypted({ a: 1 }, "k", key);
        assert(r.isErr());
        assertEquals(r.error.kind, 'storage.access');
    } finally {
        restore();
    }
});

Deno.test("try_save_encrypted classifies QuotaExceededError as storage.quota", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    const restore = swap_local_storage({
        value: {
            setItem() {
                const e = new Error("simulated quota");
                e.name = "QuotaExceededError";
                throw e;
            },
        },
    });
    try {
        const r = await try_save_encrypted({ a: 1 }, "k", key);
        assert(r.isErr());
        assertEquals(r.error.kind, 'storage.quota');
    } finally {
        restore();
    }
});

Deno.test("try_save_encrypted classifies non-quota setItem errors as storage.write", async () => {
    const key = (await try_key_gen("phrase")).unwrap() as CryptoKey;
    const restore = swap_local_storage({
        value: {
            setItem() {
                const e = new Error("denied");
                e.name = "InvalidStateError";
                throw e;
            },
        },
    });
    try {
        const r = await try_save_encrypted({ a: 1 }, "k", key);
        assert(r.isErr());
        assertEquals(r.error.kind, 'storage.write');
    } finally {
        restore();
    }
});
