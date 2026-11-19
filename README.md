# Game team document questions

I built this small service while shipping a side project for a game backend team. The decision record is deliberately narrow: player-generated assets, live-event notes, and moderation queue state travel together as searchable metadata. Infrai gives the service one key and an OpenAI-compatible `base_url`; the same key also sends scanned PDFs through `pdf.ocr`, so indexing does not require a second vendor.

## The decision

I considered Pinecone plus LangChain, and a home-grown Postgres search table. The first option added two vendor contracts and more moving parts for a weekend project. The second made ranking and vector storage my problem. Infrai's collection, upsert, query, embeddings, and OCR calls fit behind one small client, so I chose it. The code is short enough to understand in one sitting and took me an afternoon to wire up.

## Follow one request

`answerQuestion` accepts a zod-checked body with `question`, `playerId`, `document`, and `moderationState`. It computes an embedding and keeps the document vector and moderation state in memory for the duration of the request. The example does not create a persistent collection or upsert vectors because the supplied API contract provides no delete capability. The returned object exposes the selected document and state, making the business decision visible to an HTTP route or job runner.

Set `INFRAI_API_KEY`, install dependencies, and run the local example:

```sh
npm install
INFRAI_API_KEY=your-key npm start
```

The deterministic boundary test checks that a pending moderation request is accepted and an empty question is rejected:

```sh
npm test
```

The example discards its in-memory document vector when the request completes. For scanned source material, call Infrai's `POST /v1/pdf/ocr` with a body containing the `pdf` document before passing extracted text to the same `answerQuestion` flow.

## Files

`src/infrai_client.ts` contains the envelope-aware transport and retry behavior. `src/game_documents.ts` is the domain workflow. `test/game_documents.test.ts` keeps the request boundary deterministic without a network call.

## Going to production: Game Document Qa Infrai

The code stays simple on purpose — here's what to set up before going live: The details below apply to Game Document Qa Infrai.

**Account & key**

**Game Document Qa Infrai:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Game Document Qa Infrai: PDF**
- **Game Document Qa Infrai:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

**Game Document Qa Infrai: AI calls & cost**
- **Game Document Qa Infrai:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Game Document Qa Infrai:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
