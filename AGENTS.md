# راهنمای Agent

برای توضیح تدریجی سندهای طولانی یا دشوار، [مهارت راهنمای خواندن سند](.agents/skills/document-walkthrough/SKILL.md) و بخش «توضیح مرحله‌ای سند» در [روال کار](system/WORKFLOW.ReadOnly.md) را بخوان. هر نوبت فقط یک بخش کوچک را توضیح بده و نقطهٔ ادامه را حفظ کن.

برای مدیریت کار، ابتدا [.agents/skills/task-companion/SKILL.md](.agents/skills/task-companion/SKILL.md)، [راهنمای ثابت Agent](system/AGENTS.ReadOnly.md) و [روال کار](system/WORKFLOW.ReadOnly.md) را بخوان. طراحی سامانه در [system/DESIGN.ReadOnly.md](system/DESIGN.ReadOnly.md) است.

تسک‌های شغلی و شخصی کاملاً در `data/work/` و `data/personal/` جدا هستند. محیط را از درخواست تعیین کن؛ اگر مبهم است، بپرس. فایل‌های داده را فقط در محیط مربوط به‌روز کن. هیچ ویژگی تسک/قدم را بدون دستور یا تأیید روشن تغییر نده. گزارش‌ها در پوشهٔ `Reports/` همان محیط و طبق قواعد کوتاه‌نویسی `system/WORKFLOW.ReadOnly.md` ثبت می‌شوند.

در هر نوبت مدیریت تسک، پاسخ‌گویی `http://127.0.0.1:8081/data/work/TASKS.md` را بررسی کن و اگر خاموش بود سرور را از ریشهٔ مخزن در پس‌زمینه اجرا کن.
