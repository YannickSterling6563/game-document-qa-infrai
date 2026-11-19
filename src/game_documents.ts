import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const QuestionBody = z.object({
  question: z.string().min(1),
  playerId: z.string().min(1),
  document: z.string().min(1),
  moderationState: z.enum(["pending", "approved", "rejected"])
});
export type QuestionBody = z.infer<typeof QuestionBody>;

export async function extractScannedText(pdf: string) {
  const client = new InfraiClient();
  const result = await client.request<{ text?: string }>("/v1/pdf/ocr", { pdf });
  return result.text ?? "";
}

export async function answerQuestion(input: QuestionBody) {
  const body = QuestionBody.parse(input);
  const client = new InfraiClient();
  const embedding = await client.embedding(body.document);
  // Keep this example's vector request-local: the supplied API contract has
  // no delete capability for persistent collections or vectors.
  const documents = [{ embedding, metadata: { document: body.document, moderationState: body.moderationState } }];
  const match = documents.find((document) => document.embedding.length > 0 && document.metadata.moderationState === body.moderationState)?.metadata;
  return { answer: match?.document ?? "No matching game document found.", moderationState: match?.moderationState ?? body.moderationState };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const input = { question: "What happens during the live event?", playerId: "player-42", document: "Live event assets enter moderation before publication.", moderationState: "approved" as const };
  answerQuestion(input).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
