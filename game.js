const socket = io();
const peer = new RTCPeerConnection();
let channel;

// 🎧 ঐচ্ছিক: শুট সাউন্ড
const shootSound = new Audio("shoot.wav");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const player = {
  x: Math.random() * 700 + 50,
  y: 500,
  bullets: [],
  color: "cyan",
  health: 100,
  score: 0,
};

const opponent = {
  x: 400,
  y: 100,
  bullets: [],
  color: "red",
  health: 100,
  score: 0,
};

function draw() {
  ctx.clearRect(0, 0, 800, 600);

  // Player
  drawPlayer(player);
  drawPlayer(opponent);

  // Health bar
  drawHealth(player, 20, 570);
  drawHealth(opponent, 650, 10);

  // Update bullets & check collision
  updateBullets(player, opponent);
  updateBullets(opponent, player);

  document.getElementById("score").innerText = `স্কোর: ${player.score}`;
  document.getElementById("health").innerText = `হেলথ: ${player.health}%`;

  if (player.health <= 0) {
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("💀 আপনি হেরে গেছেন!", 250, 300);
  } else if (opponent.health <= 0) {
    ctx.fillStyle = "yellow";
    ctx.font = "40px Arial";
    ctx.fillText("🏆 আপনি জিতেছেন!", 250, 300);
  }
}

function drawPlayer(p) {
  ctx.fillStyle = p.color;
  ctx.fillRect(p.x, p.y, 30, 30);
}

function drawHealth(p, x, y) {
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, y, 100, 10);
  ctx.fillStyle = "lime";
  ctx.fillRect(x, y, p.health, 10);
}

function updateBullets(shooter, target) {
  shooter.bullets.forEach((b) => {
    b.y += shooter === player ? -10 : 10;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 5, 10);
  });

  shooter.bullets = shooter.bullets.filter((b) => {
    if (b.y < 0 || b.y > 600) return false;

    // Collision check
    if (
      b.x < target.x + 30 &&
      b.x + 5 > target.x &&
      b.y < target.y + 30 &&
      b.y + 10 > target.y
    ) {
      target.health -= 10;
      shooter.score += 1;
      return false;
    }
    return true;
  });
}

document.addEventListener("keydown", (e) => {
  if (player.health <= 0) return;
  if (e.key === "ArrowLeft") player.x = Math.max(0, player.x - 10);
  if (e.key === "ArrowRight") player.x = Math.min(770, player.x + 10);
  if (e.key === " ") shoot();
  sendUpdate();
});

function shoot() {
  player.bullets.push({ x: player.x + 12, y: player.y });
  shootSound.play();
  sendUpdate();
}

setInterval(draw, 30);

// 🌐 WebRTC Setup
async function initConnection() {
  channel = peer.createDataChannel("game");
  setupChannel(channel);

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  socket.emit("offer", offer);
}

socket.on("offer", async (offer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
  await peer.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("candidate", (candidate) => {
  peer.addIceCandidate(new RTCIceCandidate(candidate));
});

peer.onicecandidate = (e) => {
  if (e.candidate) socket.emit("candidate", e.candidate);
};

peer.ondatachannel = (e) => setupChannel(e.channel);

function setupChannel(ch) {
  channel = ch;
  channel.onmessage = (e) => {
    const data = JSON.parse(e.data);
    Object.assign(opponent, data);
  };
}

function sendUpdate() {
  if (channel && channel.readyState === "open") {
    channel.send(JSON.stringify(player));
  }
}

initConnection();
