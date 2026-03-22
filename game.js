const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const shareBtn = document.getElementById("shareBtn");
const width = canvas.width;
const height = canvas.height;

let gameState = "start";
let startClicked = false;

let punch;
let monkeys;

let score;
let bestScore = 0;

let irisRadius = 900;

let monkeysDefeated = 0;

let finalTime = 0;
let finalMonkeys = 0;

/* ---------------------------
   🍌 BANANA SYSTEM
---------------------------- */
let bananaMeter = 0;
let bananaMax = 10;
let bananaReady = false;
let bananaHintShown = false;

/* ---------------------------
   WAVE SYSTEM
---------------------------- */
let waveNumber = 0;
let wavePhase = "waiting"; // "waiting" | "spawning" | "complete" | "incoming"
let waveTimer = 0;
let waveAnnounceTimer = 0;
let waveMessage = "";

// Sub-group system
let spawnGroups = [];       // array of groups: [{count, side, delay}]
let currentGroup = 0;
let groupSpawnTimer = 0;
let groupSpawnQueue = 0;
let groupSpawnInterval = 0;
let groupPauseTimer = 0;
let groupPhase = "pause";   // "pause" | "spawning"

/* ---------------------------
   DIFFICULTY
---------------------------- */
let difficultyTimer = 0;
let speed_global = 1.0;
const MAX_SPEED = 2.2; // speed cap

/* ---------------------------
   SPIKE SYSTEM
---------------------------- */
let spikeTimer = 0;
let spikeActive = false;
let spikeDuration = 0;

/* ---------------------------
   SOUND SYSTEM
---------------------------- */
const punchSound = new Audio("sounds/punch.mp3");
const loseSound = new Audio("sounds/lose.mp3");
const backgroundMusic = new Audio("sounds/background.mp3");

backgroundMusic.loop = true;
backgroundMusic.volume = 0.9;
punchSound.volume = 0.1;
loseSound.volume = 0.1;

/* ---------------------------
   BACKGROUND
---------------------------- */
const zooBackground = new Image();
zooBackground.src = "assets/zoo.png";

/* ---------------------------
   MONKEY SPRITES
---------------------------- */
const monkeyFrames = [];
for (let i = 1; i <= 9; i++) {
  const img = new Image();
  img.src = "assets/monkey/" + i + ".png";
  monkeyFrames.push(img);
}

let currentFrame = 0;
let frameTimer = 0;
const frameSpeed = 6;

/* ---------------------------
   PUNCH SPRITES
---------------------------- */
const punchNeutral = new Image();
punchNeutral.src = "assets/punch/neutral.png";

const punchHappy = new Image();
punchHappy.src = "assets/punch/happy.png";

const punchSad = new Image();
punchSad.src = "assets/punch/sad.png";

/* ---------------------------
   CANVAS BUTTON HELPERS
---------------------------- */
function drawButton(label, x, y, w, h, color) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, 12);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "white";
  ctx.font = "bold 16px 'Press Start 2P'";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.restore();
}

function isInsideButton(mx, my, x, y, w, h) {
  return mx > x - w / 2 && mx < x + w / 2 && my > y - h / 2 && my < y + h / 2;
}

const btnY = height * 0.95;
const btnW = 160;
const btnH = 44;
const playBtnX = width / 2 - 160;
const shareBtnX = width / 2 + 160;

/* ---------------------------
   RESET
---------------------------- */
function resetGame() {
  gameState = "start";
  startClicked = false;

  punch = {
    x: width / 2,
    y: height / 2,
    size: 45,
    state: "neutral",
    happyTimer: 0,
    facing: 1
  };

  monkeys = [];
  score = 0;
  speed_global = 1.0;
  monkeysDefeated = 0;
  finalTime = 0;
  finalMonkeys = 0;
  difficultyTimer = 0;
  spikeTimer = 0;
  spikeActive = false;
  bananaMeter = 0;
  bananaReady = false;
  bananaHintShown = false;

  waveNumber = 0;
  wavePhase = "waiting";
  waveTimer = 90;
  waveAnnounceTimer = 0;
  waveMessage = "";
  spawnGroups = [];
  currentGroup = 0;
  groupSpawnQueue = 0;
  groupSpawnTimer = 0;
  groupPauseTimer = 0;
  groupPhase = "pause";

  restartBtn.style.display = "none";
  shareBtn.style.display = "none";
  irisRadius = 900;
  backgroundMusic.pause();
  backgroundMusic.currentTime = 0;
}

