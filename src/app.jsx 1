import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

const COLORS = {
  bg: "#080c10", surface: "#0f1318", surface2: "#161c24",
  border: "#1e2530", accent: "#00e5ff", gold: "#ffc940",
  red: "#ff4757", green: "#2ed573", text: "#e8edf5", muted: "#4a5568",
  knowledge: "#00e5ff", reasoning: "#ffc940", trap: "#ff4757",
};

const ERROR_TYPES = {
  knowledge: { label: "Knowledge Gap",     icon: "🧠", desc: "Didn't know the fact",    color: COLORS.knowledge },
  reasoning: { label: "Reasoning Error",   icon: "⚙️", desc: "Knew it, misapplied it", color: COLORS.reasoning },
  trap:      { label: "Trap / Distractor", icon: "🪤", desc: "Got fooled by wording",  color: COLORS.trap },
};

const SYSTEMS = [
  "Cardiology","Pulmonology","Gastroenterology","Nephrology","Neurology",
  "Endocrinology","Hematology","Oncology","Infectious Disease","Immunology",
  "Musculoskeletal","Dermatology","Psychiatry","OB/GYN","Pediatrics",
  "Surgery","Pharmacology","Biochemistry","Genetics","Anatomy","Pathology","Other"
];

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(ts) {
  if (!ts) return 0;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

// ── StatBar ──────────────────────────────────────────────────────
function StatBar({ entries }) {
  const byType = (t) => entries.filter((e) => e.errorType === t).length;
  const reviewed = entries.filter((e) => e.reviewed).length;
  const stats = [
    { label: "Total Logged",    value: entries.length,     color: COLORS.text },
    { label: "Knowledge Gap",   value: byType("knowledge"), color: COLORS.knowledge },
    { label: "Reasoning Error", value: byType("reasoning"), color: COLORS.reasoning },
    { label: "Trap",            value: byType("trap"),      color: COLORS.trap },
    { label: "Reviewed",        value: reviewed,            color: COLORS.green },
  ];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 28 }}>
      {stats.map((s) => (
        <div key={s.label} style={{ flex: "1 1 100px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "12px 16px" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── ErrorTypeBtn ─────────────────────────────────────────────────
function ErrorTypeBtn({ type, selected, onSelect }) {
  const info = ERROR_TYPES[type];
  const isSelected = selected === type;
  return (
    <button onClick={() => onSelect(type)} style={{
      flex: 1, padding: "12px 8px", borderRadius: 6,
      border: `2px solid ${isSelected ? info.color : COLORS.border}`,
      background: isSelected ? `${info.color}18` : "transparent",
      color: isSelected ? info.color : COLORS.muted,
      fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
      cursor: "pointer", textAlign: "center", transition: "all 0.18s", lineHeight: 1.4,
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{info.icon}</div>
      <div>{info.label}</div>
      <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{info.desc}</div>
    </button>
  );
}

// ── AddForm ──────────────────────────────────────────────────────
function AddForm({ onAdd }) {
  const [open, setOpen]             = useState(false);
  const [topic, setTopic]           = useState("");
  const [system, setSystem]         = useState("");
  const [qnum, setQnum]             = useState("");
  const [teaching, setTeaching]     = useState("");
  const [clue, setClue]             = useState("");
  const [wrongchoice, setWrongchoice] = useState("");
  const [errorType, setErrorType]   = useState("");
  const [err, setErr]               = useState("");

  const inputStyle = {
    background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6,
    color: COLORS.text, fontFamily: "'DM Mono', monospace", fontSize: 13,
    padding: "10px 12px", outline: "none", width: "100%", boxSizing: "border-box",
  };
  const labelStyle = {
    fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase",
    color: COLORS.muted, display: "block", marginBottom: 5,
  };

  const handleAdd = () => {
    if (!topic)    { setErr("Please enter a topic.");          return; }
    if (!teaching) { setErr("Please enter the teaching point."); return; }
    if (!errorType){ setErr("Please select an error type.");   return; }
    setErr("");
    onAdd({ topic, system, qnum, teaching, clue, wrongchoice, errorType });
    setTopic(""); setSystem(""); setQnum(""); setTeaching("");
    setClue(""); setWrongchoice(""); setErrorType(""); setOpen(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: "100%", padding: "16px",
      background: `linear-gradient(135deg, ${COLORS.accent}22, ${COLORS.accent}08)`,
      border: `1.5px dashed ${COLORS.accent}60`, borderRadius: 10,
      color: COLORS.accent, fontFamily: "'Syne', sans-serif", fontWeight: 800,
      fontSize: 14, cursor: "pointer", letterSpacing: "0.08em",
      textTransform: "uppercase", marginBottom: 28,
    }}>+ Log a New Wrong Answer</button>
  );

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22, marginBottom: 28, borderTop: `3px solid ${COLORS.accent}` }}>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, color: COLORS.accent, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 20 }}>New Entry</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={labelStyle}>Topic / Concept *</label><input style={inputStyle} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Afib management" /></div>
        <div>
          <label style={labelStyle}>System</label>
          <select style={{ ...inputStyle, appearance: "none" }} value={system} onChange={e => setSystem(e.target.value)}>
            <option value="">Select system...</option>
            {SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}><label style={labelStyle}>UWorld Q# (optional)</label><input style={inputStyle} value={qnum} onChange={e => setQnum(e.target.value)} placeholder="e.g. #18342" /></div>
      <div style={{ marginBottom: 12 }}><label style={labelStyle}>Core Teaching Point — in YOUR own words *</label><textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={teaching} onChange={e => setTeaching(e.target.value)} placeholder="What is the ONE thing this question was testing?" /></div>
      <div style={{ marginBottom: 12 }}><label style={labelStyle}>Clue I Missed in the Stem</label><input style={inputStyle} value={clue} onChange={e => setClue(e.target.value)} placeholder="e.g. 'irregularly irregular' → should have flagged Afib" /></div>
      <div style={{ marginBottom: 18 }}><label style={labelStyle}>What Would Make Wrong Choices Correct?</label><textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={wrongchoice} onChange={e => setWrongchoice(e.target.value)} placeholder="e.g. Choice B would be correct IF the patient were unstable..." /></div>

      <div style={{ marginBottom: 18 }}>
        <label style={labelStyle}>Error Type *</label>
        <div style={{ display: "flex", gap: 10 }}>
          {Object.keys(ERROR_TYPES).map(t => <ErrorTypeBtn key={t} type={t} selected={errorType} onSelect={setErrorType} />)}
        </div>
      </div>

      {err && <div style={{ color: COLORS.red, fontSize: 12, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleAdd} style={{ flex: 1, padding: "13px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 7, fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" }}>→ Save Entry</button>
        <button onClick={() => setOpen(false)} style={{ padding: "13px 18px", background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 7, fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── EntryCard ────────────────────────────────────────────────────
function EntryCard({ entry, onToggleReview, onDelete }) {
  const info    = ERROR_TYPES[entry.errorType] || ERROR_TYPES.knowledge;
  const days    = daysSince(entry.createdAt);
  const needsReview = !entry.reviewed && days >= 2;

  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 20, borderLeft: `4px solid ${info.color}`, marginBottom: 14, animation: "fadeIn 0.3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{entry.topic}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {entry.system && <span style={{ fontSize: 10, background: COLORS.surface2, border: `1px solid ${COLORS.border}`, borderRadius: 4, padding: "2px 8px", color: COLORS.muted }}>{entry.system}</span>}
            {entry.qnum   && <span style={{ fontSize: 10, color: COLORS.muted, fontFamily: "'DM Mono', monospace" }}>{entry.qnum}</span>}
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 4, background: `${info.color}18`, color: info.color }}>{info.icon} {info.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: COLORS.muted }}>{formatDate(entry.createdAt)}</span>
          <button onClick={() => onDelete(entry.id)} style={{ background: "none", border: "none", color: COLORS.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>×</button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>📌 Core Teaching Point</div>
        <div style={{ fontFamily: "'Lora', serif", fontStyle: "italic", fontSize: 14, color: COLORS.accent, lineHeight: 1.7 }}>{entry.teaching}</div>
      </div>

      {entry.clue && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>🔍 Clue I Missed</div>
          <div style={{ fontSize: 13, color: COLORS.gold, lineHeight: 1.6 }}>{entry.clue}</div>
        </div>
      )}

      {entry.wrongchoice && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 4 }}>🔄 What Makes Wrong Choices Correct</div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, opacity: 0.85 }}>{entry.wrongchoice}</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${COLORS.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: needsReview ? COLORS.red : entry.reviewed ? COLORS.green : COLORS.muted }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: needsReview ? COLORS.red : entry.reviewed ? COLORS.green : COLORS.muted }} />
          {entry.reviewed ? "Reviewed ✓" : needsReview ? "⚡ Due for 48hr Review!" : `Review in ${Math.max(0, 2 - days)} day(s)`}
        </div>
        <button onClick={() => onToggleReview(entry.id, entry.reviewed)} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, padding: "5px 14px", borderRadius: 5, border: `1px solid ${entry.reviewed ? COLORS.green : COLORS.border}`, background: "transparent", color: entry.reviewed ? COLORS.green : COLORS.muted, cursor: "pointer", transition: "all 0.2s" }}>
          {entry.reviewed ? "✓ Reviewed" : "Mark Reviewed"}
        </button>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState("log");

  // Real-time Firestore listener
  useEffect(() => {
    const q = query(collection(db, "entries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async (fields) => {
    setSaving(true);
    await addDoc(collection(db, "entries"), { ...fields, reviewed: false, createdAt: serverTimestamp() });
    setSaving(false);
  };

  const handleToggleReview = async (id, current) => {
    setSaving(true);
    await updateDoc(doc(db, "entries", id), { reviewed: !current });
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this entry?")) return;
    await deleteDoc(doc(db, "entries", id));
  };

  const dueCount = entries.filter(e => !e.reviewed && daysSince(e.createdAt) >= 2).length;

  const filtered = entries.filter(e => {
    const matchFilter =
      filter === "all"     ? true :
      filter === "pending" ? !e.reviewed && daysSince(e.createdAt) >= 2 :
      e.errorType === filter;
    const matchSearch = search === "" ||
      e.topic.toLowerCase().includes(search.toLowerCase()) ||
      (e.system || "").toLowerCase().includes(search.toLowerCase()) ||
      e.teaching.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const topSystems = SYSTEMS.map(s => ({ name: s, count: entries.filter(e => e.system === s).length }))
    .filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

  const dominantType = ["knowledge","reasoning","trap"].reduce((a, b) =>
    entries.filter(e=>e.errorType===b).length > entries.filter(e=>e.errorType===a).length ? b : a, "knowledge");

  const FILTERS = [
    { key: "all",       label: "All" },
    { key: "knowledge", label: "🧠 Knowledge" },
    { key: "reasoning", label: "⚙️ Reasoning" },
    { key: "trap",      label: "🪤 Trap" },
    { key: "pending",   label: `⚡ Due${dueCount > 0 ? ` (${dueCount})` : ""}` },
  ];

  if (loading) return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", color: COLORS.muted }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>Connecting to your data...</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: "'DM Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Lora:ital,wght@0,400;1,400;1,600&display=swap');
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: #3a4555; }
        select option { background: #161c24; }
        textarea { font-family: 'DM Mono', monospace; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #080c10; }
        ::-webkit-scrollbar-thumb { background: #1e2530; border-radius: 4px; }
      `}</style>

      {/* NAV */}
      <div style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, background: COLORS.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: COLORS.bg, fontFamily: "'Syne', sans-serif" }}>W</div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 14, color: COLORS.text, lineHeight: 1 }}>WhyWrong</div>
              <div style={{ fontSize: 9, color: COLORS.muted, letterSpacing: "0.1em" }}>USMLE ERROR TRACKER</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saving && <span style={{ fontSize: 10, color: COLORS.muted, letterSpacing: "0.1em" }}>saving...</span>}
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: saving ? COLORS.gold : COLORS.green }} title={saving ? "Syncing" : "Synced to Firebase"} />
            <span style={{ fontSize: 9, color: COLORS.muted, letterSpacing: "0.08em" }}>{saving ? "SYNCING" : "SYNCED"}</span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px 80px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: COLORS.accent, marginBottom: 6 }}>// Your Personal Study Platform</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px, 6vw, 42px)", fontWeight: 800, lineHeight: 1.05, color: COLORS.text }}>
            Why Was I <span style={{ color: COLORS.accent }}>Wrong?</span>
          </div>
          <div style={{ fontSize: 12, color: COLORS.muted, marginTop: 6, letterSpacing: "0.04em" }}>Every mistake categorized → every pattern eliminated → score climbs</div>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
          {[["log","📋 Error Log"],["insights","📊 Insights"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "10px 18px", background: "transparent", border: "none",
              borderBottom: tab === key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: tab === key ? COLORS.accent : COLORS.muted,
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 12,
              letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
              marginBottom: -1, transition: "all 0.18s",
            }}>{label}</button>
          ))}
        </div>

        {/* LOG TAB */}
        {tab === "log" && (
          <>
            <StatBar entries={entries} />
            <AddForm onAdd={handleAdd} />

            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entries..." style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 7, color: COLORS.text, fontFamily: "'DM Mono', monospace", fontSize: 13, padding: "10px 14px", width: "100%", outline: "none", marginBottom: 14 }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "6px 14px", borderRadius: 20, border: `1px solid ${filter === f.key ? COLORS.accent : COLORS.border}`, background: filter === f.key ? `${COLORS.accent}12` : "transparent", color: filter === f.key ? COLORS.accent : COLORS.muted, fontFamily: "'DM Mono', monospace", fontSize: 11, cursor: "pointer", transition: "all 0.18s" }}>
                  {f.label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: COLORS.muted }}>
                <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.4 }}>◎</div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>No entries yet.<br />Log your first wrong answer above.</div>
              </div>
            ) : filtered.map(e => (
              <EntryCard key={e.id} entry={e} onToggleReview={handleToggleReview} onDelete={handleDelete} />
            ))}
          </>
        )}

        {/* INSIGHTS TAB */}
        {tab === "insights" && (
          <div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: COLORS.muted, fontSize: 13 }}>Log some entries first to see insights.</div>
            ) : (
              <>
                {/* Dominant error */}
                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22, marginBottom: 16, borderTop: `3px solid ${ERROR_TYPES[dominantType].color}` }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 8 }}>Your Dominant Error Pattern</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: ERROR_TYPES[dominantType].color }}>{ERROR_TYPES[dominantType].icon} {ERROR_TYPES[dominantType].label}</div>
                  <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 8, lineHeight: 1.6 }}>
                    {dominantType === "knowledge"  && "Focus on filling content gaps. Read UWorld explanations deeply and use Anki for high-yield facts."}
                    {dominantType === "reasoning"  && "Your knowledge base is solid — you need to fix your thought process. Write out your reasoning before picking an answer."}
                    {dominantType === "trap"        && "You're getting baited by distractors. Slow down on the stem. Read every keyword carefully before looking at choices."}
                  </div>
                </div>

                {/* Breakdown bars */}
                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22, marginBottom: 16 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 16 }}>Error Type Breakdown</div>
                  {Object.keys(ERROR_TYPES).map(t => {
                    const count = entries.filter(e => e.errorType === t).length;
                    const pct   = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
                    return (
                      <div key={t} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                          <span style={{ color: ERROR_TYPES[t].color }}>{ERROR_TYPES[t].icon} {ERROR_TYPES[t].label}</span>
                          <span style={{ color: COLORS.muted }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: COLORS.surface2, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: ERROR_TYPES[t].color, borderRadius: 4, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Weak systems */}
                {topSystems.length > 0 && (
                  <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22, marginBottom: 16 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 16 }}>Weakest Systems</div>
                    {topSystems.map((s, i) => (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < topSystems.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 16, color: COLORS.muted, width: 20 }}>#{i+1}</div>
                          <span style={{ fontSize: 14, color: COLORS.text }}>{s.name}</span>
                        </div>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: COLORS.red }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review progress */}
                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22 }}>
                  <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: COLORS.muted, marginBottom: 10 }}>48-Hour Review Progress</div>
                  <div style={{ display: "flex", gap: 16 }}>
                    {[
                      { label: "Reviewed",  value: entries.filter(e=>e.reviewed).length, color: COLORS.green },
                      { label: "Due Now",   value: dueCount,                              color: COLORS.red },
                      { label: "Upcoming",  value: entries.filter(e=>!e.reviewed && daysSince(e.createdAt) < 2).length, color: COLORS.muted },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
