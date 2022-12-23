import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import { cache_expired } from '../cache.js';

Deno.test("Current timestamp with no options", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime();
    console.log(`_upd: ${new Date(ts)}`);
    const res = cache_expired({ _upd: ts });
    assertEquals(res, false);
});

Deno.test("Current timestamp with 1 option", () => {
    const ts = new Date().getTime();
    let res = cache_expired({ _upd: ts }, { force: true });
    assertEquals(res, true);

    res = cache_expired({ _upd: ts }, { skip_sec: 360 });
    assertEquals(res, false);
});

Deno.test("Current timestamp with 2 options", () => {
    const ts = new Date().getTime();
    const res = cache_expired({ _upd: ts }, { force: true, skip_sec: 360 });
    assertEquals(res, true);
});

Deno.test("Timestamp 5min+ ago returns true", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 5 * 60 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = cache_expired({ _upd: ts });
    assertEquals(res, true);

    // skip_sec affects result
    res = cache_expired({ _upd: ts }, { skip_sec: 360 });
    assertEquals(res, false);

    // force wins over skip_sec
    res = cache_expired({ _upd: ts }, { force: true, skip_sec: 360 });
    assertEquals(res, true);
});

Deno.test("Timestamp 1hour+ ago returns true", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 1 * 3600 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = cache_expired({ _upd: ts });
    assertEquals(res, true);

    res = cache_expired({ _upd: ts }, { skip_sec: 360, force: true });
    assertEquals(res, true);
});

Deno.test("Timestamp 1day+ ago returns true", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 1 * 24 * 3600 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = cache_expired({ _upd: ts });
    assertEquals(res, true);

    res = cache_expired({ _upd: ts }, { skip_sec: 360, force: true });
    assertEquals(res, true);
});

Deno.test("Timestamp 0 returns true", () => {
    const ts = new Date(0).getTime();
    console.log(`_upd: ${new Date(ts)}`);
    const res = cache_expired({ _upd: ts });
    assertEquals(res, true);
});

Deno.test("No Timestamp returns true", () => {
    let res = cache_expired({ _upd: null });
    assertEquals(res, true);

    res = cache_expired({});
    assertEquals(res, true);

    res = cache_expired([]);
    assertEquals(res, true);
});
