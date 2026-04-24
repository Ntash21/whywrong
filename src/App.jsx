import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, onSnapshot, query, orderBy, serverTimestamp
} from "firebase/firestore";

const C = {
  bg: "#f8f9fb", white: "#ffffff", border: "#e8eaed", border2: "#d1d5db",
  text: "#111827", text2: "#374151", muted: "#9ca3af", muted2: "#6b7280",
  knowledge: "#0ea5e9", reasoning: "#f59e0b", trap: "#ef4444",
  green: "#10b981", accent: "#6366f1", accentLight: "#eef2ff",
  knowledgeLight: "#f0f9ff", reasoningLight: "#fffbeb",
  trapLight: "#fef2f2", greenLight: "#f0fdf4",
};

const ERROR_TYPES = {
  knowledge: { label: "Knowledge Gap",     icon: "🧠", desc: "Didn't know the fact",    color: C.knowledge, light: C.knowledgeLight },
  reasoning: { label: "Reasoning Error",   icon: "⚙️", desc: "Knew it, misapplied it", color: C.reasoning, light: C.reasoningLight },
  trap:      { label: "Trap / Distractor", icon: "🪤", desc: "Got fooled by wording",  color: C.trap,      light: C.trapLight },
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

const inp = {
  width: "100%", padding: "10px 14px", borderRadius: 8,
  border: `1.5px solid ${C.border}`, background: C.white,
  color: C.text, fontSize: 14, outline: "none",
  fontFamily: "Inter, sans-serif", boxSizing: "border-box",
};

const lbl = {
  fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
  textTransform: "uppercase", color: C.muted2, display: "block", marginBottom: 6,
};

// ── StatBar ───────────────────────────────────────────────────────
function StatBar({ entries }) {
  const byType = (t) => entries.filter(e => e.errorType === t).length;
  const stats = [
    { label: "Total",     value: entries.length,                        color: C.accent,    bg: C.accentLight },
    { label: "Knowledge", value: byType("knowledge"),                   color: C.knowledge, bg: C.knowledgeLight },
    { label: "Reasoning", value: byType("reasoning"),                   color: C.reasoning, bg: C.reasoningLight },
    { label: "Trap",      value: byType("trap"),                        color: C.trap,      bg: C.trapLight },
    { label: "Reviewed",  value: entries.filter(e=>e.reviewed).length,  color: C.green,     bg: C.greenLight },
  ];
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
      {stats.map(s => (
        <div key={s.label} style={{ flex: "1 1 80px", background: s.bg, borderRadius: 12, padding: "16px 18px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── ErrorTypeBtn ──────────────────────────────────────────────────
function ErrorTypeBtn({ type, selected, onSelect }) {
  const info = ERROR_TYPES[type];
  const active = selected === type;
  return (
    <button onClick={() => onSelect(type)} style={{
      flex: 1, padding: "14px 10px", borderRadius: 10,
      border: `2px solid ${active ? info.color : C.border}`,
      background: active ? info.light : C.white,
      color: active ? info.color : C.muted2,
      fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13,
      cursor: "pointer", textAlign: "center", lineHeight: 1.5,
    }}>
      <div style={{ fontSize: 22, marginBottom: 5 }}>{info.icon}</div>
      <div style={{ fontWeight: 700 }}>{info.label}</div>
      <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.75, marginTop: 3 }}>{info.desc}</div>
    </button>
  );
}

// ── EntryForm (shared by Add + Edit) ─────────────────────────────
function EntryForm({ initial = {}, onSave, onCancel, saveLabel = "Save Entry" }) {
  const [topic,       setTopic]       = useState(initial.topic       || "");
  const [system,      setSystem]      = useState(initial.system      || "");
  const [qnum,        setQnum]        = useState(initial.qnum        || "");
  const [teaching,    setTeaching]    = useState(initial.teaching    || "");
  const [clue,        setClue]        = useState(initial.clue        || "");
  const [wrongchoice, setWrongchoice] = useState(initial.wrongchoice || "");
  const [errorType,   setErrorType]   = useState(initial.errorType   || "");
  const [err,         setErr]         = useState("");

  const handleSave = () => {
    if (!topic)     { setErr("Please enter a topic."); return; }
    if (!teaching)  { setErr("Please enter the teaching point."); return; }
    if (!errorType) { setErr("Please select an error type."); return; }
    setErr("");
    onSave({ topic, system, qnum, teaching, clue, wrongchoice, errorType });
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Topic / Concept *</label>
          <input style={inp} value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Afib management" />
        </div>
        <div>
          <label style={lbl}>System</label>
          <select style={{ ...inp, appearance: "none", cursor: "pointer" }} value={system} onChange={e => setSystem(e.target.value)}>
            <option value="">Select system...</option>
            {SYSTEMS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>UWorld Q# (optional)</label>
        <input style={inp} value={qnum} onChange={e => setQnum(e.target.value)} placeholder="e.g. #18342" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Core Teaching Point — in your own words *</label>
        <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={teaching} onChange={e => setTeaching(e.target.value)} placeholder="What is the ONE thing this question was testing?" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Clue I missed in the stem</label>
        <input style={inp} value={clue} onChange={e => setClue(e.target.value)} placeholder="e.g. 'irregularly irregular' → should have flagged Afib immediately" />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>What would make the wrong choices correct?</label>
        <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} value={wrongchoice} onChange={e => setWrongchoice(e.target.value)} placeholder="e.g. Choice B would be correct IF the patient were hemodynamically unstable..." />
      </div>

      <div style={{ marginBottom: 22 }}>
        <label style={lbl}>Error Type *</label>
        <div style={{ display: "flex", gap: 10 }}>
          {Object.keys(ERROR_TYPES).map(t => <ErrorTypeBtn key={t} type={t} selected={errorType} onSelect={setErrorType} />)}
        </div>
      </div>

      {err && <div style={{ color: C.trap, fontSize: 13, marginBottom: 14, fontWeight: 500 }}>{err}</div>}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSave} style={{ flex: 1, padding: "13px", background: C.accent, color: C.white, border: "none", borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
          {saveLabel}
        </button>
        <button onClick={onCancel} style={{ padding: "13px 20px", background: C.bg, color: C.muted2, border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── AddForm ───────────────────────────────────────────────────────
function AddForm({ onAdd }) {
  const [open, setOpen] = useState(false);

  const handleSave = (fields) => {
    onAdd(fields);
    setOpen(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: "100%", padding: "15px", background: C.white,
      border: `2px dashed ${C.border2}`, borderRadius: 12,
      color: C.accent, fontFamily: "Inter, sans-serif",
      fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 24,
    }}>+ Log a New Wrong Answer</button>
  );

  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: C.text }}>New Entry</div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 22 }}>×</button>
      </div>
      <EntryForm onSave={handleSave} onCancel={() => setOpen(false)} saveLabel="Save Entry" />
    </div>
  );
}

// ── EntryCard with inline Edit ────────────────────────────────────
function EntryCard({ entry, onToggleReview, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const info = ERROR_TYPES[entry.errorType] || ERROR_TYPES.knowledge;
  const days = daysSince(entry.createdAt);
  const needsReview = !entry.reviewed && days >= 2;

  const handleSave = (fields) => {
    onEdit(entry.id, fields);
    setEditing(false);
  };

  const iconBtn = (onClick, children, title) => (
    <button onClick={onClick} title={title} style={{
      background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
      color: C.muted2, cursor: "pointer", fontSize: 13, fontWeight: 600,
      padding: "4px 10px", fontFamily: "Inter, sans-serif",
      display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
    }}>{children}</button>
  );

  return (
    <div style={{
      background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14,
      padding: "22px 24px", marginBottom: 14,
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
      borderTop: `3px solid ${info.color}`,
      animation: "fadeIn 0.25s ease",
    }}>
      {/* Header — always visible */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: editing ? 20 : 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.3 }}>{entry.topic}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {entry.system && <span style={{ fontSize: 11, fontWeight: 600, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 10px", color: C.muted2 }}>{entry.system}</span>}
            {entry.qnum   && <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>{entry.qnum}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: info.light, color: info.color }}>{info.icon} {info.label}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: C.muted }}>{formatDate(entry.createdAt)}</span>
          {!editing && iconBtn(() => setEditing(true), <>✏️ Edit</>, "Edit entry")}
          <button onClick={() => onDelete(entry.id)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
      </div>

      {/* EDIT MODE */}
      {editing ? (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>✏️ Editing Entry</div>
          <EntryForm initial={entry} onSave={handleSave} onCancel={() => setEditing(false)} saveLabel="Save Changes" />
        </div>
      ) : (
        /* VIEW MODE */
        <>
          <div style={{ height: 1, background: C.border, marginBottom: 16 }} />

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>📌 Core Teaching Point</div>
            <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7, fontStyle: "italic", borderLeft: `3px solid ${info.color}`, paddingLeft: 14 }}>{entry.teaching}</div>
          </div>

          {entry.clue && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>🔍 Clue I Missed</div>
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, background: C.reasoningLight, borderRadius: 8, padding: "10px 14px" }}>{entry.clue}</div>
            </div>
          )}

          {entry.wrongchoice && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.muted, marginBottom: 6 }}>🔄 What Makes Wrong Choices Correct</div>
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{entry.wrongchoice}</div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: needsReview ? C.trap : entry.reviewed ? C.green : C.muted }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: needsReview ? C.trap : entry.reviewed ? C.green : C.border2 }} />
              {entry.reviewed ? "Reviewed ✓" : needsReview ? "⚡ Due for 48hr Review!" : `Review in ${Math.max(0, 2 - days)} day(s)`}
            </div>
            <button onClick={() => onToggleReview(entry.id, entry.reviewed)} style={{
              fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
              padding: "6px 16px", borderRadius: 20,
              border: `1.5px solid ${entry.reviewed ? C.green : C.border2}`,
              background: entry.reviewed ? C.greenLight : C.white,
              color: entry.reviewed ? C.green : C.muted2, cursor: "pointer",
            }}>
              {entry.reviewed ? "✓ Reviewed" : "Mark Reviewed"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [tab,     setTab]     = useState("log");

  useEffect(() => {
    const q = query(collection(db, "entries"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
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

  const handleEdit = async (id, fields) => {
    setSaving(true);
    await updateDoc(doc(db, "entries", id), { ...fields, updatedAt: serverTimestamp() });
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
    const matchFilter = filter === "all" ? true : filter === "pending" ? !e.reviewed && daysSince(e.createdAt) >= 2 : e.errorType === filter;
    const matchSearch = search === "" || e.topic.toLowerCase().includes(search.toLowerCase()) || (e.system||"").toLowerCase().includes(search.toLowerCase()) || e.teaching.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const topSystems = SYSTEMS.map(s => ({ name: s, count: entries.filter(e => e.system === s).length })).filter(s => s.count > 0).sort((a,b) => b.count - a.count).slice(0, 5);
  const dominantType = ["knowledge","reasoning","trap"].reduce((a,b) => entries.filter(e=>e.errorType===b).length > entries.filter(e=>e.errorType===a).length ? b : a, "knowledge");

  const FILTERS = [
    { key: "all",       label: "All" },
    { key: "knowledge", label: "🧠 Knowledge" },
    { key: "reasoning", label: "⚙️ Reasoning" },
    { key: "trap",      label: "🪤 Trap" },
    { key: "pending",   label: `⚡ Due${dueCount > 0 ? ` (${dueCount})` : ""}` },
  ];

  if (loading) return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
        <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Loading your log...</div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { font-family: Inter, sans-serif; }
        input::placeholder, textarea::placeholder { color: #d1d5db; }
        select option { background: white; }
        textarea { resize: vertical; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-5px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f3f5; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 5px; }
      `}</style>

      {/* NAV */}
      <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: C.white }}>W</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text, lineHeight: 1 }}>WhyWrong</div>
              <div style={{ fontSize: 10, color: C.muted, fontWeight: 500, letterSpacing: "0.05em" }}>USMLE Error Tracker</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: saving ? C.reasoning : C.green }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: saving ? C.reasoning : C.green }} />
            {saving ? "Saving..." : "Synced"}
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 780, margin: "0 auto", padding: "36px 20px 80px" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, marginBottom: 8 }}>Your Personal Study Platform</div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, color: C.text, lineHeight: 1.1, marginBottom: 10 }}>
            Why Was I <span style={{ color: C.accent }}>Wrong?</span>
          </h1>
          <p style={{ fontSize: 14, color: C.muted2, lineHeight: 1.6 }}>Every mistake categorized → every pattern eliminated → score climbs</p>
        </div>

        {/* TABS */}
        <div style={{ display: "flex", marginBottom: 32, borderBottom: `1.5px solid ${C.border}` }}>
          {[["log","Error Log"],["insights","Insights"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: "10px 22px", background: "transparent", border: "none",
              borderBottom: tab === key ? `2.5px solid ${C.accent}` : "2.5px solid transparent",
              color: tab === key ? C.accent : C.muted2,
              fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 13,
              cursor: "pointer", marginBottom: -1.5,
            }}>{label}</button>
          ))}
        </div>

        {/* LOG TAB */}
        {tab === "log" && (
          <>
            <StatBar entries={entries} />
            <AddForm onAdd={handleAdd} />

            <div style={{ position: "relative", marginBottom: 16 }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: C.muted, fontSize: 14 }}>🔍</div>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by topic, system, or content..." style={{ ...inp, paddingLeft: 40 }} />
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: "6px 16px", borderRadius: 20, fontFamily: "Inter, sans-serif",
                  border: `1.5px solid ${filter === f.key ? C.accent : C.border}`,
                  background: filter === f.key ? C.accentLight : C.white,
                  color: filter === f.key ? C.accent : C.muted2,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>{f.label}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text2, marginBottom: 6 }}>No entries yet</div>
                <div style={{ fontSize: 13 }}>Log your first wrong answer above to get started.</div>
              </div>
            ) : filtered.map(e => (
              <EntryCard key={e.id} entry={e} onToggleReview={handleToggleReview} onDelete={handleDelete} onEdit={handleEdit} />
            ))}
          </>
        )}

        {/* INSIGHTS TAB */}
        {tab === "insights" && (
          <div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>📊</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text2, marginBottom: 6 }}>No data yet</div>
                <div style={{ fontSize: 13 }}>Log some entries first to see your patterns.</div>
              </div>
            ) : (
              <>
                <div style={{ background: ERROR_TYPES[dominantType].light, border: `1.5px solid ${ERROR_TYPES[dominantType].color}40`, borderRadius: 14, padding: 24, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: ERROR_TYPES[dominantType].color, marginBottom: 8 }}>Your Dominant Error Pattern</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 10 }}>{ERROR_TYPES[dominantType].icon} {ERROR_TYPES[dominantType].label}</div>
                  <div style={{ fontSize: 14, color: C.text2, lineHeight: 1.7 }}>
                    {dominantType === "knowledge" && "Focus on filling content gaps. Read UWorld explanations deeply and use Anki for high-yield facts."}
                    {dominantType === "reasoning" && "Your knowledge base is solid — fix your thought process. Write out your reasoning before picking an answer."}
                    {dominantType === "trap"      && "You're getting baited by distractors. Slow down on the stem and read every keyword carefully."}
                  </div>
                </div>

                <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>Error Type Breakdown</div>
                  {Object.keys(ERROR_TYPES).map(t => {
                    const count = entries.filter(e => e.errorType === t).length;
                    const pct = entries.length > 0 ? Math.round((count / entries.length) * 100) : 0;
                    return (
                      <div key={t} style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                          <span style={{ fontWeight: 600, color: C.text2 }}>{ERROR_TYPES[t].icon} {ERROR_TYPES[t].label}</span>
                          <span style={{ fontWeight: 700, color: ERROR_TYPES[t].color }}>{count} <span style={{ fontWeight: 400, color: C.muted }}>({pct}%)</span></span>
                        </div>
                        <div style={{ height: 8, background: C.bg, borderRadius: 8, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: ERROR_TYPES[t].color, borderRadius: 8, transition: "width 0.5s ease" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {topSystems.length > 0 && (
                  <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>Weakest Systems</div>
                    {topSystems.map((s, i) => (
                      <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < topSystems.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.muted2 }}>#{i+1}</div>
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text2 }}>{s.name}</span>
                        </div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: C.trap }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>48-Hour Review Progress</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { label: "Reviewed", value: entries.filter(e=>e.reviewed).length,                                     color: C.green,     bg: C.greenLight },
                      { label: "Due Now",  value: dueCount,                                                                   color: C.trap,      bg: C.trapLight },
                      { label: "Upcoming", value: entries.filter(e=>!e.reviewed && daysSince(e.createdAt) < 2).length,        color: C.reasoning, bg: C.reasoningLight },
                    ].map(s => (
                      <div key={s.label} style={{ flex: 1, textAlign: "center", background: s.bg, borderRadius: 12, padding: "16px 8px" }}>
                        <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: s.color, opacity: 0.8 }}>{s.label}</div>
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
