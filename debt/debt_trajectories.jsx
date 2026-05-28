import { useState, useMemo } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer
} from "recharts";

/* ══════════════════════════════════════════════════════════
   REGRESSION MATH
   Iter.1 → plain OLS (weighted-capable)
   Iter.2 → outlier-robust: drop points > 2σ, re-fit
   Iter.3 → Huber IRLS, with domain-specific exclusion windows

   Numerical stability: exponential fits centre x at the
   weighted mean before log-space OLS, preventing exp()
   overflow/underflow on calendar-year x-values (~2000–2040).
   Fit stores {a0, xc, b}: pred(x) = a0 * exp(b*(x-xc)).
══════════════════════════════════════════════════════════ */
function wOls(pts) {
  if (!pts || pts.length < 2) return null;
  const sw  = pts.reduce((s, p) => s + (p.w ?? 1), 0);
  const mx  = pts.reduce((s, p) => s + p.x * (p.w ?? 1), 0) / sw;
  const my  = pts.reduce((s, p) => s + p.y * (p.w ?? 1), 0) / sw;
  const Sxx = pts.reduce((s, p) => s + (p.w ?? 1) * (p.x - mx) ** 2, 0);
  const Sxy = pts.reduce((s, p) => s + (p.w ?? 1) * (p.x - mx) * (p.y - my), 0);
  if (Sxx < 1e-10) return null;
  const b  = Sxy / Sxx;
  const a  = my - b * mx;
  const sse = pts.reduce((s, p) => s + (p.w ?? 1) * (p.y - a - b * p.x) ** 2, 0);
  const sst = pts.reduce((s, p) => s + (p.w ?? 1) * (p.y - my) ** 2, 1e-12);
  const s2  = sse / Math.max(sw - 2, 1);
  return { a, b, mx, Sxx, sw, s: Math.sqrt(s2), r2: 1 - sse / sst, type: "lin" };
}

// Centred exponential OLS — avoids exp() overflow on large x (e.g. calendar years).
// Returns fit with .a0 (coeff at xc), .xc (centre), .b, .lmx (mean of centred x), .Sxx, .sw, .s, .r2
function expOls(pts) {
  if (!pts || pts.length < 2) return null;
  const vp = pts.filter(p => p.y > 0.001);
  if (vp.length < 2) return null;
  const swv = vp.reduce((s, p) => s + (p.w ?? 1), 0);
  const xc  = vp.reduce((s, p) => s + p.x * (p.w ?? 1), 0) / swv; // weighted centre
  const lp  = vp.map(p => ({ x: p.x - xc, y: Math.log(p.y), w: p.w }));
  const fit = wOls(lp);
  if (!fit) return null;
  const { b, mx: lmx, Sxx, sw, s, a: la } = fit;
  const a0  = Math.exp(la);                       // value at x == xc
  const my  = vp.reduce((s, p) => s + p.y * (p.w ?? 1), 0) / swv;
  const sse = vp.reduce((s, p) => s + (p.w ?? 1) * (p.y - a0 * Math.exp(b * (p.x - xc))) ** 2, 0);
  const sst = vp.reduce((s, p) => s + (p.w ?? 1) * (p.y - my) ** 2, 1e-12);
  return { a0, xc, b, lmx, Sxx, sw, s, r2: 1 - sse / sst, type: "exp" };
}

const getFn = t => t === "exp" ? expOls : wOls;

function pred(fit, x) {
  if (!fit) return null;
  const v = fit.type === "exp"
    ? fit.a0 * Math.exp(fit.b * (x - fit.xc))
    : fit.a  + fit.b * x;
  return isFinite(v) ? v : null;
}

function predCI(fit, x) {
  const p = pred(fit, x);
  if (p == null) return [null, null];
  if (fit.type === "exp") {
    // SE in centred log-space
    const xd = (x - fit.xc) - (fit.lmx ?? 0);
    const se = fit.s * Math.sqrt(1 / fit.sw + xd * xd / Math.max(fit.Sxx, 1e-10));
    const lp = Math.log(Math.max(p, 1e-10));
    return [Math.exp(lp - 1.96 * se), Math.exp(lp + 1.96 * se)];
  }
  const se = fit.s * Math.sqrt(1 / fit.sw + (x - fit.mx) ** 2 / Math.max(fit.Sxx, 1e-10));
  return [p - 1.96 * se, p + 1.96 * se];
}

