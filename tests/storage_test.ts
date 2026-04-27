import { assertEquals, assert } from "jsr:@std/assert@1";
import {
    try_get_item,
    try_set_item,
    try_remove_item,
    try_clear,
} from '../storage.ts';

const make_mock = (init: Record<string, string> = {}): Storage => {
    const store = new Map<string, string>(Object.entries(init));
    return {
        get length() { return store.size; },
        clear() { store.clear(); },
        getItem(key) { return store.has(key) ? store.get(key)! : null; },
        key(i) { return Array.from(store.keys())[i] ?? null; },
        removeItem(key) { store.delete(key); },
        setItem(key, value) { store.set(key, String(value)); },
    } as Storage;
};

const swap_global = (name: 'localStorage' | 'sessionStorage', descriptor: PropertyDescriptor) => {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, ...descriptor });
    return () => {
        if (original) Object.defineProperty(globalThis, name, original);
        else delete (globalThis as Record<string, unknown>)[name];
    };
};

Deno.test("try_get_item returns Err storage.key for empty key", () => {
    const r = try_get_item(make_mock(), "");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.key');
});

Deno.test("try_get_item returns Err storage.access when storage is missing", () => {
    const r1 = try_get_item(null, "k");
    assert(r1.isErr());
    assertEquals(r1.error.kind, 'storage.access');

    const r2 = try_get_item(undefined, "k");
    assert(r2.isErr());
    assertEquals(r2.error.kind, 'storage.access');
});

Deno.test("try_get_item returns Err storage.content when key is absent", () => {
    const r = try_get_item(make_mock(), "missing");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.content');
});

Deno.test("try_get_item returns Ok(value) when key exists", () => {
    const r = try_get_item(make_mock({ k: "v" }), "k");
    assert(r.isOk());
    assertEquals(r.value, "v");
});

Deno.test("try_get_item classifies underlying read errors as storage.read", () => {
    const broken = {
        getItem() { throw new Error("boom"); },
    } as unknown as Storage;
    const r = try_get_item(broken, "k");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.read');
});

Deno.test("try_set_item returns Err storage.key for empty key", () => {
    const r = try_set_item(make_mock(), "", "v");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.key');
});

Deno.test("try_set_item returns Err storage.access when storage is missing", () => {
    const r = try_set_item(null, "k", "v");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.access');
});

Deno.test("try_set_item writes value into provided storage", () => {
    const mock = make_mock();
    const r = try_set_item(mock, "k", "v");
    assert(r.isOk());
    assertEquals(mock.getItem("k"), "v");
});

Deno.test("try_set_item classifies QuotaExceededError as storage.quota", () => {
    const broken = {
        setItem() {
            const e = new Error("simulated quota");
            e.name = "QuotaExceededError";
            throw e;
        },
    } as unknown as Storage;
    const r = try_set_item(broken, "k", "v");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.quota');
});

Deno.test("try_set_item classifies non-quota errors as storage.write", () => {
    const broken = {
        setItem() {
            const e = new Error("denied");
            e.name = "InvalidStateError";
            throw e;
        },
    } as unknown as Storage;
    const r = try_set_item(broken, "k", "v");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.write');
});

Deno.test("try_remove_item returns Err storage.key for empty key", () => {
    const r = try_remove_item(make_mock(), "");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.key');
});

Deno.test("try_remove_item returns Err storage.access when storage is missing", () => {
    const r = try_remove_item(null, "k");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.access');
});

Deno.test("try_remove_item deletes the key from storage", () => {
    const mock = make_mock({ k: "v" });
    const r = try_remove_item(mock, "k");
    assert(r.isOk());
    assertEquals(mock.getItem("k"), null);
});

Deno.test("try_remove_item classifies underlying errors as storage.write", () => {
    const broken = {
        removeItem() { throw new Error("denied"); },
    } as unknown as Storage;
    const r = try_remove_item(broken, "k");
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.write');
});

Deno.test("try_clear returns Err storage.access when storage is missing", () => {
    const r = try_clear(null);
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.access');
});

Deno.test("try_clear empties the storage", () => {
    const mock = make_mock({ a: "1", b: "2" });
    const r = try_clear(mock);
    assert(r.isOk());
    assertEquals(mock.length, 0);
});

Deno.test("try_clear classifies underlying errors as storage.write", () => {
    const broken = {
        clear() { throw new Error("denied"); },
    } as unknown as Storage;
    const r = try_clear(broken);
    assert(r.isErr());
    assertEquals(r.error.kind, 'storage.write');
});

Deno.test("try_resolve_storage via string resolves to globalThis.localStorage", () => {
    const mock = make_mock();
    const restore = swap_global('localStorage', { value: mock });
    try {
        const r = try_set_item('localStorage', 'k', 'v');
        assert(r.isOk());
        assertEquals(mock.getItem('k'), 'v');
    } finally {
        restore();
    }
});

Deno.test("try_resolve_storage via string resolves to globalThis.sessionStorage", () => {
    const mock = make_mock();
    const restore = swap_global('sessionStorage', { value: mock });
    try {
        const r = try_set_item('sessionStorage', 'k', 'v');
        assert(r.isOk());
        assertEquals(mock.getItem('k'), 'v');
    } finally {
        restore();
    }
});

Deno.test("try_resolve_storage via string returns Err storage.access when getter throws", () => {
    const restore = swap_global('localStorage', {
        get() {
            const e = new Error("storage disabled");
            e.name = "SecurityError";
            throw e;
        },
    });
    try {
        const r = try_set_item('localStorage', 'k', 'v');
        assert(r.isErr());
        assertEquals(r.error.kind, 'storage.access');
    } finally {
        restore();
    }
});
