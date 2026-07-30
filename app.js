const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

$("#partnerName").textContent = CONFIG.partnerName;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function whatsappItalics(value) {
  const safe = escapeHtml(value);
  return safe.replace(/_([^_]+)_/g, "<em>$1</em>");
}

const heroSubtitle = $("#heroSubtitle");
if (heroSubtitle && CONFIG.heroSubtitle) {
  heroSubtitle.innerHTML = whatsappItalics(CONFIG.heroSubtitle);
}

const relationshipStart = new Date(`${CONFIG.relationshipStart}T00:00:00`);
const today = new Date();
const diffMs = today - relationshipStart;
const days = Math.max(0, Math.floor(diffMs / 86400000));
$("#daysTogether").textContent = days.toLocaleString("es-ES");

const modal = $("#modal");
const modalIcon = $("#modalIcon");
const modalTitle = $("#modalTitle");
const modalText = $("#modalText");
const modalExtra = $("#modalExtra");

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function openModal({ icon = "❤️", title, text, extra = "" }) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalText.innerHTML = whatsappItalics(text);
  modalExtra.innerHTML = extra;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$$("[data-close-modal]").forEach(el => el.addEventListener("click", closeModal));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
});

$("#startBtn").addEventListener("click", async () => {
  const button = $("#startBtn");
  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = "Avisando a Jaime... ❤️";

  try {
    const response = await fetch("/api/asistencia", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target: "jaime" }),
    });

    if (!response.ok) {
      throw new Error("No configurado");
    }

    button.textContent = "Jaime ha sido avisado 🚨❤️";
    confetti(60);
  } catch (error) {
    // La web sigue funcionando aunque todavía no se hayan configurado las notificaciones.
    button.textContent = "Asistencia activada ❤️";
  }

  $("#emergencySection").classList.remove("hidden");
  $("#emergencySection").scrollIntoView({ behavior: "smooth", block: "start" });

  setTimeout(() => {
    button.disabled = false;
    button.textContent = originalText;
  }, 4500);
});

$$("[data-action]").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "badDay") {
      openModal({
        icon: "😔",
        title: "Protocolo antidesastre activado",
        text: randomFrom(CONFIG.badDayMessages)
      });
    }

    if (action === "affection") {
      openModal({
        icon: "🥺",
        title: "Solicitud aprobada",
        text: randomFrom(CONFIG.affectionMessages),
        extra: `<div class="voucher"><strong>VALE OFICIAL</strong><span>Propiedad exclusiva de ${CONFIG.partnerName}</span></div>`
      });
      confetti(40);
    }

    if (action === "laugh") {
      openModal({
        icon: "😂",
        title: "Intento de hacerte reír",
        text: randomFrom(CONFIG.laughMessages)
      });
    }

    if (action === "love") {
      openModal({
        icon: "❤️",
        title: "Una razón más",
        text: randomFrom(CONFIG.loveReasons)
      });
      confetti(28);
    }

    if (action === "surprise") {
      openModal({
        icon: "🎁",
        title: "Te ha tocado...",
        text: randomFrom(CONFIG.surprises),
        extra: `<div class="voucher"><strong>PREMIO CANJEABLE</strong><span>No se admiten reclamaciones por parte de Jaime.</span></div>`
      });
      confetti(70);
    }
  });
});

const lettersGrid = $("#lettersGrid");
CONFIG.letters.forEach(letter => {
  const button = document.createElement("button");
  button.className = "letter-card";
  button.innerHTML = `
    <span class="icon">${letter.icon}</span>
    <strong>Ábreme cuando ${letter.title}</strong>
    <small>${whatsappItalics(letter.subtitle)}</small>
  `;
  button.addEventListener("click", () => {
    openModal({
      icon: letter.icon,
      title: `Para cuando ${letter.title}`,
      text: letter.text
    });
  });
  lettersGrid.appendChild(button);
});