resetGame();

/* ---------------------------
   BUILD WAVE GROUPS
   Each wave is made of 2-4 sub-groups
   coming from different sides with pauses between
---------------------------- */
function buildWaveGroups() {
  const groups = [];
  const numGroups = Math.min(2 + Math.floor(waveNumber / 2), 5);

  for (let g = 0; g < numGroups; g++) {
    const side = Math.floor(Math.random() * 4);
    // Group size grows with wave, more monkeys per group over time
    const count = Math.min(2 + Math.floor(waveNumber * 0.6) + Math.floor(Math.random() * 2), 6);
    // Pause between groups shrinks over time but never disappears
    const pause = Math.max(40, 90 - waveNumber * 4);
    // Interval between monkeys within a group — stays moderate
    const interval = Math.max(10, 22 - Math.floor(waveNumber * 0.5));

    groups.push({ side, count, pause, interval });
  }

  return groups;
}

function startNextWave() {
  waveNumber++;
  wavePhase = "spawning";
  waveMessage = "WAVE " + waveNumber;
  waveAnnounceTimer = 90;

  spawnGroups = buildWaveGroups();
  currentGroup = 0;
  groupPauseTimer = 30; // small initial pause before first group
  groupSpawnQueue = 0;
  groupPhase = "pause";
}

function spawnMonkey(forceSide) {
  const side = forceSide !== undefined ? forceSide : Math.floor(Math.random() * 4);

  let x, y;
  if (side === 0) { x = 0; y = Math.random() * height; }
  else if (side === 1) { x = width; y = Math.random() * height; }
  else if (side === 2) { x = Math.random() * width; y = 0; }
  else { x = Math.random() * width; y = height; }

  let type = "normal";
  if (Math.random() < 0.2 && waveNumber > 6) type = "fast";

  const sizeVariation = 1.15;
  const baseSize = type === "fast" ? 14 : 20;
  const finalSize = Math.round(baseSize * sizeVariation);
  const baseDrawSize = 64;
  const finalDrawSize = Math.round(baseDrawSize * sizeVariation);

  // Top monkeys always slower; speed capped globally
  const sideMultiplier = side === 2 ? 0.55 : 1;
  const monkeySpeed = Math.min(
    (type === "fast" ? speed_global * 1.15 : speed_global) * sideMultiplier,
    MAX_SPEED
  );

  monkeys.push({
    x, y,
    size: finalSize,
    drawSize: finalDrawSize,
    speed: monkeySpeed,
    hit: false,
    vx: 0,
    vy: 0
  });
}

