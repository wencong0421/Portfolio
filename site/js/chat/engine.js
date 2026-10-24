// Client-side recruiter assistant. No network calls, no AI model: every answer is assembled from
// PROFILE (knowledge.js), so it can never invent facts. Pipeline for each message:
//
//   1. normalise   lower-case, expand contractions, map synonyms and multi-word terms
//   2. correct     fix typos against the known vocabulary (Damerau-Levenshtein)
//   3. entities    find skills, projects, companies, schools, certificate issuers, unlisted tools
//   4. intents     score every intent by weighted keywords + phrase patterns + entity signals
//   5. context     resolve follow-ups ("tell me more", "the second one", "what tools there?")
//   6. respond     run the winning handler(s); if nothing is confident, BM25 search over all facts
//
// Answers are structured { blocks, suggestions } so the UI can render them safely without innerHTML.

import { PROFILE } from "./knowledge.js";

// ============================================================================================
// 1. Text processing
// ============================================================================================

const STOPWORDS = new Set(
  ("a an the and or but if of to in on at for from by with about as into than then so such is are was were be been being " +
    "do does did doing have has had having i me my we our you your he him his she her they them their it its this that these those " +
    "there here what which who whom whose when where why how can could would should will shall may might must just also very really " +
    "please tell show give let lets know any some all any much many more most other ivan ivans wong man chong mr").split(" ")
);
// Words that carry meaning for intents even though they look like stop-words.
const KEEP = new Set(["how", "why", "who", "where", "when", "more", "know", "can", "much", "many", "tell"]);

const CONTRACTIONS = [
  [/\bwhat's\b/g, "what is"], [/\bwho's\b/g, "who is"], [/\bwhere's\b/g, "where is"], [/\bhow's\b/g, "how is"],
  [/\bit's\b/g, "it is"], [/\bhe's\b/g, "he is"], [/\bshe's\b/g, "she is"], [/\bthat's\b/g, "that is"],
  [/\b(\w+)'re\b/g, "$1 are"], [/\b(\w+)'ve\b/g, "$1 have"], [/\b(\w+)'ll\b/g, "$1 will"], [/\b(\w+)'d\b/g, "$1 would"],
  [/\bcan't\b/g, "can not"], [/\bwon't\b/g, "will not"], [/\b(\w+)n't\b/g, "$1 not"], [/\b(\w+)'s\b/g, "$1"],
];

