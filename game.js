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

let spawnTimer;
let speed;

let irisRadius = 900;

let monkeysDefeated = 0;

let finalTime = 0;
let finalMonkeys = 0;

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

function drawButton(label, x, y, w, h, color){
ctx.save();

ctx.shadowColor = "rgba(0,0,0,0.4)";
ctx.shadowBlur = 8;
ctx.shadowOffsetY = 4;

ctx.fillStyle = color;
ctx.beginPath();
ctx.roundRect(x - w/2, y - h/2, w, h, 12);
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

function isInsideButton(mx, my, x, y, w, h){
return mx > x - w/2 && mx < x + w/2 && my > y - h/2 && my < y + h/2;
}

/* button positions */
const btnY = height * 0.95;
const btnW = 160;
const btnH = 44;
const playBtnX = width/2 - 160;
const shareBtnX = width/2 + 160;

function resetGame(){

gameState = "start";
startClicked = false;

punch = {
x: width/2,
y: height/2,
size: 45,
state: "neutral",
happyTimer: 0,
facing: 1
};

monkeys = [];

score = 0;
spawnTimer = 0;
speed = 1.0;

monkeysDefeated = 0;

finalTime = 0;
finalMonkeys = 0;

restartBtn.style.display="none";
shareBtn.style.display="none";

irisRadius = 900;

backgroundMusic.pause();
backgroundMusic.currentTime = 0;

}

resetGame();

function spawnMonkey(){

const side = Math.floor(Math.random()*4);

let x,y;

if(side===0){x=0;y=Math.random()*height;}
else if(side===1){x=width;y=Math.random()*height;}
else if(side===2){x=Math.random()*width;y=0;}
else{x=Math.random()*width;y=height;}

let type="normal";

if(Math.random()<0.25) type="fast";

const sizeVariation = 1.15;
const baseSize = type==="fast" ? 14 : 20;
const finalSize = Math.round(baseSize * sizeVariation);
const baseDrawSize = 64;
const finalDrawSize = Math.round(baseDrawSize * sizeVariation);

monkeys.push({
x:x,
y:y,
size: finalSize,
drawSize: finalDrawSize,
speed: type==="fast" ? speed*1.5 : speed,
hit:false,
vx:0,
vy:0
});

}

/* ---------------------------
   CLICK HANDLING
---------------------------- */

canvas.addEventListener("click",function(e){

const rect = canvas.getBoundingClientRect();
const mouseX = (e.clientX-rect.left)*(canvas.width/rect.width);
const mouseY = (e.clientY-rect.top)*(canvas.height/rect.height);

if(gameState==="start"){

if(!startClicked){
startClicked = true;
backgroundMusic.currentTime = 0;
backgroundMusic.play();
return;
}

gameState="playing";
backgroundMusic.currentTime = 0;
return;

}

if(gameState==="end"){

if(isInsideButton(mouseX, mouseY, playBtnX, btnY, btnW, btnH)){
resetGame();
return;
}

if(isInsideButton(mouseX, mouseY, shareBtnX, btnY, btnW, btnH)){
const text = "I survived "+finalTime.toFixed(1)+" seconds and eliminated "+finalMonkeys+" monkeys in Protect Punch 🐒";
const url = window.location.href;
const twitter = "https://twitter.com/intent/tweet?text="+encodeURIComponent(text)+"&url="+encodeURIComponent(url);
const facebook = "https://www.facebook.com/sharer/sharer.php?u="+encodeURIComponent(url);
const choice = prompt("Share your score!\n\n1 = Twitter/X\n2 = Facebook\n3 = Copy Link");
if(choice==="1") window.open(twitter,"_blank");
else if(choice==="2") window.open(facebook,"_blank");
else if(choice==="3"){ navigator.clipboard.writeText(url); alert("Link copied!"); }
return;
}

}

if(gameState!=="playing") return;

for(let i=monkeys.length-1;i>=0;i--){

const m = monkeys[i];

const dx = mouseX-m.x;
const dy = mouseY-m.y;

const dist = Math.sqrt(dx*dx+dy*dy);

if(dist < m.size + 20){

m.hit = true;

punchSound.currentTime = 0;
punchSound.play();

const angle = Math.atan2(dy,dx);

m.vx = Math.cos(angle) * -6;
m.vy = Math.sin(angle) * -6;

punch.state="happy";
punch.happyTimer=45;
punch.facing = m.x < punch.x ? 1 : -1;

}

}

});

function update(){

if(gameState!=="playing") return;

frameTimer++;

if(frameTimer > frameSpeed){
currentFrame++;
if(currentFrame >= monkeyFrames.length) currentFrame = 0;
frameTimer = 0;
}

spawnTimer++;

let spawnRate = 80 - score*0.35;
if(spawnRate < 25) spawnRate = 25;

if(spawnTimer > spawnRate){
spawnMonkey();
if(score > 35 && Math.random() < 0.35) spawnMonkey();
spawnTimer = 0;
}

if(punch.happyTimer > 0){
punch.happyTimer--;
if(punch.happyTimer === 0) punch.state="neutral";
}

for(let i=monkeys.length-1;i>=0;i--){

const m = monkeys[i];

if(m.hit){
m.x += m.vx;
m.y += m.vy;
m.vx *= 0.85;
m.vy *= 0.85;
if(Math.abs(m.vx)<0.5 && Math.abs(m.vy)<0.5){
monkeys.splice(i,1);
monkeysDefeated++;
}
continue;
}

const dx = punch.x-m.x;
const dy = punch.y-m.y;
const dist = Math.sqrt(dx*dx+dy*dy)||0.001;

const targetVX = (dx/dist) * m.speed;
const targetVY = (dy/dist) * m.speed;

m.vx += (targetVX - m.vx) * 0.08;
m.vy += (targetVY - m.vy) * 0.08;

m.x += m.vx;
m.y += m.vy;

if(dist < punch.size){

gameState="irisClosing";
finalTime=score;
finalMonkeys=monkeysDefeated;

loseSound.play();
backgroundMusic.pause();

if(score > bestScore) bestScore=score;

}

}

score += 0.016;

if(score < 10){
speed = 1.0;
} else {
speed = 1.0 + (score - 10) * 0.02;
}

}

/* ---------------------------
   DRAWING
---------------------------- */

function draw(){

ctx.clearRect(0,0,width,height);

/* START SCREEN */

if(gameState==="start"){

ctx.fillStyle="#111";
ctx.fillRect(0,0,width,height);

ctx.textAlign="center";

ctx.fillStyle="#FFE135";
ctx.font="72px 'Luckiest Guy'";
ctx.fillText("PROTECT PUNCH", width/2, height*0.22);

let bob = Math.sin(Date.now()*0.004)*8;

ctx.drawImage(punchNeutral, width/2-70, height*0.28+bob, 140, 140);

ctx.fillStyle="white";
ctx.font="13px 'Pressalign-items: center;
justify-content: center;
}

canvas {
display: block;
touch-action: none;
max-width: 100vw;
max-height: 100dvh;
width: auto;
height: auto;
aspect-ratio: 16 / 9;
}

#muteBtn {
position: fixed;
top: 10px;
right: 10px;
font-size: 16px;
padding: 6px 12px;
z-index: 10;
cursor: pointer;
}

#restartBtn, #shareBtn {
position: fixed;
bottom: 20px;
font-size: clamp(14px, 2vw, 18px);
padding: 10px 20px;
cursor: pointer;
z-index: 10;
}

#restartBtn {
left: 50%;
transform: translateX(-120%);
}

#shareBtn {
left: 50%;
transform: translateX(20%);
}

@media (orientation: portrait) and (max-width: 768px) {
body::before {
content: "Please rotate your device to play 🔄";
display: flex;
justify-content: center;
align-items: center;
height: 100dvh;
width: 100vw;
font-size: 24px;
font-family: Arial;
color: white;
background: #000;
position: fixed;
top: 0;
left: 0;
z-index: 999;
text-align: center;
padding: 20px;
}
}

</style>
</head>
<body>

<!-- SOUND TOGGLE -->
<button id="muteBtn">🔊 Sound</button>

<!-- GAME CANVAS -->
<div id="gameWrapper">
<canvas id="gameCanvas" width="800" height="450"></canvas>
</div>

<!-- GAME BUTTONS -->
<button id="restartBtn" style="display:none;">Play Again</button>
<button id="shareBtn" style="display:none;">Share Score</button>

<script src="game.js"></script>
<script data-goatcounter="https://protectpunch.goatcounter.com/count"
      async src="//gc.zgo.at/count.js"></script>

</body>
</html>
