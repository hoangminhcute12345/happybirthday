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
};

const CHALLENGES = [
  {
    title: "Tích phân cho trẻ mầm non",
    icon: "🔐",
    desc: "Trùng sinh về thời cấp 3.",
    tag: "",
  },
  {
    title: "Ghép hình",
    icon: "🖼️",
    desc: "Bức ảnh chứa những kỉ niệm :))",
    tag: "",
  },
  {
    title: "Lật mảnh ghép",
    icon: "🎴",
    desc: "Tìm đủ 10 cặp icon sinh nhật.",
    tag: "",
  },
  {
    title: "Đoán vị trí bóng",
    icon: "🥤",
    desc: "Trò chơi cho cựu thiếu nhi.",
    tag: "",
  },
  {
    title: "Trả lời câu hỏi",
    icon: "📝",
    desc: "Test kiến thức cấp 3.",
    tag: "",
  },
  {
    title: "Máy chọn ngẫu nhiên",
    icon: "🎰",
    desc: "Ký ức về chiếc máy bỗng trở lại.",
    tag: "",
  },
  {
    title: "Khảo sát",
    icon: "📝",
    desc: "Xin chút ý kiến riêng.",
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
  currentChallengeView = null;
  addCode(num);
  const nextText =
    num < 7
      ? `Thử thách ${num + 1} đã được mở khóa!`
      : "Bạn đã có mảnh mã cuối cùng.";
  showModal(
    "🎉",
    "Hoàn thành",
    `Mã nhận được: ${CONFIG.codes[num - 1]}\n\n${nextText}`,
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
      return initJigsawPuzzle(body);
    case 3:
      return initMemoryGame(body);
    case 4:
      return initCupGame(body);
    case 5:
      return initEssayQuiz(body);
    case 6:
      return initNameRoulette(body);
    case 7:
      return initSurvey(body);
  }
}

/* =========================================================
   CHALLENGE 1 — TÍCH PHÂN
   ========================================================= */
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

/* =========================================================
   CHALLENGE 2 — GHÉP HÌNH (3 vòng: picture / puzzle2 / puzzle3)
   ========================================================= */
function initJigsawPuzzle(root) {
  const COLS = 4;
  const ROWS = 3;
  const TOTAL = COLS * ROWS;
  const IMAGES = ["./picture.png", "./puzzle_special.png", "./puzzle3.png"];
  let roundIdx = 0;

  function startRound() {
    const image = IMAGES[roundIdx];

    root.innerHTML = `
      <div class="jigsaw-wrapper">
        <div class="jigsaw-round-badge">Vòng ${roundIdx + 1} / ${IMAGES.length}</div>
        <p class="jigsaw-hint">Kéo các mảnh vào đúng vị trí để ghép hoàn chỉnh bức ảnh.</p>
        <div class="jigsaw-layout">
          <div class="jigsaw-tray" id="jigsawTray" aria-label="Khu chứa mảnh ghép"></div>
          <div class="jigsaw-board" id="jigsawBoard" aria-label="Bảng ghép hình" style="--jcols:${COLS};--jrows:${ROWS}"></div>
        </div>
        <div class="jigsaw-status" id="jigsawStatus">0 / ${TOTAL} mảnh đã đúng vị trí</div>
      </div>
    `;

    const tray = $("#jigsawTray", root);
    const board = $("#jigsawBoard", root);
    const statusEl = $("#jigsawStatus", root);

    const correctOrder = Array.from({ length: TOTAL }, (_, i) => i);
    const shuffled = shuffle([...correctOrder]);

    const placed = new Array(TOTAL).fill(null);
    let placedCount = 0;
    let draggedPiece = null;

    shuffled.forEach((pieceIdx) => {
      tray.appendChild(createPiece(pieceIdx));
    });

    for (let s = 0; s < TOTAL; s++) {
      const slot = document.createElement("div");
      slot.className = "jigsaw-slot";
      slot.dataset.slot = String(s);
      slot.setAttribute("aria-label", `Ô ${s + 1}`);
      setupSlotDrop(slot, s);
      board.appendChild(slot);
    }

    function createPiece(pieceIdx) {
      const col = pieceIdx % COLS;
      const row = Math.floor(pieceIdx / COLS);
      const piece = document.createElement("div");
      piece.className = "jigsaw-piece";
      piece.dataset.piece = String(pieceIdx);
      piece.setAttribute("draggable", "true");
      piece.setAttribute("aria-label", `Mảnh ${pieceIdx + 1}`);
      piece.style.backgroundImage = `url('${image}')`;
      piece.style.backgroundSize = `${COLS * 100}% ${ROWS * 100}%`;
      piece.style.backgroundPosition = `${(col / (COLS - 1)) * 100}% ${(row / (ROWS - 1)) * 100}%`;
      setupPieceDrag(piece, pieceIdx);
      return piece;
    }

    function setupPieceDrag(piece, pieceIdx) {
      piece.addEventListener("dragstart", (e) => {
        draggedPiece = pieceIdx;
        piece.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(pieceIdx));
      });
      piece.addEventListener("dragend", () => {
        draggedPiece = null;
        piece.classList.remove("dragging");
      });

      let touchOffsetX = 0;
      let touchOffsetY = 0;
      let ghost = null;

      piece.addEventListener(
        "touchstart",
        (e) => {
          if (piece.classList.contains("locked")) return;
          draggedPiece = pieceIdx;
          const t = e.touches[0];
          const rect = piece.getBoundingClientRect();
          touchOffsetX = t.clientX - rect.left;
          touchOffsetY = t.clientY - rect.top;
          ghost = createPiece(pieceIdx);
          ghost.classList.add("jigsaw-ghost");
          ghost.style.width = rect.width + "px";
          ghost.style.height = rect.height + "px";
          ghost.style.left = t.clientX - touchOffsetX + "px";
          ghost.style.top = t.clientY - touchOffsetY + "px";
          document.body.appendChild(ghost);
          e.preventDefault();
        },
        { passive: false },
      );

      piece.addEventListener(
        "touchmove",
        (e) => {
          if (!ghost) return;
          const t = e.touches[0];
          ghost.style.left = t.clientX - touchOffsetX + "px";
          ghost.style.top = t.clientY - touchOffsetY + "px";
          e.preventDefault();
        },
        { passive: false },
      );

      piece.addEventListener("touchend", (e) => {
        if (!ghost) return;
        ghost.remove();
        ghost = null;
        const t = e.changedTouches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const slotEl = el?.closest(".jigsaw-slot");
        if (slotEl) {
          const slotIdx = Number(slotEl.dataset.slot);
          tryPlace(draggedPiece, slotIdx);
        }
        draggedPiece = null;
      });
    }

    function setupSlotDrop(slot, slotIdx) {
      slot.addEventListener("dragover", (e) => {
        if (slot.classList.contains("slot-locked")) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        slot.classList.add("drag-over");
      });
      slot.addEventListener("dragleave", () =>
        slot.classList.remove("drag-over"),
      );
      slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over");
        if (slot.classList.contains("slot-locked")) return;
        const pIdx = Number(e.dataTransfer.getData("text/plain"));
        tryPlace(pIdx, slotIdx);
      });
    }

    function tryPlace(pieceIdx, slotIdx) {
      if (placed[slotIdx] !== null) return;
      const pieceInTray = tray.querySelector(`[data-piece="${pieceIdx}"]`);
      if (!pieceInTray) return;

      if (pieceIdx === slotIdx) {
        pieceInTray.remove();
        const fixedPiece = createPiece(pieceIdx);
        fixedPiece.classList.add("locked");
        fixedPiece.setAttribute("draggable", "false");
        const slot = board.querySelector(`[data-slot="${slotIdx}"]`);
        slot.classList.add("slot-locked");
        slot.appendChild(fixedPiece);
        placed[slotIdx] = pieceIdx;
        placedCount++;
        updateStatus();

        if (placedCount === TOTAL) {
          setTimeout(() => {
            if (roundIdx < IMAGES.length - 1) {
              roundIdx++;
              statusEl.textContent =
                "🎉 Hoàn thành vòng! Chuẩn bị vòng tiếp theo...";
              setTimeout(startRound, 1200);
            } else {
              completeChallenge(2);
            }
          }, 500);
        }
      } else {
        const slot = board.querySelector(`[data-slot="${slotIdx}"]`);
        slot.classList.add("slot-wrong");
        pieceInTray.classList.add("shake");
        setTimeout(() => {
          slot.classList.remove("slot-wrong");
          pieceInTray.classList.remove("shake");
        }, 400);
      }
    }

    function updateStatus() {
      statusEl.textContent = `${placedCount} / ${TOTAL} mảnh đã đúng vị trí`;
    }
  }

  startRound();
}

