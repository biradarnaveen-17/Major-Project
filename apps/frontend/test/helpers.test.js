import test from "node:test";
import assert from "node:assert/strict";
import { shortAddress, parcelMetadata } from "../src/utils/helpers.js";

test("shortAddress formats valid Ethereum wallet addresses", () => {
  assert.equal(shortAddress("0x1234567890abcdef1234567890abcdef12345678"), "0x1234...5678");
  assert.equal(shortAddress(null), "Not connected");
  assert.equal(shortAddress(undefined), "Not connected");
});

test("parcelMetadata generates consistent normalized fingerprint string", () => {
  const result = parcelMetadata("Survey-101", "Bengaluru", "North", "Yelahanka", "Singanayakanahalli");
  assert.equal(result, "survey-101|singanayakanahalli|yelahanka|north|bengaluru");
});