const timeline = $("#timeline");
CONFIG.timeline.forEach(item => {
  const node = document.createElement("article");
  node.className = "timeline-item";
  node.innerHTML = `
    <small>${item.date}</small>
    <h3>${item.title}</h3>
    <p>${whatsappItalics(item.text)}</p>
  `;
  timeline.appendChild(node);
});

let meterRunning = false;
$("#calculateLove").addEventListener("click", () => {
  if (meterRunning) return;
  meterRunning = true;

  const fill = $("#meterFill");
  const value = $("#meterValue");
  const result = $("#meterResult");
  result.textContent = "";

  let current = 0;
  const stops = [12, 38, 63, 79, 92, 99];

  function nextStop(i = 0) {
    if (i >= stops.length) {
      setTimeout(() => {
        value.textContent = "∞";
        fill.style.width = "100%";
        result.textContent = "ERROR: valor demasiado grande para ser calculado. El sistema recomienda asumir que es muchísimo. ❤️";
        confetti(120);
        meterRunning = false;
      }, 700);
      return;
    }

    current = stops[i];
    value.textContent = `${current}%`;
    fill.style.width = `${current}%`;
    setTimeout(() => nextStop(i + 1), 430 + i * 80);
  }

  fill.style.width = "0%";
  value.textContent = "0%";
  setTimeout(() => nextStop(), 250);
});

function confetti(count = 60) {
  const canvas = $("#confettiCanvas");
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const pieces = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * 100,
    size: 5 + Math.random() * 7,
    speedY: 2 + Math.random() * 3,
    speedX: -1.5 + Math.random() * 3,
    rotation: Math.random() * Math.PI,
    spin: -.12 + Math.random() * .24,
    life: 0,
    maxLife: 160 + Math.random() * 80,
    shape: Math.random() > .65 ? "heart" : "rect",
    hue: Math.random() > .5 ? 345 : 15
  }));

  function drawHeart(x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-12, -3, -10, -12, -3, -12);
    ctx.bezierCurveTo(1, -12, 4, -9, 5, -6);
    ctx.bezierCurveTo(6, -9, 9, -12, 13, -12);
    ctx.bezierCurveTo(20, -12, 22, -3, 10, 6);
    ctx.lineTo(5, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    let active = false;

    pieces.forEach(p => {
      p.life++;
      if (p.life > p.maxLife) return;
      active = true;
      p.x += p.speedX;
      p.y += p.speedY;
      p.rotation += p.spin;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = `hsl(${p.hue} 75% 66%)`;

      if (p.shape === "heart") {
        ctx.restore();
        ctx.fillStyle = `hsl(${p.hue} 75% 66%)`;
        drawHeart(p.x, p.y, p.size * 1.8);
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
        ctx.restore();
      }
    });

    if (active) requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, width, height);
  }

  animate();
}


/* ---------- Cápsulas del tiempo ---------- */

const capsuleModal = $("#capsuleModal");