/* =========================================================
   CHALLENGE 3 — LẬT MẢNH GHÉP (MEMORY MATCH)
   ========================================================= */
function initMemoryGame(root) {
  const DRAGON = "🐉";
  const EIGHT_BALL = "🎱";

  const ICONS = [
    "🎂",
    "🎁",
    "🎈",
    "🎉",
    "🍰",
    "🧁",
    "🍭",
    "🎵",
    DRAGON,
    EIGHT_BALL,
  ];
  const TOTAL_PAIRS = ICONS.length;

  const deck = shuffle(ICONS.flatMap((icon) => [{ icon }, { icon }]));

  // Giữ đúng 1 lá rồng nằm cạnh đúng 1 lá bi số 8
  const dragonIdx = deck.findIndex((c) => c.icon === DRAGON);
  const ballIdx = deck.findIndex((c) => c.icon === EIGHT_BALL);
  if (Math.abs(dragonIdx - ballIdx) !== 1) {
    const target =
      dragonIdx === deck.length - 1 ? dragonIdx - 1 : dragonIdx + 1;
    [deck[target], deck[ballIdx]] = [deck[ballIdx], deck[target]];
  }

  root.innerHTML = `
    <div class="memory-game">
      <div class="memory-head">
        <span id="memoryStatus">Đã ghép 0 / ${TOTAL_PAIRS} cặp</span>
        <button id="memoryRestart" class="ghost-btn" type="button">↺ Chơi lại</button>
      </div>
      <div class="memory-board" id="memoryBoard" aria-label="Bảng lật mảnh ghép"></div>
      <p class="memory-hint">
        Mỗi lượt lật 2 mảnh. Hai mảnh cùng icon sẽ được giữ nguyên, khác icon sẽ úp lại.
      </p>
    </div>
  `;

  const board = $("#memoryBoard", root);
  const statusEl = $("#memoryStatus", root);

  let firstCard = null;
  let lock = false;
  let matchedPairs = 0;

  deck.forEach((card, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "memory-card";
    btn.dataset.icon = card.icon;
    btn.setAttribute("aria-label", `Mảnh ghép ${index + 1}`);
    btn.innerHTML = `
      <span class="memory-card-inner">
        <span class="memory-card-face memory-card-back">?</span>
        <span class="memory-card-face memory-card-front">${card.icon}</span>
      </span>
    `;
    btn.addEventListener("click", () => flipCard(btn));
    board.appendChild(btn);
  });

  function flipCard(card) {
    if (lock) return;
    if (
      card.classList.contains("flipped") ||
      card.classList.contains("matched")
    )
      return;

    card.classList.add("flipped");

    if (!firstCard) {
      firstCard = card;
      return;
    }

    const first = firstCard;
    firstCard = null;

    if (first.dataset.icon === card.dataset.icon) {
      first.classList.add("matched");
      card.classList.add("matched");
      first.disabled = true;
      card.disabled = true;

      matchedPairs++;
      statusEl.textContent = `Đã ghép ${matchedPairs} / ${TOTAL_PAIRS} cặp`;

      if (matchedPairs === TOTAL_PAIRS) {
        lock = true;
        setTimeout(() => completeChallenge(3), 600);
      }
      return;
    }

    lock = true;
    first.classList.add("wrong");
    card.classList.add("wrong");

    setTimeout(() => {
      first.classList.remove("flipped", "wrong");
      card.classList.remove("flipped", "wrong");
      lock = false;
    }, 750);
  }

  $("#memoryRestart", root).addEventListener("click", () => {
    initMemoryGame(root);
  });
}

