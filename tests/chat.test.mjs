// Tests for the recruiter assistant engine.  Run:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createChatEngine, normalise, stem, editDistance } from "../site/js/chat/engine.js";
import { PROFILE } from "../site/js/chat/knowledge.js";

const fixedNow = () => new Date("2026-10-22T10:00:00Z");
const textOf = (reply) =>
  reply.blocks
    .map((b) => (b.type === "list" ? b.items.join(" | ") : b.type === "actions" ? b.items.map((i) => i.label).join(" | ") : b.text))
    .join(" \n ");

function ask(question, engine = createChatEngine(PROFILE, { now: fixedNow })) {
  const reply = engine.reply(question);
  return { reply, text: textOf(reply), intent: reply.intent };
}

// [question, expected intent, text that must appear, text that must NOT appear]
const CASES = [
  ["Hi there", "greeting", "portfolio assistant"],
  ["Tell me about Ivan", "about", "Business Analytics graduate"],
  ["Give me a quick summary", "about", "Power BI"],
  ["Where does he work now?", "current_role", "Lavender Confectionery & Bakery"],
  ["What is his current role?", "current_role", "Business Analyst"],
  ["What's his work history?", "experience", "Rimbun Capital"],
  ["How many years of experience does he have?", "experience_years", "professional experience"],
  ["What did he do at Rimbun?", "company_detail", "Dataverse"],
  ["Tell me about his job at Lavender", "company_detail", "~2.5% revenue gap"],
  ["Where did he study?", "education", "Lancaster"],
  ["What's his CGPA?", "grades", "3.21"],
  ["Did he graduate with honours?", "grades", "Second Class Honours"],
  ["Was he on the dean's list?", "grades", "Dean's List"],
  ["What's his tech stack?", "skills", "Azure Synapse Analytics"],
  ["What programming languages does he know?", "skills", "Python"],
  ["Does he know DAX?", "skill_check", "Yes, DAX"],
  ["Can he use Python and SQL?", "skill_check", "Yes, Python"],
  ["Is he familiar with power bi?", "skill_check", "Yes, Power BI"],
  ["Does he know Snowflake?", "skill_check", "isn't listed", "Yes, Snowflake"],
  ["Has he used Databricks?", "skill_check", "Azure Synapse Analytics"],
  ["Kubernetes?", "skill_check", "isn't listed"],
  ["Show me his projects", "projects", "Silent Pipeline Failure"],
  ["Tell me about project 3", "project_detail", "2.5%"],
  ["Explain the revenue reconciliation", "project_detail", "hard-coded category exclusions"],
  ["Tell me about the loyalty analytics project", "project_detail", "Synapse serverless SQL"],
  ["How did he cut Azure costs?", "project_detail", "about 70%"],
  ["Was he an auditor?", "company_detail", "Jul 2026 – Oct 2026"],
  ["How did he fix the forecast outage?", "project_detail", "Entra ID"],
  ["What was his final year project?", "project_detail", "Netlify"],
  ["What's his proudest achievement?", "best_project", "Enterprise Data Platform Recovery"],
  ["What measurable impact has he had?", "achievements", "25+ outlets"],
  ["What certifications does he have?", "certifications", "18 credentials"],
  ["Is he Microsoft certified?", "certifications", "not a Microsoft certification exam"],
  ["Does he have PL-300?", "certifications", "PL-300"],
  ["Any Google certificates?", "certifications", "Google Business Intelligence"],
  ["How can I contact him?", "contact", "wencong0421@gmail.com"],
  ["Can I get his CV?", "resume", "Download resume"],
  ["Where is he based?", "location", "Johor Bahru"],
  ["Is he open to relocation?", "relocation", "hasn't shared"],
  ["What's his salary expectation?", "salary", "hasn't shared"],
  ["Does he need visa sponsorship?", "visa", "hasn't shared"],
  ["When can he start?", "availability", "contact him directly"],
  ["What languages does he speak?", "languages", "Mandarin"],
  ["What are his hobbies?", "hobbies", "rather not guess"],
  ["How old is he?", "private", "personal information"],
  ["Why should we hire him?", "strengths", "Fixes production problems"],
  ["What's his biggest weakness?", "weaknesses", "rather not guess"],
  ["What AI experience does he have?", "ai", "GenAI legal assistant"],
  ["Does he speak Cantonese?", "languages", "Cantonese"],
  ["Has he worked with MCP?", "ai", "local MCP server"],
  ["Tell me about EZBot", "project_detail", "PHP and MySQL"],
  ["Is he good with stakeholders?", "leadership", "CEO"],
  ["Is he a fit for a data engineer role?", "role_fit", "Azure Synapse pipelines"],
  ["Are you a bot?", "bot", "scripted assistant"],
  ["What's his favourite pizza topping?", "fallback", "rather not guess"],
];

