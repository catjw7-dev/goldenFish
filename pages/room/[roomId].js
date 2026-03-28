import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSocket } from '../../lib/useSocket';

/* ── helpers ─────────────────────────────────────── */
function PlayerPill({ p, isCurrent, isSelectable, onSelect }) {
  let cls = 'pp';
  if (isSelectable) cls += ' selectable';
  else if (isCurrent) cls += ' current';
  else cls += p.status === 'alive' ? ' alive' : ' dead';

  return (
    <div className={cls} onClick={isSelectable ? onSelect : undefined}>
      <span style={{ fontSize: 22 }}>{p.status === 'alive' ? '😊' : '🐟'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="orb" style={{
          fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isCurrent ? 'var(--cyan)' : 'var(--txt)',
          textShadow: isCurrent ? '0 0 8px rgba(0,245,255,.6)' : 'none',
        }}>{p.name}</div>
        <div style={{ fontSize: 11, color: 'var(--txt2)', marginTop: 2 }}>
          ✅{p.survived} ☠️{p.deaths} 💖{p.saves}
        </div>
      </div>
      <span style={{
        fontSize: 10, fontFamily: "'Orbitron',sans-serif", fontWeight: 700,
        padding: '2px 7px', borderRadius: 4,
        border: `1px solid ${p.status === 'alive' ? 'var(--green)' : 'var(--pink)'}`,
        color: p.status === 'alive' ? 'var(--green)' : 'var(--pink)',
        opacity: p.status === 'alive' ? 1 : .7,
      }}>{p.status === 'alive' ? 'ALIVE' : 'FISH'}</span>
    </div>
  );
}

/* ── LOBBY ───────────────────────────────────────── */
function Lobby({ gs, roomId, myName, onJoin, onStart, onKick }) {
  const [name, setName] = useState('');
  const players = (gs?.players || []);
  const full = players.length >= 8;

  return (
    <div className="fu" style={{ maxWidth: 560, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div className="float" style={{ fontSize: 60, marginBottom: 8 }}>🐟</div>
        <h1 className="orb g-gold flicker" style={{ fontSize: 'clamp(26px,6vw,44px)', fontWeight: 900 }}>
          GOLDEN FISH
        </h1>
        <div className="orb" style={{ fontSize: 12, letterSpacing: '.18em', marginTop: 6 }}>
          <span className="g-cyan">서버 {roomId}</span>
          <span style={{ color: 'var(--txt2)', marginLeft: 10 }}>— QUIZ SURVIVAL</span>
        </div>
      </div>

      {/* join */}
      {!myName ? (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div className="orb" style={{ fontSize: 11, color: 'var(--txt2)', letterSpacing: '.1em', marginBottom: 10 }}>ENTER YOUR NAME</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="inp" placeholder="이름 입력..." value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onJoin(name.trim())}
              maxLength={10} />
            <button className="btn btn-cyan" onClick={() => name.trim() && onJoin(name.trim())}>참가</button>
          </div>
          {full && <p style={{ color: 'var(--pink)', fontSize: 12, marginTop: 8 }}>⚠ 방이 가득 찼습니다 (8/8)</p>}
        </div>
      ) : (
        <div style={{ padding: '10px 14px', marginBottom: '1rem', borderRadius: 8, border: '1px solid rgba(57,255,20,.3)', background: 'rgba(57,255,20,.05)', fontSize: 14 }}>
          <span className="g-green orb" style={{ fontSize: 12 }}>✓ 참가 완료 —</span>
          <span style={{ marginLeft: 8 }}>{myName}</span>
        </div>
      )}

      {/* player list */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span className="orb" style={{ fontSize: 11, color: 'var(--txt2)', letterSpacing: '.1em' }}>
            PLAYERS ({players.length}/8)
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {players.map((_, i) => (
              <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px rgba(57,255,20,.7)' }} />
            ))}
          </div>
        </div>
        {players.length === 0
          ? <p style={{ color: 'var(--txt2)', fontSize: 13, textAlign: 'center', padding: '1rem 0' }}>아직 없음</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {players.map(p => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(57,255,20,.05)', border: '1px solid rgba(57,255,20,.18)',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <span style={{ fontSize: 17 }}>🎮</span>
                  <span className="orb" style={{ fontSize: 12, fontWeight: 700, flex: 1 }}>{p.name}</span>
                  {myName === p.name && (
                    <button onClick={() => onKick(p.name)}
                      style={{ background: 'none', border: 'none', color: 'var(--pink)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>

      {players.length >= 2
        ? <div style={{ textAlign: 'center' }}>
            <button className="btn btn-gold btn-lg" onClick={onStart}>▶ GAME START</button>
          </div>
        : <p style={{ textAlign: 'center', color: 'var(--txt2)', fontSize: 13 }}>2명 이상이어야 시작 가능</p>
      }
    </div>
  );
}

/* ── GAME (question + revive) ────────────────────── */
function Game({ gs, myName, onAnswer, onRevive }) {
  const [ans, setAns] = useState('');
  const [sent, setSent] = useState(false);
  const [timerPct, setTimerPct] = useState(100);
  const [flashKey, setFlashKey] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const prevTurn = useRef(null);

  const isMyTurn = gs?.currentPlayer?.name === myName;
  const isReviver = gs?.phase === 'revive' && gs?.currentPlayer?.name === myName;
  const dead = (gs?.players || []).filter(p => p.status === 'dead');

  // reset on new turn
  useEffect(() => {
    if (gs?.turnCount !== prevTurn.current) {
      prevTurn.current = gs?.turnCount;
      setAns('');
      setSent(false);
      setFlashKey(k => k + 1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [gs?.turnCount]);

  // timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (gs?.phase !== 'question' || !gs?.timerStart) { setTimerPct(100); return; }
    const tl = gs.timeLimit * 1000;
    const tick = () => {
      const pct = Math.max(0, 100 - (Date.now() - gs.timerStart) / tl * 100);
      setTimerPct(pct);
    };
    tick();
    timerRef.current = setInterval(tick, 80);
    return () => clearInterval(timerRef.current);
  }, [gs?.timerStart, gs?.timeLimit, gs?.phase]);

  const submit = () => {
    if (sent || !ans.trim() || !isMyTurn) return;
    setSent(true);
    onAnswer(ans.trim());
  };

  const tc = timerPct > 50 ? 'var(--cyan)' : timerPct > 25 ? 'var(--gold)' : 'var(--pink)';
  const secsLeft = gs?.timerStart
    ? Math.max(0, Math.ceil((gs.timerStart + gs.timeLimit * 1000 - Date.now()) / 1000))
    : gs?.timeLimit;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '1rem' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="orb g-gold" style={{ fontSize: 17, fontWeight: 900 }}>🐟 GOLDEN FISH</span>
        <div style={{ textAlign: 'right' }}>
          <div className="orb" style={{ fontSize: 10, color: 'var(--txt2)', letterSpacing: '.1em' }}>TURN</div>
          <div className="orb g-cyan" style={{ fontSize: 20, fontWeight: 700 }}>
            {gs?.turnCount}<span style={{ fontSize: 12, color: 'var(--txt2)' }}> / {gs?.maxTurns}</span>
          </div>
        </div>
      </div>

      {/* players */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(155px,1fr))', gap: 7, marginBottom: '1rem' }}>
        {(gs?.players || []).map(p => (
          <PlayerPill key={p.name} p={p}
            isCurrent={gs?.phase === 'question' && gs?.currentPlayer?.name === p.name}
            isSelectable={isReviver && p.status === 'dead'}
            onSelect={() => onRevive(p.name)} />
        ))}
      </div>

      {/* question box */}
      {gs?.phase === 'question' && gs?.currentQuestion && (
        <div key={flashKey} className="zi card-cyan" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div className="orb" style={{ fontSize: 11, color: 'var(--cyan)', letterSpacing: '.14em', marginBottom: 8 }}>
            🎯 {gs.currentPlayer?.name}의 차례
          </div>
          <div style={{ fontSize: 'clamp(20px,4vw,30px)', fontWeight: 700, margin: '1rem 0', lineHeight: 1.3 }}>
            {gs.currentQuestion.question}
          </div>
          {/* timer */}
          <div className="t-track" style={{ marginBottom: 5 }}>
            <div className="t-fill" style={{ width: `${timerPct}%`, background: tc, boxShadow: `0 0 10px ${tc}` }} />
          </div>
          <div className="orb" style={{ fontSize: 13, color: tc, textShadow: `0 0 8px ${tc}`, marginBottom: 12 }}>
            {secsLeft}s
          </div>

          {isMyTurn && !sent && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input ref={inputRef} className="inp" placeholder="답 입력 후 Enter..." value={ans}
                onChange={e => setAns(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
              <button className="btn btn-green" onClick={submit}>제출</button>
            </div>
          )}
          {isMyTurn && sent && (
            <p className="orb" style={{ fontSize: 13, color: 'var(--gold)' }}>⏳ 결과 대기 중...</p>
          )}
          {!isMyTurn && (
            <p style={{ fontSize: 14, color: 'var(--txt2)' }}>{gs.currentPlayer?.name}이(가) 답 입력 중...</p>
          )}
        </div>
      )}

      {/* revive box */}
      {gs?.phase === 'revive' && (
        <div className="zi card-cyan" style={{ padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div className="orb g-cyan" style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>💖 REVIVE TIME</div>
          <p style={{ fontSize: 14, color: 'var(--txt2)', marginBottom: '1rem' }}>
            {isReviver
              ? '죽은 플레이어를 클릭해서 부활시키세요!'
              : `${gs.currentPlayer?.name}이(가) 선택 중...`}
          </p>
          {isReviver && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
              {dead.map(p => (
                <div key={p.name} className="pp selectable" onClick={() => onRevive(p.name)}>
                  <span style={{ fontSize: 22 }}>🐟</span>
                  <div>
                    <div className="orb g-gold" style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--txt2)' }}>☠️ {p.deaths}회</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* log */}
      <div className="card" style={{ padding: '1rem', maxHeight: 130, overflowY: 'auto' }}>
        <div className="orb" style={{ fontSize: 9, color: 'var(--txt2)', letterSpacing: '.12em', marginBottom: 6 }}>GAME LOG</div>
        {[...(gs?.log || [])].reverse().map((l, i) => (
          <div key={i} className={`log-line ${l.type}`}>{l.msg}</div>
        ))}
      </div>
    </div>
  );
}

/* ── RESULT ──────────────────────────────────────── */
function Result({ gs, onReset }) {
  const players = gs?.players || [];
  const sorted = [...players].sort((a, b) => b.survived - a.survived);
  const byDeath = [...players].sort((a, b) => b.deaths - a.deaths);
  const bySave = [...players].sort((a, b) => b.saves - a.saves);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="fu" style={{ maxWidth: 620, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: 58, marginBottom: 8 }}>🏆</div>
        <h1 className="orb g-gold" style={{ fontSize: 'clamp(26px,6vw,42px)', fontWeight: 900 }}>GAME OVER</h1>
        <p style={{ color: 'var(--txt2)', fontSize: 14, marginTop: 6 }}>{gs?.endReason}</p>
      </div>

      {/* top 3 stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1.5rem' }}>
        {[
          { label: '🥇 최다 생존', p: sorted[0], val: `${sorted[0]?.survived}회`, c: 'var(--gold)' },
          { label: '☠️ 최다 사망', p: byDeath[0], val: `${byDeath[0]?.deaths}회`, c: 'var(--pink)' },
          { label: '💖 최다 부활', p: bySave[0], val: `${bySave[0]?.saves}명`, c: 'var(--cyan)' },
        ].map(({ label, p, val, c }) => (
          <div key={label} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--txt2)', marginBottom: 6 }}>{label}</div>
            <div className="orb" style={{ fontSize: 14, fontWeight: 700, color: c }}>{p?.name || '—'}</div>
            <div style={{ fontSize: 12, color: 'var(--txt2)', marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* full ranking */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="orb" style={{ fontSize: 11, color: 'var(--txt2)', letterSpacing: '.1em', marginBottom: '1rem' }}>FINAL RANKING</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((p, i) => (
            <div key={p.name} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: i === 0 ? 'rgba(255,215,0,.06)' : 'var(--card)',
              border: `1px solid ${i === 0 ? 'rgba(255,215,0,.3)' : 'var(--border)'}`,
              borderRadius: 8, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 20, minWidth: 28 }}>{medals[i] || `#${i + 1}`}</span>
              <span className="orb" style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.name}</span>
              <div style={{ display: 'flex', gap: 14, fontSize: 13, fontWeight: 600 }}>
                <span><span style={{ color: 'var(--green)' }}>✅</span> {p.survived}</span>
                <span><span style={{ color: 'var(--pink)' }}>☠️</span> {p.deaths}</span>
                <span><span style={{ color: 'var(--cyan)' }}>💖</span> {p.saves}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <button className="btn btn-gold btn-lg" onClick={onReset}>↩ PLAY AGAIN</button>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ───────────────────────────────────── */
export default function RoomPage() {
  const router = useRouter();
  const { roomId } = router.query;
  const { socket, ready } = useSocket();
  const [gs, setGs] = useState(null);
  const [myName, setMyName] = useState('');

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.on('state', setGs);
    socket.on('error', msg => alert(msg));

    const saved = sessionStorage.getItem(`gf_name_${roomId}`);
    if (saved) {
      setMyName(saved);
      socket.emit('join', { roomId, name: saved });
    }

    return () => { socket.off('state', setGs); socket.off('error'); };
  }, [socket, roomId]);

  const join = useCallback((name) => {
    if (!socket || !roomId) return;
    setMyName(name);
    sessionStorage.setItem(`gf_name_${roomId}`, name);
    socket.emit('join', { roomId, name });
  }, [socket, roomId]);

  const start = useCallback(() => socket?.emit('start', { roomId }), [socket, roomId]);
  const kick = useCallback((name) => {
    socket?.emit('kick', { roomId, name });
    if (name === myName) { setMyName(''); sessionStorage.removeItem(`gf_name_${roomId}`); }
  }, [socket, roomId, myName]);
  const answer = useCallback((a) => socket?.emit('answer', { roomId, name: myName, answer: a }), [socket, roomId, myName]);
  const revive = useCallback((t) => socket?.emit('revive', { roomId, reviverName: myName, targetName: t }), [socket, roomId, myName]);
  const reset = useCallback(() => socket?.emit('reset', { roomId }), [socket, roomId]);

  const phase = gs?.phase || 'lobby';

  return (
    <>
      <Head>
        <title>🐟 서버 {roomId} — Golden Fish</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
      </Head>
      <main style={{ minHeight: '100vh' }}>
        {phase === 'lobby' && (
          <Lobby gs={gs} roomId={roomId} myName={myName}
            onJoin={join} onStart={start} onKick={kick} />
        )}
        {(phase === 'question' || phase === 'revive') && (
          <Game gs={gs} myName={myName} onAnswer={answer} onRevive={revive} />
        )}
        {phase === 'result' && (
          <Result gs={gs} onReset={reset} />
        )}

        {/* connection dot */}
        <div style={{
          position: 'fixed', bottom: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,.65)', border: '1px solid var(--border)',
          borderRadius: 20, padding: '4px 10px', fontSize: 10,
          fontFamily: "'Orbitron',sans-serif", color: 'var(--txt2)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: ready ? 'var(--green)' : 'var(--pink)',
            boxShadow: ready ? '0 0 6px rgba(57,255,20,.8)' : 'none',
          }} />
          {ready ? 'ONLINE' : 'CONNECTING...'}
        </div>
      </main>
    </>
  );
}
