(() => {
  const A = window.TaskApp, $ = id => document.getElementById(id);
  const JOB_FIELDS = ["شناسه", "عنوان", "ارتباط", "نقش", "وضعیت", "نسخه", "آخرین ثبت", "قرارداد", "نتیجه"];
  const DECISION_FIELDS = ["شناسه", "مأموریت", "نسخه", "پرسش", "گزینه‌ها", "پیشنهاد و دلیل", "پیامد", "بخش منتظر", "وضعیت", "پاسخ و منشأ", "زمان ثبت"];
  const JOB_STATES = ["پیش‌نویس", "آماده", "در حال اجرا", "منتظر تصمیم", "نتیجه آماده", "نیازمند بازبینی", "اعمال‌شده", "ناموفق", "لغوشده"];
  let jobs = [], decisions = [], generation = 0, documentGeneration = 0;
  // Accept only an explicit mission file under the selected environment.
  function validPath(path, id) {
    return /^J-\d+$/.test(id) && new RegExp("^AgentJobs/" + id + "/(?:mission-v[1-9]\\d*|result-v[1-9]\\d*-attempt-[1-9]\\d*)\\.md$").test(path);
  }
  async function registry(file, template) {
    const response = await fetch("../data/" + A.environment() + "/" + file, { cache: "no-store" });
    if (response.status === 404) return { text: await A.read("../system/" + template), fallback: true };
    if (!response.ok) throw new Error("خواندن " + file + " ناموفق بود (" + response.status + ").");
    return { text: await response.text(), fallback: false };
  }
  function detail(card, label, value) {
    const p = document.createElement("p"), strong = document.createElement("strong");
    p.className = "step-meta"; strong.textContent = label + ": ";
    p.append(strong, String(value || "—")); card.append(p);
  }
  function base(row, title) {
    const card = document.createElement("article"), id = document.createElement("bdi"), heading = document.createElement("h3");
    card.className = "step-card"; id.dir = "ltr"; id.textContent = row["شناسه"]; heading.textContent = title;
    card.append(id, heading, A.badge(row["وضعیت"])); return card;
  }
  function fileButton(card, label, path, id) {
    if (!path || path === "—") return;
    if (!validPath(path, id)) { detail(card, label, "مسیر پرونده معتبر نیست: " + path); return; }
    const button = document.createElement("button"); button.type = "button"; button.textContent = label;
    button.addEventListener("click", async () => {
      const token = ++documentGeneration;
      $("document-panel").hidden = false; $("document-title").textContent = label + " · " + id;
      $("document-content").textContent = "در حال خواندن…";
      try { const text = await A.readData(path); if (token === documentGeneration) $("document-content").textContent = text; }
      catch (error) { if (token === documentGeneration) $("document-content").textContent = error.message; }
    }); card.append(button);
  }
  function matches(row) { const query = A.normalize($("search").value); return !query || A.normalize(Object.values(row).join(" ")).includes(query); }
  function empty(target, text) { const p = document.createElement("p"); p.className = "empty"; p.textContent = text; target.append(p); }
  function render() {
    const visibleJobs = jobs.filter(row => matches(row) && (!$("job-state").value || row["وضعیت"] === $("job-state").value));
    const visibleDecisions = decisions.filter(row => matches(row) && (!$("decision-state").value || row["وضعیت"] === $("decision-state").value));
    $("jobs").replaceChildren(); $("decisions").replaceChildren();
    for (const row of visibleJobs) {
      const card = base(row, row["عنوان"]);
      for (const field of ["ارتباط", "نقش", "نسخه", "آخرین ثبت"]) detail(card, field, row[field]);
      fileButton(card, "مشاهدهٔ قرارداد", row["قرارداد"], row["شناسه"]);
      fileButton(card, "مشاهدهٔ نتیجه", row["نتیجه"], row["شناسه"]); $("jobs").append(card);
    }
    for (const row of visibleDecisions) {
      const card = base(row, row["پرسش"]);
      for (const field of DECISION_FIELDS.filter(field => !["شناسه", "پرسش", "وضعیت"].includes(field))) detail(card, field, row[field]);
      $("decisions").append(card);
    }
    if (!visibleJobs.length) empty($("jobs"), jobs.length ? "مأموریتی با این فیلتر پیدا نشد." : "هنوز مأموریتی ثبت نشده است.");
    if (!visibleDecisions.length) empty($("decisions"), decisions.length ? "تصمیمی با این فیلتر پیدا نشد." : "هنوز تصمیمی ثبت نشده است.");
    $("stats").textContent = "مأموریت‌های نمایان: " + visibleJobs.length + " از " + jobs.length + " · تصمیم‌های نمایان: " + visibleDecisions.length + " از " + decisions.length + " · منتظر پاسخ: " + decisions.filter(row => row["وضعیت"] === "منتظر پاسخ").length;
  }
  async function load() {
    const token = ++generation; ++documentGeneration; jobs = []; decisions = [];
    $("error").hidden = true; $("document-panel").hidden = true;
    $("jobs").replaceChildren(); $("decisions").replaceChildren(); $("stats").textContent = "";
    $("source").textContent = "در حال خواندن محیط " + A.environments[A.environment()] + "…";
    try {
      const [jobFile, decisionFile] = await Promise.all([registry("AGENT-JOBS.md", "AGENT-JOBS-TEMPLATE.ReadOnly.md"), registry("DECISIONS.md", "DECISIONS-TEMPLATE.ReadOnly.md")]);
      if (token !== generation) return;
      jobs = A.parseTable(jobFile.text, JOB_FIELDS); decisions = A.parseTable(decisionFile.text, DECISION_FIELDS);
      $("source").textContent = "محیط " + A.environments[A.environment()] + " · AGENT-JOBS.md / DECISIONS.md" + (jobFile.fallback || decisionFile.fallback ? " · فایل ثبت‌نشده از قالب خالی خوانده شد" : ""); render();
    } catch (error) { if (token === generation) { jobs = []; decisions = []; A.showError(error); $("source").textContent = "بارگذاری ناموفق بود."; } }
  }
  A.nav("agents"); for (const state of JOB_STATES) $("job-state").add(new Option(state, state));
  for (const id of ["search", "job-state", "decision-state"]) $(id).addEventListener(id === "search" ? "input" : "change", render);
  $("reload").addEventListener("click", load);
  $("close-document").addEventListener("click", () => { ++documentGeneration; $("document-panel").hidden = true; });
  load();
})();
