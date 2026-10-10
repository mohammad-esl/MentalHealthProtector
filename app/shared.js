(() => {
  const normalize = (value) => String(value ?? "").normalize("NFKC").replace(/[\u200c\u200f]/g, "").replace(/\u064a/g, "ی").replace(/\u0643/g, "ک").toLocaleLowerCase("fa").trim();
  const splitRow = (line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  function parseTable(markdown, required) {
    const lines = markdown.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim().startsWith("|")) continue;
      const header = splitRow(lines[i]);
      if (!required.every((name) => header.includes(name))) continue;
      const rows = [];
      for (let j = i + 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (!line) continue;
        if (!line.startsWith("|")) break;
        if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line)) continue;
        const cells = splitRow(line);
        if (cells.length >= header.length) rows.push(Object.fromEntries(header.map((key, index) => [key, cells[index] || "—"])));
      }
      return rows;
    }
    throw new Error("جدول موردنیاز در فایل Markdown پیدا نشد.");
  }
  async function read(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("فایل " + path + " خوانده نشد.");
    return response.text();
  }
  const ENV_KEY = "task-companion.environment";
  const environments = { work: "کاری", personal: "شخصی" };
  function environment() {
    try { const current = localStorage.getItem(ENV_KEY); return environments[current] ? current : "work"; }
    catch { return "work"; }
  }
  function readData(file) {
    const safeFile = String(file).replace(/^\/+/, "");
    if (safeFile.split("/").some((part) => part === "..")) throw new Error("مسیر داده معتبر نیست.");
    return read("../data/" + environment() + "/" + safeFile);
  }
  function badge(value, kind = "status") {
    const el = document.createElement("span"); el.className = "badge"; el.dataset.kind = kind; el.dataset.value = value; el.textContent = value || "—"; return el;
  }
  function cell(row, text) { const td = row.insertCell(); td.textContent = text || "—"; return td; }
  function nav(active) {
    const links = [["tasks", "index.html", "کارها"], ["steps", "steps.html", "قدم‌های روزانه"], ["completed", "completed.html", "انجام‌شده‌ها و تاریخچه"], ["network", "network.html", "شبکهٔ افراد"], ["knowledge", "knowledge.html", "دانش و دارایی‌ها"], ["agents", "agents.html", "مأموریت‌ها و تصمیم‌ها"]];
    const envBar = document.createElement("div"); envBar.className = "environment-bar";
    const envLabel = document.createElement("label"); envLabel.htmlFor = "environment-select"; envLabel.textContent = "محیط تسک‌ها";
    const envSelect = document.createElement("select"); envSelect.id = "environment-select";
    for (const [key, label] of Object.entries(environments)) envSelect.add(new Option(label, key));
    envSelect.value = environment(); envSelect.addEventListener("change", () => { try { localStorage.setItem(ENV_KEY, envSelect.value); } catch {} location.reload(); });
    envBar.append(envLabel, envSelect);
    const el = document.createElement("nav"); el.className = "nav"; el.setAttribute("aria-label", "بخش‌های سامانه");
    for (const [key, href, label] of links) { const a = document.createElement("a"); a.href = href; a.textContent = label; if (key === active) a.setAttribute("aria-current", "page"); el.append(a); }
    document.querySelector("main").insertBefore(envBar, document.querySelector("main").children[1]);
    envBar.after(el);
  }
  function showError(error) { const el = document.getElementById("error"); if (el) { el.hidden = false; el.textContent = "بارگذاری اطلاعات انجام نشد: " + error.message; } }
  const dateValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(value + "T00:00:00").valueOf()) ? new Date(value + "T00:00:00") : null;
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const dependencyIds = value => !value || value === "—" ? [] : [...new Set(value.split(/[,،;؛\s]+/).filter(Boolean))];
  function dependencies(tasks, steps) {
    const nodes = new Map(), duplicates = new Set();
    for (const row of [...tasks, ...steps]) {
      const id = row["شناسه"] || row["شناسهٔ قدم"];
      if (nodes.has(id)) duplicates.add(id);
      nodes.set(id, row);
    }
    function refs(row) {
      const own = dependencyIds(row["وابسته به"]);
      return row["شناسهٔ قدم"] ? [...own, row["شناسهٔ تسک"]] : own;
    }
    function invalid(id, path = []) {
      if (path.includes(id)) return "وابستگی حلقوی: " + [...path, id].join("، ");
      if (duplicates.has(id)) return "شناسهٔ تکراری: " + id;
      const row = nodes.get(id);
      if (!row) return "پیش‌نیاز پیدا نشد: " + id;
      const own = dependencyIds(row["وابسته به"]), prefix = row["شناسهٔ قدم"] ? "S" : "T";
      if (own.some(ref => !new RegExp("^" + prefix + "-\\d+$").test(ref))) return "شناسهٔ پیش‌نیاز نامعتبر: " + id;
      for (const ref of refs(row)) { const error = invalid(ref, [...path, id]); if (error) return error; }
      return "";
    }
    function state(row) {
      const id = row["شناسه"] || row["شناسهٔ قدم"], error = invalid(id);
      if (error) return { kind: "blocked", label: "نیازمند اصلاح وابستگی", reason: error };
      if (["انجام‌شده", "کنارگذاشته‌شده"].includes(row["وضعیت"])) return { kind: "closed", label: "بسته‌شده", reason: "" };
      const parent = row["شناسهٔ قدم"] ? nodes.get(row["شناسهٔ تسک"]) : null;
      const required = [...dependencyIds(row["وابسته به"]), ...dependencyIds(parent?.["وابسته به"])];
      const pending = required.filter(ref => nodes.get(ref)?.["وضعیت"] !== "انجام‌شده");
      if (pending.length) return { kind: "blocked", label: "در انتظار پیش‌نیاز", reason: pending.join("، ") };
      if (row["وضعیت"] === "منتظر" || parent?.["وضعیت"] === "منتظر") return { kind: "waiting", label: "منتظر تعیین تکلیف", reason: "پیش‌نیازها مانع نیستند؛ وضعیت ثبت‌شده همچنان منتظر است." };
      if (parent && ["انجام‌شده", "کنارگذاشته‌شده"].includes(parent["وضعیت"])) return { kind: "closed", label: "تسک مادر بسته‌شده", reason: "" };
      if (row["وضعیت"] === "نیاز به پاسخ" || parent?.["وضعیت"] === "نیاز به پاسخ") return { kind: "waiting", label: "نیازمند پاسخ", reason: "" };
      return { kind: "ready", label: "آمادهٔ اجرا", reason: "" };
    }
    function view(row) {
      const result = state(row), box = document.createElement("div"); box.className = "dependencies";
      const mark = badge(result.label, "readiness"); mark.dataset.state = result.kind; box.append(mark);
      const parent = row["شناسهٔ قدم"] ? nodes.get(row["شناسهٔ تسک"]) : null;
      for (const [value, label] of [[row["وابسته به"], "پیش‌نیاز"], [parent?.["وابسته به"], "پیش‌نیاز تسک مادر"]]) {
        for (const ref of dependencyIds(value)) {
          const line = document.createElement("div"), code = document.createElement("bdi"), target = nodes.get(ref);
          code.dir = "ltr"; code.textContent = "[" + ref + "]";
          line.append(label + ": ", code, " · " + (target?.["عنوان"] || target?.["قدم اتمی"] || "ناموجود") + " · " + (target?.["وضعیت"] || "نامعلوم")); box.append(line);
        }
      }
      if (result.reason) { const note = document.createElement("div"); note.textContent = result.reason; box.append(note); }
      return box;
    }
    return { state, view };
  }
  const taskCollections = {
    tasks: { root: "TASKS.md", project: "تسک‌های جاری" },
    steps: { root: "STEPS.md", project: "قدم‌های جاری" },
    completedTasks: { root: "ARCHIVE/completed-tasks.md", project: "تسک‌های بایگانی‌شده" },
    completedSteps: { root: "ARCHIVE/completed-steps.md", project: "قدم‌های بایگانی‌شده" }
  };
  async function taskFileGroups() {
    const groups = Object.fromEntries(Object.entries(taskCollections).map(([key, value]) => [key, [value.root]]));
    let index = "";
    try { index = await readData("PROJECTS/INDEX.md"); }
    catch (error) {
      if (!String(error?.message || error).includes("PROJECTS/INDEX.md خوانده نشد")) throw error;
    }
    if (!index) return groups;
    const projects = parseTable(index, ["نام پروژه", ...Object.values(taskCollections).map(value => value.project)]);
    for (const project of projects) {
      for (const [key, value] of Object.entries(taskCollections)) {
        const path = project[value.project];
        if (path && path !== "—") groups[key].push(path);
      }
    }
    return groups;
  }
  async function readTaskCollection(collection) {
    const spec = taskCollections[collection];
    if (!spec) throw new Error("مجموعهٔ تسک معتبر نیست.");
    const groups = await taskFileGroups();
    const required = [collection === "steps" || collection === "completedSteps" ? "شناسهٔ قدم" : "شناسه", "وضعیت"];
    const rows = await Promise.all(groups[collection].map(file => readData(file).then(text => parseTable(text, required))));
    return rows.flat();
  }
  async function dependencyData() {
    const [tasks, steps, completedTasks, completedSteps] = await Promise.all([
      readTaskCollection("tasks"), readTaskCollection("steps"),
      readTaskCollection("completedTasks"), readTaskCollection("completedSteps")
    ]);
    return { tasks, steps, resolver: dependencies([...tasks, ...completedTasks], [...steps, ...completedSteps]) };
  }
  window.TaskApp = { normalize, parseTable, read, readData, readTaskCollection, environment, environments, badge, cell, nav, showError, dateValue, today, dependencies, dependencyData };
})();
