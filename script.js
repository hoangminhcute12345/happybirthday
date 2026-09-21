"use strict";

// ===============================
// EASY CONFIGURATION
// ===============================
const CONFIG = {
  recipientName: "Bạn thân",
  birthdayMessage: `Chúc mừng sinh nhật! 🎉\nChúc bạn có một ngày thật vui, nhiều niềm vui và thật nhiều điều tuyệt vời trong tuổi mới! 💖`,
  youtubeUrl: "https://www.youtube.com/watch?v=2INYgH-Gcjk",
  codes: [
    "Q2jDumMg",
    "beG7q25n",
    "IHNpbmgg",
    "bmjhuq10",
    "IEjDoCDEk",
    "MSDbmc",
    "gSHV5",
  ],
  finalCode: "Q2jDumMgbeG7q25nIHNpbmggbmjhuq10IEjDoCDEkMSDbmcgSHV5",
  shortAnswer: {
    names: ["long bi", "trần hoàng long", "hoàng long"],
    numeric: /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/,
  },
};

const CHALLENGES = [
  {
    title: "Tích phân cho trẻ mầm non",
    icon: "🔐",
    desc: "Trùng sinh về thời cấp 3.",
    tag: "",
  },
  {
    title: "Oẳn tù tì",
    icon: "✊",
    desc: "Solo với LongAI, thua thì do bạn 🐣.",
    tag: "",
  },
  {
    title: "Trả lời câu hỏi",
    icon: "📝",
    desc: "Test kiến thức cấp 3.",
    tag: "",
  },
  {
    title: "Đoán vị trí bóng",
    icon: "🥤",
    desc: "Trò chơi cho cựu thiếu nhi.",
    tag: "",
  },
  {
    title: "Khảo sát",
    icon: "📝",
    desc: "Xin chút ý kiến riêng.",
    tag: "",
  },
  {
    title: "Máy chọn ngẫu nhiên",
    icon: "🎰",
    desc: "Ký ức về chiếc máy bỗng trở lại.",
    tag: "",
  },
  {
    title: "Final",
    icon: "✨",
    desc: "Mảnh ghép cuối.",
    tag: "",
  },
];

const STORAGE_KEY = "birthday-quest-v2-rps";
const state = loadState();
let modalReturnFocus = null;
let currentChallengeView = null;
let cupGame = { round: 0, ballPos: 0, busy: false, started: false };
let rpsGame = { busy: false, rounds: 0, wins: 0 };
let rouletteSpins = 0;

const $ = (sel, root = document) => root.querySelector(sel);

