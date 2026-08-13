interface CountRow {
  c: number;
}

async function count(db: D1Database, whereClause?: string): Promise<number> {
  const sql = whereClause
    ? `SELECT COUNT(*) as c FROM user_sightings WHERE ${whereClause}`
    : "SELECT COUNT(*) as c FROM user_sightings";
  const row = await db.prepare(sql).first<CountRow>();
  return row?.c ?? 0;
}

export async function renderInsightsPage(db: D1Database): Promise<Response> {
  const [dau, wau, mau, total] = await Promise.all([
    count(db, "last_seen_date = date('now')"),
    count(db, "last_seen_date >= date('now', '-7 days')"),
    count(db, "last_seen_date >= date('now', '-30 days')"),
    count(db),
  ]);

  const rows: Array<[string, number]> = [
    ["DAU", dau],
    ["WAU", wau],
    ["MAU", mau],
    ["Total users", total],
  ];

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>TacOps Insights</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 2rem; }
  table { border-collapse: collapse; }
  td { border: 1px solid #ccc; padding: 0.5rem 1rem; }
</style>
</head>
<body>
<table>
${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("\n")}
</table>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
