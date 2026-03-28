# 🐟 Golden Fish Game

실시간 멀티플레이 퀴즈 생존 게임 — 학교 축제용

---

## 📁 폴더 구조

```
golden-fish/
├── server.js                  ← Socket.IO + Next.js 서버
├── next.config.js
├── package.json
├── pages/
│   ├── _app.js
│   ├── index.js               ← 서버 선택 화면
│   └── room/
│       └── [roomId].js        ← 게임 화면 (서버1, 서버2 공용)
├── lib/
│   └── useSocket.js
└── styles/
    └── globals.css
```

---

## 🚀 배포 (Render — 무료)

> ⚠️ **Vercel 절대 안 됨!** WebSocket은 Render/Railway만 가능

### 1. GitHub 올리기
```bash
git init
git add .
git commit -m "Golden Fish Game"
git remote add origin https://github.com/YOUR/golden-fish.git
git push -u origin main
```

### 2. Render 설정
- render.com → New → **Web Service**
- GitHub 저장소 연결
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Node Version:** 18

배포 완료되면 URL 예시: `https://golden-fish-xxxx.onrender.com`

---

## 🎮 사용법

| URL | 용도 |
|-----|------|
| `/` | 서버1/서버2 선택 화면 |
| `/room/1` | 서버 1 (최대 8명) |
| `/room/2` | 서버 2 (최대 8명) |

### Zep 설정
- 문 1 → 팝업 URL: `https://your-app.onrender.com/room/1`
- 문 2 → 팝업 URL: `https://your-app.onrender.com/room/2`

### 게임 진행
1. 학생이 Zep 문 클릭 → 팝업으로 게임 접속
2. 이름 입력 → 참가 버튼
3. 8명 모이면 아무나 **GAME START** 클릭
4. 자동 진행: 랜덤 선택 → 문제 → 6초 타이머
5. 정답 → 죽은 사람 부활 선택
6. 오답/시간초과 → 탈락 (🐟)
7. 16턴 후 랭킹 화면

---

## ⚡ 로컬 테스트

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## 🎲 규칙 요약

- 서버당 최대 **8명**, 두 서버 **동시 병렬** 진행
- 문제 100개 내장, 한 게임 내 **중복 없음**
- 문제당 **6초** 제한
- **16턴** 후 종료
- 최대 약 **1분 36초** 소요