function defaultState() {
  return { currentChallenge: 1, completed: [], collectedCodes: [] };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultState();
    const completed = Array.isArray(saved.completed)
      ? [
          ...new Set(
            saved.completed.map(Number).filter((n) => n >= 1 && n <= 7),
          ),
        ].sort((a, b) => a - b)
      : [];
    const collectedCodes = Array.isArray(saved.collectedCodes)
      ? [...new Set(saved.collectedCodes)]
      : [];

    // Always derive the minimum unlocked challenge from completed progress.
    // This also repairs older/corrupted localStorage where challenge 1 is
    // completed but currentChallenge was still saved as 1.
    const savedCurrent = Math.min(
      7,
      Math.max(1, Number(saved.currentChallenge) || 1),
    );
    const highestCompleted = completed.length ? Math.max(...completed) : 0;
    const currentChallenge = Math.min(
      7,
      Math.max(savedCurrent, highestCompleted + 1),
    );

    return { currentChallenge, completed, collectedCodes };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeText(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function updateProgress() {
  const count = state.completed.length;
  const percent = Math.round((count / 7) * 100);
  $("#progressText").textContent = `${count} / 7 thử thách`;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  $("#finalCodeInput").value = state.collectedCodes.join("");
  $("#codeStatus").textContent =
    count === 7
      ? "Đã đủ mật mã. Nhấn XÁC NHẬN để mở trang bí mật."
      : `Đã thu thập ${count} / 7 mảnh mã.`;
}

function renderChallengeGrid() {
  const grid = $("#challengeGrid");
  grid.innerHTML = "";
  CHALLENGES.forEach((challenge, index) => {
    const num = index + 1;
    const completed = state.completed.includes(num);
    const unlocked = num <= state.currentChallenge || completed;
    const card = document.createElement("article");
    card.className = `challenge-card ${completed ? "completed" : unlocked ? "unlocked active" : "locked"}`;
    card.dataset.challenge = String(num);
    const stateText = completed
      ? "✓ COMPLETED"
      : unlocked
        ? "🔓 OPEN"
        : "🔒 LOCKED";
    card.innerHTML = `
      <span class="challenge-number">CHALLENGE ${num}</span>
      <div class="challenge-state">${stateText}</div>
      <div class="challenge-icon">${completed ? "✅" : unlocked ? challenge.icon : "🔒"}</div>
      <h3 class="challenge-title">${challenge.title}</h3>
      <p class="challenge-desc">${unlocked ? challenge.desc : `Hoàn thành thử thách ${num - 1} để mở khóa.`}</p>
      ${completed ? `<div class="challenge-state" style="right:auto;left:20px;top:auto;bottom:14px;color:var(--success)">${challenge.tag}</div>` : ""}
    `;
    if (unlocked && !completed)
      card.addEventListener("click", () => openChallenge(num));
    grid.appendChild(card);
  });
}

function isUnlocked(num) {
  return num <= state.currentChallenge || state.completed.includes(num);
}

function addCode(num) {
  if (state.completed.includes(num)) return false;
  state.completed.push(num);
  state.completed.sort((a, b) => a - b);
  const code = CONFIG.codes[num - 1];
  if (!state.collectedCodes.includes(code)) state.collectedCodes.push(code);
  state.currentChallenge = Math.min(7, num + 1);
  saveState();
  updateProgress();
  renderChallengeGrid();
  return true;
}

function completeChallenge(num) {
  if (state.completed.includes(num)) return;
  // Replace the active challenge view with the updated challenge grid.
  // Reset this guard so the next unlocked challenge can be opened.
  currentChallengeView = null;
  addCode(num);
  const nextText =
    num < 7
      ? `Thử thách ${num + 1} đã được mở khóa!`
      : "Bạn đã có mảnh mã cuối cùng.";
  showModal(
    "🎉",
    "CHÍNH XÁC!",
    `Mã đã nhận: ${CONFIG.codes[num - 1]}\n\n${nextText}`,
    [
      {
        label: num < 7 ? "TIẾP TỤC" : "ĐÓNG",
        className: "primary-btn",
        onClick: closeModal,
      },
    ],
  );
}

function openChallenge(num) {
  if (!isUnlocked(num) || state.completed.includes(num)) return;
  if (currentChallengeView) return;
  currentChallengeView = num;
  const grid = $("#challengeGrid");
  const original = grid.innerHTML;
  grid.innerHTML = "";

  const host = document.createElement("section");
  host.className = "challenge-screen";
  host.id = "challengeScreen";
  host.dataset.original = original;
  grid.appendChild(host);
  renderChallengeView(num, host);
  host.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeChallenge() {
  currentChallengeView = null;
  cupGame = { round: 0, ballPos: 0, busy: false, started: false };
  rpsGame = { busy: false, rounds: 0, wins: 0 };
  rouletteSpins = 0;
  renderChallengeGrid();
  updateProgress();
}

function renderChallengeView(num, host) {
  const c = CHALLENGES[num - 1];
  host.innerHTML = `
    <div class="challenge-hero">
      <div>
        <div class="challenge-number">CHALLENGE ${num} · ${c.tag}</div>
        <h2>${c.icon} ${c.title}</h2>
        <p>${c.desc}</p>
      </div>
      <button class="challenge-close" type="button" aria-label="Đóng">×</button>
    </div>
    <div id="challengeBody" class="challenge-box"></div>
  `;
  $(".challenge-close", host).addEventListener("click", closeChallenge);
  const body = $("#challengeBody", host);
  switch (num) {
    case 1:
      return initMathPuzzle(body);
    case 2:
      return initRockPaperScissors(body);
    case 3:
      return initShortAnswer(body);
    case 4:
      return initCupGame(body);
    case 5:
      return initSurvey(body);
    case 6:
      return initNameRoulette(body);
    case 7:
      return initFinalAnimation(body);
  }
}

function initMathPuzzle(root) {
  root.innerHTML = `
    <div class="math-card">
      <div class="eyebrow">TÍCH PHÂN CHO TRẺ MẦM NON</div>
      <div class="equation">
        <img src="./tichphan.png">
      </div>
      <input id="mathAnswer" class="answer-input" inputmode="decimal" autocomplete="off" placeholder="Nhập đáp án">
      <div style="height:12px"></div>
      <button id="mathCheck" class="primary-btn">KIỂM TRA</button>
      <div class="help-text">Không cần viết lời giải. Chỉ cần kết quả cuối.</div>
    </div>
  `;
  const input = $("#mathAnswer", root);
  $("#mathCheck", root).addEventListener("click", () => {
    const value = input.value.trim();
    if (!value) return flashInput(input, "Nhập đáp án đã!");
    const answer = Number(value);
    if (Number.isFinite(answer) && Math.abs(answer - 2) < 1e-10) {
      completeChallenge(1);
    } else {
      flashInput(input, "Sai rồi, thử lại đi!");
    }
  });
}

function initRockPaperScissors(root) {
  const choices = [
    { key: "rock", label: "BÚA", emoji: "✊" },
    { key: "paper", label: "BAO", emoji: "✋" },
    { key: "scissors", label: "KÉO", emoji: "✌️" },
  ];
  const beats = {
    rock: "scissors",
    paper: "rock",
    scissors: "paper",
  };

  root.innerHTML = `
    <div class="rps-game">
      <div class="rps-scoreboard">
        <div class="rps-score-card">
          <span>BẠN</span>
          <strong id="rpsPlayerWins">0</strong>
        </div>
        <div class="rps-vs">VS</div>
        <div class="rps-score-card">
          <span>MÁY</span>
          <strong id="rpsCpuWins">0</strong>
        </div>
      </div>

      <div class="rps-arena">
        <div class="rps-side">
          <div id="rpsPlayerPick" class="rps-pick">❔</div>
          <span>BẠN</span>
        </div>
        <div class="rps-result" id="rpsResult" aria-live="polite">Chọn một chiêu!</div>
        <div class="rps-side">
          <div id="rpsCpuPick" class="rps-pick">❔</div>
          <span>MÁY</span>
        </div>
      </div>

      <div class="rps-choices" role="group" aria-label="Lựa chọn">
        ${choices
          .map(
            (choice) => `
          <button class="rps-choice" data-choice="${choice.key}" type="button">
            <span class="rps-choice-emoji">${choice.emoji}</span>
            <span>${choice.label}</span>
          </button>
        `,
          )
          .join("")}
      </div>

      <div id="rpsStatus" class="rps-status">Bạn phải thắng ít nhất 1 ván để vượt qua thử thách.</div>
    </div>
  `;

  const playerPick = $("#rpsPlayerPick", root);
  const cpuPick = $("#rpsCpuPick", root);
  const result = $("#rpsResult", root);
  const status = $("#rpsStatus", root);
  const playerWins = $("#rpsPlayerWins", root);
  const cpuWins = $("#rpsCpuWins", root);
  const buttons = [...root.querySelectorAll(".rps-choice")];
  const byKey = Object.fromEntries(choices.map((c) => [c.key, c]));

  const randomChoice = () => {
    const index = Math.floor(Math.random() * choices.length);
    return choices[index].key;
  };

  const resultText = (player, cpu) => {
    if (player === cpu) return ["🤝 HÒA!", "Cũng thường thôi 😏", "draw"];
    if (beats[player] === cpu) return ["🎉 THẮNG!", "I was lost 😥", "win"];
    return ["😈 THUA!", "Non choẹt 😂", "lose"];
  };

  async function play(playerChoice) {
    if (rpsGame.busy || state.completed.includes(2)) return;
    rpsGame.busy = true;
    buttons.forEach((button) => {
      button.disabled = true;
      button.classList.remove("chosen");
    });
    const selectedButton = buttons.find(
      (button) => button.dataset.choice === playerChoice,
    );
    selectedButton?.classList.add("chosen");

    const cpuChoice = randomChoice();
    const playerInfo = byKey[playerChoice];
    const cpuInfo = byKey[cpuChoice];

    playerPick.textContent = playerInfo.emoji;
    cpuPick.textContent = "❔";
    result.textContent = "Đang đấu...";
    result.className = "rps-result thinking";
    status.textContent = "✊ ✋ ✌️";
    await wait(520);

    cpuPick.textContent = cpuInfo.emoji;
    rpsGame.rounds += 1;
    const [headline, detail, type] = resultText(playerChoice, cpuChoice);
    result.textContent = headline;
    result.className = `rps-result ${type}`;

    if (type === "win") {
      rpsGame.wins += 1;
      playerWins.textContent = String(rpsGame.wins);
      status.textContent = `${detail} Bạn đã vượt qua thử thách!`;
      buttons.forEach((button) => {
        button.disabled = true;
      });
      await wait(450);
      completeChallenge(2);
      return;
    }

    if (type === "lose") {
      const previous = Number(cpuWins.textContent) || 0;
      cpuWins.textContent = String(previous + 1);
    }

    status.textContent = detail;
    await wait(180);
    rpsGame.busy = false;
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => play(button.dataset.choice));
  });
}

function initShortAnswer(root) {
  root.innerHTML = `
    <div class="questions">
      <div class="question-item">
        <label for="q1">1. Nhân vật nổi (tai) tiếng nhất lơp A2K57 là ai?</label>
        <input id="q1" type="text" autocomplete="off" placeholder="Nhập câu trả lời">
      </div>
      <div class="question-item">
        <label for="q2">2. Điểm thi toán cuối kỳ 2 lớp 12 của Hoàng Minh là bao nhiêu?</label>
        <input id="q2" type="text" inputmode="decimal" autocomplete="off" placeholder="Nhập một số bất kỳ">
      </div>
      <div style="text-align:center"><button id="shortCheck" class="primary-btn">KIỂM TRA</button></div>
    </div>
  `;
  $("#shortCheck", root).addEventListener("click", () => {
    const q1 = normalizeText($("#q1", root).value);
    const q2 = $("#q2", root).value.replace(/\s+/g, "");
    const accepted = CONFIG.shortAnswer.names.map(normalizeText);
    const ok1 = accepted.includes(q1);
    const ok2 = CONFIG.shortAnswer.numeric.test(q2);
    if (ok1 && ok2) completeChallenge(3);
    else {
      $("#q1", root).classList.toggle("shake", !ok1);
      $("#q2", root).classList.toggle("shake", !ok2);
      setTimeout(() => {
        $("#q1", root).classList.remove("shake");
        $("#q2", root).classList.remove("shake");
      }, 400);
      showModal("😈", "CHƯA ĐÚNG", "1 trong 2 câu trả lời chưa đúng!");
    }
  });
}
//----------------------------------------------------------
function initCupGame(root) {
  root.innerHTML = `
    <div class="cup-game">

      <span id="cupRound" class="round-badge">
        Vòng 1 / 3
      </span>

      <p id="cupMessage" style="margin:0;color:var(--muted)">
        Quan sát vị trí quả bóng.
      </p>

      <div
        class="cup-arena"
        id="cupArena"
        aria-label="Khu vực 3 cốc"
      >
        <div class="ball" id="cupBall"></div>

        <div class="cup" data-cup="0" aria-hidden="true"></div>
        <div class="cup" data-cup="1" aria-hidden="true"></div>
        <div class="cup" data-cup="2" aria-hidden="true"></div>
      </div>

      <div class="cup-labels">
        <button class="cup-select" data-cup="0" type="button">
          CỐC 1
        </button>

        <button class="cup-select" data-cup="1" type="button">
          CỐC 2
        </button>

        <button class="cup-select" data-cup="2" type="button">
          CỐC 3
        </button>
      </div>

      <div>
        <button
          id="cupStart"
          class="primary-btn"
          type="button"
        >
          BẮT ĐẦU VÒNG
        </button>
      </div>

    </div>
  `;

  // =========================================================
  // ELEMENTS
  // =========================================================

  const cups = [...root.querySelectorAll(".cup")];
  const buttons = [...root.querySelectorAll(".cup-select")];

  const ball = $("#cupBall", root);
  const start = $("#cupStart", root);
  const msg = $("#cupMessage", root);
  const roundBadge = $("#cupRound", root);

  // 3 vị trí ngang
  const positions = [16.67, 50, 83.33];

  // =========================================================
  // GAME STATE
  // =========================================================

  // slot -> cup ID
  //
  // Ví dụ:
  // [2, 0, 1]
  //
  // nghĩa là:
  // slot 0 = cốc 3
  // slot 1 = cốc 1
  // slot 2 = cốc 2
  //
  let cupAtSlot = [0, 1, 2];

  // ID của cốc đang chứa bóng
  let ballCup = 0;

  // Vị trí hiện tại của bóng
  let ballSlot = 0;

  // =========================================================
  // ĐẶT VỊ TRÍ 3 CỐC
  // =========================================================

  function setCupPositions(order = [0, 1, 2]) {
    cupAtSlot = [...order];

    order.forEach((cupId, slot) => {
      cups[cupId].style.left = `${positions[slot]}%`;
    });

    // Tìm xem cốc chứa bóng hiện đang ở slot nào
    ballSlot = cupAtSlot.indexOf(ballCup);
  }

  // =========================================================
  // RESET VISUAL
  // =========================================================

  function resetCupVisual() {
    // Đưa cốc về đúng thứ tự
    setCupPositions([0, 1, 2]);

    // Xóa animation trạng thái
    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });

    // Cốc 1 chứa bóng
    ballCup = 0;

    // Cốc 1 ở slot đầu tiên
    ballSlot = 0;

    // Bóng nằm dưới cốc 1
    ball.style.left = `${positions[0]}%`;

    ball.style.opacity = "1";

    roundBadge.textContent = `Vòng ${cupGame.round + 1} / 3`;
  }

  // =========================================================
  // RESET TOÀN BỘ GAME
  // =========================================================

  function resetCupGame() {
    cupGame.round = 0;
    cupGame.started = false;
    cupGame.busy = false;

    start.disabled = false;
    start.textContent = "BẮT ĐẦU VÒNG";

    buttons.forEach((b) => {
      b.disabled = true;
    });

    msg.textContent = "Quan sát vị trí quả bóng.";

    roundBadge.textContent = "Vòng 1 / 3";

    // Reset toàn bộ vị trí
    setCupPositions([0, 1, 2]);

    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });

    // Cốc 1 chứa bóng
    ballCup = 0;
    ballSlot = 0;

    // Bóng dưới cốc 1
    ball.style.left = `${positions[0]}%`;

    ball.style.opacity = "1";
  }

  // =========================================================
  // BẮT ĐẦU VÒNG
  // =========================================================

  async function startRound() {
    if (cupGame.busy || cupGame.round >= 3) {
      return;
    }

    cupGame.busy = true;
    cupGame.started = true;

    roundBadge.textContent = `Vòng ${cupGame.round + 1} / 3`;

    msg.textContent = "Quan sát vị trí quả bóng...";

    buttons.forEach((b) => {
      b.disabled = true;
    });

    // =======================================================
    // 1. RESET VỀ TRẠNG THÁI BAN ĐẦU
    // =======================================================

    setCupPositions([0, 1, 2]);

    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });

    // Luôn bắt đầu với CỐC 1
    ballCup = 0;
    ballSlot = 0;

    // Bóng dưới CỐC 1
    ball.style.left = `${positions[0]}%`;

    ball.style.opacity = "1";

    // Cho người chơi nhìn bóng
    await wait(900);

    // =======================================================
    // 2. 3 CỐC HẠ XUỐNG
    // =======================================================

    cups.forEach((c) => {
      c.classList.add("shuffling");
    });

    await wait(400);

    // =======================================================
    // 3. ẨN BÓNG
    // =======================================================

    ball.style.opacity = "0";

    await wait(200);

    // =======================================================
    // 4. XÁO CỐC
    // =======================================================

    for (let i = 0; i < 5; i++) {
      const order = shuffle(cupAtSlot);

      setCupPositions(order);

      await wait(260 + i * 35);
    }

    // =======================================================
    // 5. XÁO XONG
    // =======================================================

    msg.textContent = "Chọn một cốc!";

    buttons.forEach((b) => {
      b.disabled = false;
    });

    cupGame.busy = false;

    start.disabled = true;
  }

  // =========================================================
  // CHỌN CỐC
  // =========================================================

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (cupGame.busy || !cupGame.started || cupGame.round >= 3) {
        return;
      }

      cupGame.busy = true;

      buttons.forEach((b) => {
        b.disabled = true;
      });

      // =====================================================
      // SLOT NGƯỜI CHƠI CHỌN
      // =====================================================

      const guessSlot = Number(btn.dataset.cup);

      // ID thật của cốc ở slot đó
      const guessedCupId = cupAtSlot[guessSlot];

      // Kiểm tra đúng / sai
      const correct = guessSlot === ballSlot;

      // =====================================================
      // CHỈ CỐC ĐƯỢC CHỌN ĐI LÊN
      // =====================================================

      cups.forEach((c) => {
        c.classList.remove("reveal");
      });

      cups[guessedCupId].classList.add("reveal");

      await wait(400);

      // =====================================================
      // HIỆN BÓNG
      // =====================================================

      ball.style.left = `${positions[ballSlot]}%`;

      ball.style.opacity = "1";

      await wait(600);

      // =====================================================
      // NẾU SAI
      // =====================================================

      if (!correct) {
        msg.textContent = "😈 Sai rồi! Bạn phải chơi lại từ đầu.";

        await wait(800);

        resetCupGame();

        return;
      }

      // =====================================================
      // NẾU ĐÚNG
      // =====================================================

      cupGame.round += 1;

      // =====================================================
      // HOÀN THÀNH 3 VÒNG
      // =====================================================

      if (cupGame.round >= 3) {
        msg.textContent = "🎉 Chính xác! Bạn đã hoàn thành!";

        cupGame.started = false;
        cupGame.busy = false;

        buttons.forEach((b) => {
          b.disabled = true;
        });

        completeChallenge(4);

        return;
      }

      // =====================================================
      // CHUẨN BỊ VÒNG TIẾP THEO
      // =====================================================

      msg.textContent = "✓ Chính xác! Chuẩn bị vòng tiếp theo...";

      await wait(700);

      cupGame.started = false;
      cupGame.busy = false;

      start.disabled = false;

      start.textContent = "BẮT ĐẦU VÒNG TIẾP";

      // Reset visual:
      //
      // Cốc lại ở phía trên
      // Bóng lại dưới Cốc 1
      // Không xáo ngay
      //
      resetCupVisual();
    });
  });

  // =========================================================
  // NÚT BẮT ĐẦU
  // =========================================================

  start.addEventListener("click", startRound);

  // =========================================================
  // TRẠNG THÁI BAN ĐẦU
  // =========================================================

  setCupPositions([0, 1, 2]);

  ballCup = 0;
  ballSlot = 0;

  ball.style.left = `${positions[0]}%`;

  ball.style.opacity = "1";

  // Chưa bắt đầu thì không cho chọn cốc
  buttons.forEach((b) => {
    b.disabled = true;
  });
}
//----------------------------------------------
function initSurvey(root) {
  const options = [
    ["A", "Vui vãi chưởng", "Yeah!"],
    ["B", "Bình thường", "Ok"],
    ["C", "Như l..", "Oe Oe Oe"],
    ["D", "Meh", ":("],
  ];
  root.innerHTML = `
    <div class="survey">
      <div class="survey-question">Đến đây rồi, bạn có thấy trò chơi này vui không?</div>
      <div class="survey-grid"></div>
    </div>
  `;
  const grid = $(".survey-grid", root);
  options.forEach(([letter, label, reply]) => {
    const btn = document.createElement("button");
    btn.className = "survey-option";
    btn.textContent = `${letter}. ${label}`;
    btn.addEventListener("click", () => {
      showModal("😂", reply, "Cảm ơn vì đã trả lời khảo sát.", [
        {
          label: "QUA MÀN",
          className: "primary-btn",
          onClick: () => {
            closeModal();
            completeChallenge(5);
          },
        },
      ]);
    });
    grid.appendChild(btn);
  });
}

