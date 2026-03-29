const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

/* ═══════════════════════════════════════════════════
   GAME CONSTANTS
═══════════════════════════════════════════════════ */
const MAX_PLAYERS = 8;
const MAX_TURNS = 16;
const TIME_LIMIT = 6; // seconds per question

/* ═══════════════════════════════════════════════════
   DEFAULT 100 QUESTIONS
═══════════════════════════════════════════════════ */
const DEFAULT_QUESTIONS = [
  //진주에 관한것
  { question: "진주의 마스코트는?", answer: "하모"},
  { question:"임진왜란때 진주대첩이 일어난 성은?", answer : "진주성"},
  { question: "진주가 속한 도는 어디일까요?", answer: "경상남도"},
  { question: "진주 유등축제는 주로 어느 계절에 열릴까?", answer: "가을"},
  { question: "진주성은 ㅁㅁ을 끼고 지어졌다. 이때 ㅁㅁ는? (힌트 : ㅁ강)", answer: "남강"},
  { question: "진주는 시 일까 군 일까?", answer: "시"},
  { question: "논개가 몸을 던진 장소로 알려진 바위의 이름은?", answer: "의암"},
  { question: "진주성 안에서 남강을 바라볼 수 있는 유명한 누각은?", answer: "촉석루"},
  { question: "임진왜란때 진주에서 일어난 큰 전투는?", answer: "진주대첩"}
  { question: "진주성을 만든 나라는?", answer: "고려"}
];

/* ═══════════════════════════════════════════════════
   IN-MEMORY ROOMS
═══════════════════════════════════════════════════ */
// rooms["1"] and rooms["2"]
const rooms = {};

function getRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = {
      id: roomId,
      phase: "lobby",
      players: [],
      usedQuestionIds: new Set(),
      currentPlayer: null,
      lastPlayerName: null,   // 직전 턴 플레이어 (다음 턴 제외)
      currentQuestion: null,
      turnCount: 0,
      maxTurns: 0,            // 게임 시작 시 players.length * 2 로 설정
      log: [],
      timer: null,
      timerStart: null,
    };
  }
  return rooms[roomId];
}

function pickQuestion(room) {
  const available = DEFAULT_QUESTIONS.filter((_, i) => !room.usedQuestionIds.has(i));
  if (available.length === 0) {
    room.usedQuestionIds.clear();
    return DEFAULT_QUESTIONS[Math.floor(Math.random() * DEFAULT_QUESTIONS.length)];
  }
  const idx = DEFAULT_QUESTIONS.indexOf(available[Math.floor(Math.random() * available.length)]);
  room.usedQuestionIds.add(idx);
  return DEFAULT_QUESTIONS[idx];
}

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function addLog(room, msg, type) {
  room.log.push({ msg, type, ts: Date.now() });
  if (room.log.length > 50) room.log.shift();
}

function stateFor(room) {
  return {
    phase: room.phase,
    players: room.players,
    currentPlayer: room.currentPlayer,
    currentQuestion: room.phase === "question" && room.currentQuestion
      ? { question: room.currentQuestion.question }
      : null,
    turnCount: room.turnCount,
    maxTurns: room.maxTurns,
    log: room.log.slice(-20),
    timerStart: room.timerStart,
    timeLimit: TIME_LIMIT,
    roomId: room.id,
  };
}

function broadcast(io, roomId) {
  io.to(`room:${roomId}`).emit("state", stateFor(rooms[roomId]));
}

/* ═══════════════════════════════════════════════════
   GAME FLOW
═══════════════════════════════════════════════════ */
function startNextTurn(io, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);

  const alive = room.players.filter(p => p.status === "alive");

  if (alive.length === 0) { endGame(io, roomId, "전원 탈락!"); return; }
  if (room.turnCount >= room.maxTurns) { endGame(io, roomId, `${room.maxTurns}턴 종료!`); return; }

  // 직전 플레이어 제외 (2명 이상일 때만)
  let candidates = alive.filter(p => p.name !== room.lastPlayerName);
  if (candidates.length === 0) candidates = alive; // 1명만 살아있으면 예외

  room.turnCount++;
  room.phase = "question";
  room.currentPlayer = rand(candidates);
  room.lastPlayerName = room.currentPlayer.name;
  room.currentQuestion = pickQuestion(room);
  room.timerStart = Date.now();

  broadcast(io, roomId);

  room.timer = setTimeout(() => {
    processAnswer(io, roomId, null);
  }, TIME_LIMIT * 1000 + 3000);
}

