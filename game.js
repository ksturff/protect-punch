const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const shareBtn = document.getElementById("shareBtn");

const width = canvas.width;
const height = canvas.height;

let gameState = "start"; // start, playing, irisClosing, end

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

function resetGame(){

gameState = "start";

punch = {
x: width/2,
y: height/2,
size:45,
state:"neutral",
happyTimer:0
};

monkeys = [];

score = 0;
spawnTimer = 0;
speed = 1.2;

monkeysDefeated = 0;

finalTime = 0;
finalMonkeys = 0;

restartBtn.style.display="none";
shareBtn.style.display="none";

irisRadius = 900;

/* reset music */

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

monkeys.push({
x:x,
y:y,
size: type==="fast" ? 14 : 20,
speed: type==="fast" ? speed*1.8 : speed,
hit:false,
vx:0,
vy:0
});

}

/* ---------------------------
   CLICK HANDLING
---------------------------- */

canvas.addEventListener("click",function(e){

if(gameState==="start"){

gameState="playing";

/* start background music */

backgroundMusic.currentTime = 0;
backgroundMusic.play();

return;

}

if(gameState!=="playing") return;

const rect = canvas.getBoundingClientRect();

const mouseX = (e.clientX-rect.left)*(canvas.width/rect.width);
const mouseY = (e.clientY-rect.top)*(canvas.height/rect.height);

for(let i=monkeys.length-1;i>=0;i--){

const m = monkeys[i];

const dx = mouseX-m.x;
const dy = mouseY-m.y;

const dist = Math.sqrt(dx*dx+dy*dy);

if(dist < m.size + 12){

m.hit = true;

/* punch sound */

punchSound.currentTime = 0;
punchSound.play();

const angle = Math.atan2(dy,dx);

m.vx = Math.cos(angle) * -6;
m.vy = Math.sin(angle) * -6;

punch.state="happy";
punch.happyTimer=45;

}

}

});

function update(){

if(gameState!=="playing") return;

/* animate monkeys */

frameTimer++;

if(frameTimer > frameSpeed){

currentFrame++;
if(currentFrame >= monkeyFrames.length) currentFrame = 0;

frameTimer = 0;

}

/* spawn */

spawnTimer++;

let spawnRate = 80 - score*0.35;
if(spawnRate < 25) spawnRate = 25;

if(spawnTimer > spawnRate){

spawnMonkey();

if(score > 35 && Math.random() < 0.35)
spawnMonkey();

spawnTimer = 0;

}

/* punch emotion */

if(punch.happyTimer > 0){
punch.happyTimer--;
if(punch.happyTimer === 0)
punch.state="neutral";
}

/* monkeys */

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

/* game over */

if(dist < punch.size){

gameState="irisClosing";

finalTime=score;
finalMonkeys=monkeysDefeated;

/* play lose sound */

loseSound.play();

/* stop music */

backgroundMusic.pause();

restartBtn.style.display="inline-block";
shareBtn.style.display="inline-block";

if(score > bestScore)
bestScore=score;

}

}

score += 0.016;
speed = 1.2 + score * 0.03;

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
ctx.font="56px 'Luckiest Guy'";
ctx.fillText("PROTECT PUNCH", width/2,180);

let bob = Math.sin(Date.now()*0.004)*10;

ctx.drawImage(
punchNeutral,
width/2-64,
260 + bob,
200,
200
);

ctx.fillStyle="white";
ctx.font="16px 'Press Start 2P'";
ctx.fillText("CLICK MONKEYS BEFORE", width/2,440);
ctx.fillText("THEY REACH PUNCH", width/2,470);

ctx.fillStyle="#FFE135";
ctx.font="18px 'Press Start 2P'";
ctx.fillText("CLICK TO START", width/2,540);

ctx.fillStyle="white";
ctx.font="12px 'Press Start 2P'";
ctx.fillText("BEST TIME: "+bestScore.toFixed(1)+" SEC", width/2,80);

return;

}

/* GAMEPLAY */

ctx.drawImage(zooBackground,0,0,width,height);

let punchSprite=punchNeutral;

if(punch.state==="happy") punchSprite=punchHappy;
if(punch.state==="sad") punchSprite=punchSad;

ctx.drawImage(
punchSprite,
punch.x-64,
punch.y-64,
200,
200
);

/* monkeys */

monkeys.forEach(m=>{

const dx=punch.x-m.x;
const dy=punch.y-m.y;

const angle=Math.atan2(dy,dx)-Math.PI/2;

ctx.save();
ctx.translate(m.x,m.y);
ctx.rotate(angle);

ctx.drawImage(
monkeyFrames[currentFrame],
-32,
-32,
64,
64
);

ctx.restore();

});

/* HUD */

ctx.fillStyle="black";
ctx.font="20px Arial";
ctx.textAlign="left";

ctx.fillText("Time: "+score.toFixed(1),10,25);
ctx.fillText("Best: "+bestScore.toFixed(1),10,50);

/* IRIS CLOSE */

if(gameState==="irisClosing"){

irisRadius -= 18;

ctx.beginPath();
ctx.rect(0,0,width,height);
ctx.arc(punch.x,punch.y,irisRadius,0,Math.PI*2,true);
ctx.fillStyle="black";
ctx.fill();

if(irisRadius <= 0){
gameState="end";
}

}

/* END SCREEN */

if(gameState==="end"){

ctx.fillStyle="black";
ctx.fillRect(0,0,width,height);

let pulse = Math.sin(Date.now()*0.005)*6;

ctx.textAlign="center";

ctx.lineWidth = 8;
ctx.strokeStyle = "#2a2a2a";
ctx.fillStyle = "#FFE135";
ctx.font = "48px 'Luckiest Guy'";

ctx.strokeText("PUNCH GOT BULLIED!", width/2,90+pulse);
ctx.fillText("PUNCH GOT BULLIED!", width/2,90+pulse);

ctx.drawImage(
punchSad,
width/2-64,
220,
128,
128
);

ctx.fillStyle="white";

ctx.font="16px 'Press Start 2P'";
ctx.fillText("SURVIVAL TIME", width/2,390);

ctx.font="22px 'Press Start 2P'";
ctx.fillText(finalTime.toFixed(1)+" SEC", width/2,430);

ctx.font="16px 'Press Start 2P'";
ctx.fillText("MONKEYS ELIMINATED", width/2,490);

ctx.font="22px 'Press Start 2P'";
ctx.fillText(finalMonkeys, width/2,530);

}

}

function loop(){

update();
draw();

requestAnimationFrame(loop);

}

loop();

/* buttons */

restartBtn.onclick=function(){
resetGame();
};

shareBtn.onclick=function(){

const text =
"I survived "+finalTime.toFixed(1)+" seconds and eliminated "+
finalMonkeys+" monkeys in Protect Punch 🐒";

const url=window.location.href;

const twitter="https://twitter.com/intent/tweet?text="+
encodeURIComponent(text)+"&url="+encodeURIComponent(url);

const facebook="https://www.facebook.com/sharer/sharer.php?u="+
encodeURIComponent(url);

const choice=prompt(
"Share your score!\n\n1 = Twitter/X\n2 = Facebook\n3 = Copy Link"
);

if(choice==="1") window.open(twitter,"_blank");
else if(choice==="2") window.open(facebook,"_blank");
else if(choice==="3"){
navigator.clipboard.writeText(url);
alert("Link copied!");
}

};