function initNameRoulette(root) {
  rouletteSpins = 0;
  const families = [
    "Nguyễn",
    "Trần",
    "Lê",
    "Phạm",
    "Hoàng",
    "Vũ",
    "Đỗ",
    "Đặng",
    "Bùi",
  ];
  const middles = ["Văn", "Thị", "Hoàng", "Minh", "Anh", "Đức"];
  const names = ["Minh", "Long", "Nam", "Anh", "Huy", "Tuấn"];
  root.innerHTML = `
    <div class="roulette">
      <p style="margin:0;color:var(--muted)">Hãy quay ra chữ <strong style="color:var(--text)">“Trần Hoàng Long”</strong> để vượt qua thử thách!</p>
      <div class="slot-machine">
        <div class="slot"><div><b id="slotFamily">???</b><small>Họ</small></div></div>
        <div class="slot"><div><b id="slotMiddle">???</b><small>Tên đệm</small></div></div>
        <div class="slot"><div><b id="slotName">???</b><small>Tên</small></div></div>
      </div>
      <button id="spinBtn" class="primary-btn">🎰 QUAY</button>
      <div class="cheat-wrap"><button id="cheatBtn" class="danger-btn hidden">🔥 CHEAT</button></div>
     <p id="rouletteStatus" style="margin:0;color:var(--muted);font-size:.8rem">If you know, you know.</p>
    </div>
  `;
  const familyEl = $("#slotFamily", root);
  const middleEl = $("#slotMiddle", root);
  const nameEl = $("#slotName", root);
  const spinBtn = $("#spinBtn", root);
  const cheatBtn = $("#cheatBtn", root);
  const status = $("#rouletteStatus", root);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  async function spin() {
    if (spinBtn.disabled || state.completed.includes(6)) return;
    rouletteSpins++;
    spinBtn.disabled = true;
    let result;
    do {
      result = [pick(families), pick(middles), pick(names)];
    } while (rouletteSpins <= 3 && result.join("|") === "Trần|Hoàng|Long");
    const animateSlot = (el, list, finalValue, delay) =>
      new Promise((resolve) => {
        let ticks = 0;
        const timer = setInterval(() => {
          el.textContent = pick(list);
          ticks++;
          if (ticks >= 14 + delay) {
            clearInterval(timer);
            el.textContent = finalValue;
            resolve();
          }
        }, 60);
      });
    await Promise.all([
      animateSlot(familyEl, families, result[0], 0),
      animateSlot(middleEl, middles, result[1], 2),
      animateSlot(nameEl, names, result[2], 4),
    ]);
    const exact = result.join("|") === "Trần|Hoàng|Long";
    if (exact) {
      status.textContent = "🎯 Không thể tin được... bạn tự quay trúng rồi!";
      completeChallenge(6);
      return;
    }
    status.textContent = `Lần quay ${rouletteSpins}: chưa trúng`;
    if (rouletteSpins >= 3) {
      cheatBtn.classList.remove("hidden");
      cheatBtn.classList.add("success-pop");
    }
    spinBtn.disabled = false;
  }

  spinBtn.addEventListener("click", spin);
  cheatBtn.addEventListener("click", () => {
    familyEl.textContent = "Trần";
    middleEl.textContent = "Hoàng";
    nameEl.textContent = "Long";
    status.textContent = "Qua màn :))";
    cheatBtn.disabled = true;
    spinBtn.disabled = true;
    setTimeout(() => completeChallenge(6), 450);
  });
}