/* =========================================================
   CHALLENGE 4 — ĐOÁN VỊ TRÍ BÓNG
   ========================================================= */
function initCupGame(root) {
  root.innerHTML = `
    <div class="cup-game">

      <span id="cupRound" class="round-badge">
        Vòng 1 / 3
      </span>

      <p id="cupMessage" style="margin:0;color:var(--muted)">
        Quan sát vị trí quả bóng.
      </p>

      <div class="cup-arena" id="cupArena" aria-label="Khu vực 3 cốc">
        <div class="ball" id="cupBall"></div>
        <div class="cup" data-cup="0" aria-hidden="true"></div>
        <div class="cup" data-cup="1" aria-hidden="true"></div>
        <div class="cup" data-cup="2" aria-hidden="true"></div>
      </div>

      <div class="cup-labels">
        <button class="cup-select" data-cup="0" type="button">CỐC 1</button>
        <button class="cup-select" data-cup="1" type="button">CỐC 2</button>
        <button class="cup-select" data-cup="2" type="button">CỐC 3</button>
      </div>

      <div>
        <button id="cupStart" class="primary-btn" type="button">BẮT ĐẦU VÒNG</button>
      </div>

    </div>
  `;

  const cups = [...root.querySelectorAll(".cup")];
  const buttons = [...root.querySelectorAll(".cup-select")];

  const ball = $("#cupBall", root);
  const start = $("#cupStart", root);
  const msg = $("#cupMessage", root);
  const roundBadge = $("#cupRound", root);

  const positions = [16.67, 50, 83.33];

  let cupAtSlot = [0, 1, 2];
  let ballCup = 0;
  let ballSlot = 0;

  function setCupPositions(order = [0, 1, 2]) {
    cupAtSlot = [...order];
    order.forEach((cupId, slot) => {
      cups[cupId].style.left = `${positions[slot]}%`;
    });
    ballSlot = cupAtSlot.indexOf(ballCup);
  }

  function resetCupVisual() {
    setCupPositions([0, 1, 2]);
    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });
    ballCup = 0;
    ballSlot = 0;
    ball.style.left = `${positions[0]}%`;
    ball.style.opacity = "1";
    roundBadge.textContent = `Vòng ${cupGame.round + 1} / 3`;
  }

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

    setCupPositions([0, 1, 2]);
    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });

    ballCup = 0;
    ballSlot = 0;
    ball.style.left = `${positions[0]}%`;
    ball.style.opacity = "1";
  }

  async function startRound() {
    if (cupGame.busy || cupGame.round >= 3) return;

    cupGame.busy = true;
    cupGame.started = true;

    roundBadge.textContent = `Vòng ${cupGame.round + 1} / 3`;
    msg.textContent = "Quan sát vị trí quả bóng...";

    buttons.forEach((b) => {
      b.disabled = true;
    });

    setCupPositions([0, 1, 2]);
    cups.forEach((c) => {
      c.classList.remove("shuffling", "reveal");
    });

    ballCup = 0;
    ballSlot = 0;
    ball.style.left = `${positions[0]}%`;
    ball.style.opacity = "1";

    await wait(900);

    cups.forEach((c) => {
      c.classList.add("shuffling");
    });
    await wait(400);

    ball.style.opacity = "0";
    await wait(200);

    for (let i = 0; i < 5; i++) {
      const order = shuffle(cupAtSlot);
      setCupPositions(order);
      await wait(260 + i * 35);
    }

    msg.textContent = "Chọn một cốc!";
    buttons.forEach((b) => {
      b.disabled = false;
    });

    cupGame.busy = false;
    start.disabled = true;
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (cupGame.busy || !cupGame.started || cupGame.round >= 3) return;

      cupGame.busy = true;
      buttons.forEach((b) => {
        b.disabled = true;
      });

      const guessSlot = Number(btn.dataset.cup);
      const guessedCupId = cupAtSlot[guessSlot];
      const correct = guessSlot === ballSlot;

      cups.forEach((c) => c.classList.remove("reveal"));
      cups[guessedCupId].classList.add("reveal");

      await wait(400);

      ball.style.left = `${positions[ballSlot]}%`;
      ball.style.opacity = "1";

      await wait(600);

      if (!correct) {
        msg.textContent = "😈 Sai rồi! Bạn phải chơi lại từ đầu.";
        await wait(800);
        resetCupGame();
        return;
      }

      cupGame.round += 1;

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

      msg.textContent = "✓ Chính xác! Chuẩn bị vòng tiếp theo...";
      await wait(700);

      cupGame.started = false;
      cupGame.busy = false;
      start.disabled = false;
      start.textContent = "BẮT ĐẦU VÒNG TIẾP";
      resetCupVisual();
    });
  });

  start.addEventListener("click", startRound);

  setCupPositions([0, 1, 2]);
  ballCup = 0;
  ballSlot = 0;
  ball.style.left = `${positions[0]}%`;
  ball.style.opacity = "1";

  buttons.forEach((b) => {
    b.disabled = true;
  });
}