/* ---------------------------
   CLICK HANDLING
---------------------------- */
canvas.addEventListener("click", function (e) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (gameState === "start") {
    if (!startClicked) {
      startClicked = true;
      backgroundMusic.currentTime = 0;
      backgroundMusic.play();
      return;
    }
    gameState = "playing";
    backgroundMusic.currentTime = 0;
    return;
  }

  if (gameState === "end") {
    if (isInsideButton(mouseX, mouseY, playBtnX, btnY, btnW, btnH)) { resetGame(); return; }
    if (isInsideButton(mouseX, mouseY, shareBtnX, btnY, btnW, btnH)) {
      const text = `🥊 I survived ${finalTime.toFixed(1)} seconds and eliminated ${finalMonkeys} monkeys in Protect Punch! Can you beat me?`;
      if (navigator.share) {
        navigator.share({ title: "Protect Punch", text: text, url: window.location.href });
      } else {
        navigator.clipboard.writeText(text + " " + window.location.href);
        alert("Score copied to clipboard!");
      }
      return;
    }
  }

  if (gameState !== "playing") return;

  const dxPunch = mouseX - punch.x;
  const dyPunch = mouseY - punch.y;
  const distPunch = Math.sqrt(dxPunch * dxPunch + dyPunch * dyPunch);

  if (distPunch < punch.size + 20) {
    if (bananaReady) {
      triggerBanana();
      if (navigator.vibrate) navigator.vibrate(100);
    }
    return;
  }

  for (let i = monkeys.length - 1; i >= 0; i--) {
    const m = monkeys[i];
    const dx = mouseX - m.x;
    const dy = mouseY - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < m.size + 20) {
      m.hit = true;
      punchSound.currentTime = 0;
      punchSound.play();
      const angle = Math.atan2(dy, dx);
      m.vx = Math.cos(angle) * -6;
      m.vy = Math.sin(angle) * -6;
      punch.state = "happy";
      punch.happyTimer = 45;
      punch.facing = m.x < punch.x ? 1 : -1;
    }
  }
});

canvas.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  if (gameState !== "playing") return;
  if (!bananaReady) return;
  triggerBanana();
});

function triggerBanana() {
  bananaReady = false;
  bananaMeter = 0;
  bananaHintShown = true;
  monkeys.forEach(m => {
    m.hit = true;
    const dx = m.x - punch.x;
    const dy = m.y - punch.y;
    const angle = Math.atan2(dy, dx);
    m.vx = Math.cos(angle) * 16;
    m.vy = Math.sin(angle) * 16;
  });
}

/* ---------------------------
   UPDATE
---------------------------- */
function update() {
  if (gameState !== "playing") return;

  frameTimer++;
  if (frameTimer > frameSpeed) {
    currentFrame++;
    if (currentFrame >= monkeyFrames.length) currentFrame = 0;
    frameTimer = 0;
  }

  difficultyTimer++;
  let t = difficultyTimer / 60;
  speed_global = Math.min(1 + (t * 0.025), MAX_SPEED);

  if (waveAnnounceTimer > 0) waveAnnounceTimer--;

  /* WAVE LOGIC */
  if (wavePhase === "waiting") {
    waveTimer--;
    if (waveTimer <= 0) startNextWave();
  }

  else if (wavePhase === "spawning") {
    if (currentGroup < spawnGroups.length) {
      const group = spawnGroups[currentGroup];

      if (groupPhase === "pause") {
        groupPauseTimer--;
        if (groupPauseTimer <= 0) {
          // Start spawning this group
          groupPhase = "spawning";
          groupSpawnQueue = group.count;
          groupSpawnTimer = 0;
          groupSpawnInterval = group.interval;
        }
      }

      else if (groupPhase === "spawning") {
        if (groupSpawnQueue > 0) {
          groupSpawnTimer--;
          if (groupSpawnTimer <= 0) {
            spawnMonkey(group.side);
            groupSpawnQueue--;
            groupSpawnTimer = groupSpawnInterval;
          }
        } else {
          // Group done — pause before next group
          currentGroup++;
          groupPhase = "pause";
          groupPauseTimer = currentGroup < spawnGroups.length
            ? spawnGroups[currentGroup].pause
            : 0;
        }
      }

    } else {
      // All groups spawned — wait for screen to clear
      if (monkeys.length === 0) {
        wavePhase = "complete";
        waveMessage = "WAVE " + waveNumber + " COMPLETE!";
        waveAnnounceTimer = 110;
        waveTimer = 110;
      }
    }
  }

  else if (wavePhase === "complete") {
    waveTimer--;
    if (waveTimer <= 0) {
      wavePhase = "incoming";
      waveMessage = "WAVE " + (waveNumber + 1) + " INCOMING!";
      waveAnnounceTimer = 110;
      waveTimer = 110;
    }
  }

  else if (wavePhase === "incoming") {
    waveTimer--;
    if (waveTimer <= 0) startNextWave();
  }

  let dangerNearby = false;
  if (punch.happyTimer > 0) punch.happyTimer--;

  for (let i = monkeys.length - 1; i >= 0; i--) {
    const m = monkeys[i];

    if (m.hit) {
      m.x += m.vx;
      m.y += m.vy;
      m.vx *= 0.85;
      m.vy *= 0.85;
      if (Math.abs(m.vx) < 0.5 && Math.abs(m.vy) < 0.5) {
        monkeys.splice(i, 1);
        monkeysDefeated++;
        bananaMeter += 1;
        if (bananaMeter >= bananaMax) {
          bananaMeter = bananaMax;
          bananaReady = true;
        }
      }
      continue;
    }

    const dx = punch.x - m.x;
    const dy = punch.y - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;

    let aggression = 1;
    if (dist < 120) { aggression = 1.2; dangerNearby = true; }

    const targetVX = (dx / dist) * m.speed * aggression;
    const targetVY = (dy / dist) * m.speed * aggression;

    m.vx += (targetVX - m.vx) * 0.08;
    m.vy += (targetVY - m.vy) * 0.08;

    m.vx = Math.max(-3.5, Math.min(3.5, m.vx));
    m.vy = Math.max(-3.5, Math.min(3.5, m.vy));

    m.x += m.vx;
    m.y += m.vy;

    if (dist < punch.size) {
      gameState = "irisClosing";
      finalTime = score;
      finalMonkeys = monkeysDefeated;
      loseSound.play();
      backgroundMusic.pause();
      if (score > bestScore) bestScore = score;
    }
  }

  if (punch.happyTimer > 0) punch.state = "happy";
  else if (dangerNearby) punch.state = "sad";
  else punch.state = "neutral";

  score += 0.016;
}