// Multi-word terms and synonyms collapse to one canonical token before tokenising.
const PHRASES = [
  [/\bpower\s*bi\b|\bpbi\b/g, " powerbi "],
  [/\bazure synapse( analytics)?\b|\bsynapse analytics\b/g, " synapse "],
  [/\brow[\s-]*level security\b/g, " rls "],
  [/\bt[\s-]?sql\b/g, " tsql "],
  [/\bpower query\b/g, " powerquery "],
  [/\bpower automate\b/g, " powerautomate "],
  [/\bpower apps?\b/g, " powerapps "],
  [/\bmachine learning\b/g, " ml "],
  [/\bartificial intelligence\b|\bgen\s*ai\b|\bgenerative ai\b/g, " ai "],
  [/\bcurriculum vitae\b|\bcv\b|\brésumé\b|\bresumé\b/g, " resume "],
  [/\be-?mail\b/g, " email "],
  [/\bwhats\s*app\b/g, " whatsapp "],
  [/\blinked\s*in\b/g, " linkedin "],
  [/\bdean'?s? list\b/g, " deanslist "],
  [/\bfinal year project\b|\bfyp\b/g, " fyp "],
  [/\bnotice period\b/g, " notice "],
  [/\bwork permit\b|\bwork authori[sz]ation\b|\bright to work\b/g, " visa "],
  [/\bfree time\b|\bspare time\b|\bpast ?times?\b/g, " hobby "],
  [/\bfull[\s-]?time\b/g, " fulltime "],
  [/\bpart[\s-]?time\b/g, " parttime "],
  [/\bwork from home\b|\bwfh\b/g, " remote "],
  [/\bsystem of record\b/g, " pos "],
  [/\bdata engineer(ing)?\b/g, " dataengineer "],
  [/\bdata analyst\b|\bdata analytics\b/g, " dataanalyst "],
  [/\bdata scien(tist|ce)\b/g, " datascientist "],
  [/\bbusiness analyst\b/g, " businessanalyst "],
  [/\bbi (developer|analyst|engineer)\b/g, " bideveloper "],
];

export function normalise(input) {
  let s = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'");
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  s = s.replace(/&/g, " and ").replace(/\+/g, " plus ");
  for (const [re, to] of PHRASES) s = s.replace(re, to);
  return s.replace(/[^a-z0-9#.\s-]/g, " ").replace(/(\s|^)[.-]+|[.-]+(\s|$)/g, " ").replace(/\s+/g, " ").trim();
}

// Light suffix stemmer; good enough to match "projects" / "project", "certified" / "certify".
export function stem(word) {
  if (word.length <= 3) return word;
  let w = word;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) w = w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  else if (w.endsWith("ation") && w.length > 7) w = w.slice(0, -5);
  else if (w.endsWith("ly") && w.length > 5) w = w.slice(0, -2);
  return w;
}

export function tokenize(normalised, { keepStopwords = false } = {}) {
  return normalised
    .split(" ")
    .filter(Boolean)
    .filter((t) => keepStopwords || KEEP.has(t) || !STOPWORDS.has(t));
}

// Damerau-Levenshtein (optimal string alignment) with an early exit.
export function editDistance(a, b, max = 2) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      rowMin = Math.min(rowMin, d[i][j]);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}

// ============================================================================================
// 2. Intents
// ============================================================================================
// keywords: stem -> weight. patterns: regexes on the normalised text (+3 each, capped).
// entity:   an entity type that makes this intent eligible / boosts it.

const INTENTS = [
  { id: "greeting", patterns: [/^(hi|hello|hey|hiya|yo|greetings|good (morning|afternoon|evening))\b/], keywords: { hi: 2, hello: 2, hey: 2 } },
  { id: "thanks", patterns: [/\b(thanks|thank you|thx|cheers|appreciate it|much appreciated)\b/] },
  { id: "goodbye", patterns: [/\b(bye|goodbye|see you|see ya|that is all|that will be all|nothing else)\b/] },
  { id: "help", patterns: [/\bwhat can (you|i) (do|ask)\b/, /^(help|menu|options|commands)\b/, /\bhow (does|do) this work\b/] },
  { id: "bot", patterns: [/\b(who|what) are you\b/, /\bare you (a |an )?(bot|ai|robot|human|real|person|chatgpt|gpt|claude|ivan)\b/, /\b(is this|am i talking to) (a )?(bot|ai|ivan|real)\b/] },

  { id: "about", keywords: { about: 1, yourself: 2.5, introduce: 2.5, introduction: 2.5, summary: 2, overview: 2, profile: 1.5, elevator: 2.5, pitch: 2, describe: 1.5 },
    patterns: [/\btell me about (him|ivan|yourself)\b/, /\bwho is (he|ivan|this)\b/, /^(about|summary|overview|intro)\b/, /\bwhat (should|do) i know about\b/] },
  { id: "current_role", keywords: { current: 2.5, now: 1.5, present: 1.5, today: 1, currently: 2.5 },
    patterns: [/\bwhere (does|is) (he|ivan) work/, /\bwhat (does|is) (he|ivan) do(ing)?( now| currently| for work)?\b/, /\b(current|present) (job|role|position|employer|company|title)\b/, /\bwho (does he|is he) work(ing)? for\b/] },
  { id: "experience", keywords: { experience: 2.5, work: 1, history: 2, career: 2.5, job: 1.5, employment: 2.5, employer: 2, role: 1, position: 1, worked: 1.5, internship: 2, intern: 2, background: 1.2, previous: 1.5, past: 1 },
    patterns: [/\bwork (experience|history)\b/, /\bwhere has (he|ivan) worked\b/, /\b(previous|past) (jobs?|roles?|companies|employers?)\b/] },
  { id: "experience_years", keywords: { years: 1, months: 1, senior: 1.5, junior: 1.5, level: 1 },
    patterns: [/\bhow (much|many|long)\b.{0,30}\b(experience|years?|months?|working)\b/, /\byears? of experience\b/, /\b(is he|how) (senior|junior|experienced)\b/, /\bentry level\b/] },
  { id: "education", keywords: { education: 3, degree: 3, university: 2.5, study: 2, studied: 2, college: 2.5, diploma: 2.5, graduate: 2, graduat: 2, qualification: 2.5, bachelor: 2.5, school: 1.5, major: 2, academic: 1.5, sunway: 2, lancaster: 2 },
    patterns: [/\bwhere did (he|ivan) (study|graduate|go to)\b/, /\bwhat did (he|ivan) study\b/] },
  { id: "grades", keywords: { cgpa: 3.5, gpa: 3.5, grade: 3, honour: 3, honor: 3, deanslist: 3.5, classification: 3, distinction: 2, transcript: 2.5, score: 1.5, result: 1 },
    patterns: [/\bwhat (were|are) (his|ivan) (grades|results)\b/, /\bfirst class\b|\bsecond class\b/] },
  { id: "skills", keywords: { skill: 3, tech: 1.5, stack: 2.5, tool: 2, technolog: 2.5, toolkit: 2.5, technical: 2, competenc: 2.5, expertise: 2.5, strong: 0.5, languages: 0.5, programming: 1.5 },
    patterns: [/\bwhat (tools|technologies|tech|languages|software) (does|can|do)\b/, /\btech(nical)? stack\b/, /\bprogramming languages?\b/] },
  { id: "skill_check", entity: "skill", keywords: { know: 2, use: 1.5, used: 1.5, familiar: 2.5, proficient: 2.5, experience: 1, worked: 1.5, expert: 2, good: 1, level: 1.5, comfortable: 2, hands: 1.5, can: 1, ever: 1 } },
  { id: "projects", keywords: { project: 3, portfolio: 1.5, built: 2, build: 1.5, examples: 2, case: 1.5, studies: 1.5, work: 0.5, done: 1, showcase: 2 },
    patterns: [/\bwhat has (he|ivan) (built|done|made|delivered)\b/, /\b(list|show)( me)? (his )?projects\b/] },
  { id: "project_detail", entity: "project", keywords: { detail: 1.5, explain: 2, how: 1, walk: 1.5 } },
  { id: "best_project", patterns: [/\b(best|biggest|most (impressive|important|proud|challenging|difficult|complex)|proudest|flagship|favou?rite|hardest|top)\b.{0,25}\b(project|achievement|work|accomplishment|win)\b/, /\b(proudest|biggest|greatest) (achievement|accomplishment)\b/] },
  { id: "achievements", keywords: { achievement: 3, accomplishment: 3, impact: 2.5, result: 1.5, numbers: 1.5, metric: 2, win: 1.5, proud: 1.5, deliver: 1.5, quantif: 2 },
    patterns: [/\bwhat has (he|ivan) achieved\b/, /\bmeasurable (impact|results)\b/] },
  { id: "certifications", entity: "issuer", keywords: { certification: 3.5, certificate: 3.5, certified: 3.5, cert: 3.5, course: 2, learning: 1.5, credential: 3, coursera: 2.5, license: 2, accredit: 2.5, pl: 1, exam: 2 },
    patterns: [/\bis (he|ivan) (microsoft |google |pmi |iiba )?certified\b/, /\b(pl|dp|da|az)[\s-]?\d{3}\b/] },
  { id: "contact", keywords: { contact: 3.5, email: 3.5, phone: 3.5, whatsapp: 3.5, reach: 2.5, call: 2, number: 1.5, linkedin: 3, connect: 2, message: 1.5, touch: 2, interview: 1.5 },
    patterns: [/\bhow (can|do) i (reach|contact|get in touch|talk to|speak to)\b/, /\bget in touch\b/] },
  { id: "resume", keywords: { resume: 3.5, download: 2.5, pdf: 2 }, patterns: [/\b(send|share|see|get) (me )?(his )?resume\b/] },
  { id: "location", keywords: { location: 3, located: 3, based: 3, live: 2.5, city: 2.5, country: 2, malaysia: 2, johor: 2.5, bahru: 2, timezone: 2.5 },
    patterns: [/\bwhere (is|does) (he|ivan) (live|based|located|from)\b/, /\bwhere is (he|ivan)\b/] },
  { id: "relocation", keywords: { relocate: 5, relocation: 5, relocat: 5, move: 2, remote: 4.5, hybrid: 4.5, onsite: 4, office: 1.5, travel: 2, singapore: 2.5, kuala: 1.5, lumpur: 1.5, abroad: 3, overseas: 3 } },
  { id: "availability", keywords: { available: 3.5, availab: 3.5, notice: 3.5, start: 2, join: 2, immediately: 2.5, asap: 2.5, open: 1.5, looking: 1.5 },
    patterns: [/\bwhen (can|could) (he|ivan) (start|join)\b/, /\bis (he|ivan) (open|looking|available)\b/, /\bopen to (work|opportunities|offers|new roles)\b/] },
  { id: "salary", keywords: { salary: 4, pay: 3, compensation: 4, expect: 1.5, expectation: 2.5, package: 2.5, rate: 2, wage: 4, ctc: 4, remuneration: 4 } },
  { id: "visa", keywords: { visa: 4, sponsorship: 4, sponsor: 3, citizen: 3, citizenship: 3.5, nationality: 3.5, pr: 2, passport: 3 } },
  { id: "languages", keywords: { language: 2.5, speak: 3.5, spoken: 3, mandarin: 3, chinese: 3, english: 3, malay: 3, bahasa: 3, cantonese: 3, fluent: 2.5, bilingual: 3 },
    patterns: [/\bwhat languages? (does|can) (he|ivan) speak\b/] },
  { id: "hobbies", keywords: { hobby: 4, interest: 2.5, fun: 2, weekend: 2.5, personal: 1.5, sport: 2.5, passion: 2, outside: 1.5, enjoy: 2.5, like: 0.8 },
    patterns: [/\bwhat (does|do) (he|ivan) (do|like|enjoy) (for fun|outside( of)? work|on weekends|in (his|their) free time)\b/] },
  { id: "private", patterns: [/\bhow old\b|\b(his )?age\b|\bbirthday\b|\bdate of birth\b|\bmarried\b|\bmarital\b|\bgirlfriend\b|\bboyfriend\b|\breligion\b|\brace\b|\bethnicity\b|\bhealth\b|\bic number\b|\bnric\b|\bhome address\b/] },
  { id: "strengths", keywords: { strength: 4, hire: 2.5, stand: 1.5, unique: 2.5, value: 1.5, best: 0.8, special: 2, why: 1 },
    patterns: [/\bwhy (should|would) (we|i|you|anyone) hire\b/, /\bwhat makes (him|ivan) (stand out|different|special|unique)\b/, /\bwhat (is|are) (his|ivan) (strengths?|superpower)\b/, /\bsell me\b/] },
  { id: "weaknesses", keywords: { weakness: 4, improve: 2, improvement: 2, lack: 2.5, gap: 1, fail: 2, mistake: 2.5 } },
  { id: "ai", keywords: { ai: 3.5, mcp: 4, connector: 2, plugin: 2, gpt: 3, chatgpt: 3, llm: 3.5, claude: 3, prompt: 2.5, agentic: 3.5, agent: 2, ml: 1.5, openai: 3, anthropic: 3, copilot: 2.5 } },
  { id: "leadership", keywords: { stakeholder: 3.5, communication: 3.5, communicat: 3.5, present: 1.5, presentation: 2.5, leadership: 3.5, lead: 2, led: 2, ceo: 3, executive: 2.5, management: 1.5, team: 1.5, collaborat: 2.5, teamwork: 3, soft: 2, explain: 1, business: 0.5 } },
  { id: "role_fit", keywords: { fit: 3, suitable: 3, qualified: 3, ready: 1.5, dataengineer: 2, dataanalyst: 2, datascientist: 2, businessanalyst: 2, bideveloper: 2 },
    patterns: [/\b(fit|suitable|good|right|qualified|ready|hire him|consider him) (for|as) (a |an )?(dataengineer|dataanalyst|datascientist|businessanalyst|bideveloper|analyst|engineer|developer)\b/, /\b(can|could) (he|ivan) (be|work as|do|handle) (a |an )?(dataengineer|dataanalyst|datascientist|businessanalyst|bideveloper)\b/, /\b(is he|is ivan) (a )?(dataengineer|dataanalyst|datascientist|bideveloper)\b/] },
  { id: "company_detail", entity: "company", keywords: { company: 1.5, there: 1, role: 1 } },
  { id: "site", patterns: [/\b(this|your|the) (site|website|portfolio|page)\b/, /\bhow (was|is) (this|it) (built|made)\b/, /\bwho (built|made|designed) (this|the site)\b/] },
];

for (const intent of INTENTS) {
  intent.stems = {};
  for (const [word, weight] of Object.entries(intent.keywords || {})) {
    const key = stem(word);
    intent.stems[key] = Math.max(intent.stems[key] || 0, weight);
  }
}

// Ordinary words that typo correction must never "fix" into vocabulary words.
const COMMON = new Set(
  "hello thanks thank great cool nice okay sure would could should about really please good what does that this with have from they them were when where which while your work works worked well also into than then just like know very much more most other some many".split(" ")
);

// ============================================================================================
// 3. Knowledge preparation (entities, retrieval index)
// ============================================================================================

function buildEntityIndex(profile) {
  const entries = [];
  const add = (alias, type, value) => {
    const key = normalise(alias);
    if (key) entries.push({ key, type, value, words: key.split(" ").length });
  };
  for (const group of profile.skills) {
    for (const item of group.items) {
      add(item.name, "skill", item.name);
      item.aliases.forEach((a) => add(a, "skill", item.name));
    }
  }
  for (const [tool, nearest] of Object.entries(profile.notListed)) add(tool, "unlisted", { tool, nearest });
  for (const p of profile.projects) {
    add(p.title, "project", p.id);
    p.aliases.forEach((a) => add(a, "project", p.id));
  }
  for (const e of profile.experience) e.companyAliases.forEach((a) => add(a, "company", e.company));
  for (const ed of profile.education) ed.institutionAliases.forEach((a) => add(a, "school", ed.id));
  for (const issuer of ["microsoft", "google", "coursera", "linkedin learning", "iiba", "pmi"]) add(issuer, "issuer", issuer);
  // Longest aliases first, so "power bi data methods" beats "power bi".
  return entries.sort((a, b) => b.key.length - a.key.length);
}

function findEntities(text, index) {
  const found = [];
  let rest = ` ${text} `;
  for (const entry of index) {
    const needle = ` ${entry.key} `;
    if (rest.includes(needle)) {
      if (!found.some((f) => f.type === entry.type && JSON.stringify(f.value) === JSON.stringify(entry.value))) {
        found.push({ type: entry.type, value: entry.value, alias: entry.key });
      }
      rest = rest.split(needle).join(" ¦ ");
    }
  }
  // "project 3", "#3", "the third one"
  const ordinals = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, last: 10 };
  const numbered = text.match(/\b(?:project|no|number|#)\s*0?([1-9]|10)\b/) || text.match(/#0?([1-9]|10)\b/);
  if (numbered) found.push({ type: "projectNumber", value: Number(numbered[1]) });
  const ordinal = text.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last) (one|project)\b/);
  if (ordinal) found.push({ type: "ordinal", value: ordinals[ordinal[1]] });
  return found;
}

