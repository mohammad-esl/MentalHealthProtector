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
      for (let j = i + 1; j < lines.length && lines[j].trim().startsWith("|"); j++) {
        const line = lines[j].trim();
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
  function badge(value, kind = "status") {
    const el = document.createElement("span"); el.className = "badge"; el.dataset.kind = kind; el.dataset.value = value; el.textContent = value || "—"; return el;
  }
  function cell(row, text) { const td = row.insertCell(); td.textContent = text || "—"; return td; }
  function nav(active) {
    const links = [["tasks", "index.html", "کارها"], ["steps", "steps.html", "قدم‌های روزانه"], ["completed", "completed.html", "انجام‌شده‌ها و تاریخچه"], ["network", "network.html", "شبکهٔ افراد"]];
    const el = document.createElement("nav"); el.className = "nav"; el.setAttribute("aria-label", "بخش‌های سامانه");
    for (const [key, href, label] of links) { const a = document.createElement("a"); a.href = href; a.textContent = label; if (key === active) a.setAttribute("aria-current", "page"); el.append(a); }
    document.querySelector("main").insertBefore(el, document.querySelector("main").children[1]);
  }
  function showError(error) { const el = document.getElementById("error"); if (el) { el.hidden = false; el.textContent = "بارگذاری اطلاعات انجام نشد: " + error.message; } }
  const dateValue = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(new Date(value + "T00:00:00").valueOf()) ? new Date(value + "T00:00:00") : null;
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  window.TaskApp = { normalize, parseTable, read, badge, cell, nav, showError, dateValue, today };
})();