/* =========================================================
   CHALLENGE 5 — 4 CÂU HỎI TỰ LUẬN
   ========================================================= */
function initEssayQuiz(root) {
  const ACCEPTED_NAMES = ["long bi", "trần hoàng long", "hoàng long"];
  const Q2_ANSWER = 4;
  const Q2_HINT_THRESHOLD = 4;

  const Q3_OPTIONS = [
    "9 tín",
    "01/04",
    "11/09",
    "22/07",
    "15/12",
    "cảnh báo 1",
    "cảnh báo 2",
  ];
  const Q3_CORRECT = new Set([0, 1, 4, 5, 6]); // 9 tín, 01/04, 15/12, cảnh báo 1, cảnh báo 2
  const Q3_CANH_BAO_2 = 6;

  const Q4_OPTIONS = [
    { label: "A. Không, hay phết", reply: "Thanks ❤️" },
    { label: "B. Như l...", reply: "Oe Oe Oe 😭" },
    { label: "C. Tạm", reply: "Bruh :V" },
    { label: "D. ...", reply: "..." },
  ];

  const progress = { q1: false, q2: false, q3: false, q4: false };
  let q2WrongCount = 0;
  let q2HintShown = false;

  // Xáo trộn thứ tự checkbox nhưng giữ nguyên mapping index thật
  const q3Order = shuffle([...Q3_OPTIONS.keys()]);

  root.innerHTML = `
    <div class="questions">
      <div class="question-item">
        <label for="eq1">1. Ai là người nổi (tai) tiếng nhất A2K57?</label>
        <input id="eq1" type="text" autocomplete="off" placeholder="Nhập câu trả lời">
      </div>
      <div class="question-item">
        <label for="eq2">2. Người đó đã trải qua bao nhiêu mối tình?</label>
        <input id="eq2" type="text" inputmode="numeric" autocomplete="off" placeholder="Nhập một số">
      </div>
      <div class="question-item">
        <label>3. Số liệu nào sau đây liên quan đến người đó nhiều nhất?</label>
        <div class="checkbox-grid" id="eq3Grid">
          ${q3Order
            .map(
              (realIdx) => `
            <label class="checkbox-item">
              <input type="checkbox" value="${realIdx}">
              <span>${Q3_OPTIONS[realIdx]}</span>
            </label>
          `,
            )
            .join("")}
        </div>
      </div>
      <div class="question-item">
        <label>4. Bạn có cảm thấy 3 câu hỏi trên xàm dái không?</label>
        <div class="choice-grid" id="eq4Grid">
          ${Q4_OPTIONS.map(
            (opt, i) => `
            <button type="button" class="survey-option" data-q4="${i}">${opt.label}</button>
          `,
          ).join("")}
        </div>
      </div>
      <div style="text-align:center">
        <button id="eqCheck" class="primary-btn">KIỂM TRA</button>
      </div>
    </div>
  `;

  const q1El = $("#eq1", root);
  const q2El = $("#eq2", root);
  const q3Grid = $("#eq3Grid", root);
  const q4Grid = $("#eq4Grid", root);

  q4Grid.querySelectorAll("button[data-q4]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.q4);
      const opt = Q4_OPTIONS[idx];
      progress.q4 = true;
      q4Grid
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("chosen"));
      btn.classList.add("chosen");
      showModal("💬", "Phản hồi", opt.reply, [
        { label: "OK", className: "primary-btn", onClick: closeModal },
      ]);
    });
  });

  function flashField(el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
    setTimeout(() => el.classList.remove("shake"), 400);
  }

  $("#eqCheck", root).addEventListener("click", () => {
    // ===== Q1 =====
    const q1Val = normalizeText(q1El.value);
    const ok1 = ACCEPTED_NAMES.map(normalizeText).includes(q1Val);
    if (ok1) progress.q1 = true;

    // ===== Q2 =====
    const q2Raw = q2El.value.trim();
    const q2Num = Number(q2Raw);
    const ok2 = q2Raw !== "" && Number.isFinite(q2Num) && q2Num === Q2_ANSWER;
    if (ok2) {
      progress.q2 = true;
    } else {
      q2WrongCount++;
    }

    // ===== Q3 =====
    const selected = [
      ...q3Grid.querySelectorAll('input[type="checkbox"]:checked'),
    ].map((cb) => Number(cb.value));
    const selectedSet = new Set(selected);
    const q3CorrectSelected =
      selectedSet.size === Q3_CORRECT.size &&
      [...Q3_CORRECT].every((i) => selectedSet.has(i));

    const specialSet = new Set(
      [...Q3_CORRECT].filter((i) => i !== Q3_CANH_BAO_2),
    );
    const q3Special =
      selectedSet.size === specialSet.size &&
      [...specialSet].every((i) => selectedSet.has(i));

    if (q3CorrectSelected) progress.q3 = true;

    // ===== Đủ cả 4 → qua màn =====
    if (progress.q1 && progress.q2 && progress.q3 && progress.q4) {
      completeChallenge(5);
      return;
    }

    // ===== Ưu tiên hint đặc biệt cho Q3 =====
    if (!q3CorrectSelected && q3Special) {
      showModal("⚠️", "Lưu ý!", "Kỳ 1 cảnh báo 1, kỳ 2...");
      return;
    }

    // ===== Hint cho Q2 sau nhiều lần sai =====
    if (!ok2 && q2WrongCount >= Q2_HINT_THRESHOLD && !q2HintShown) {
      q2HintShown = true;
      showModal(
        "🐧",
        "Gợi ý",
        "Bạn có thể đã bỏ qua 1 người nào đó xa tận chân trời, gần ngay trước mắt 🐧",
      );
      return;
    }

    if (!ok1) flashField(q1El);
    if (!ok2) flashField(q2El);

    const allElseOK = ok1 && ok2 && q3CorrectSelected;
    const msg = allElseOK
      ? "Đừng quên trả lời câu 4 nhé!"
      : "Một số câu trả lời chưa đúng!";
    showModal("😈", "CHƯA ĐÚNG", msg);
  });
}