// One retrieval document per fact, for BM25 fallback search.
function buildDocuments(profile) {
  const docs = [];
  const push = (text, topic, extra = {}) => docs.push({ text, topic, ...extra });
  push(profile.summary, "about");
  for (const e of profile.experience) {
    push(`${e.role} at ${e.company} (${e.type}, ${formatRange(e.start, e.end)}). ${e.summary}`, "experience", { ref: e.id });
    e.highlights.forEach((h) => push(h, "experience", { ref: e.id, company: e.company }));
  }
  for (const ed of profile.education) {
    push(`${ed.qualification} at ${ed.institution}, ${formatRange(ed.start, ed.end)}. CGPA ${ed.cgpa}.${ed.classification ? ` ${ed.classification}.` : ""}`, "education", { ref: ed.id });
    if (ed.finalYearProject) push(`Final year project: ${ed.finalYearProject}`, "education", { ref: ed.id });
  }
  for (const p of profile.projects) push(`${p.title}. ${p.problem} ${p.action} ${p.result} Tools: ${p.tools.join(", ")}.`, "project", { ref: p.id });
  for (const c of profile.certifications) push(`${c.title}, ${c.kind.toLowerCase()} from ${c.issuer}${c.date ? `, ${c.date}` : ""}.`, "certification", { ref: c.rank });
  profile.achievements.forEach((a) => push(a, "achievement"));
  profile.strengths.forEach((s) => push(`${s.title}: ${s.evidence}`, "strength"));
  return docs.map((d) => ({ ...d, terms: tokenize(normalise(d.text)).map(stem) }));
}

