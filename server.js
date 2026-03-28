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
  { question: "1 + 1 = ?", answer: "2" },
  { question: "대한민국의 수도는?", answer: "서울" },
  { question: "2 × 8 = ?", answer: "16" },
  { question: "태양계에서 가장 큰 행성은?", answer: "목성" },
  { question: "3의 제곱은?", answer: "9" },
  { question: "물의 화학식은? (소문자)", answer: "h2o" },
  { question: "100 ÷ 4 = ?", answer: "25" },
  { question: "한국의 국화는?", answer: "무궁화" },
  { question: "5 + 7 = ?", answer: "12" },
  { question: "세계에서 가장 높은 산은?", answer: "에베레스트" },
  { question: "15 - 8 = ?", answer: "7" },
  { question: "지구에서 가장 큰 대양은?", answer: "태평양" },
  { question: "3 × 6 = ?", answer: "18" },
  { question: "무지개 색깔 수는? (숫자만)", answer: "7" },
  { question: "4 × 4 = ?", answer: "16" },
  { question: "한글을 만든 왕은?", answer: "세종대왕" },
  { question: "지구에서 가장 가까운 별은?", answer: "태양" },
  { question: "1시간은 몇 분? (숫자만)", answer: "60" },
  { question: "삼각형 내각의 합은? (숫자만)", answer: "180" },
  { question: "대한민국 광복절은 몇 월 며칠? (숫자/숫자)", answer: "8/15" },
  { question: "피타고라스의 나라는?", answer: "그리스" },
  { question: "1주일은 며칠? (숫자만)", answer: "7" },
  { question: "지구에서 가장 큰 대륙은?", answer: "아시아" },
  { question: "6 × 7 = ?", answer: "42" },
  { question: "사람의 심장은 몇 개?", answer: "1" },
  { question: "한국에서 가장 높은 산은?", answer: "한라산" },
  { question: "빛의 속도 (km/s, 근사값)?", answer: "300000" },
  { question: "2 + 2 + 2 + 2 = ?", answer: "8" },
  { question: "고려를 세운 왕은?", answer: "왕건" },
  { question: "사과를 영어로?", answer: "apple" },
  { question: "물이 끓는 온도 (°C)?", answer: "100" },
  { question: "9 × 9 = ?", answer: "81" },
  { question: "한반도 남쪽 나라는?", answer: "대한민국" },
  { question: "O₂ 의 이름은?", answer: "산소" },
  { question: "7 × 8 = ?", answer: "56" },
  { question: "지구의 위성 이름은?", answer: "달" },
  { question: "1년은 며칠? (숫자만)", answer: "365" },
  { question: "CO₂ 의 이름은?", answer: "이산화탄소" },
  { question: "12 ÷ 3 = ?", answer: "4" },
  { question: "세계에서 가장 긴 강은?", answer: "나일강" },
  { question: "조선의 첫 번째 왕은?", answer: "이성계" },
  { question: "5 × 5 = ?", answer: "25" },
  { question: "한국의 화폐 단위는?", answer: "원" },
  { question: "100 - 37 = ?", answer: "63" },
  { question: "지구의 대기에서 가장 많은 기체는?", answer: "질소" },
  { question: "8 × 9 = ?", answer: "72" },
  { question: "세계에서 가장 작은 나라는?", answer: "바티칸" },
  { question: "2의 10제곱은?", answer: "1024" },
  { question: "인체에서 가장 큰 뼈는?", answer: "대퇴골" },
  { question: "17 + 26 = ?", answer: "43" },
  { question: "한국 최초 우주인은?", answer: "이소연" },
  { question: "태극기의 색깔 수는? (숫자만)", answer: "4" },
  { question: "사람의 정상 체온 (°C)?", answer: "36.5" },
  { question: "6 ÷ 2 × (1 + 2) = ?", answer: "9" },
  { question: "DNA의 이중 나선을 발견한 사람 중 한 명은?", answer: "왓슨" },
  { question: "서울 올림픽 개최 연도는?", answer: "1988" },
  { question: "3 + 4 × 2 = ?", answer: "11" },
  { question: "세계에서 가장 큰 사막은?", answer: "사하라" },
  { question: "원소 기호 Fe 는?", answer: "철" },
  { question: "13 × 3 = ?", answer: "39" },
  { question: "태양계 행성 수는? (숫자만)", answer: "8" },
  { question: "한국의 가장 큰 섬은?", answer: "제주도" },
  { question: "50 + 50 = ?", answer: "100" },
  { question: "세계에서 인구가 가장 많은 나라는?", answer: "인도" },
  { question: "원소 기호 Au 는?", answer: "금" },
  { question: "1000 ÷ 8 = ?", answer: "125" },
  { question: "하늘이 파란 이유에 관련된 현상은?", answer: "산란" },
  { question: "조선의 마지막 왕은?", answer: "순종" },
  { question: "11 × 11 = ?", answer: "121" },
  { question: "빛이 프리즘을 통과하면 나타나는 현상은?", answer: "분산" },
  { question: "지구에서 두 번째로 큰 대륙은?", answer: "아프리카" },
  { question: "4 × 4 × 4 = ?", answer: "64" },
  { question: "유관순 열사가 만세를 외친 운동은?", answer: "3·1운동" },
  { question: "빛의 삼원색 중 하나가 아닌 것은? (빨강/노랑/파랑)", answer: "노랑" },
  { question: "99 + 99 = ?", answer: "198" },
  { question: "세계에서 가장 높은 폭포는?", answer: "앙헬폭포" },
  { question: "H₂O의 원소 수는? (숫자만)", answer: "3" },
  { question: "15 × 4 = ?", answer: "60" },
  { question: "지구의 자전 주기는? (하루/1년 중)", answer: "하루" },
  { question: "원소 기호 Na 는?", answer: "나트륨" },
  { question: "200 ÷ 5 = ?", answer: "40" },
  { question: "한국 최초의 금속활자 인쇄본은?", answer: "직지심체요절" },
  { question: "소금의 화학식은?", answer: "nacl" },
  { question: "72 ÷ 8 = ?", answer: "9" },
  { question: "세계 최초로 달에 착륙한 사람은?", answer: "암스트롱" },
  { question: "원소 기호 O 는?", answer: "산소" },
  { question: "25 × 4 = ?", answer: "100" },
  { question: "훈민정음 창제 연도는?", answer: "1443" },
  { question: "빛의 색 중 파장이 가장 긴 것은?", answer: "빨강" },
  { question: "144 ÷ 12 = ?", answer: "12" },
  { question: "세계에서 가장 깊은 호수는?", answer: "바이칼호" },
  { question: "원소 기호 C 는?", answer: "탄소" },
  { question: "1024 ÷ 4 = ?", answer: "256" },
  { question: "광합성에서 흡수하는 기체는?", answer: "이산화탄소" },
  { question: "대한민국 헌법 1조 1항: 대한민국은 ( )이다.", answer: "민주공화국" },
  { question: "2 × 2 × 2 × 2 × 2 = ?", answer: "32" },
  { question: "세포의 유전 정보를 담는 물질은?", answer: "dna" },
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
      phase: "lobby",       // lobby | countdown | question | revive | result
      players: [],
      usedQuestionIds: new Set(),
      currentPlayer: null,
      currentQuestion: null,
      turnCount: 0,
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
    maxTurns: MAX_PLAYERS,  // = player count turns (max 8 per round, 2 rounds = 16)
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
  if (room.turnCount >= MAX_TURNS) { endGame(io, roomId, `${MAX_TURNS}턴 종료!`); return; }

  room.turnCount++;
  room.phase = "question";
  room.currentPlayer = rand(alive);
  room.currentQuestion = pickQuestion(room);
  room.timerStart = Date.now();

  broadcast(io, roomId);

  room.timer = setTimeout(() => {
    processAnswer(io, roomId, null);
  }, TIME_LIMIT * 1000 + 300);
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
      if (!room || room.phase !== "lobby") return;
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
