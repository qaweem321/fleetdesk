import assert from "node:assert/strict";
import { test } from "node:test";
import { buttonEmailHtml, escapeHtml } from "./email";

test("escapeHtml neutralises HTML", () => {
  assert.equal(
    escapeHtml(`<script>"x"&'y'</script>`),
    "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;",
  );
});

test("email template never contains raw user HTML", () => {
  const html = buttonEmailHtml({
    heading: "Join <b>Evil</b>",
    message: `<img src=x onerror="alert(1)">`,
    buttonText: "Go",
    url: "https://example.com/a?b=1&c=2",
    footer: "Bye",
  });
  assert.ok(!html.includes("<b>Evil</b>"));
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("https://example.com/a?b=1&amp;c=2"));
});