function buildBM25(docs) {
  const df = new Map();
  docs.forEach((d) => new Set(d.terms).forEach((t) => df.set(t, (df.get(t) || 0) + 1)));
  const avg = docs.reduce((n, d) => n + d.terms.length, 0) / docs.length;
  const N = docs.length;
  const k1 = 1.4;
  const b = 0.72;
  return (queryTerms) =>
    docs
      .map((d) => {
        let score = 0;
        for (const q of new Set(queryTerms)) {
          const n = df.get(q);
          if (!n) continue;
          const tf = d.terms.filter((t) => t === q).length;
          if (!tf) continue;
          const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
          score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * d.terms.length) / avg)));
        }
        return { doc: d, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b2) => b2.score - a.score);
}

function buildVocabulary(docs, entityIndex) {
  const vocab = new Set();
  INTENTS.forEach((intent) => Object.keys(intent.keywords || {}).forEach((k) => vocab.add(k)));
  docs.forEach((d) => tokenize(normalise(d.text)).forEach((t) => vocab.add(t)));
  entityIndex.forEach((e) => e.key.split(" ").forEach((t) => vocab.add(t)));
  ["hobby", "salary", "relocate", "remote", "visa", "notice", "resume", "certified", "experience", "education", "university", "strengths", "weakness"].forEach((t) => vocab.add(t));
  return [...vocab].filter((t) => t.length >= 3);
}

