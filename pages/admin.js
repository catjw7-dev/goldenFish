import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import { useSocket } from "../lib/useSocket";

const ROOM_ID = "festival-main";

export default function Admin() {
  const socket = useSocket();
  const [gameState, setGameState] = useState(null);
  const [endData, setEndData] = useState(null);
  const [tab, setTab] = useState("game"); // game | questions
  const [newQ, setNewQ] = useState({ question: "", answer: "", timeLimit: 8 });
  const [questions, setQuestions] = useState([]);
  const [qStatus, setQStatus] = useState("");

  useEffect(() => {
    if (!socket) return;
    socket.emit("joinRoom", { roomId: ROOM_ID, playerName: "__admin__" });
    socket.on("gameState", setGameState);
    socket.on("gameEnd", setEndData);
    fetchQuestions();
    return () => { socket.off("gameState"); socket.off("gameEnd"); };
  }, [socket]);

  async function fetchQuestions() {
    try {
      const r = await fetch("/api/questions");
      const data = await r.json();
      setQuestions(data);
    } catch {}
  }

  async function addQuestion() {
    if (!newQ.question.trim() || !newQ.answer.trim()) return;
    try {
      const r = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQ),
      });
      if (r.ok) {
        setNewQ({ question: "", answer: "", timeLimit: 8 });
        setQStatus("✅ 추가 완료!");
        fetchQuestions();
        setTimeout(() => setQStatus(""), 2000);
      }
    } catch { setQStatus("❌ 오류 발생"); }
  }

  async function deleteQuestion(id) {
    try {
      await fetch(`/api/questions?id=${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch {}
  }

  const emit = useCallback((event, data) => socket?.emit(event, { roomId: ROOM_ID, ...data }), [socket]);

  const phase = gameState?.phase || "lobby";
  const players = gameState?.players || [];
  const alive = players.filter(p => p.status === "alive" && p.name !== "__admin__");
  const dead = players.filter(p => p.status === "dead");

  const inputStyle = {
    background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,245,255,0.25)",
    borderRadius: 6, color: "var(--text-primary)", padding: "8px 12px",
    fontFamily: "'Rajdhani',sans-serif", fontSize: 14, outline: "none",
  };

  return (
    <>
      <Head><title>🎛️ Admin — Golden Fish</title></Head>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 className="font-orbitron neon-gold" style={{ fontSize: 22, fontWeight: 900 }}>🎛️ ADMIN PANEL</h1>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: socket?.connected ? "var(--neon-green)" : "var(--neon-pink)", boxShadow: socket?.connected ? "0 0 8px rgba(57,255,20,0.8)" : "none" }} />
            <span className="font-orbitron" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{socket?.connected ? "CONNECTED" : "OFFLINE"}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
          {["game", "questions"].map(t => (
            <button key={t} className={`btn-neon ${tab === t ? "btn-neon-gold" : ""}`}
              style={{ textTransform: "uppercase" }} onClick={() => setTab(t)}>
              {t === "game" ? "🎮 게임" : "📝 문제 관리"}
            </button>
          ))}
        </div>

        {/* GAME TAB */}
        {tab === "game" && (
          <div>
            {/* Status + controls */}
            <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <span className="font-orbitron" style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em" }}>PHASE: </span>
                  <span className="font-orbitron neon-cyan" style={{ fontSize: 14 }}>{phase.toUpperCase()}</span>
                  {phase !== "lobby" && (
                    <span style={{ marginLeft: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                      턴 {gameState?.turnCount} / {gameState?.maxTurns}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {phase === "lobby" && alive.length >= 2 && (
                    <button className="btn-neon btn-neon-green" onClick={() => emit("startGame")}>▶ 시작</button>
                  )}
                  <button className="btn-neon btn-neon-pink" onClick={() => emit("resetGame")}>↩ 리셋</button>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[
                  { label: "전체", val: players.filter(p => p.name !== "__admin__").length, color: "var(--text-primary)" },
                  { label: "생존", val: alive.length, color: "var(--neon-green)" },
                  { label: "탈락", val: dead.length, color: "var(--neon-pink)" },
                ].map(({ label, val, color }) => (
                  <div key={label} style={{ background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</div>
                    <div className="font-orbitron" style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Current turn info */}
            {gameState?.currentPlayer && phase === "question" && (
              <div className="glass-card-glow" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                <div className="font-orbitron" style={{ fontSize: 11, color: "var(--neon-cyan)", letterSpacing: "0.1em", marginBottom: 6 }}>CURRENT TURN</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  🎯 {gameState.currentPlayer.name}
                </div>
                {gameState.currentQuestion && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Q: </span>
                    <span>{gameState.currentQuestion.question}</span>
                  </div>
                )}
              </div>
            )}

            {/* Players list */}
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div className="font-orbitron" style={{ fontSize: 11, color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                PLAYERS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {players.filter(p => p.name !== "__admin__").map(p => (
                  <div key={p.name} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "var(--bg-card)", border: `1px solid ${p.status === "alive" ? "rgba(57,255,20,0.2)" : "rgba(255,45,120,0.15)"}`,
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <span style={{ fontSize: 16 }}>{p.status === "alive" ? "😊" : "🐟"}</span>
                    <span className="font-orbitron" style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>✅{p.survived} ☠️{p.deaths} 💖{p.saves}</span>
                    <span style={{ fontSize: 11, color: p.status === "alive" ? "var(--neon-green)" : "var(--neon-pink)", fontFamily: "'Orbitron',sans-serif" }}>
                      {p.status === "alive" ? "ALIVE" : "FISH"}
                    </span>
                    {phase === "lobby" && (
                      <button onClick={() => emit("removePlayer", { playerName: p.name })}
                        style={{ background: "none", border: "none", color: "var(--neon-pink)", cursor: "pointer", fontSize: 13 }}>✕</button>
                    )}
                  </div>
                ))}
                {players.filter(p => p.name !== "__admin__").length === 0 && (
                  <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>아직 참가자가 없습니다</p>
                )}
              </div>
            </div>

            {/* Log */}
            <div className="glass-card" style={{ padding: "1rem", marginTop: "1rem", maxHeight: 200, overflowY: "auto" }}>
              <div className="font-orbitron" style={{ fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: 8 }}>GAME LOG</div>
              {[...(gameState?.log || [])].reverse().map((l, i) => (
                <div key={i} className={`log-item ${l.type}`}>{l.msg}</div>
              ))}
            </div>
          </div>
        )}

        {/* QUESTIONS TAB */}
        {tab === "questions" && (
          <div>
            <div className="glass-card" style={{ padding: "1.25rem", marginBottom: "1rem" }}>
              <div className="font-orbitron" style={{ fontSize: 12, color: "var(--neon-cyan)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                새 문제 추가
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input style={inputStyle} placeholder="문제 (예: 1+1=?)"
                  value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))} />
                <div style={{ display: "flex", gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="정답 (예: 2)"
                    value={newQ.answer} onChange={e => setNewQ(p => ({ ...p, answer: e.target.value }))} />
                  <input style={{ ...inputStyle, width: 80 }} type="number" min={5} max={30} placeholder="초"
                    value={newQ.timeLimit} onChange={e => setNewQ(p => ({ ...p, timeLimit: Number(e.target.value) }))} />
                  <button className="btn-neon btn-neon-green" onClick={addQuestion}>추가</button>
                </div>
                {qStatus && <span style={{ fontSize: 13, color: "var(--neon-cyan)" }}>{qStatus}</span>}
              </div>
            </div>

            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <div className="font-orbitron" style={{ fontSize: 12, color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                문제 목록 ({questions.length})
              </div>
              {questions.length === 0 && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  MongoDB 미연결 시 기본 문제 20개가 사용됩니다
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {questions.map(q => (
                  <div key={q._id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "var(--bg-card)", border: "1px solid var(--border-dim)",
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, color: "var(--text-primary)" }}>{q.question}</div>
                      <div style={{ fontSize: 12, color: "var(--neon-green)", marginTop: 2 }}>정답: {q.answer} | {q.timeLimit}초</div>
                    </div>
                    <button onClick={() => deleteQuestion(q._id)}
                      style={{ background: "none", border: "none", color: "var(--neon-pink)", cursor: "pointer", fontSize: 14 }}>🗑️</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
