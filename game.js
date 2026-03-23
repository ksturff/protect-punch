const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const shareBtn = document.getElementById("shareBtn");
const width = canvas.width;
const height = canvas.height;

/* ---------------------------
   MODE
---------------------------- */
let selectedMode = null; // "survival" | "wave"

/* ---------------------------
   GAME STATE
---------------------------- */
let gameState = "start"; // "start" | "modeSelect" | "playing" | "irisClosing" | "end"
let startClicked = false;

let punch;
let monkeys;

let score;
let bestScoreSurvival = 0;
let bestScoreWave = 0;

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
   SURVIVAL: CONTINUOUS DIFFICULTY
---------------------------- */
let difficultyTimer = 0;
let baseSpawnInterval = 150;
let minSpawnInterval = 20;
let spawnInterval = baseSpawnInterval;
let spawnTimer = 0;
let speed = 1.0;
let maxEnemiesOnScreen = 10;

/* ---------------------------
   SURVIVAL: SPIKE SYSTEM
---------------------------- */
let spikeTimer = 0;
let spikeActive = false;
let spikeDuration = 0;

/* ---------------------------
   WAVE SYSTEM
---------------------------- */
let waveNumber = 0;
let wavePhase = "waiting"; // "waiting" | "spawning" | "complete" | "incoming"
let waveTimer = 90;
let waveAnnounceTimer = 0;
let waveMessage = "";

let spawnGroups = [];
let currentGroup = 0;
let groupSpawnTimer = 0;
let groupSpawnQueue = 0;
let groupSpawnInterval = 0;
let groupPauseTimer = 0;
let groupPhase = "pause"; // "pause" | "spawning"

/* ---------------------------
   WAVE: DIFFICULTY
---------------------------- */
let speed_global = 1.0;
const MAX_SPEED = 2.2;

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

/* Mode button positions */
const modeBtnW = 200;
const modeBtnH = 54;
const survivalBtnX = width / 2;
const survivalBtnY = height * 0.53;
const waveBtnX = width / 2;
const waveBtnY = height * 0.76;