function i2fit(pts, ft) {
  const f = getFn(ft)(pts);
  if (!f) return null;
  const res = pts.map(p => Math.abs(p.y - (pred(f, p.x) ?? p.y)));
  const rmse = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
  const cl = pts.filter((_, i) => res[i] <= 2 * rmse);
  return cl.length >= 2 ? getFn(ft)(cl) : f;
}

function i3fit(pts, ft, n = 6) {
  let wp = pts.map(p => ({ ...p, w: 1 }));
  let f = getFn(ft)(wp);
  for (let i = 0; i < n; i++) {
    if (!f) break;
    const res = wp.map(p => Math.abs(p.y - (pred(f, p.x) ?? p.y)));
    const rmse = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / res.length);
    const k = 1.345 * rmse;
    wp = wp.map((p, j) => ({ ...p, w: res[j] <= k ? 1 : k / Math.max(res[j], 1e-10) }));
    f = getFn(ft)(wp);
  }
  return f;
}

function crossYr(fit, thr, dir = "up", x0 = 2025, x1 = 2050) {
  if (!fit) return null;
  for (let x = x0; x <= x1; x += 0.1) {
    const p = pred(fit, x);
    if (p == null) continue;
    if (dir === "up" && p >= thr) return +(x.toFixed(1));
    if (dir === "down" && p <= thr) return +(x.toFixed(1));
  }
  return null;
}