function initFinalAnimation(root) {
  root.innerHTML = `
    <div class="final-stage" id="finalStage">
      <div class="challenge-orbit" aria-hidden="true">
        ${[1, 2, 3, 4, 5, 6, 7].map((n, i) => `<div class="orbit-item" style="--delay:${i * 0.08}s">${n}</div>`).join("")}
      </div>
      <div id="finalCode" class="final-code">${CONFIG.codes[6]}</div>
    </div>
  `;
  const stage = $("#finalStage", root);
  const code = $("#finalCode", root);
  requestAnimationFrame(() => stage.classList.add("playing"));
  setTimeout(() => code.classList.add("show"), 1150);
  setTimeout(() => completeChallenge(7), 2350);
}

function validateFinalCode() {
  const entered = $("#finalCodeInput").value.trim();
  if (entered === CONFIG.finalCode && state.completed.length === 7) {
    window.location.href = "birthday.html";
  } else {
    showModal(
      "😈",
      "MẬT MÃ CHƯA ĐÚNG",
      "Hoàn thành tất cả thử thách để lấy mã.",
    );
  }
}

function showModal(icon, title, message, actions = []) {
  modalReturnFocus = document.activeElement;
  $("#modalIcon").textContent = icon;
  $("#modalTitle").textContent = title;
  $("#modalMessage").textContent = message;
  const actionsEl = $("#modalActions");
  actionsEl.innerHTML = "";
  actions.forEach((action) => {
    const btn = document.createElement("button");
    btn.className = action.className || "secondary-btn";
    btn.textContent = action.label;
    btn.addEventListener("click", action.onClick);
    actionsEl.appendChild(btn);
  });
  if (!actions.length) {
    const btn = document.createElement("button");
    btn.className = "secondary-btn";
    btn.textContent = "ĐÓNG";
    btn.addEventListener("click", closeModal);
    actionsEl.appendChild(btn);
  }
  const backdrop = $("#modalBackdrop");
  backdrop.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => $("#modalClose")?.focus());
}