function processAnswer(io, roomId, answer) {
  const room = rooms[roomId];
  if (!room || room.phase !== "question") return;
  clearTimeout(room.timer);

  const correct =
    answer !== null &&
    answer.trim().toLowerCase() === room.currentQuestion.answer.toLowerCase();

  if (correct) {
    room.currentPlayer.survived++;
    addLog(room, `✅ ${room.currentPlayer.name} 정답!`, "correct");
    const dead = room.players.filter(p => p.status === "dead");
    if (dead.length > 0) {
      room.phase = "revive";
      broadcast(io, roomId);
    } else {
      broadcast(io, roomId);
      setTimeout(() => startNextTurn(io, roomId), 1200);
    }
  } else {
    const isTimeout = answer === null;
    addLog(room, isTimeout
      ? `⏰ ${room.currentPlayer.name} 시간 초과!`
      : `❌ ${room.currentPlayer.name} 오답! (정답: ${room.currentQuestion.answer})`,
      "wrong");
    room.currentPlayer.status = "dead";
    room.currentPlayer.deaths++;
    broadcast(io, roomId);
    setTimeout(() => startNextTurn(io, roomId), 1800);
  }
}

function processRevive(io, roomId, reviverName, targetName) {
  const room = rooms[roomId];
  if (!room || room.phase !== "revive") return;
  if (room.currentPlayer?.name !== reviverName) return;

  const target = room.players.find(p => p.name === targetName && p.status === "dead");
  if (!target) return;

  target.status = "alive";
  room.currentPlayer.saves++;
  addLog(room, `💖 ${reviverName} → ${targetName} 부활!`, "revive");
  broadcast(io, roomId);
  setTimeout(() => startNextTurn(io, roomId), 1000);
}

function endGame(io, roomId, reason) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.phase = "result";
  room.endReason = reason;
  broadcast(io, roomId);
}

function resetRoom(io, roomId) {
  const room = rooms[roomId];
  if (!room) return;
  clearTimeout(room.timer);
  room.phase = "lobby";
  room.players.forEach(p => {
    p.status = "alive"; p.survived = 0; p.deaths = 0; p.saves = 0;
  });
  room.usedQuestionIds = new Set();
  room.turnCount = 0;
  room.maxTurns = 0;
  room.lastPlayerName = null;
  room.log = [];
  room.currentPlayer = null;
  room.currentQuestion = null;
  room.timerStart = null;
  broadcast(io, roomId);
}

/* ═══════════════════════════════════════════════════
   SOCKET WIRING
═══════════════════════════════════════════════════ */
function initSocket(io) {
  io.on("connection", socket => {
    let myRoom = null;
    let myName = null;

    socket.on("join", ({ roomId, name }) => {
      if (!["1", "2"].includes(String(roomId))) return;
      myRoom = String(roomId);
      myName = name;

      const room = getRoom(myRoom);
      socket.join(`room:${myRoom}`);

      if (room.phase === "lobby") {
        const exists = room.players.find(p => p.name === name);
        if (!exists) {
          if (room.players.length >= MAX_PLAYERS) {
            socket.emit("error", "방이 가득 찼습니다 (최대 8명)");
            return;
          }
          room.players.push({ name, status: "alive", survived: 0, deaths: 0, saves: 0 });
        }
      }
      broadcast(io, myRoom);
    });

    socket.on("start", ({ roomId }) => {
      const room = rooms[String(roomId)];
      if (!room || room.phase !== "lobby") return;
      if (room.players.length < 2) { socket.emit("error", "2명 이상 필요합니다"); return; }
      room.players.forEach(p => { p.status = "alive"; p.survived = 0; p.deaths = 0; p.saves = 0; });
      room.usedQuestionIds = new Set();
      room.turnCount = 0;
      room.maxTurns = room.players.length * 2;
      room.lastPlayerName = null;
      room.log = [];
      startNextTurn(io, String(roomId));
    });

    socket.on("answer", ({ roomId, name, answer }) => {
      const room = rooms[String(roomId)];
      if (!room || room.phase !== "question") return;
      if (room.currentPlayer?.name !== name) return;
      processAnswer(io, String(roomId), answer);
    });

    socket.on("revive", ({ roomId, reviverName, targetName }) => {
      processRevive(io, String(roomId), reviverName, targetName);
    });

    socket.on("reset", ({ roomId }) => {
      resetRoom(io, String(roomId));
    });

    socket.on("kick", ({ roomId, name }) => {
      const room = rooms[String(roomId)];
      if (!room) return;
      room.players = room.players.filter(p => p.name !== name);
      broadcast(io, String(roomId));
    });

    socket.on("disconnect", () => {});
  });
}

/* ═══════════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════════ */
app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  });

  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  initSocket(io);

  // Pre-create both rooms
  getRoom("1");
  getRoom("2");

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🐟 Golden Fish running → http://localhost:${PORT}`);
    console.log(`   Room 1: http://localhost:${PORT}/room/1`);
    console.log(`   Room 2: http://localhost:${PORT}/room/2`);
  });
});
