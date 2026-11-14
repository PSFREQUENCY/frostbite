import { describe, expect, it } from "vitest";

import {
  creatorApplicationDraftSchema,
  creatorReviewDecisionSchema,
} from "../src/creator-admission/index.ts";
import { webUrlSchema } from "../src/http/index.ts";

// An address a person types that is later shown or followed must be a web address. A bare URL check accepts any scheme, among them the ones
// that run script or carry a whole document (`javascript:`, `data:`), so the scheme is part of the check.
const refused = [
  "javascript:alert(1)",
  "JavaScript:alert(1)",
  "jAvAsCrIpT:alert(document.cookie)",
  "data:text/html,<script>alert(1)</script>",
  "vbscript:msgbox(1)",
  "file:///etc/passwd",
  "blob:https://example.test/0b3b",
  "ftp://example.test/file",
  "mailto:someone@example.test",
  "//example.test/path",
  "example.test/path",
  "  javascript:alert(1)",
  "java\nscript:alert(1)",
  "",
  "not a url",
];

describe("a web address", () => {
  it.each([
    "https://example.test",
    "http://example.test/a?b=c#d",
    "HTTPS://EXAMPLE.TEST/",
    "https://example.test:8443/work",
  ])("accepts %s", (value) => {
    expect(webUrlSchema.safeParse(value).success).toBe(true);
  });

  it.each(refused)("refuses %j", (value) => {
    expect(webUrlSchema.safeParse(value).success).toBe(false);
  });
});

describe("the links of a creator's application and of a reviewer's evidence", () => {
  const draft = {
    contentDeclarationAccepted: true,
    displayName: "Arcade Builder",
    expectedLaunchSize: "A small cohort",
    expectedLaunchTiming: "After review",
    jurisdictionAcknowledged: true,
    portfolioLinks: ["https://example.test/work"],
    projectSummary: "A Bitcoin-native arcade experience.",
    provenanceDeclarationAccepted: true,
    rightsDeclarationAccepted: true,
  };
  const decision = {
    action: "approve",
    applicationId: "01994b10-0000-7000-8000-000000000001",
    creatorFeedback: "",
    evidenceReferences: ["https://example.test/proof"],
    privateNotes: "",
    reasonCode: "creator-approved",
  };

  it("take web addresses", () => {
    expect(creatorApplicationDraftSchema.safeParse(draft).success).toBe(true);
    expect(creatorReviewDecisionSchema.safeParse(decision).success).toBe(true);
  });

  it.each(refused.filter((value) => value !== ""))(
    "refuse a portfolio link that is %j",
    (value) => {
      expect(
        creatorApplicationDraftSchema.safeParse({
          ...draft,
          portfolioLinks: [value],
        }).success,
      ).toBe(false);
    },
  );

  it.each(refused.filter((value) => value !== ""))(
    "refuse an evidence reference that is %j",
    (value) => {
      expect(
        creatorReviewDecisionSchema.safeParse({
          ...decision,
          evidenceReferences: [value],
        }).success,
      ).toBe(false);
    },
  );
});