function openCapsuleModal() {
  capsuleModal.classList.remove("hidden");
  capsuleModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeCapsuleModal() {
  capsuleModal.classList.add("hidden");
  capsuleModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

$("#newCapsuleBtn")?.addEventListener("click", openCapsuleModal);
$$("[data-close-capsule]").forEach(el => el.addEventListener("click", closeCapsuleModal));

function daysUntil(dateString) {
  const target = new Date(`${dateString}T00:00:00`);
  const now = new Date();
  return Math.ceil((target - now) / 86400000);
}

function capsuleIsOpen(capsule) {
  return new Date() >= new Date(`${capsule.openAt}T00:00:00`);
}

function renderCapsules() {
  const grid = $("#capsulesGrid");
  if (!grid) return;

  const localCapsules = JSON.parse(localStorage.getItem("bj_capsules") || "[]");
  const capsules = [...(CONFIG.capsules || []), ...localCapsules];

  grid.innerHTML = "";

  capsules.forEach(capsule => {
    const isOpen = capsuleIsOpen(capsule);
    const remaining = daysUntil(capsule.openAt);

    const card = document.createElement("article");
    card.className = `capsule-card ${isOpen ? "unlocked" : "locked"}`;

    const dateText = capsule.secretDate && !isOpen
      ? "Fecha secreta"
      : new Date(`${capsule.openAt}T00:00:00`).toLocaleDateString("es-ES", {
          day: "2-digit", month: "long", year: "numeric"
        });

    card.innerHTML = `
      <div class="capsule-icon">${isOpen ? "💌" : "🔒"}</div>
      <div class="capsule-meta">De ${escapeHtml(capsule.from)} para ${escapeHtml(capsule.to)}</div>
      <h3>${escapeHtml(capsule.title)}</h3>
      <p>${isOpen ? "Esta cápsula ya puede abrirse." : remaining > 0 ? `Quedan ${remaining} días.` : "Ya casi..."}</p>
      <div class="capsule-date">${escapeHtml(dateText)}</div>
      <button class="${isOpen ? "primary-btn" : "secondary-btn"} capsule-open-btn">
        ${isOpen ? "Abrir cápsula ❤️" : "Todavía no 🔒"}
      </button>
    `;

    const btn = card.querySelector(".capsule-open-btn");
    btn.disabled = !isOpen;

    if (isOpen) {
      btn.addEventListener("click", () => {
        openModal({
          icon: "💌",
          title: capsule.title,
          text: capsule.message
        });
        confetti(80);
      });
    }

    grid.appendChild(card);
  });
}

$("#saveCapsuleBtn")?.addEventListener("click", () => {
  const recipient = $("#capsuleRecipient").value;
  const title = $("#capsuleTitle").value.trim();
  const message = $("#capsuleMessage").value.trim();
  const openAt = $("#capsuleDate").value;
  const secretDate = $("#secretDate").checked;
  const status = $("#capsuleFormStatus");

  if (!title || !message || !openAt) {
    status.textContent = "Falta título, mensaje o fecha.";
    return;
  }

  const capsule = {
    id: `local-${Date.now()}`,
    from: recipient === "Bel" ? "Jaime" : "Bel",
    to: recipient,
    title,
    message,
    openAt,
    secretDate,
    createdAt: new Date().toISOString().slice(0, 10)
  };

  const existing = JSON.parse(localStorage.getItem("bj_capsules") || "[]");
  existing.push(capsule);
  localStorage.setItem("bj_capsules", JSON.stringify(existing));

  status.textContent = "Cápsula guardada 🔒";
  renderCapsules();
  setTimeout(() => {
    closeCapsuleModal();
    $("#capsuleTitle").value = "";
    $("#capsuleMessage").value = "";
    $("#capsuleDate").value = "";
    $("#secretDate").checked = false;
    status.textContent = "";
  }, 800);
});

/* ---------- Listas compartidas demo/local ---------- */

function renderSimpleList(storageKey, configItems, selector) {
  const grid = $(selector);
  if (!grid) return;
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  const items = [...configItems, ...stored];

  grid.innerHTML = items.map((item, i) => `
    <div class="shared-item">
      <span>${selector.includes("travel") ? "✈️" : "🍽️"}</span>
      <strong>${escapeHtml(item)}</strong>
    </div>
  `).join("");
}

function setupAddButton(btnSelector, inputSelector, storageKey, configItems, gridSelector) {
  $(btnSelector)?.addEventListener("click", () => {
    const input = $(inputSelector);
    const value = input.value.trim();
    if (!value) return;
    const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
    stored.push(value);
    localStorage.setItem(storageKey, JSON.stringify(stored));
    input.value = "";
    renderSimpleList(storageKey, configItems, gridSelector);
  });
}

renderCapsules();
renderSimpleList("bj_travel", CONFIG.travelWishlist || [], "#travelGrid");
renderSimpleList("bj_food", CONFIG.foodWishlist || [], "#foodGrid");
setupAddButton("#addTravelBtn", "#travelInput", "bj_travel", CONFIG.travelWishlist || [], "#travelGrid");
setupAddButton("#addFoodBtn", "#foodInput", "bj_food", CONFIG.foodWishlist || [], "#foodGrid");
