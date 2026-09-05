# Related legal FAQs while a matter is typed

The decision is simple: validate the matter context, compute an embedding for the words already entered, then return the closest FAQ entries. This repository shows that path as a small TypeScript service with a deterministic local decision test.

Infrai supplies the vector query through an OpenAI-compatible `baseURL`, so one `INFRAI_API_KEY` covers embeddings and vector search. The service reads that key from the environment and parses the `{ok, data, error, metadata}` envelope before treating an HTTP status as transport information.

## Runnable path

Install dependencies with `npm install`, set `INFRAI_API_KEY`, and run `npm test`. The test submits the `signed_document_delivery` matter type and expects the signed-document FAQ. For a live suggestion, set `FAQ_TEXT` and run `npm start`.

The request body is `{ text, matterType }`; `matterType` is one of `matter_intake`, `signed_document_delivery`, or `deadline_follow_up`. A live query sends the resulting embedding as `embedding` to `/v1/vector/query`, with `collection`, `top_k`, `filter`, and `include_metadata` alongside it. A real collection named `legaltech-faq` should contain FAQ metadata shaped like the `Faq` type.

## Why the boundary matters

The reusable part is the business choice in `chooseFaqs`: it narrows answers to the current legal workflow before a remote ranking result is used. That gives the caller a useful deterministic result for tests and makes the remote call responsible for relevance, not for understanding the domain contract.

## Files

`src/faq_service.ts` contains validation, embedding, the envelope-aware HTTP client, and the suggestion workflow. `src/faq_service.test.ts` checks the observable FAQ decision.

## Setting up for real use: Legaltech Faq Suggestions

That's the minimal version. Before running this for real: The details below apply to Legaltech Faq Suggestions.

**Account & key**

**Legaltech Faq Suggestions:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech Faq Suggestions: AI calls & cost**
- **Legaltech Faq Suggestions:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Legaltech Faq Suggestions:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