for (const [question, intent, mustContain, mustNotContain] of CASES) {
  test(`"${question}" → ${intent}`, () => {
    const { text, intent: got } = ask(question);
    assert.equal(got, intent, `intent for "${question}"\n${text}`);
    if (mustContain) assert.ok(text.includes(mustContain), `"${question}" should mention "${mustContain}"\n${text}`);
    if (mustNotContain) assert.ok(!text.includes(mustNotContain), `"${question}" should not mention "${mustNotContain}"`);
  });
}

test("typos are corrected", () => {
  assert.equal(ask("wat are his certfications").intent, "certifications");
  assert.equal(ask("does he knwo pyhton").intent, "skill_check");
  assert.equal(ask("tell me about his educaton").intent, "education");
  assert.ok(ask("what did he do at lavendar").text.includes("Lavender"));
});

test("follow-ups use conversation context", () => {
  const engine = createChatEngine(PROFILE, { now: fixedNow });
  assert.equal(engine.reply("Show me his projects").intent, "projects");
  assert.ok(textOf(engine.reply("tell me about the second one")).includes("Silent Pipeline Failure"));
  assert.ok(textOf(engine.reply("what tools did he use?")).includes("Git"));
  assert.ok(textOf(engine.reply("next project")).includes("Revenue Reconciliation"));
  assert.ok(textOf(engine.reply("what was the result?")).includes("reconciled"));
});

test("two topics in one question are both answered", () => {
  const { text } = ask("What's his education and certifications?");
  assert.ok(text.includes("Lancaster"), text);
  assert.ok(text.includes("credentials"), text);
});

test("experience length is computed from the dates, not hard-coded", () => {
  const engine = createChatEngine(PROFILE, { now: () => new Date("2027-04-15") });
  assert.ok(textOf(engine.reply("how many years of experience")).includes("about 1 year"));
});

test("never claims a skill that isn't in the profile", () => {
  for (const tool of ["Snowflake", "Kafka", "Docker", "Java", "Salesforce", "Looker"]) {
    const { text } = ask(`Does he know ${tool}?`);
    assert.ok(!text.startsWith(`Yes`), `${tool}: ${text}`);
    assert.ok(text.includes("isn't listed"), `${tool}: ${text}`);
  }
});

test("helpers", () => {
  assert.equal(normalise("Power BI & Azure Synapse!"), "powerbi and synapse");
  assert.equal(stem("certifications"), stem("certification"));
  assert.equal(editDistance("pyhton", "python"), 1);
  assert.equal(editDistance("certfications", "certifications"), 1);
});

// The site is public: no answer may reveal money amounts or private terms, and answers stay
// neutral about career plans. Private terms live in tests/private-terms.json, which is kept out of
// version control; without it, only the money check runs.
const PRIVATE_TERMS = existsSync(new URL("./private-terms.json", import.meta.url))
  ? JSON.parse(readFileSync(new URL("./private-terms.json", import.meta.url), "utf8"))
  : [];
const PRIVATE_PATTERN = PRIVATE_TERMS.length ? new RegExp(PRIVATE_TERMS.join("|"), "i") : null;
const PROBES = [...CASES.map((c) => c[0]), "Tell me more", "Why should we hire him?", "What are his achievements?", "Is he looking for a job?", "What roles is he targeting?", "Is he open to work?"];
test("no answer reveals money amounts or private terms", () => {
  const engine = createChatEngine(PROFILE, { now: fixedNow });
  for (const q of PROBES) {
    const t = textOf(engine.reply(q));
    assert.ok(!/RM ?\d|USD|S\$ ?\d|\$\d/i.test(t), `"${q}" shows a money amount: ${t}`);
    assert.ok(!PRIVATE_PATTERN || !PRIVATE_PATTERN.test(t), `"${q}" leaked a private term: ${t}`);
  }
});
test("answers stay neutral about career plans", () => {
  const engine = createChatEngine(PROFILE, { now: fixedNow });
  for (const q of PROBES) {
    const t = textOf(engine.reply(q));
    assert.ok(!/actively looking|now looking|looking for (a )?(new )?(job|role)|seeking|targeting|open to work/i.test(t), `"${q}" sounds job-seeking: ${t}`);
  }
});
