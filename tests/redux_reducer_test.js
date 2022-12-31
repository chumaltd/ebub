import { assertEquals } from "https://deno.land/std@0.166.0/testing/asserts.ts";
import { refresh_with_ts } from '../redux/reducer.js';
import { get_body } from '../redux/util.js';

Deno.test("Non object shall be wrapped & retrieved", () => {
    const value = 1234;
    const state = {};
    state.summary = refresh_with_ts({}, { payload: value });
    const result = get_body(state, 'summary');
    assertEquals(value, result);
});