/* =========================================================
   CHALLENGE 6 — MÁY CHỌN NGẪU NHIÊN
   ========================================================= */
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

/* =========================================================
   CHALLENGE 7 — KHẢO SÁT (nội dung cũ của challenge 5)
   ========================================================= */
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
            completeChallenge(7);
          },
        },
      ]);
    });
    grid.appendChild(btn);
  });
}

/* =========================================================
   FINAL CODE + ANIMATION
   ========================================================= */
function validateFinalCode() {
  const input = $("#finalCodeInput");
  const entered = input.value.trim();
  if (entered === CONFIG.finalCode && state.completed.length === 7) {
    playFinalAnimation(input);
  } else {
    showModal(
      "😈",
      "MẬT MÃ CHƯA ĐÚNG",
      "Hoàn thành tất cả thử thách để lấy mã.",
    );
  }
}

function playFinalAnimation(inputEl) {
  const panel = inputEl.closest(".code-panel");
  if (!panel || panel.classList.contains("final-mode")) return;
  panel.classList.add("final-mode");

  const text = inputEl.value;

  const overlay = document.createElement("div");
  overlay.className = "final-overlay";

  const codeDisplay = document.createElement("div");
  codeDisplay.className = "final-code-display";
  [...text].forEach((ch) => {
    const span = document.createElement("span");
    span.className = "final-code-char";
    span.textContent = ch;
    codeDisplay.appendChild(span);
  });
  overlay.appendChild(codeDisplay);
  panel.appendChild(overlay);

  const chars = codeDisplay.querySelectorAll(".final-code-char");
  chars.forEach((span, i) => {
    setTimeout(() => span.classList.add("fade-out"), i * 70);
  });

  const fadeDuration = chars.length * 70 + 400;

  setTimeout(() => {
    codeDisplay.remove();
    const greeting = document.createElement("div");
    greeting.className = "final-greeting";
    greeting.textContent = "Chúc mừng sinh nhật Hà Đăng Huy";
    overlay.appendChild(greeting);
    requestAnimationFrame(() => greeting.classList.add("show"));

    setTimeout(() => {
      window.location.href = "birthday.html";
    }, 3000);
  }, fadeDuration);
}

/* =========================================================
   MODAL + HELPERS
   ========================================================= */
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