// ============================================================================================
// 4. Formatting helpers
// ============================================================================================

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatMonth(ym) {
  if (!ym) return "Present";
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
function formatRange(start, end) {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "Present"}`;
}
function monthsBetween(start, end, now = new Date()) {
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end ? end.split("-").map(Number) : [now.getFullYear(), now.getMonth() + 1];
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1);
}
const list = (items) => ({ type: "list", items });
const para = (text) => ({ type: "p", text });
const actions = (items) => ({ type: "actions", items });
const answer = (blocks, suggestions = [], meta = {}) => ({ blocks, suggestions, ...meta });

function joinWords(items) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

// ============================================================================================
// 5. Engine
// ============================================================================================

export function createChatEngine(profile = PROFILE, { now = () => new Date() } = {}) {
  const entityIndex = buildEntityIndex(profile);
  const docs = buildDocuments(profile);
  const search = buildBM25(docs);
  const vocabulary = buildVocabulary(docs, entityIndex);
  const name = profile.identity.preferredName;
  const contactActions = () =>
    actions([
      { label: "Email Ivan", href: `mailto:${profile.contact.email}` },
      { label: "WhatsApp", href: profile.contact.whatsapp },
      { label: "LinkedIn", href: profile.contact.linkedin },
    ]);

  const context = { lastIntent: null, lastProject: null, lastCompany: null, lastSkill: null, listedProjects: false, turns: 0 };

  const projectById = (id) => profile.projects.find((p) => p.id === id);
  const projectByNumber = (n) => profile.projects.find((p) => p.number === n);
  const skillEvidence = (skillName) => {
    const key = normalise(skillName);
    // Whole-word containment, so the skill "R" doesn't match every word with an r in it.
    const contains = (hay, needle) => ` ${hay} `.includes(` ${needle} `);
    const matches = (s) => {
      const n = normalise(s);
      return n === key || contains(n, key) || contains(key, n);
    };
    return {
      projects: profile.projects.filter((p) => p.tools.some(matches)),
      roles: profile.experience.filter((e) => e.skills.some(matches)),
      certs: profile.certifications.filter((c) => c.skills.some(matches) || contains(normalise(c.title), key)),
    };
  };

  // ---- Typo correction ------------------------------------------------------------------
  function correct(tokens) {
    const known = new Set(vocabulary);
    return tokens.map((t) => {
      if (t.length < 4 || known.has(t) || STOPWORDS.has(t) || COMMON.has(t) || /\d/.test(t)) return t;
      const max = t.length >= 8 ? 2 : 1;
      let best = t;
      let bestDistance = max + 1;
      for (const v of vocabulary) {
        if (Math.abs(v.length - t.length) > max || v[0] !== t[0]) continue;
        const d = editDistance(t, v, max);
        if (d < bestDistance) {
          bestDistance = d;
          best = v;
          if (d === 1) break;
        }
      }
      return best;
    });
  }

  // ---- Intent scoring --------------------------------------------------------------------
  function scoreIntents(text, stems, entities) {
    const has = (type) => entities.some((e) => e.type === type);
    return INTENTS.map((intent) => {
      let score = 0;
      for (const s of stems) {
        if (intent.stems[s]) {
          score += intent.stems[s];
          continue;
        }
        // Partial credit when one stem is a prefix of the other ("reloc" ~ "relocat").
        for (const [k, w] of Object.entries(intent.stems)) {
          if (Math.min(k.length, s.length) >= 5 && (s.startsWith(k) || k.startsWith(s))) {
            score += w * 0.8;
            break;
          }
        }
      }
      const patternHits = (intent.patterns || []).filter((re) => re.test(text)).length;
      score += Math.min(patternHits, 2) * 3;
      if (intent.entity) {
        if (has(intent.entity)) score += 2.5;
        else if (intent.id !== "certifications") score = Math.min(score, 0.5);
      }
      return { id: intent.id, score };
    }).sort((a, b) => b.score - a.score);
  }

  // ---- Handlers ---------------------------------------------------------------------------
  const handlers = {
    greeting: () =>
      answer(
        [para(`Hi! I'm ${name}'s portfolio assistant. Ask me anything a recruiter would: experience, skills, projects, education or how to get in touch.`)],
        ["Tell me about Ivan", "What's his tech stack?", "Show me his projects"]
      ),
    thanks: () => answer([para("You're welcome! Anything else you'd like to know?")], ["How can I contact him?", "Download his resume"]),
    goodbye: () => answer([para(`Thanks for stopping by. ${name} would be glad to hear from you.`), contactActions()]),
    help: () =>
      answer(
        [para("You can ask me things like:"), list(["Does Ivan know DAX?", "What did he do at Rimbun Capital?", "Tell me about the revenue reconciliation", "What's his CGPA?", "Is he Microsoft certified?", "Why should we hire him?"])],
        ["Tell me about Ivan", "Show me his projects"]
      ),
    bot: () =>
      answer(
        [para(`I'm a scripted assistant built into ${name}'s portfolio. I answer only from the facts on this site and his resume, so I won't make things up, and I don't use an AI model or send your questions anywhere.`), para(`For anything I can't answer, ${name} is happy to talk directly.`), contactActions()],
        ["Tell me about Ivan", "What can I ask?"]
      ),

    about: ({ detail }) => {
      const blocks = [para(profile.summary)];
      blocks.push(para(`His focus is ${joinWords(profile.focus.areas.map((r) => r.toLowerCase()))}.${detail ? ` ${profile.focus.statement}` : ""}`));
      return answer(blocks, ["What's his current role?", "Show me his projects", "Why should we hire him?"]);
    },

    current_role: () => {
      const current = profile.experience.filter((e) => !e.end);
      const main = current.find((e) => e.type === "Full-time") || current[0];
      context.lastCompany = main.company;
      const blocks = [para(`${name} is currently a **${main.role}** at **${main.company}** in ${main.location} (since ${formatMonth(main.start)}). ${main.summary}`)];
      const others = current.filter((e) => e !== main);
      if (others.length) blocks.push(para(`Alongside that he works as a **${others.map((o) => o.role).join(", ")}** (${others.map((o) => o.type.toLowerCase()).join(", ")}, since ${formatMonth(others[0].start)}).`));
      return answer(blocks, ["What has he achieved there?", "Work history", "Tech stack"]);
    },

    experience: ({ detail }) => {
      const blocks = [para(`${name}'s work history:`)];
      blocks.push(list(profile.experience.map((e) => `**${e.role}**, ${e.company} · ${formatRange(e.start, e.end)}${e.type !== "Full-time" ? ` · ${e.type}` : ""}`)));
      if (detail) profile.experience.forEach((e) => blocks.push(para(`**${e.company}, ${e.role}:** ${e.summary}`)));
      return answer(blocks, ["What did he do at Lavender?", "What did he do at Rimbun?", "How much experience does he have?"], { offer: "experience" });
    },

    experience_years: () => {
      const today = now();
      const professional = profile.experience.filter((e) => e.type !== "Part-time");
      const months = professional.reduce((n, e) => n + monthsBetween(e.start, e.end, today), 0);
      const first = professional.map((e) => e.start).sort()[0];
      const years = Math.floor(months / 12);
      const length = years >= 1 ? `about ${years} year${years > 1 ? "s" : ""}${months % 12 ? ` and ${months % 12} month${months % 12 > 1 ? "s" : ""}` : ""}` : `about ${months} months`;
      return answer(
        [
          para(`${name} has **${length}** of professional experience, starting with an internship in ${formatMonth(first)} and moving into a full-time Business Analyst role in Apr 2026. He also held a part-time outlet auditing role from Jul to Oct 2026.`),
          para("It's early-career experience with unusually broad ownership: he is the sole in-house owner of a production Power BI and Azure Synapse platform."),
        ],
        ["What does that platform involve?", "Show me his projects"]
      );
    },

    company_detail: ({ entities, text = "" }) => {
      const companyName = entities.find((e) => e.type === "company")?.value || context.lastCompany;
      let roles = profile.experience.filter((e) => e.company === companyName);
      // "Was he an auditor?" should answer about that role, not every role at the company.
      if (/\baudit/.test(text)) {
        const audit = roles.filter((r) => /audit/i.test(r.role));
        if (audit.length) roles = audit;
      }
      if (!roles.length) return null;
      context.lastCompany = companyName;
      const blocks = [];
      roles.forEach((r) => {
        blocks.push(para(`**${r.role}** · ${r.company} · ${formatRange(r.start, r.end)} · ${r.location}`));
        blocks.push(list(r.highlights));
      });
      const projects = profile.projects.filter((p) => normalise(p.context).includes(normalise(companyName).split(" ")[0]));
      return answer(blocks, projects.slice(0, 2).map((p) => `Tell me about ${p.title}`).concat(["Work history"]));
    },

    education: ({ detail }) => {
      const blocks = profile.education.map((ed) =>
        para(`**${ed.qualification}**, ${ed.institution} · ${formatRange(ed.start, ed.end)}${ed.classification ? ` · ${ed.classification}` : ""} · CGPA ${ed.cgpa}${ed.honours.length ? ` · ${ed.honours.join(", ")}` : ""}`)
      );
      const degree = profile.education[0];
      if (degree.conferred) blocks.push(para(`The degree was conferred on ${new Date(degree.conferred).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`));
      if (detail && degree.finalYearProject) blocks.push(para(`Final year project: ${degree.finalYearProject}`));
      return answer(blocks, ["What was his final year project?", "Certifications", "What's his CGPA?"]);
    },

    grades: () => {
      const [degree, diploma] = profile.education;
      return answer(
        [
          list([
            `Bachelor of Business Analytics: **${degree.classification}**, CGPA **${degree.cgpa}**`,
            ...degree.honours.map((h) => `**${h}**`),
            `Diploma in Business Administration: CGPA **${diploma.cgpa}**`,
          ]),
        ],
        ["Where did he study?", "Certifications"]
      );
    },

    skills: ({ text }) => {
      if (/\bprogramming\b|\blanguages?\b|\bcode\b|\bcoding\b/.test(text)) {
        const group = profile.skills.find((g) => g.category.startsWith("Programming"));
        return answer([para(`Programming and automation: ${joinWords(group.items.map((i) => i.name))}.`), para("Day to day he uses SQL / T-SQL, DAX and Python most.")], ["Does he know DAX?", "Show me his projects"]);
      }
      const blocks = [para(`${name}'s toolkit, grouped:`), list(profile.skills.map((g) => `**${g.category}:** ${g.items.map((i) => i.name).join(", ")}`))];
      return answer(blocks, ["Does he know Python?", "Is he certified in Power BI?", "What's he strongest at?"]);
    },

    skill_check: ({ entities }) => {
      const skills = entities.filter((e) => e.type === "skill").map((e) => e.value);
      const unlisted = entities.filter((e) => e.type === "unlisted").map((e) => e.value);
      const blocks = [];
      for (const skill of [...new Set(skills)].slice(0, 3)) {
        context.lastSkill = skill;
        const ev = skillEvidence(skill);
        const proof = [];
        if (ev.roles.length) proof.push(`used in his work at ${joinWords([...new Set(ev.roles.map((r) => r.company))])}`);
        if (ev.projects.length) proof.push(`in projects like ${joinWords(ev.projects.slice(0, 2).map((p) => `“${p.title}”`))}`);
        if (ev.certs.length) proof.push(`backed by ${ev.certs.length === 1 ? `the “${ev.certs[0].title}” course` : `${ev.certs.length} related courses`}`);
        blocks.push(para(`**Yes, ${skill}.** ${proof.length ? `It's ${joinWords(proof)}.` : `It's listed in his skills.`}`));
      }
      for (const { tool, nearest } of unlisted.slice(0, 3)) {
        blocks.push(
          para(
            `**${tool.replace(/\b\w/g, (c) => c.toUpperCase())}** isn't listed in ${name}'s profile.` +
              (nearest ? ` The closest thing he has hands-on experience with is **${nearest}**.` : " I'd suggest asking him directly.")
          )
        );
      }
      if (!blocks.length) return null;
      return answer(blocks, ["What's his full tech stack?", "Show me his projects"]);
    },

    projects: () => {
      context.listedProjects = true;
      return answer(
        [para(`${name}'s notable projects:`), list(profile.projects.map((p) => `**${p.number}. ${p.title}** · ${p.context}`)), para("Ask about any of them by name or number, e.g. “tell me about project 3”."), actions([{ label: "View projects", href: "#projects" }])],
        ["Tell me about project 1", "Which project is he proudest of?", "The revenue reconciliation"]
      );
    },

    project_detail: ({ entities, focus }) => {
      const ref = entities.find((e) => e.type === "project")?.value;
      const num = entities.find((e) => e.type === "projectNumber" || e.type === "ordinal")?.value;
      const project = (ref && projectById(ref)) || (num && projectByNumber(num)) || (context.lastProject && projectById(context.lastProject));
      if (!project) return null;
      context.lastProject = project.id;
      if (focus === "tools") return answer([para(`For **${project.title}**, ${name} used ${joinWords(project.tools)}.`)], ["What was the result?", "Next project"]);
      if (focus === "result") return answer([para(`**Result:** ${project.result}`)], ["What tools did he use?", "Other projects"]);
      return answer(
        [
          para(`**${project.number}. ${project.title}** · ${project.context}`),
          para(`**Problem:** ${project.problem}`),
          para(`**What he did:** ${project.action}`),
          para(`**Result:** ${project.result}`),
          para(`**Tools:** ${project.tools.join(", ")}`),
          ...(project.onPage === false ? [] : [actions([{ label: "See it on the page", href: "#projects" }])]),
        ],
        [project.number < profile.projects.length ? "Next project" : "Show me his projects", "What tools did he use?", "Other projects"]
      );
    },

    best_project: () => {
      const project = projectById("recovery");
      context.lastProject = project.id;
      return answer(
        [para(`${name} lists **${project.title}** as a key achievement: a company-wide, C-suite-escalated outage he root-caused and fixed himself.`), para(`${project.problem} ${project.action}`), para(`The **revenue reconciliation** (a ~2.5% gap traced and fixed) is another strong example of his attention to data accuracy.`)],
        ["Tell me about the revenue reconciliation", "Show me all projects"]
      );
    },

    achievements: () => answer([para(`Highlights with measurable impact:`), list(profile.achievements)], ["Why should we hire him?", "Show me his projects"]),

    certifications: ({ text, entities }) => {
      const issuer = entities.find((e) => e.type === "issuer")?.value;
      const examCode = text.match(/\b(pl|dp|da|az)[\s-]?(\d{3})\b/);
      if (examCode) {
        const code = `${examCode[1].toUpperCase()}-${examCode[2]}`;
        return answer([para(`I don't see **${code}** in ${name}'s certifications. His Microsoft credential is the **Microsoft Business Analyst Professional Certificate** (via Coursera), and he has several Power BI courses including DAX and Power Query.`)], ["List all certifications", "Does he know DAX?"]);
      }
      if (issuer) {
        const matches = profile.certifications.filter((c) => normalise(c.issuer).includes(issuer) || normalise(c.title).includes(issuer));
        if (!matches.length) return answer([para(`I don't see any certifications from ${issuer.toUpperCase()} in ${name}'s profile.`)], ["List all certifications"]);
        const blocks = [para(`${matches.length === 1 ? "One credential" : `${matches.length} credentials`} from ${issuer === "linkedin learning" ? "LinkedIn Learning" : issuer.replace(/\b\w/g, (c) => c.toUpperCase())}:`), list(matches.map((c) => `**${c.title}** · ${c.kind}${c.date ? ` · ${c.date}` : ""}`))];
        matches.filter((c) => c.note).forEach((c) => blocks.push(para(c.note)));
        const verifiable = matches.filter((c) => c.verify);
        if (verifiable.length) blocks.push(actions(verifiable.map((c) => ({ label: `Verify: ${c.title}`, href: c.verify }))));
        return answer(blocks, ["List all certifications", "Education"]);
      }
      const top = profile.certifications.slice(0, 6);
      return answer(
        [
          para(`${name} holds **${profile.certifications.length} credentials**: an honours degree, 2 professional certificates (Microsoft, Google) and 15 LinkedIn Learning courses. The top ones:`),
          list(top.map((c) => `**${c.title}** · ${c.issuer}${c.date ? ` · ${c.date}` : ""}`)),
          actions([{ label: "See all certificates", href: "#certificates" }]),
        ],
        ["Is he Microsoft certified?", "Any Google certificates?", "Education"]
      );
    },

    contact: () =>
      answer(
        [para(`You can reach ${name} directly:`), list([`**Email:** ${profile.contact.email}`, `**Phone / WhatsApp:** ${profile.contact.phone}`, `**LinkedIn:** linkedin.com/in/wongmanchongivan`]), contactActions()],
        ["Download his resume", "Where is he based?"]
      ),
    resume: () => answer([para(`Here's ${name}'s resume (PDF).`), actions([{ label: "Download resume", href: profile.contact.resume, download: true }])], ["How can I contact him?"]),
    location: () => answer([para(`${name} is based in **${profile.identity.location.city}, ${profile.identity.location.country}**.`)], ["Is he open to relocation?", "How can I contact him?"]),

    relocation: () => unknownOr(profile.workPreferences.relocation || profile.workPreferences.workMode, "relocation, remote or hybrid work", ["Where is he based?", "When can he start?"]),
    availability: () => {
      const wp = profile.workPreferences;
      const known = [wp.availableFrom && `Available from ${wp.availableFrom}.`, wp.noticePeriod && `Notice period: ${wp.noticePeriod}.`].filter(Boolean).join(" ");
      return answer(
        [para(known || `${name} hasn't published availability details here. For any opportunity, it's best to contact him directly.`), contactActions()],
        ["What's his focus?", "Download his resume"]
      );
    },
    salary: () => unknownOr(profile.workPreferences.salaryExpectation, "salary expectations", ["How can I contact him?"]),
    visa: () => unknownOr(profile.workPreferences.workAuthorization, "work authorisation or visa status", ["Where is he based?"]),
    languages: () => answer([para(`${name} speaks ${joinWords(profile.identity.languages.map((l) => `**${l.name}** (${l.level.toLowerCase()})`))}.`)], ["Where is he based?"]),

    hobbies: () => {
      const p = profile.personal;
      if (p.hobbies.length || p.interests.length) {
        return answer([para(`Outside work, ${name} enjoys ${joinWords([...p.hobbies, ...p.interests])}.`), ...(p.funFacts.length ? [list(p.funFacts)] : [])], ["Tell me about Ivan"]);
      }
      return answer(
        [para(`${name} hasn't added personal interests to his portfolio yet, so I'd rather not guess.`), para("What I can tell you is how he spends his learning time: 15 LinkedIn Learning courses and two professional certificates (Microsoft, Google).")],
        ["Certifications", "How can I contact him?"]
      );
    },
    private: () => answer([para(`That's personal information ${name} hasn't shared here, and it isn't something I'd share on his behalf. I'm happy to help with his skills, experience or projects.`)], ["Tell me about Ivan", "Show me his projects"]),

    strengths: () =>
      answer([para(`Five reasons, each with evidence:`), list(profile.strengths.map((s) => `**${s.title}.** ${s.evidence}`))], ["Show me his projects", "How can I contact him?"]),
    weaknesses: () =>
      answer(
        [para(`I'd rather not guess at ${name}'s weaknesses. That's a good one to ask him in an interview.`), para("Factually: his professional experience is early-career (since Jan 2026), though with unusually broad ownership of a production data platform.")],
        ["How much experience does he have?", "What are his strengths?"]
      ),
    ai: () =>
      answer(
        [
          para(`${name}'s AI experience is practical and business-facing:`),
          list([
            "Prototyped a **GenAI legal assistant** (ChatGPT Enterprise) for Corporate Recovery documents at Rimbun Capital.",
            "Built an **OCR extraction pipeline** with AI Builder and Power Automate for SSM PDF filings.",
            "Built a custom, read-only **local MCP server** over the point-of-sale API so sales and stock questions can be analysed in plain language, and piloted MCP querying of the Power BI model.",
            "Briefed the **CEO** on governance for agentic AI, and led colleagues in adopting **MCP servers, connectors and plugins**, including setting them up on their laptops.",
            "Evaluated the **Claude API / agentic AI architecture**, and builds **custom GPT agents**.",
            "Took **AI Strategy Foundations** (IIBA-endorsed course).",
          ]),
        ],
        ["Tell me about the Asset Portfolio project", "Tech stack"]
      ),
    leadership: () =>
      answer(
        [
          para(`Communication and stakeholder work in ${name}'s record:`),
          list([
            "Briefed senior management, **including the CEO**, on AI-driven data architecture.",
            "Led colleagues in adopting AI tooling (MCP servers, connectors, plugins), including configuring it on their laptops.",
            "At Rimbun Capital, was the **primary liaison** between senior stakeholders and the technical team, turning needs into **BRDs**.",
            "Supports Operations, Production and Purchasing with the forecast platform they depend on.",
          ]),
        ],
        ["Why should we hire him?", "Work history"]
      ),

    role_fit: ({ text }) => {
      const fits = {
        dataengineer: ["Data Engineer", "He runs Azure Synapse pipelines, a dedicated SQL pool, ADLS Gen2 and Azure Functions in production, and built a Python consolidation pipeline (72 files → 1 governed dataset)."],
        bideveloper: ["BI Developer / Analyst", "He owns a Power BI semantic layer with advanced DAX (TREATAS, disconnected tables) and Row-Level Security across 25+ branches."],
        dataanalyst: ["Data Analyst", "He works daily in SQL, DAX and Python, reconciled a ~2.5% revenue gap against the POS record, and replaced error-ridden Excel reporting with governed dashboards."],
        businessanalyst: ["Business Analyst", "He holds that title today, wrote BRDs as liaison between stakeholders and the tech team at Rimbun, and has the Microsoft Business Analyst Professional Certificate."],
        datascientist: ["Data Scientist", "His hands-on work is analytics, BI and data engineering. He lists statistical analysis and machine learning among his methods, but data science isn't the focus of his experience so far."],
      };
      const key = Object.keys(fits).find((k) => text.includes(k));
      if (key) {
        const [title, evidence] = fits[key];
        return answer([para(`**${title}:** ${evidence}`), para(`His focus is ${joinWords(profile.focus.areas.map((r) => r.toLowerCase()))}.`)], ["Show me his projects", "Tech stack"]);
      }
      return answer([para(`${name}'s experience spans ${joinWords(profile.focus.areas.map((r) => r.toLowerCase()))}.`), list(Object.values(fits).slice(0, 4).map(([t, e]) => `**${t}:** ${e}`))], ["Show me his projects"]);
    },
    site: () => answer([para(profile.site.stack), para(`His final year project was also a web-based reporting system deployed on Netlify.`)], ["Tell me about the final year project"]),
  };

  function unknownOr(value, topic, suggestions) {
    if (value) return answer([para(value)], suggestions);
    return answer([para(`${name} hasn't shared his ${topic} here. That's best discussed with him directly.`), contactActions()], suggestions);
  }

  // ---- Follow-up handling -------------------------------------------------------------------
  function followUp(text, entities) {
    const isMore = /^(more|tell me more|go on|continue|elaborate|expand|details?|more details?|and|what else|anything else|keep going)\b/.test(text) || /\b(tell me more|more about (that|it|this)|more details?)\b/.test(text);
    const wantsTools = /\b(what|which) (tools|tech|technolog\w*|stack|software)\b|\btools? (did|does) he use\b/.test(text);
    const wantsResult = /\b(what was the )?(result|outcome|impact)\b/.test(text) && text.split(" ").length <= 6;
    const nextProject = /^next( one| project)?\b/.test(text);
    const hasProject = entities.some((e) => ["project", "projectNumber", "ordinal"].includes(e.type));

    if (nextProject && context.lastProject) {
      const n = projectById(context.lastProject).number;
      return handlers.project_detail({ entities: [{ type: "projectNumber", value: n >= profile.projects.length ? 1 : n + 1 }] });
    }
    if ((wantsTools || wantsResult) && !hasProject && context.lastProject && !entities.some((e) => e.type === "skill")) {
      return handlers.project_detail({ entities: [], focus: wantsTools ? "tools" : "result" });
    }
    if (isMore && context.lastIntent) {
      if (context.lastIntent === "project_detail" && context.lastProject) {
        const n = projectById(context.lastProject).number;
        return handlers.project_detail({ entities: [{ type: "projectNumber", value: n >= profile.projects.length ? 1 : n + 1 }] });
      }
      const handler = handlers[context.lastIntent];
      if (handler) return handler({ text, entities, detail: true });
    }
    // "What did he do there?" after talking about a company.
    if (/\b(there|that (job|role|company))\b/.test(text) && context.lastCompany && !entities.length) {
      return handlers.company_detail({ entities: [] });
    }
    return null;
  }

  // ---- Fallback search ---------------------------------------------------------------------
  function retrieve(stems) {
    const results = search(stems);
    if (!results.length || results[0].score < 2.2) return null;
    const top = results.filter((r) => r.score >= results[0].score * 0.7).slice(0, 2);
    const project = top.find((r) => r.doc.topic === "project");
    if (project) context.lastProject = project.doc.ref;
    return answer([para("Here's the closest match in Ivan's profile:"), list(top.map((r) => r.doc.text))], ["Show me his projects", "Tell me about Ivan"], { retrieved: true });
  }

  function notFound() {
    return answer(
      [para(`I don't have that in ${name}'s profile, and I'd rather not guess. You could ask me about his experience, skills, projects, education or certifications, or ask him directly.`), contactActions()],
      ["What can I ask?", "Tell me about Ivan", "Show me his projects"],
      { fallback: true }
    );
  }

  // ---- Main entry --------------------------------------------------------------------------
  function reply(input) {
    context.turns += 1;
    const raw = String(input || "").trim();
    if (!raw) return answer([para("Ask me anything about Ivan's experience, skills or projects.")], ["Tell me about Ivan"]);

    const normalised = normalise(raw);
    const corrected = correct(tokenize(normalised, { keepStopwords: true })).join(" ");
    const entities = findEntities(` ${corrected} `.trim(), entityIndex);
    const stems = tokenize(corrected).map(stem);

    // Numbered / ordinal references after listing projects.
    if (entities.some((e) => e.type === "ordinal") && !context.listedProjects && !context.lastProject) {
      entities.splice(entities.findIndex((e) => e.type === "ordinal"), 1);
    }

    const follow = followUp(corrected, entities);
    if (follow) return finalise(follow, context.lastIntent);

    const ranked = scoreIntents(corrected, stems, entities);
    let top = ranked[0];

    // Entity routing: a named skill / project / company usually decides the question.
    const hasType = (t) => entities.some((e) => e.type === t);
    const strong = (id) => ranked.find((r) => r.id === id)?.score || 0;
    if ((hasType("skill") || hasType("unlisted")) && strong("certifications") < 3 && strong("projects") < 3 && strong("skills") < 3.5) {
      if (/^(does|do|can|is|has|have|did|any|how good|how well|what about)\b/.test(corrected) || corrected.split(" ").length <= 4 || strong("skill_check") > 1) {
        top = { id: "skill_check", score: 5 };
      }
    }
    if ((hasType("project") || hasType("projectNumber") || (hasType("ordinal") && context.listedProjects)) && top.id !== "best_project") {
      top = { id: "project_detail", score: 5 };
    }
    if (hasType("company") && ["experience", "current_role", "about"].includes(top.id) === false && top.score < 4) top = { id: "company_detail", score: 4 };
    if (hasType("company") && top.id === "experience") top = { id: "company_detail", score: 4 };
    if (hasType("school") && top.score < 3) top = { id: "education", score: 4 };

    if (top.score >= 1.5) {
      // Answer up to two clearly-asked topics ("education and certifications").
      const second = ranked.find((r) => r.id !== top.id && r.score >= Math.max(2.5, top.score * 0.6));
      const composable = ["education", "experience", "skills", "projects", "certifications", "contact", "location", "languages", "grades", "achievements"];
      const first = handlers[top.id]?.({ text: corrected, entities, stems });
      if (first) {
        if (second && /\band\b|,/.test(corrected) && composable.includes(top.id) && composable.includes(second.id)) {
          const extra = handlers[second.id]?.({ text: corrected, entities, stems });
          if (extra) first.blocks.push(...extra.blocks);
        }
        return finalise(first, top.id);
      }
    }

    const retrieved = retrieve(stems);
    if (retrieved) return finalise(retrieved, "retrieval");
    return finalise(notFound(), "fallback");
  }

  function finalise(result, intent) {
    if (intent && intent !== "retrieval" && intent !== "fallback") context.lastIntent = intent;
    if (intent === "projects") context.listedProjects = true;
    return { ...result, intent };
  }

  function reset() {
    Object.assign(context, { lastIntent: null, lastProject: null, lastCompany: null, lastSkill: null, listedProjects: false, turns: 0 });
  }

  return { reply, reset, context };
}
