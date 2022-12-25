import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import { key_gen } from '../serde.js';

Deno.test("It accepts both string and digest", async () => {
    const key_str = "some_test_phrase";
    const digest = await crypto.subtle.digest(
        { name: 'SHA-256' },
        (new TextEncoder()).encode(key_str)
    );
    const key1 = await key_gen(key_str);
    const key2 = await key_gen(new Uint8Array(digest));
    assertEquals(key1, key2);
});

Deno.test("Invalid key returns null", async () => {
    const key1 = await key_gen("");
    assertEquals(key1, null);

    const key2 = await key_gen(null);
    assertEquals(key2, null);

    const key3 = await key_gen(10);
    assertEquals(key3, null);
});
