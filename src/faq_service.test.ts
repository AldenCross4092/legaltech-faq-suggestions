import assert from "node:assert/strict";
import { chooseFaqs } from "./faq_service.js";

const result = chooseFaqs({ text: "signed copy", matterType: "signed_document_delivery" });
assert.equal(result.length, 1);
assert.equal(result[0].question, "How should I deliver a signed document?");
console.log("faq decision test passed");
