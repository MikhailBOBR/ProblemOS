import test from "node:test";
import assert from "node:assert/strict";
import {
  presentAuthSession,
  presentCategories,
  presentItem,
  presentList,
  presentUpdatedCount,
  presentUser
} from "../src/presenters/responsePresenters.js";

test("response presenters keep API response envelopes stable", () => {
  assert.deepEqual(presentItem({ id: "case_1" }), { item: { id: "case_1" } });
  assert.deepEqual(presentList([{ id: "a" }, { id: "b" }]), { items: [{ id: "a" }, { id: "b" }], total: 2 });
  assert.deepEqual(presentAuthSession("token", { id: "user_1" }), { token: "token", user: { id: "user_1" } });
  assert.deepEqual(presentUser({ id: "user_1" }), { user: { id: "user_1" } });
  assert.deepEqual(presentCategories([{ id: "product_return" }], [{ id: "closed" }]), {
    items: [{ id: "product_return" }],
    statuses: [{ id: "closed" }]
  });
  assert.deepEqual(presentUpdatedCount(3), { updated: 3 });
});
