import { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Search, X, Filter, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryMeta } from "./issues";
import { getActionMeta } from "./issue-detail";

interface Party { id: number; name: string; shortName: string; color: string; }
interface IssueResponse { actionType: string; description: string | null; politicianName: string | null; sourceUrl: string | null; }
interface MatrixIssue {
  id: number; title: string; category: string; dateOccurred: string | null;
  location: string | null; responses: Record<string, IssueResponse[]>;
}
interface MatrixData { parties: Party[]; issues: MatrixIssue[]; }

function ResponseCell({ responses, partyColor }: { responses: IssueResponse[]; partyColor: string }) {
  if (!responses || responses.length === 0) {
    return <span className="text-muted-foreground/40 text-xs select-none">—</span>;
  }
  return (
    <div className="space-y-1">
      {responses.map((r, i) => {
        const meta = getActionMeta(r.actionType);
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: `${meta.color}18`, color: meta.color }}>
              {meta.label}
            </span>
            {r.politicianName && <span className="text-xs text-muted-foreground pl-0.5">{r.politicianName}</span>}
            {r.description && <span className="text-xs text-muted-foreground/70 pl-0.5 line-clamp-2">{r.description}</span>}
            {r.sourceUrl && (
              <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline pl-0.5" onClick={(e) => e.stopPropagation()}>
                Source ↗
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

function exportPDF(data: MatrixData, filtered: MatrixIssue[], visibleParties: string[], dateFrom: string, dateTo: string, search: string) {
  const partyList = data.parties.filter((p) => visibleParties.includes(p.shortName));

  const headerCols = ["Issue", "Category", "Date", "Location", ...partyList.map((p) => p.shortName)];

  const rows = filtered.map((issue) => [
    issue.title,
    getCategoryMeta(issue.category).label,
    issue.dateOccurred ? new Date(issue.dateOccurred).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—",
    issue.location ?? "—",
    ...partyList.map((p) => {
      const res = issue.responses[p.shortName] ?? [];
      if (res.length === 0) return "—";
      return res.map((r) => {
        let txt = getActionMeta(r.actionType).label;
        if (r.politicianName) txt += ` (${r.politicianName})`;
        if (r.description) txt += `: ${r.description}`;
        return txt;
      }).join(" | ");
    }),
  ]);

  const filterInfo = [
    search ? `Search: "${search}"` : "",
    dateFrom ? `From: ${dateFrom}` : "",
    dateTo ? `To: ${dateTo}` : "",
  ].filter(Boolean).join("  ·  ");

  const colWidths = [
    "280px",
    "110px",
    "90px",
    "120px",
    ...partyList.map(() => `${Math.max(100, Math.floor(700 / partyList.length))}px`),
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>TN Politics - Issues Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #111; padding: 20px; }
  h1 { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
  .meta { color: #555; font-size: 10px; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #1e293b; color: white; padding: 6px 8px; text-align: left; font-size: 10px; font-weight: bold; white-space: nowrap; }
  td { padding: 6px 8px; vertical-align: top; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .party-th { text-align: center; }
  .party-td { text-align: left; }
  .dash { color: #bbb; }
  .action { display: inline-block; padding: 1px 5px; border-radius: 3px; margin-bottom: 2px; font-size: 9px; font-weight: bold; }
  .pol { color: #555; font-size: 9px; }
  .desc { color: #777; font-size: 9px; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
<h1>TN Politics — Issues & Accountability Matrix</h1>
<div class="meta">
  Generated: ${new Date().toLocaleString("en-IN")} · ${filtered.length} issues · Parties: ${partyList.map((p) => p.shortName).join(", ")}
  ${filterInfo ? `<br/>Filters: ${filterInfo}` : ""}
</div>
<table>
<thead>
<tr>
  ${headerCols.map((col, i) => `<th style="width:${colWidths[i]};${i >= 4 ? "text-align:center;" : ""}">${col}</th>`).join("")}
</tr>
</thead>
<tbody>
${rows.map((row) => `<tr>
  ${row.map((cell, i) => {
    if (i >= 4) {
      if (cell === "—") return `<td class="party-td dash" style="text-align:center;">—</td>`;
      const parts = cell.split(" | ");
      const inner = parts.map((part) => {
        const colonIdx = part.indexOf(": ");
        const label = colonIdx > -1 ? part.substring(0, colonIdx) : part;
        const desc = colonIdx > -1 ? part.substring(colonIdx + 2) : "";
        return `<div><span class="action" style="background:#e0e7ff;color:#3730a3;">${label}</span>${desc ? `<br/><span class="desc">${desc}</span>` : ""}</div>`;
      }).join("");
      return `<td class="party-td">${inner}</td>`;
    }
    return `<td>${cell}</td>`;
  }).join("")}
</tr>`).join("")}
</tbody>
</table>
</body>
</html>`;

  const win = window.open("", "_blank", "width=1200,height=800");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.print(); }, 500);
}

export default function IssuesMatrix() {
  const [data, setData] = useState<MatrixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [visibleParties, setVisibleParties] = useState<string[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/issues/matrix")
      .then((r) => r.json())
      .then((d: MatrixData) => {
        setData(d);
        setVisibleParties(d.parties.map((p) => p.shortName));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleParty = (shortName: string) => {
    setVisibleParties((prev) =>
      prev.includes(shortName) ? prev.filter((p) => p !== shortName) : [...prev, shortName]
    );
  };

  const filtered = (data?.issues ?? []).filter((issue) => {
    if (search && !issue.title.toLowerCase().includes(search.toLowerCase()) && !issue.location?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCategory && issue.category !== filterCategory) return false;
    if (dateFrom && issue.dateOccurred && issue.dateOccurred < dateFrom) return false;
    if (dateTo && issue.dateOccurred && issue.dateOccurred > dateTo) return false;
    return true;
  });

  const shownParties = (data?.parties ?? []).filter((p) => visibleParties.includes(p.shortName));

  const CATEGORIES = [
    { value: "death", label: "Death", emoji: "🕊️" },
    { value: "protest", label: "Protest", emoji: "✊" },
    { value: "scheme", label: "Scheme", emoji: "📋" },
    { value: "objection", label: "Objection", emoji: "⚠️" },
    { value: "disaster", label: "Disaster", emoji: "🌊" },
    { value: "controversy", label: "Controversy", emoji: "🔥" },
    { value: "newsletter", label: "Press", emoji: "📰" },
    { value: "other", label: "Other", emoji: "📌" },
  ];

  return (
    <div className="max-w-full px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/issues" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Issues
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            Accountability Matrix
          </h1>
        </div>
        <Button onClick={() => data && exportPDF(data, filtered, visibleParties, dateFrom, dateTo, search)} variant="outline" className="gap-2" disabled={!data || filtered.length === 0}>
          <Download className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by issue or location..." className="pl-9 bg-background border-border text-sm" />
            {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">From</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-background border-border text-sm w-36" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-0.5">To</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-background border-border text-sm w-36" />
            </div>
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground self-center mr-1">Category:</span>
          <button onClick={() => setFilterCategory("")} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!filterCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>All</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} onClick={() => setFilterCategory(filterCategory === c.value ? "" : c.value)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${filterCategory === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Party column toggles */}
        {data && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">Show parties:</span>
            {data.parties.map((p) => (
              <button key={p.id} onClick={() => toggleParty(p.shortName)}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all border ${visibleParties.includes(p.shortName) ? "text-white border-transparent" : "border-border bg-card text-muted-foreground"}`}
                style={visibleParties.includes(p.shortName) ? { backgroundColor: p.color } : {}}
              >{p.shortName}</button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {!loading && (
        <div className="text-xs text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {data?.issues.length ?? 0} issues
        </div>
      )}

      {/* Matrix Table */}
      <div ref={tableRef} className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[260px] sticky left-0 bg-muted/60 z-10">Issue</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">Category</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Date</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Location</th>
                {shownParties.map((party) => (
                  <th key={party.id} className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-center min-w-[140px]" style={{ color: party.color }}>
                    {party.shortName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="px-4 py-4 sticky left-0 bg-card"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-3 py-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-3 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-3 py-4"><Skeleton className="h-4 w-20" /></td>
                  {[1, 2, 3].map((j) => <td key={j} className="px-3 py-4"><Skeleton className="h-4 w-20 mx-auto" /></td>)}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4 + shownParties.length} className="px-4 py-16 text-center">
                    <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No issues match your filters.</p>
                    <Link href="/issues" className="text-xs text-primary hover:underline mt-1 block">Go log an issue →</Link>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((issue, idx) => {
                const catMeta = getCategoryMeta(issue.category);
                return (
                  <tr key={issue.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    {/* Issue title — sticky */}
                    <td className={`px-4 py-3 sticky left-0 z-10 ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"} hover:bg-muted/20`}>
                      <Link href={`/issues/${issue.id}`} className="group">
                        <div className="font-medium text-foreground text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug">{issue.title}</div>
                      </Link>
                    </td>
                    {/* Category */}
                    <td className="px-3 py-3">
                      <span className="text-xs whitespace-nowrap" style={{ color: catMeta.color }}>{catMeta.emoji} {catMeta.label}</span>
                    </td>
                    {/* Date */}
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {issue.dateOccurred ? new Date(issue.dateOccurred).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {/* Location */}
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {issue.location ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    {/* Party response columns */}
                    {shownParties.map((party) => (
                      <td key={party.id} className="px-3 py-3 text-center align-top">
                        <ResponseCell responses={issue.responses[party.shortName] ?? []} partyColor={party.color} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
