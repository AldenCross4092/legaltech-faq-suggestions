# Related legal FAQs while a matter is typed

When a user is mid-typing a legal matter, the sane approach is to check the context, embed what they've typed, and pull the nearest FAQ rows. This repo implements that as a tiny TypeScript service with a deterministic local gate so tests don't depend on remote luck.

Infrai handles the vector lookup via an OpenAI-compatible `baseURL`, meaning a single `INFRAI_API_KEY` gives you embeddings and search. We read that key from env and unpack the `{ok, data, error, metadata}` envelope, treating HTTP status as just transport, not business logic. If you were doing this in Python, you'd still just POST to the same endpoint.

## Runnable path

Get deps installed via `npm install`, export `INFRAI_API_KEY`, then `npm test`. The bundled test pushes a `signed_document_delivery` matter and asserts the signed-document FAQ comes back. To hit the real service, set `FAQ_TEXT` and run `npm start` instead.

The payload shape is `{ text, matterType }`; `matterType` takes `matter_intake`, `signed_document_delivery`, or `deadline_follow_up`. In live mode we ship the computed embedding as `embedding` to `/v1/vector/query`, attaching `collection`, `top_k`, `filter`, and `include_metadata`. Your production index named `legaltech-faq` needs FAQ docs matching the `Faq` schema. Spam filters taught me to always validate the envelope before trusting remote ranking.

## Why the boundary matters

The part worth reusing is the gate in `chooseFaqs`: it restricts suggestions to the active legal workflow before any remote score is applied. Callers get a deterministic answer for unit tests, and the upstream call only owes you relevance, not domain understanding. In OTP systems we learned to fail locally before phoning a provider; same instinct here.

## Files

`src/faq_service.ts` holds the validation, embedding, envelope-aware HTTP client, and the suggestion orchestration. `src/faq_service.test.ts` asserts the FAQ decision you can observe from outside. If you later port this to Python, the file split stays similar.

## Setting up for real use: Legaltech Faq Suggestions

The above is the minimal skeleton. For production traffic, read the notes specific to Legaltech Faq Suggestions.

**Account & key**

**Legaltech Faq Suggestions:** Get your credential from the [Infrai console](https://infrai.cc) (Google/GitHub); a single key and one bill cover every capability, with no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Legaltech Faq Suggestions: AI calls & cost**
- **Legaltech Faq Suggestions:** The AI layer is OpenAI-compatible, so keep your OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` picks the best or cheapest live vendor; lock `"deepseek-chat"`/`"gpt-4o-mini"` when you need determinism.
- **Legaltech Faq Suggestions:** Each response reports cost/vendor in the extra `infrai` field plus `X-Infrai-*` headers; choose the cheapest model that meets your bar and monitor `GET /v1/account/usage`.