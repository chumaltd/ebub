import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import { stale_cache } from '../cache.js';

Deno.test("Current timestamp with no options", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime();
    console.log(`_upd: ${new Date(ts)}`);
    const res = stale_cache({ _upd: ts }).next();
    assertEquals(res.done, true);
});

Deno.test("Current timestamp with 1 option", () => {
    const ts = new Date().getTime();
    let res = stale_cache({ _upd: ts }, { id: 1 }).next();
    assertEquals(res.done, true);

    res = stale_cache({ _upd: ts }, { force: true }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, null);

    res = stale_cache({ _upd: ts }, { skip_sec: 360 }).next();
    assertEquals(res.done, true);
});

Deno.test("Current timestamp with 2 options", () => {
    const ts = new Date().getTime();
    let res = stale_cache({ _upd: ts }, { id: 1, force: true }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);

    res = stale_cache({ _upd: ts }, { id: 1, skip_sec: 360 }).next();
    assertEquals(res.done, true);

    res = stale_cache({ _upd: ts }, { id: 1, force: true, skip_sec: 360 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
});

Deno.test("Current timestamp with 3 options", () => {
    const ts = new Date().getTime();
    let res = stale_cache({ _upd: ts }, { id: 1, force: true, skip_sec: 360 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(new Date(res.value.timestamp), new Date(0));
});

Deno.test("Timestamp 5min+ ago returns noDone", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 5 * 60 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = stale_cache({ _upd: ts }, { id: 1 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 1);
    assertEquals(new Date(res.value.timestamp), new Date(ts - 3 * 60 * 1000));
    console.log(`Request DateTime: ${new Date(res.value.timestamp)}`);
});

Deno.test("Timestamp 1hour+ ago returns id: 0", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 1 * 3600 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = stale_cache({ _upd: ts }, { id: 1 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(new Date(res.value.timestamp), new Date(ts - 3 * 60 * 1000));

    // skip_sec donesn't affect, force returns timestamp 0
    res = stale_cache({ _upd: ts }, { id: 1, skip_sec: 360, force: true }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(new Date(res.value.timestamp), new Date(0));
    console.log(`Request DateTime: ${new Date(res.value.timestamp)}`);

});

Deno.test("Timestamp 1day+ ago returns timestamp: 0", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date().getTime() - 1 * 24 * 3600 * 1000 - 1;
    console.log(`_upd: ${new Date(ts)}`);
    let res = stale_cache({ _upd: ts }, { id: 1 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(new Date(res.value.timestamp), new Date(0));

    // skip_sec donesn't affect, force returns timestamp 0
    res = stale_cache({ _upd: ts }, { id: 1, skip_sec: 360, force: true }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(new Date(res.value.timestamp), new Date(0));
    console.log(`Request DateTime: ${new Date(res.value.timestamp)}`);

});

Deno.test("Timestamp 0 returns noDone", () => {
    console.log(`Now: ${new Date()}`);
    const ts = new Date(0).getTime();
    console.log(`_upd: ${new Date(ts)}`);
    const res = stale_cache({ _upd: ts }, { id: 1 }).next();
    assertEquals(res.done, false);
    assertEquals(res.value.id, 0);
    assertEquals(res.value.timestamp, 0);
    console.log(`Request DateTime: ${new Date(res.value.timestamp)}`);
});