/* ---------------------------
   RESET
---------------------------- */
function resetGame() {
  gameState = "start";
  startClicked = false;
  selectedMode = null;

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
  spawnTimer = 0;
  speed = 1.0;
  speed_global = 1.0;
  monkeysDefeated = 0;
  finalTime = 0;
  finalMonkeys = 0;
  difficultyTimer = 0;

  spawnInterval = baseSpawnInterval;
  maxEnemiesOnScreen = 10;
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
   WAVE HELPERS
---------------------------- */
function buildWaveGroups() {
  const groups = [];
  const numGroups = Math.min(2 + Math.floor(waveNumber / 2), 5);

  for (let g = 0; g < numGroups; g++) {
    const side = Math.floor(Math.random() * 4);
    const count = Math.min(2 + Math.floor(waveNumber * 0.6) + Math.floor(Math.random() * 2), 6);
    const pause = Math.max(40, 90 - waveNumber * 4);
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
  groupPauseTimer = 30;
  groupSpawnQueue = 0;
  groupPhase = "pause";
}

/* ---------------------------
   SPAWN MONKEY
---------------------------- */
function spawnMonkey(forceSide) {
  const side = forceSide !== undefined ? forceSide : Math.floor(Math.random() * 4);

  let x, y;
  if (side === 0) { x = 0; y = Math.random() * height; }
  else if (side === 1) { x = width; y = Math.random() * height; }
  else if (side === 2) { x = Math.random() * width; y = 0; }
  else { x = Math.random() * width; y = height; }

  let type = "normal";
  if (selectedMode === "survival") {
    if (Math.random() < 0.25 && difficultyTimer > 1800) type = "fast";
  } else {
    if (Math.random() < 0.2 && waveNumber > 6) type = "fast";
  }

  const sizeVariation = 1.15;
  const baseSize = type === "fast" ? 14 : 20;
  const finalSize = Math.round(baseSize * sizeVariation);
  const baseDrawSize = 64;
  const finalDrawSize = Math.round(baseDrawSize * sizeVariation);

  const speedMultiplier = (side === 2 || side === 3) ? 0.55 : 1;

  let monkeySpeed;
  if (selectedMode === "survival") {
    monkeySpeed = (type === "fast" ? speed * 1.2 : speed) * speedMultiplier;
  } else {
    monkeySpeed = Math.min(
      (type === "fast" ? speed_global * 1.15 : speed_global) * speedMultiplier,
      MAX_SPEED
    );
  }

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

  /* START SCREEN */
  if (gameState === "start") {
    if (!startClicked) {
      startClicked = true;
      backgroundMusic.currentTime = 0;
      backgroundMusic.play();
      return;
    }
    gameState = "modeSelect";
    return;
  }

  /* MODE SELECT */
  if (gameState === "modeSelect") {
    if (isInsideButton(mouseX, mouseY, survivalBtnX, survivalBtnY, modeBtnW, modeBtnH)) {
      selectedMode = "survival";
      gameState = "playing";
      backgroundMusic.currentTime = 0;
      return;
    }
    if (isInsideButton(mouseX, mouseY, waveBtnX, waveBtnY, modeBtnW, modeBtnH)) {
      selectedMode = "wave";
      gameState = "playing";
      backgroundMusic.currentTime = 0;
      return;
    }
    return;
  }

  /* END SCREEN */
  if (gameState === "end") {
    if (isInsideButton(mouseX, mouseY, playBtnX, btnY, btnW, btnH)) {
      resetGame();
      return;
    }
    if (isInsideButton(mouseX, mouseY, shareBtnX, btnY, btnW, btnH)) {
      let text;
      if (selectedMode === "survival") {
        text = `🥊 I survived ${finalTime.toFixed(1)} seconds and eliminated ${finalMonkeys} monkeys in Protect Punch! Can you beat me?`;
      } else {
        text = `🥊 I survived ${waveNumber - 1} waves and eliminated ${finalMonkeys} monkeys in Protect Punch! Can you beat me?`;
      }
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

  /* BANANA TAP */
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

  /* HIT MONKEYS */
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

  /* ---- SURVIVAL SPAWNING ---- */
  if (selectedMode === "survival") {
    spawnInterval = Math.max(minSpawnInterval, baseSpawnInterval - (t * 0.7));
    maxEnemiesOnScreen = 6 + Math.floor(t / 5);
    speed = 1 + (t * 0.03);

    spikeTimer++;
    if (!spikeActive && spikeTimer > 3600 + Math.random() * 600) {
      spikeActive = true;
      spikeDuration = 120 + Math.random() * 60;
      spikeTimer = 0;
    }
    if (spikeActive) {
      spawnInterval *= 0.65;
      speed *= 1.15;
      maxEnemiesOnScreen += 3;
      spikeDuration--;
      if (spikeDuration <= 0) spikeActive = false;
    }
    if (t > 45) spawnInterval *= 0.7;

    spawnTimer++;
    let randomOffset = Math.random() * 10;
    if (spawnTimer >= spawnInterval - randomOffset && monkeys.length < maxEnemiesOnScreen) {
      spawnMonkey();
      spawnTimer = 0;
    }

  /* ---- WAVE SPAWNING ---- */
  } else {
    speed_global = Math.min(1 + (t * 0.025), MAX_SPEED);

    if (waveAnnounceTimer > 0) waveAnnounceTimer--;

    if (wavePhase === "waiting") {
      waveTimer--;
      if (waveTimer <= 0) startNextWave();

    } else if (wavePhase === "spawning") {
      if (currentGroup < spawnGroups.length) {
        const group = spawnGroups[currentGroup];

        if (groupPhase === "pause") {
          groupPauseTimer--;
          if (groupPauseTimer <= 0) {
            groupPhase = "spawning";
            groupSpawnQueue = group.count;
            groupSpawnTimer = 0;
            groupSpawnInterval = group.interval;
          }
        } else if (groupPhase === "spawning") {
          if (groupSpawnQueue > 0) {
            groupSpawnTimer--;
            if (groupSpawnTimer <= 0) {
              spawnMonkey(group.side);
              groupSpawnQueue--;
              groupSpawnTimer = groupSpawnInterval;
            }
          } else {
            currentGroup++;
            groupPhase = "pause";
            groupPauseTimer = currentGroup < spawnGroups.length
              ? spawnGroups[currentGroup].pause
              : 0;
          }
        }
      } else {
        if (monkeys.length === 0) {
          wavePhase = "complete";
          waveMessage = "WAVE " + waveNumber + " COMPLETE!";
          waveAnnounceTimer = 110;
          waveTimer = 110;
        }
      }

    } else if (wavePhase === "complete") {
      waveTimer--;
      if (waveTimer <= 0) {
        wavePhase = "incoming";
        waveMessage = "WAVE " + (waveNumber + 1) + " INCOMING!";
        waveAnnounceTimer = 110;
        waveTimer = 110;
      }

    } else if (wavePhase === "incoming") {
      waveTimer--;
      if (waveTimer <= 0) startNextWave();
    }
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

      if (selectedMode === "survival") {
        if (score > bestScoreSurvival) bestScoreSurvival = score;
      } else {
        if (waveNumber - 1 > bestScoreWave) bestScoreWave = waveNumber - 1;
      }
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

  /* ---- START SCREEN ---- */
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
    ctx.fillText("MONKEYS ELIMINATED", width / 2, 350);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(finalMonkeys, width / 2, 390);

    ctx.fillStyle = "#FFE135";
    ctx.font = "15px 'Press Start 2P'";
    ctx.fillText(startClicked ? "CLICK TO PLAY" : "CLICK TO START", width / 2, height * 0.96);
    return;
  }

  /* ---- MODE SELECT SCREEN ---- */
  if (gameState === "modeSelect") {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = "center";

    ctx.fillStyle = "#FFE135";
    ctx.font = "52px 'Luckiest Guy'";
    ctx.fillText("CHOOSE YOUR MODE", width / 2, height * 0.18);

    let bob = Math.sin(Date.now() * 0.004) * 6;
    ctx.drawImage(punchNeutral, width / 2 - 55, height * 0.22 + bob, 110, 110);

    /* SURVIVAL button */
    drawButton("SURVIVAL", survivalBtnX, survivalBtnY, modeBtnW, modeBtnH, "#27ae60");
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("endless trickle  ·  time score", width / 2, survivalBtnY + 38);
    ctx.fillStyle = "white";
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillText("BEST: " + bestScoreSurvival.toFixed(1) + " SEC", width / 2, survivalBtnY + 56);

    /* WAVE MODE button */
    drawButton("WAVE MODE", waveBtnX, waveBtnY, modeBtnW, modeBtnH, "#8e44ad");
    ctx.fillStyle = "#aaaaaa";
    ctx.font = "9px 'Press Start 2P'";
    ctx.fillText("organized groups  ·  waves score", width / 2, waveBtnY + 38);
    ctx.fillStyle = "white";
    ctx.font = "11px 'Press Start 2P'";
    ctx.fillText("BEST: " + bestScoreWave + " WAVES", width / 2, waveBtnY + 56);

    return;
  }

  /* ---- GAMEPLAY ---- */
  ctx.drawImage(zooBackground, 0, 0, width, height);

  /* PUNCH */
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

  /* HUD */
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "10px 'Press Start 2P'";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  if (selectedMode === "survival") {
    ctx.fillText("SURVIVAL  " + score.toFixed(1) + "s", 10, 10);
  } else {
    ctx.fillText("WAVE MODE  WAVE " + waveNumber, 10, 10);
  }
  ctx.restore();

  /* WAVE ANNOUNCEMENT */
  if (selectedMode === "wave" && waveAnnounceTimer > 0 && waveMessage !== "") {
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

  /* ---- END SCREEN ---- */
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

    ctx.drawImage(punchSad, width / 2 - 70, height * 0.25, 140, 140);

    ctx.fillStyle = "white";

    if (selectedMode === "survival") {
      ctx.font = "13px 'Press Start 2P'";
      ctx.fillText("SURVIVAL TIME", width / 2, height * 0.55);
      ctx.font = "20px 'Press Start 2P'";
      ctx.fillText(finalTime.toFixed(1) + " SEC", width / 2, height * 0.63);
      ctx.font = "13px 'Press Start 2P'";
      ctx.fillText("BEST: " + bestScoreSurvival.toFixed(1) + " SEC", width / 2, height * 0.70);
    } else {
      ctx.font = "13px 'Press Start 2P'";
      ctx.fillText("WAVES SURVIVED", width / 2, height * 0.55);
      ctx.font = "20px 'Press Start 2P'";
      ctx.fillText(waveNumber - 1, width / 2, height * 0.63);
      ctx.font = "13px 'Press Start 2P'";
      ctx.fillText("BEST: " + bestScoreWave + " WAVES", width / 2, height * 0.70);
    }

    ctx.font = "13px 'Press Start 2P'";
    ctx.fillText("MONKEYS ELIMINATED", width / 2, height * 0.78);
    ctx.font = "20px 'Press Start 2P'";
    ctx.fillText(finalMonkeys, width / 2, height * 0.85);

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
