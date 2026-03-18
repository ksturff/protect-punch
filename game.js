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
   CONTINUOUS DIFFICULTY SYSTEM
---------------------------- */

let difficultyTimer = 0;

let baseSpawnInterval = 150;
let minSpawnInterval = 20;
let spawnInterval = baseSpawnInterval;

let maxEnemiesOnScreen = 10;

/* ---------------------------
   🔥 SPIKE SYSTEM
---------------------------- */

let spikeTimer = 0;
let spikeActive = false;
let spikeDuration = 0;

/* ---------------------------
   DANGER SYSTEM (TUNED)
---------------------------- */

let dangerRadius = 95;

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

difficultyTimer = 0;

spikeTimer = 0;
spikeActive = false;

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

if(Math.random()<0.25 && difficultyTimer > 1800) type="fast";

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

/* CLICK HANDLING */

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

difficultyTimer++;
let t = difficultyTimer / 60;

spawnInterval = Math.max(minSpawnInterval, baseSpawnInterval - (t * 0.7));
maxEnemiesOnScreen = 6 + Math.floor(t / 5);
speed = 1 + (t * 0.03);

spikeTimer++;

if(!spikeActive && spikeTimer > 3600 + Math.random()*600){
spikeActive = true;
spikeDuration = 120 + Math.random()*60;
spikeTimer = 0;
}

if(spikeActive){
spawnInterval *= 0.65;
speed *= 1.15;
maxEnemiesOnScreen += 3;

spikeDuration--;

if(spikeDuration <= 0){
spikeActive = false;
}
}

if(t > 45){
spawnInterval *= 0.7;
}

spawnTimer++;

let randomOffset = Math.random() * 10;

if(spawnTimer >= spawnInterval - randomOffset && monkeys.length < maxEnemiesOnScreen){
spawnMonkey();
spawnTimer = 0;
}

let dangerNearby = false;

if(punch.happyTimer > 0){
punch.happyTimer--;
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

let aggression = 1;
if(dist < 120){
aggression = 1.6;
dangerNearby = true;
}

const targetVX = (dx/dist) * m.speed * aggression;
const targetVY = (dy/dist) * m.speed * aggression;

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

if(punch.happyTimer > 0){
punch.state = "happy";
}
else if(dangerNearby){
punch.state = "sad";
}
else{
punch.state = "neutral";
}

score += 0.016;

}

/* DRAW */

function draw(){

ctx.clearRect(0,0,width,height);
ctx.textBaseline = "middle";

/* START */

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
ctx.font="13px 'Press Start 2P'";
ctx.fillText("BEST: "+bestScore.toFixed(1)+" SEC", width/2, 310);

ctx.fillText("MONKEYS ELIMINATED", width/2, 350);

ctx.font="20px 'Press Start 2P'";
ctx.fillText(finalMonkeys, width/2, 390);

ctx.fillStyle="#FFE135";
ctx.font="15px 'Press Start 2P'";
ctx.fillText(startClicked ? "CLICK TO PLAY" : "CLICK TO START", width/2, height*0.96);

return;

}

/* GAMEPLAY + END */

ctx.drawImage(zooBackground,0,0,width,height);

let punchSprite=punchNeutral;
if(punch.state==="happy") punchSprite=punchHappy;
if(punch.state==="sad") punchSprite=punchSad;

ctx.save();
ctx.translate(punch.x, punch.y);
ctx.scale(punch.facing, 1);
ctx.drawImage(punchSprite, -64, -64, 128, 128);
ctx.restore();

monkeys.forEach(m=>{
const dx=punch.x-m.x;
const dy=punch.y-m.y;
const angle=Math.atan2(dy,dx)-Math.PI/2;
const half=m.drawSize/2;
ctx.save();
ctx.translate(m.x,m.y);
ctx.rotate(angle);
ctx.drawImage(monkeyFrames[currentFrame], -half, -half, m.drawSize, m.drawSize);
ctx.restore();
});

if(gameState==="irisClosing"){
irisRadius -= 18;
ctx.beginPath();
ctx.rect(0,0,width,height);
ctx.arc(punch.x,punch.y,irisRadius,0,Math.PI*2,true);
ctx.fillStyle="black";
ctx.fill();
if(irisRadius <= 0) gameState="end";
}

if(gameState==="end"){

ctx.fillStyle="black";
ctx.fillRect(0,0,width,height);

let pulse = Math.sin(Date.now()*0.005)*5;

ctx.textAlign="center";
ctx.lineWidth = 8;
ctx.strokeStyle = "#2a2a2a";
ctx.fillStyle = "#FFE135";
ctx.font = "64px 'Luckiest Guy'";
ctx.strokeText("PUNCH GOT BULLIED!", width/2, height*0.18+pulse);
ctx.fillText("PUNCH GOT BULLIED!", width/2, height*0.18+pulse);

ctx.drawImage(punchSad, width/2-70, height*0.22, 140, 140);

ctx.fillStyle="white";

ctx.font="13px 'Press Start 2P'";
ctx.fillText("SURVIVAL TIME", width/2, height*0.60);

ctx.font="20px 'Press Start 2P'";
ctx.fillText(finalTime.toFixed(1)+" SEC", width/2, height*0.68);

ctx.font="13px 'Press Start 2P'";
ctx.fillText("BEST: "+bestScore.toFixed(1)+" SEC", width/2, height*0.75);

ctx.font="13px 'Press Start 2P'";
ctx.fillText("MONKEYS ELIMINATED", width/2, height*0.83);

ctx.font="20px 'Press Start 2P'";
ctx.fillText(finalMonkeys, width/2, height*0.90);

drawButton("PLAY AGAIN", playBtnX, btnY, btnW, btnH, "#27ae60");
drawButton("SHARE", shareBtnX, btnY, btnW, btnH, "#2980b9");

}

}

function loop(){
update();
draw();
requestAnimationFrame(loop);
}

loop();