/* ══════════════════════════════════════════════════════════
   DATA — 16 SYSTEMS (12 from repo + 4 extended)
   pts: [[year, value], ...]
   exc: years to exclude from Iter.3 (COVID / policy distortions)
══════════════════════════════════════════════════════════ */
const SERIES = [
  {
    id: "fedInt", name: "US Fed Net Interest", unit: "$B", color: "#f87171",
    domain: "sovereign", ft: "exp", thr: 2100, tDir: "up",
    tLab: "$2.1T — CBO 2036 forecast",
    pts: [[2015,223],[2016,240],[2017,263],[2018,325],[2019,375],
          [2020,345],[2021,352],[2022,476],[2023,660],[2024,880],[2025,952]],
    src: "CBO, US Treasury"
  },
  {
    id: "climDis", name: "Climate Disaster Losses", unit: "$B", color: "#fb923c",
    domain: "ecological", ft: "exp", thr: 500, tDir: "up",
    tLab: "$500B — sovereign fiscal tipping",
    pts: [[2000,85],[2001,55],[2002,60],[2003,70],[2004,90],[2005,225],
          [2006,60],[2007,75],[2008,190],[2009,60],[2010,130],[2011,380],
          [2012,170],[2013,130],[2014,115],[2015,95],[2016,175],[2017,330],
          [2018,220],[2019,160],[2020,210],[2021,280],[2022,280],[2023,224],[2024,368]],
    src: "Munich Re, Swiss Re NatCatService"
  },
  {
    id: "cc90", name: "CC 90-day+ Delinquency", unit: "%", color: "#ef4444",
    domain: "consumer", ft: "lin", thr: 18, tDir: "up",
    tLab: "18% — bank systemic loss trigger",
    pts: [[2013,5.7],[2014,5.2],[2015,4.8],[2016,4.5],[2017,4.3],[2018,4.8],
          [2019,5.3],[2020,4.3],[2021,3.4],[2022,4.0],[2023,8.9],[2024,11.2],[2025.25,13.0]],
    exc: [2020,2021,2022],
    src: "NY Fed HHDC"
  },
  {
    id: "h100", name: "H100 GPU Rental Rate", unit: "$/hr", color: "#a78bfa",
    domain: "tech", ft: "exp", thr: 1.0, tDir: "down",
    tLab: "$1/hr — economic marginal threshold",
    pts: [[2023.0,9.5],[2023.3,9.0],[2023.6,8.5],[2023.9,7.0],
          [2024.2,5.5],[2024.5,4.5],[2024.8,3.5],[2025.0,3.0],[2025.2,2.85],[2025.5,2.3]],
    src: "GPU secondary markets, CoreWeave, Lambda"
  },
  {
    id: "mental", name: "Mental Health Econ. Cost", unit: "$T/yr", color: "#818cf8",
    domain: "social", ft: "lin", thr: 6.0, tDir: "up",
    tLab: "$6T/yr — Lancet 2030 projection",
    pts: [[2019,2.2],[2020,2.5],[2021,2.7],[2022,2.9],[2023,3.1],[2024,3.5],[2025,4.0]],
    src: "WHO, Lancet Global Health, OECD"
  },
  {
    id: "ewaste", name: "Global E-Waste Volume", unit: "Mt/yr", color: "#34d399",
    domain: "ecological", ft: "lin", thr: 82, tDir: "up",
    tLab: "82 Mt — UN 2030 projection",
    pts: [[2010,34],[2013,39],[2016,44.7],[2019,53.6],[2022,62],[2024,67]],
    src: "Global E-Waste Monitor 2024"
  },
  {
    id: "zombie", name: "Zombie Corporation Rate", unit: "%", color: "#a8a29e",
    domain: "corporate", ft: "lin", thr: 28, tDir: "up",
    tLab: "28% — systemic credit dysfunction",
    pts: [[2008,2],[2012,5],[2015,8],[2017,12],[2019,15],
          [2020,20],[2021,17],[2022,16],[2023,17],[2024,19]],
    exc: [2020,2021],
    src: "BIS, Bloomberg, OECD"
  },
  {
    id: "cre", name: "CRE Delinquency", unit: "%", color: "#fbbf24",
    domain: "corporate", ft: "lin", thr: 10, tDir: "up",
    tLab: "10% — CRE systemic stress",
    pts: [[2019,2.2],[2020,4.6],[2021,3.0],[2022,2.0],[2023,3.8],[2024,6.5],[2025,8.2]],
    src: "MSCI, CBRE, Federal Reserve"
  },
  {
    id: "trust", name: "OECD Low/No Gov. Trust", unit: "%", color: "#94a3b8",
    domain: "social", ft: "lin", thr: 60, tDir: "up",
    tLab: "60% — institutional delegitimization",
    pts: [[2014,37],[2016,38],[2018,40],[2020,41],[2022,43],[2023,44],[2024,45]],
    src: "OECD Trust Survey 2024"
  },
  {
    id: "insGap", name: "Uninsured Climate Loss %", unit: "%", color: "#f472b6",
    domain: "ecological", ft: "lin", thr: 70, tDir: "up",
    tLab: "70% — insurance market retreat",
    pts: [[2010,28],[2013,32],[2015,35],[2017,38],[2019,40],
          [2020,42],[2021,44],[2022,46],[2023,52],[2024,57]],
    src: "Munich Re, Swiss Re, IAIS"
  },
  {
    id: "student", name: "Student Loan Delinquency", unit: "%", color: "#38bdf8",
    domain: "consumer", ft: "lin", thr: 30, tDir: "up",
    tLab: "30% — structural default cascade",
    pts: [[2018,11.0],[2019,10.8],[2020,5.3],[2021,3.0],
          [2022,1.2],[2023,0.7],[2024,16.19],[2025,18.5]],
    exc: [2020,2021,2022,2023],
    note: "COVID forbearance 2020–23 excluded in Iter.3",
    src: "Federal Reserve, NY Fed, Dept. of Education"
  },
  {
    id: "aiGap", name: "AI Capex–Revenue Gap", unit: "$B", color: "#c084fc",
    domain: "tech", ft: "exp", thr: 800, tDir: "up",
    tLab: "$800B/yr — structurally unsustainable",
    pts: [[2019,30],[2020,38],[2021,55],[2022,70],[2023,125],[2024,255]],
    src: "Sequoia Capital, Goldman Sachs, McKinsey, Barclays"
  },
  /* ── EXTENDED SYSTEMS ── */
  {
    id: "medDebt", name: "US Medical Debt Outstanding", unit: "$B", color: "#fb7185",
    domain: "consumer", ft: "lin", thr: 320, tDir: "up",
    tLab: "$320B — exceeds auto-loan collections",
    pts: [[2013,80],[2016,120],[2018,150],[2019,175],[2020,180],
          [2021,195],[2022,210],[2023,220],[2024,230]],
    src: "KFF, CFPB, Health Affairs"
  },
  {
    id: "pension", name: "US Pension Underfunding", unit: "$T", color: "#fcd34d",
    domain: "sovereign", ft: "lin", thr: 2.5, tDir: "up",
    tLab: "$2.5T — municipal fiscal cascade",
    pts: [[2000,0.3],[2005,0.8],[2010,1.5],[2012,1.0],[2015,1.1],
          [2019,1.3],[2021,1.1],[2022,0.9],[2023,1.2],[2024,1.5]],
    src: "Pew Charitable Trusts, Urban Institute, NASRA"
  },
  {
    id: "shooting", name: "US Mass Shooting Rate", unit: "ev/yr", color: "#71717a",
    domain: "social", ft: "exp", thr: 120, tDir: "up",
    tLab: "120/yr — normalization threshold",
    pts: [[1980,3],[1985,4],[1990,5],[1995,7],[2000,9],[2005,12],
          [2010,18],[2012,24],[2015,38],[2016,42],[2017,51],[2018,51],
          [2019,45],[2020,38],[2021,61],[2022,79],[2023,88],[2024,92]],
    exc: [2020],
    src: "Violence Project, NIJ, CHDS"
  },
  {
    id: "climLiab", name: "Climate Litigation Liability", unit: "$B", color: "#d97706",
    domain: "legal", ft: "exp", thr: 200, tDir: "up",
    tLab: "$200B — major balance-sheet shock",
    pts: [[2015,0.5],[2018,1.2],[2020,2.5],[2022,5.0],
          [2023,11.5],[2024,16],[2025,28]],
    src: "Climate Litigation DB, Callahan & Mankin 2022; NY/CA superfund"
  }
];

