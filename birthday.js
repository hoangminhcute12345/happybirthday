"use strict";

/* =========================================
   CONFIGURATION
========================================= */

const CONFIG = {
  recipientName: "Hà Đăng Huy",

  birthdayMessage: `Chúc mừng sinh nhật! 🎉
Chúc Huy có một ngày thật vui, nhiều niềm vui
và thật nhiều điều tuyệt vời trong tuổi 19! 💖`,

  confettiCount: 45,
};

/* =========================================
   DOM CACHE
========================================= */

const elements = {
  celebration: document.getElementById("celebration"),
  recipient: document.getElementById("recipientName"),
  message: document.getElementById("birthdayMessage"),
  video: document.getElementById("birthdayVideo"),
};

/* =========================================
   BIRTHDAY TEXT
========================================= */

function setupBirthday() {
  elements.recipient.textContent = CONFIG.recipientName;

  elements.message.textContent = CONFIG.birthdayMessage;
}

/* =========================================
   CONFETTI
========================================= */

function createConfetti() {
  const host = elements.celebration;

  const fragment = document.createDocumentFragment();

  const colors = ["#ff72b6", "#ffd777", "#8c75ff", "#ffb8d8"];

  for (let i = 0; i < CONFIG.confettiCount; i++) {
    const particle = document.createElement("span");

    particle.className = "confetti";

    particle.style.left = `${Math.random() * 100}%`;

    particle.style.setProperty("--dx", `${(Math.random() - 0.5) * 22}vw`);

    particle.style.setProperty("--rot", `${(Math.random() - 0.5) * 720}deg`);

    particle.style.setProperty("--delay", `${Math.random() * 1.5}s`);

    particle.style.setProperty("--dur", `${4 + Math.random() * 3}s`);

    particle.style.background = colors[i % colors.length];

    fragment.appendChild(particle);
  }

  host.appendChild(fragment);
}

/* =========================================
   FIREWORK
========================================= */

function createFirework(x, y) {
  const firework = document.createElement("span");

  firework.className = "firework";

  firework.style.left = `${x}%`;
  firework.style.top = `${y}%`;

  elements.celebration.appendChild(firework);

  setTimeout(() => {
    firework.remove();
  }, 1000);
}

function launchFireworks() {
  const positions = [
    [18, 24],
    [80, 22],
    [50, 13],
  ];

  positions.forEach(([x, y], index) => {
    setTimeout(() => createFirework(x, y), index * 500);
  });
}

/* =========================================
   VIDEO
========================================= */

function setupVideo() {
  const video = elements.video;

  if (!video) return;

  /*
   * Không autoplay.
   * Không tải toàn bộ video ngay khi mở trang.
   *
   * preload="metadata" chỉ tải thông tin
   * cơ bản của video.
   */

  video.preload = "metadata";
}

/* =========================================
   START
========================================= */

function boot() {
  setupBirthday();

  setupVideo();

  createConfetti();

  /*
   * Cho giao diện render trước,
   * sau đó mới chạy fireworks.
   */

  requestAnimationFrame(() => {
    setTimeout(launchFireworks, 350);
  });
}

/* =========================================
   START APP
========================================= */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