/* ---------------------------
   DRAW
---------------------------- */
function draw() {
  ctx.clearRect(0, 0, width, height);
  ctx.textBaseline = "middle";

  if (gameState === "start") {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFE135";
    ctx.font = "72px 'Luckiest Guy'";
    ctx.fillText("PROTECT PUNCH", width / 2, height * 0.22);
    let bob = Math.sin(Date.now() * 0.004) * 8;
    ctx.drawImage(punchNeutral, width / 2 - 70, height * 0.28 + bob, 140, 140);
    ctx.fillStyle = "white";
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillText("BEST: " + bestScore.toFixed(1) + " SEC", width / 2, 310);
    ctx.fillText("MONKEYS ELIMINATED", width / 2, 350);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(finalMonkeys, width / 2, 390);
    ctx.fillStyle = "#FFE135";
    ctx.font = "15px 'Press Start 2P'";
    ctx.fillText(startClicked ? "CLICK TO PLAY" : "CLICK TO START", width / 2, height * 0.96);
    return;
  }

  ctx.drawImage(zooBackground, 0, 0, width, height);

  /* PUNCH GLOW */
  if (gameState === "playing" || gameState === "irisClosing") {
    const glowProgress = bananaMeter / bananaMax;

    let punchSprite = punchNeutral;
    if (punch.state === "happy") punchSprite = punchHappy;
    if (punch.state === "sad") punchSprite = punchSad;

    ctx.save();
    ctx.translate(punch.x, punch.y);
    ctx.scale(punch.facing, 1);

    if (glowProgress > 0) {
      const now = Date.now();
      const pulseSpeed = 0.003 + glowProgress * 0.015;
      const pulse = 0.5 + Math.sin(now * pulseSpeed) * 0.5;
      const glowAlpha = bananaReady ? 0.6 + pulse * 0.4 : 0.3 + 0.5 * glowProgress;
      const glowSize = bananaReady ? 30 + pulse * 20 : 10 + 30 * glowProgress;
      const passes = bananaReady ? 3 : 2;
      for (let p = 0; p < passes; p++) {
        ctx.shadowBlur = glowSize + p * 10;
        ctx.shadowColor = `rgba(255, 200, 0, ${glowAlpha - p * 0.1})`;
        ctx.drawImage(punchSprite, -64, -64, 128, 128);
      }
    }

    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    ctx.drawImage(punchSprite, -64, -64, 128, 128);
    ctx.restore();

  } else {
    let punchSprite = punchNeutral;
    if (punch.state === "happy") punchSprite = punchHappy;
    if (punch.state === "sad") punchSprite = punchSad;
    ctx.save();
    ctx.translate(punch.x, punch.y);
    ctx.scale(punch.facing, 1);
    ctx.drawImage(punchSprite, -64, -64, 128, 128);
    ctx.restore();
  }

  /* TAP ME */
  if (bananaReady) {
    const flash = 0.6 + Math.sin(Date.now() * 0.01) * 0.4;
    const hintBob = Math.sin(Date.now() * 0.006) * 4;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "15px 'Press Start 2P'";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = `rgba(255, 50, 50, ${flash})`;
    ctx.fillText("TAP ME!", punch.x, punch.y - 82 + hintBob);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.restore();
  }

  /* WAVE MESSAGE */
  if (waveAnnounceTimer > 0 && waveMessage !== "") {
    const alpha = Math.min(1, waveAnnounceTimer / 20);
    const isComplete = waveMessage.includes("COMPLETE");
    const isIncoming = waveMessage.includes("INCOMING");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "14px 'Press Start 2P'";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = isComplete ? "#44ff88" : isIncoming ? "#ff4444" : "#FFE135";
    ctx.fillText(waveMessage, width / 2, height * 0.18);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /* MONKEYS */
  monkeys.forEach(m => {
    const dx = punch.x - m.x;
    const dy = punch.y - m.y;
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    const half = m.drawSize / 2;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(angle);
    ctx.drawImage(monkeyFrames[currentFrame], -half, -half, m.drawSize, m.drawSize);
    ctx.restore();
  });

  /* IRIS CLOSE */
  if (gameState === "irisClosing") {
    irisRadius -= 18;
    ctx.beginPath();
    ctx.rect(0, 0, width, height);
    ctx.arc(punch.x, punch.y, irisRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = "black";
    ctx.fill();
    if (irisRadius <= 0) gameState = "end";
  }

  /* END SCREEN */
  if (gameState === "end") {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);
    let pulse = Math.sin(Date.now() * 0.005) * 5;
    ctx.textAlign = "center";
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#2a2a2a";
    ctx.fillStyle = "#FFE135";
    ctx.font = "64px 'Luckiest Guy'";
    ctx.strokeText("PUNCH GOT BULLIED!", width / 2, height * 0.18 + pulse);
    ctx.fillText("PUNCH GOT BULLIED!", width / 2, height * 0.18 + pulse);
    ctx.drawImage(punchSad, width / 2 - 70, height * 0.22, 140, 140);
    ctx.fillStyle = "white";
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillText("SURVIVAL TIME", width / 2, height * 0.60);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(finalTime.toFixed(1) + " SEC", width / 2, height * 0.68);
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillText("BEST: " + bestScore.toFixed(1) + " SEC", width / 2, height * 0.75);
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillText("MONKEYS ELIMINATED", width / 2, height * 0.83);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(finalMonkeys, width / 2, height * 0.90);
    ctx.font = "13px 'Press Start 2P'";
    ctx.fillStyle = "#FFE135";
    ctx.fillText("WAVES SURVIVED: " + (waveNumber - 1), width / 2, height * 0.95);
    drawButton("PLAY AGAIN", playBtnX, btnY, btnW, btnH, "#27ae60");
    drawButton("SHARE", shareBtnX, btnY, btnW, btnH, "#2980b9");
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