const DMETA = {
  consumer:  { label: "Consumer",   color: "#ef4444" },
  sovereign: { label: "Sovereign",  color: "#f97316" },
  tech:      { label: "Tech / AI",  color: "#a78bfa" },
  ecological:{ label: "Ecological", color: "#34d399" },
  social:    { label: "Social",     color: "#818cf8" },
  corporate: { label: "Corporate",  color: "#fbbf24" },
  legal:     { label: "Legal",      color: "#d97706" }
};

/* ══════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════ */
export default function App() {
  const [df, setDf] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [showTable, setShowTable] = useState(false);

  /* compute all 3 fits per series */
  const allFits = useMemo(() => {
    const r = {};
    for (const s of SERIES) {
      const pts = s.pts.map(([x, y]) => ({ x, y }));
      const pts3 = s.exc
        ? pts.filter(p => !s.exc.includes(Math.floor(p.x)))
        : pts;
      r[s.id] = {
        f1: getFn(s.ft)(pts),
        f2: i2fit(pts, s.ft),
        f3: i3fit(pts3, s.ft)
      };
    }
    return r;
  }, []);

  /* generate dense chart data per series */
  const cdMap = useMemo(() => {
    const m = {};
    for (const s of SERIES) {
      const { f1, f2, f3 } = allFits[s.id];
      const xMin = Math.min(...s.pts.map(([x]) => x));
      const step = s.id === "h100" ? 0.1 : 1;

      // include all actual x values (handles non-integer like 2025.25)
      const xSet = new Set();
      for (let x = xMin; x <= 2040; x += step)
        xSet.add(parseFloat(x.toFixed(2)));
      s.pts.forEach(([x]) => xSet.add(x));
      const xs = [...xSet].sort((a, b) => a - b);

      const am = new Map(s.pts.map(([x, y]) => [x, y]));
      m[s.id] = xs.map(x => {
        const row = { x };
        const a = am.get(x);
        if (a !== undefined) row.actual = a;
        const p1 = pred(f1, x), p2 = pred(f2, x), p3 = pred(f3, x);
        if (p1 != null) row.fit1 = +p1.toFixed(4);
        if (p2 != null) row.fit2 = +p2.toFixed(4);
        if (p3 != null) {
          row.fit3 = +p3.toFixed(4);
          const [lo, hi] = predCI(f3, x);
          if (lo != null) row.ciLo = +lo.toFixed(4);
          if (hi != null) row.ciHi = +hi.toFixed(4);
        }
        return row;
      });
    }
    return m;
  }, [allFits]);

  /* threshold crossings enriched with fit objects */
  const crossings = useMemo(() =>
    SERIES.map(s => {
      const { f1, f2, f3 } = allFits[s.id];
      const lastVal = s.pts[s.pts.length - 1][1];
      const crossed = s.tDir === "up" ? lastVal >= s.thr : lastVal <= s.thr;
      const x0 = Math.max(...s.pts.map(([x]) => x)) + 0.1;
      return {
        ...s, f1, f2, f3, lastVal, crossed,
        yr1: crossed ? null : crossYr(f1, s.thr, s.tDir, x0),
        yr2: crossed ? null : crossYr(f2, s.thr, s.tDir, x0),
        yr3: crossed ? null : crossYr(f3, s.thr, s.tDir, x0)
      };
    }).sort((a, b) => (a.yr3 ?? 99) - (b.yr3 ?? 99)),
  [allFits]);

  const filtered = df === "all" ? SERIES : SERIES.filter(s => s.domain === df);
  const upcoming = crossings.filter(c => c.yr3 && c.yr3 <= 2036 && !c.crossed).slice(0, 4);

  return (
    <div style={{
      background: "#030712", minHeight: "100vh", padding: "20px 24px",
      fontFamily: "'Courier New', 'Lucida Console', monospace", color: "#cbd5e1"
    }}>
      {/* ─── HEADER ─── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#334155", letterSpacing: "0.15em", marginBottom: 4 }}>
          COMPOUND DEBT ANALYSIS — EXTENDED DATASET 2026
        </div>
        <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#f1f5f9", margin: 0, letterSpacing: "0.02em" }}>
          16-SYSTEM TRAJECTORY INFERENCE
        </h1>
        <div style={{ fontSize: 10, color: "#475569", marginTop: 4 }}>
          Iter.1: Plain OLS &nbsp;→&nbsp; Iter.2: Outlier-Robust (2σ drop) &nbsp;→&nbsp;
          Iter.3: Huber IRLS + domain exclusions &nbsp;|&nbsp; 95% CI projection bands &nbsp;|&nbsp;
          4 extended systems: medical debt, pension underfunding, mass-shooting rate, climate litigation
        </div>
      </div>

      {/* ─── HEADLINE METRICS ─── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
        {upcoming.map(c => (
          <div key={c.id} style={{
            background: "#0f172a", border: `1px solid ${c.color}55`,
            borderRadius: 6, padding: "10px 12px"
          }}>
            <div style={{ fontSize: 9, color: c.color, marginBottom: 3, letterSpacing: "0.08em" }}>
              {DMETA[c.domain]?.label?.toUpperCase()} · CROSSING
            </div>
            <div style={{ fontSize: 26, fontWeight: "bold", color: c.color, lineHeight: 1 }}>
              {c.yr3?.toFixed(1)}
            </div>
            <div style={{ fontSize: 9, color: "#475569", marginTop: 3 }}>{c.name}</div>
            <div style={{ fontSize: 8, color: "#334155", marginTop: 1 }}>{c.tLab}</div>
          </div>
        ))}
      </div>

      {/* ─── TIMELINE ─── */}
      <Timeline crossings={crossings} />

      {/* ─── DOMAIN FILTER ─── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "14px 0" }}>
        {[["all","ALL","#64748b"], ...Object.entries(DMETA).map(([id,d])=>[id,d.label,d.color])].map(
          ([id, label, color]) => (
            <button key={id} onClick={() => setDf(id)} style={{
              padding: "3px 10px", fontSize: 10, borderRadius: 3, cursor: "pointer",
              border: `1px solid ${df === id ? color : "#1e293b"}`,
              background: df === id ? color + "22" : "transparent",
              color: df === id ? color : "#475569", letterSpacing: "0.08em"
            }}>{label}</button>
          )
        )}
      </div>

      {/* ─── CHART GRID ─── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(440px,1fr))",
        gap: 12
      }}>
        {filtered.map(s => (
          <SeriesCard
            key={s.id} series={s}
            data={cdMap[s.id]}
            crossing={crossings.find(c => c.id === s.id)}
            expanded={expanded === s.id}
            onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
          />
        ))}
      </div>

      {/* ─── ITERATION CONVERGENCE TABLE ─── */}
      <div style={{ marginTop: 20 }}>
        {!showTable ? (
          <button onClick={() => setShowTable(true)} style={{
            padding: "6px 14px", fontSize: 10, background: "#0f172a",
            border: "1px solid #1e293b", borderRadius: 4,
            color: "#64748b", cursor: "pointer", letterSpacing: "0.08em"
          }}>▼ ITERATION CONVERGENCE TABLE — ALL 16 SYSTEMS</button>
        ) : (
          <IterTable crossings={crossings} onClose={() => setShowTable(false)} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   TIMELINE COMPONENT
══════════════════════════════════════════════════════════ */
function Timeline({ crossings }) {
  const events = crossings
    .filter(c => c.yr3 && c.yr3 >= 2025 && c.yr3 <= 2045 && !c.crossed)
    .sort((a, b) => a.yr3 - b.yr3);
  const MIN = 2025, MAX = 2045, R = MAX - MIN;
  return (
    <div style={{
      background: "#0a1120", border: "1px solid #1e293b",
      borderRadius: 8, padding: "14px 16px", marginBottom: 14
    }}>
      <div style={{ fontSize: 9, color: "#334155", letterSpacing: "0.15em", marginBottom: 10 }}>
        THRESHOLD CROSSING TIMELINE — ITER.3 (HUBER IRLS) PROJECTION
      </div>
      <div style={{ position: "relative", height: 68 }}>
        <div style={{
          position: "absolute", top: 34, left: 0, right: 0,
          height: 1, background: "#1e293b"
        }} />
        {[2025,2027,2029,2031,2033,2035,2038,2041,2045].map(y => (
          <div key={y} style={{
            position: "absolute", left: `${(y - MIN) / R * 100}%`, top: 30
          }}>
            <div style={{ width: 1, height: 8, background: "#334155" }} />
            <div style={{ fontSize: 7, color: "#334155", marginTop: 2, marginLeft: -8 }}>{y}</div>
          </div>
        ))}
        {events.map((c, i) => {
          const left = Math.min(98, Math.max(0, (c.yr3 - MIN) / R * 100));
          const top = i % 2 === 0 ? 4 : 18;
          return (
            <div key={c.id} style={{ position: "absolute", left: `${left}%`, top }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: c.color, opacity: 0.85
              }} title={`${c.name}: ${c.yr3}`} />
              <div style={{
                position: "absolute", left: 9, top: 0,
                fontSize: 8, whiteSpace: "nowrap", color: c.color + "bb",
                maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis"
              }}>
                {Math.round(c.yr3)} {c.name.split(" ").slice(0, 2).join(" ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SERIES CARD
══════════════════════════════════════════════════════════ */
function SeriesCard({ series: s, data, crossing, expanded, onToggle }) {
  const { f1, f2, f3, yr1, yr2, yr3, crossed } = crossing || {};
  const h = expanded ? 290 : 175;

  const fmtX = x => {
    const r = x % 1;
    return (r > 0.01 && r < 0.99) ? x.toFixed(1) : Math.floor(x).toString();
  };
  const fmtY = v => {
    if (v == null) return "";
    const a = Math.abs(v);
    if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (a >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v.toFixed(1);
  };

  const domColor = DMETA[s.domain]?.color || "#64748b";

  return (
    <div
      onClick={onToggle}
      style={{
        background: "#0a1120",
        border: `1px solid ${expanded ? s.color + "66" : "#1e293b"}`,
        borderRadius: 8, padding: "12px", cursor: "pointer",
        transition: "border-color 0.2s"
      }}
    >
      {/* card header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span style={{
            display: "inline-block", padding: "1px 7px", borderRadius: 3,
            fontSize: 8, background: domColor + "22", color: domColor,
            letterSpacing: "0.1em"
          }}>{DMETA[s.domain]?.label}</span>
          <div style={{ fontSize: 12, fontWeight: "bold", color: "#f1f5f9", marginTop: 4 }}>
            {s.name}
          </div>
          {s.note && (
            <div style={{ fontSize: 8, color: "#334155", marginTop: 2 }}>{s.note}</div>
          )}
        </div>
        <div style={{ textAlign: "right", minWidth: 64 }}>
          {crossed ? (
            <div style={{ fontSize: 10, color: "#dc2626", fontWeight: "bold" }}>CROSSED</div>
          ) : yr3 ? (
            <div style={{ fontSize: 24, fontWeight: "bold", color: s.color, lineHeight: 1 }}>
              {yr3.toFixed(1)}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "#334155" }}>—</div>
          )}
          <div style={{ fontSize: 7, color: "#475569", marginTop: 1 }}>THRESHOLD YR</div>
          <div style={{ fontSize: 9, color: "#334155" }}>{s.unit}</div>
        </div>
      </div>

      {/* chart */}
      <ResponsiveContainer width="100%" height={h}>
        <ComposedChart data={data} margin={{ top: 2, right: 6, bottom: 2, left: 0 }}>
          <CartesianGrid strokeDasharray="1 4" stroke="#0f1929" vertical={false} />
          <XAxis
            dataKey="x" tickFormatter={fmtX} type="number"
            domain={["dataMin", 2040]} scale="linear" tickCount={7}
            tick={{ fontSize: 8, fill: "#334155" }}
          />
          <YAxis
            tickFormatter={fmtY} width={36}
            tick={{ fontSize: 8, fill: "#334155" }}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a", border: "1px solid #1e293b",
              fontSize: 10, padding: "4px 8px", borderRadius: 4
            }}
            labelStyle={{ color: "#64748b" }}
            formatter={(v, n) => [v != null ? (+v).toFixed(2) : "—", n]}
          />
          {/* 95% CI band as faint dashed lines */}
          <Line type="monotone" dataKey="ciHi" stroke={s.color} strokeOpacity={0.12}
                strokeDasharray="1 3" dot={false} strokeWidth={1}
                connectNulls={false} legendType="none" />
          <Line type="monotone" dataKey="ciLo" stroke={s.color} strokeOpacity={0.12}
                strokeDasharray="1 3" dot={false} strokeWidth={1}
                connectNulls={false} legendType="none" />
          {/* fits — only show all 3 when expanded */}
          {expanded && (
            <Line type="monotone" dataKey="fit1" stroke="#1e3a5f"
                  strokeDasharray="8 4" dot={false} strokeWidth={1}
                  name="Iter.1 OLS" connectNulls />
          )}
          {expanded && (
            <Line type="monotone" dataKey="fit2" stroke="#334155"
                  strokeDasharray="4 2" dot={false} strokeWidth={1}
                  name="Iter.2 Robust" connectNulls />
          )}
          <Line type="monotone" dataKey="fit3" stroke={s.color}
                dot={false} strokeWidth={expanded ? 1.5 : 1.2}
                name="Iter.3 Huber" connectNulls />
          {/* actual data dots */}
          <Line type="monotone" dataKey="actual" stroke={s.color}
                dot={{ r: 3, fill: s.color, strokeWidth: 0 }}
                strokeWidth={0} connectNulls={false}
                name="Actual" activeDot={{ r: 5 }} />
          {/* threshold line */}
          <ReferenceLine y={s.thr} stroke={s.color + "44"} strokeDasharray="5 3"
            label={{ value: s.tLab, position: "insideTopRight", fontSize: 7, fill: s.color + "88" }} />
          {/* crossing vertical */}
          {yr3 && (
            <ReferenceLine x={yr3} stroke={s.color + "33"} strokeDasharray="4 4" />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* expanded stats */}
      {expanded && (
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6, marginTop: 8
        }}>
          {[
            ["Iter.1  OLS",        f1, yr1, "#1e3a5f"],
            ["Iter.2  Robust-2σ",  f2, yr2, "#334155"],
            ["Iter.3  Huber IRLS", f3, yr3, s.color]
          ].map(([lbl, fit, yr, col]) => (
            <div key={lbl} style={{
              background: "#030712", borderRadius: 4,
              padding: "7px 8px", fontSize: 9
            }}>
              <div style={{ color: col, fontWeight: "bold", marginBottom: 3 }}>{lbl}</div>
              <div style={{ color: "#64748b" }}>
                R² = {fit?.r2 != null ? (fit.r2 * 100).toFixed(1) + "%" : "—"}
              </div>
              <div style={{ color: "#475569" }}>
                σ = {fit?.s != null ? fit.s.toFixed(2) : "—"} {s.unit}
              </div>
              <div style={{ color: "#334155" }}>
                n = {fit?.sw != null ? Math.round(fit.sw) : "—"} pts
              </div>
              <div style={{ color: col, marginTop: 2 }}>
                cross: {yr ? yr.toFixed(1) : "—"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 7, color: "#1e3a5f", marginTop: 5 }}>{s.src}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ITERATION CONVERGENCE TABLE
══════════════════════════════════════════════════════════ */
function IterTable({ crossings, onClose }) {
  return (
    <div style={{
      background: "#0a1120", border: "1px solid #1e293b",
      borderRadius: 8, padding: 16
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 12
      }}>
        <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em" }}>
          REGRESSION CONVERGENCE — R² AND THRESHOLD CROSSING YEAR STABILITY ACROSS ITERATIONS
        </div>
        <button onClick={onClose} style={{
          fontSize: 10, color: "#475569", background: "transparent",
          border: "none", cursor: "pointer"
        }}>✕</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1e293b" }}>
              {[
                "System","Domain","Fit",
                "I1 R²","I1 σ","I1 Year",
                "I2 R²","I2 σ","I2 Year",
                "I3 R²","I3 σ","I3 Year",
                "ΔR² (1→3)","ΔYear (1→3)"
              ].map(h => (
                <th key={h} style={{
                  padding: "3px 8px", color: "#334155",
                  textAlign: "left", fontWeight: "normal", whiteSpace: "nowrap"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crossings.map((c, i) => {
              const dr2 = (c.f3?.r2 != null && c.f1?.r2 != null)
                ? ((c.f3.r2 - c.f1.r2) * 100) : null;
              const dyr = (c.yr3 != null && c.yr1 != null)
                ? (c.yr3 - c.yr1) : null;
              const domColor = DMETA[c.domain]?.color || "#64748b";
              return (
                <tr key={c.id} style={{
                  borderBottom: "1px solid #0a1120",
                  background: i % 2 === 0 ? "#060d1a" : "transparent"
                }}>
                  <td style={{ padding: "3px 8px", color: c.color }}>{c.name}</td>
                  <td style={{ padding: "3px 8px", color: domColor }}>{c.domain}</td>
                  <td style={{ padding: "3px 8px", color: "#475569" }}>{c.ft}</td>
                  {/* I1 */}
                  <td style={{ padding: "3px 8px", color: "#334155" }}>
                    {c.f1?.r2 != null ? (c.f1.r2 * 100).toFixed(1) + "%" : "—"}</td>
                  <td style={{ padding: "3px 8px", color: "#334155" }}>
                    {c.f1?.s != null ? c.f1.s.toFixed(2) : "—"}</td>
                  <td style={{ padding: "3px 8px", color: "#475569" }}>
                    {c.yr1?.toFixed(1) || (c.crossed ? "PAST" : "—")}</td>
                  {/* I2 */}
                  <td style={{ padding: "3px 8px", color: "#475569" }}>
                    {c.f2?.r2 != null ? (c.f2.r2 * 100).toFixed(1) + "%" : "—"}</td>
                  <td style={{ padding: "3px 8px", color: "#475569" }}>
                    {c.f2?.s != null ? c.f2.s.toFixed(2) : "—"}</td>
                  <td style={{ padding: "3px 8px", color: "#64748b" }}>
                    {c.yr2?.toFixed(1) || (c.crossed ? "PAST" : "—")}</td>
                  {/* I3 */}
                  <td style={{ padding: "3px 8px", color: c.color, fontWeight: "bold" }}>
                    {c.f3?.r2 != null ? (c.f3.r2 * 100).toFixed(1) + "%" : "—"}</td>
                  <td style={{ padding: "3px 8px", color: c.color }}>
                    {c.f3?.s != null ? c.f3.s.toFixed(2) : "—"}</td>
                  <td style={{ padding: "3px 8px", color: c.color, fontWeight: "bold" }}>
                    {c.yr3?.toFixed(1) || (c.crossed ? "PAST" : "—")}</td>
                  {/* deltas */}
                  <td style={{
                    padding: "3px 8px",
                    color: dr2 == null ? "#334155" : dr2 > 2 ? "#22c55e" : dr2 < -2 ? "#ef4444" : "#64748b"
                  }}>
                    {dr2 != null ? (dr2 > 0 ? "+" : "") + dr2.toFixed(1) + "%" : "—"}
                  </td>
                  <td style={{
                    padding: "3px 8px",
                    color: dyr == null ? "#334155" : Math.abs(dyr) > 3 ? "#f59e0b" : "#22c55e"
                  }}>
                    {dyr != null ? (dyr > 0 ? "+" : "") + dyr.toFixed(1) + " yr" : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 8, color: "#1e3a5f", marginTop: 10 }}>
        ΔR²: fit quality change from Iter.1 to Iter.3.
        ΔYear: threshold crossing estimate revision (+ = later, − = sooner).
        Orange ΔYear = materially revised trajectory (|Δ| &gt; 3 yr) — high iteration sensitivity.
        Green ΔR² = robust fit improvement from outlier removal and Huber down-weighting.
        COVID-distorted exclusion windows apply to: CC-90, zombie corps, student loans, mass shootings.
      </div>
    </div>
  );
}