function closeModal() {
  const backdrop = $("#modalBackdrop");
  backdrop.hidden = true;
  document.body.classList.remove("modal-open");
  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") {
    try {
      modalReturnFocus.focus();
    } catch {}
  }
  modalReturnFocus = null;
}
function flashInput(input, message) {
  input.classList.remove("shake");
  void input.offsetWidth;
  input.classList.add("shake");
  input.focus();
  showModal("😈", "THỬ LẠI", message);
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    let r;
    try {
      r = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    } catch {
      r = Math.random();
    }
    const j = Math.floor(r * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initParticles() {
  const wrap = $("#particles");
  const count = matchMedia("(max-width: 640px)").matches ? 10 : 18;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.className = "particle";
    dot.style.left = `${Math.random() * 100}%`;
    dot.style.top = `${Math.random() * 100}%`;
    dot.style.setProperty("--dur", `${2.2 + Math.random() * 3.8}s`);
    dot.style.animationDelay = `${Math.random() * 2}s`;
    wrap.appendChild(dot);
  }
}

$("#verifyCodeBtn").addEventListener("click", validateFinalCode);
$("#finalCodeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") validateFinalCode();
});
$("#modalClose").addEventListener("click", closeModal);
$("#modalBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "modalBackdrop") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("#modalBackdrop").hidden) closeModal();
});
$("#resetBtn").addEventListener("click", () => {
  showModal("🗑️", "RESET GAME?", "Bạn có chắc muốn chơi lại từ đầu?", [
    { label: "HỦY", className: "secondary-btn", onClick: closeModal },
    {
      label: "RESET",
      className: "danger-btn",
      onClick: () => {
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(state, defaultState());
        closeModal();
        currentChallengeView = null;
        renderChallengeGrid();
        updateProgress();
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
  ]);
});

renderChallengeGrid();
updateProgress();
initParticles();
