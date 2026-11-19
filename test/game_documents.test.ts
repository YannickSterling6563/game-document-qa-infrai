import assert from "node:assert/strict";
import { InfraiClient } from "../src/infrai_client.js";
import { answerQuestion, QuestionBody } from "../src/game_documents.js";

const accepted = QuestionBody.parse({ question: "When is the event?", playerId: "p1", document: "Event starts Friday.", moderationState: "pending" });
assert.equal(accepted.moderationState, "pending");
assert.throws(() => QuestionBody.parse({ question: "", playerId: "p1", document: "x", moderationState: "pending" }));
console.log("request boundary test passed");

// The live example must never leave a collection or vector behind.
const originalEmbedding = InfraiClient.prototype.embedding;
const originalRequest = InfraiClient.prototype.request;
const originalKey = process.env.INFRAI_API_KEY;
process.env.INFRAI_API_KEY = "local-test-key";
try {
  InfraiClient.prototype.embedding = async () => [1, 0];
  InfraiClient.prototype.request = async () => { throw new Error("Unexpected persistent API call"); };
  assert.deepEqual(await answerQuestion(accepted), { answer: accepted.document, moderationState: "pending" });
} finally {
  InfraiClient.prototype.embedding = originalEmbedding;
  InfraiClient.prototype.request = originalRequest;
  if (originalKey === undefined) delete process.env.INFRAI_API_KEY;
  else process.env.INFRAI_API_KEY = originalKey;
}
console.log("request-local vector test passed");
