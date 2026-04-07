let gameState = 'START'; // START, PLAYING, GAMEOVER, WIN
let level = 1;
let levelStartTime = 0;
let prepDelay = 800; // 0.8秒準備時間
let transitionDuration = 2000; // 2秒平滑過渡時間
let topPoints = [];
let bottomPoints = [];
let numPoints = 5;
let gem = { x: 0, y: 0, r: 20 }; // 縮小寶石，確保其能容納在隧道內
let waveSpeed = 0.03;      // 擺動速度
let waveAmplitude = 25;    // 擺動幅度
let waveFrequency = 0.6;   // 波浪密度
let driftSpeed = 0.01;     // 頂點隨機漂移的速度
let driftAmplitude = 40;   // 頂點隨機漂移的最大幅度
let thiefImg;
let loseImg;
let winImg;
let checkImg;

// 警衛巡視相關變數
let guardState = 'IDLE'; // IDLE, WARNING, ACTIVE
let guardTimer = 0;
let nextGuardTime = 0;
let lastMouseX = 0;
let lastMouseY = 0;

function preload() {
  // 預載怪盜圖片
  thiefImg = loadImage('怪盜.png');
  loseImg = loadImage('輸了.png');
  winImg = loadImage('鑑定.png');
  checkImg = loadImage('檢查.png');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  initMaze();
}

function getCurrentAmplitude() {
  // 第一關或是非遊戲進行狀態（如選單）顯示完整擺幅供玩家觀察
  if (level < 2) return 0;
  if (gameState !== 'PLAYING') return waveAmplitude;
  if (guardState !== 'IDLE') return 0; // 警衛來時隧道停止移動

  let elapsed = millis() - levelStartTime;
  if (elapsed < prepDelay) return 0;

  // 在準備時間結束後，根據經過的時間比例計算當前振幅 (0 -> waveAmplitude)
  return map(elapsed, prepDelay, prepDelay + transitionDuration, 0, waveAmplitude, true);
}

function initMaze() {
  numPoints = 5 + floor(level / 2); // 隨等級增加點的數量，讓迷宮越來越長、越曲折
  topPoints = [];
  bottomPoints = [];
  let spacing = width / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    let px = i * spacing;
    let py, distance;

    if (i === 0) {
      // 固定起點位置與寬度，方便玩家開始
      py = height / 2 - 25;
      distance = 50;
    } else if (i === numPoints - 1) {
      // 固定終點（寶石處）的寬度，確保寶石在隧道內
      py = random(height * 0.3, height * 0.6);
      distance = 60; // 給予較大的空間容納寶石
    } else {
      // 隨機生成後續路徑
      py = random(height * 0.2, height * 0.7);
      distance = random(20, 50);
    }

    topPoints.push({ x: px, y: py });
    bottomPoints.push({ x: px, y: py + distance });
  }

  // 設定寶石在最後一個段落（X 座標固定，Y 會隨波浪動態計算）
  gem.x = width - 60;
}

function draw() {
  // 根據警衛狀態改變背景顏色
  if (guardState === 'WARNING' || guardState === 'ACTIVE') {
    background(100, 10, 10); // 警報紅背景
  } else {
    background(10, 10, 20); // 深色背景
  }

  if (gameState === 'START') {
    drawStartScreen();
  } else if (gameState === 'PLAYING') {
    updateGuard();
    drawMaze();
    checkCollision();

    // 警衛狀態視覺特效
    if (guardState === 'WARNING') drawCheckAlert();
    if (guardState === 'ACTIVE') drawFlashlightEffect();

  } else if (gameState === 'GAMEOVER') {
    drawEndScreen("警報響起！怪盜被捕了", color(255, 50, 50));
  } else if (gameState === 'WIN') {
    drawEndScreen(`達成任務！進入第 ${level + 1} 關`, color(50, 255, 255));
  }
}

function updateGuard() {
  if (level < 3) return; // 從第三關開始有警衛

  let now = millis();
  if (guardState === 'IDLE' && now > nextGuardTime) {
    guardState = 'WARNING';
    guardTimer = now + 1000; // 1秒預警
  } else if (guardState === 'WARNING' && now > guardTimer) {
    guardState = 'ACTIVE';
    guardTimer = now + random(2000, 5000); // 警衛待 2-5 秒
    // 進入巡視瞬間記錄滑鼠位置
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  } else if (guardState === 'ACTIVE' && now > guardTimer) {
    guardState = 'IDLE';
    nextGuardTime = now + random(5000, 10000); // 下次警衛出現間隔 5-10 秒
  }
}

function drawStartScreen() {
  drawMaze(); // 顯示隧道

  // 背景半透明遮罩
  if (guardState !== 'IDLE') 
    fill(150, 0, 0, 127); // 預警時封面變紅
  else
    fill(0, 50, 200, 127); // 藍色全螢幕
  rect(0, 0, width, height);

  // 繪製怪盜圖片 (置中並根據螢幕高度縮放)
  push();
  imageMode(CENTER);
  let displayHeight = min(height * 0.6, 754); // 最高不超過原圖高度，且佔螢幕約 60%
  let displayWidth = displayHeight * (720 / 754); // 保持比例
  image(thiefImg, width / 2, height / 2, displayWidth, displayHeight);

  // 在圖案上寫著「怪盜偷寶石」
  fill(255);
  stroke(0);
  strokeWeight(4);
  textAlign(CENTER, CENTER);
  textSize(min(displayWidth * 0.15, 60)); // 根據圖片大小調整字體
  text("怪盜偷寶石", width / 2, height / 2);
  pop();

  drawStartButton(); // 繪製動態開始按鈕

  fill(255);
  noStroke();
  textAlign(CENTER);
  textSize(18);
  text("請點擊隧道入口處的「START」開始任務", width / 2, height - 50);
}

function drawStartButton() {
  let amp = getCurrentAmplitude();
  let startOffset = sin(frameCount * waveSpeed) * amp;

  // 繪製跟隨隧道波動的綠色區域
  fill(0, 255, 0, 150);
  noStroke();
  rect(0, topPoints[0].y + startOffset, 60, bottomPoints[0].y - topPoints[0].y);
  
  fill(255);
  textAlign(CENTER);
  textSize(12);
  text("START", 30, (topPoints[0].y + bottomPoints[0].y) / 2 + startOffset + 5);
}

function drawMaze() {
  let amp = getCurrentAmplitude();
  // 從第 3 關開始產生頂點獨立漂移，難度隨等級提升
  let currentDriftAmp = (level >= 3 && gameState === 'PLAYING' && guardState === 'IDLE') ? map(level, 3, 10, 15, driftAmplitude, true) : 0;
  let driftTime = frameCount * driftSpeed;

  // 精確計算寶石所在位置的上下邊界 Y 座標（用於繪製包裹射線）
  let spacing = width / (numPoints - 1);
  let seg = floor(gem.x / spacing);
  let pct = (gem.x - topPoints[seg].x) / (topPoints[seg + 1].x - topPoints[seg].x);
  
  let w0 = sin(frameCount * waveSpeed + seg * waveFrequency) * amp;
  let w1 = sin(frameCount * waveSpeed + (seg + 1) * waveFrequency) * amp;
  let d0 = (noise(seg, driftTime) - 0.5) * currentDriftAmp;
  let d1 = (noise(seg + 1, driftTime) - 0.5) * currentDriftAmp;
  
  let gemTopY = lerp(topPoints[seg].y, topPoints[seg + 1].y, pct) + lerp(w0, w1, pct) + lerp(d0, d1, pct);
  let gemBotY = lerp(bottomPoints[seg].y, bottomPoints[seg + 1].y, pct) + lerp(w0, w1, pct) + lerp(d0, d1, pct);
  gem.y = (gemTopY + gemBotY) / 2;

  // 1. 先繪製寶石 (讓後續的紫色射線輝光覆蓋在其上，形成「包裹」感)
  push();
  fill(0, 255, 255);
  noStroke();
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = color(0, 255, 255);
  beginShape(); // 鑽石形狀
  vertex(gem.x, gem.y - gem.r);
  vertex(gem.x + gem.r * 0.7, gem.y);
  vertex(gem.x, gem.y + gem.r);
  vertex(gem.x - gem.r * 0.7, gem.y);
  endShape(CLOSE);
  pop();

  // 繪製發光的紫外線邊界
  push();
  noFill();
  strokeWeight(3);
  stroke(200, 0, 255); // 紫色紫外線
  drawingContext.shadowBlur = 20;
  drawingContext.shadowColor = color(200, 0, 255);

  // 繪製上邊界
  beginShape();
  for (let i = 0; i < topPoints.length; i++) {
    let waveOffset = sin(frameCount * waveSpeed + i * waveFrequency) * amp;
    let driftOffset = (noise(i, driftTime) - 0.5) * currentDriftAmp;
    vertex(topPoints[i].x, topPoints[i].y + waveOffset + driftOffset);
  }
  endShape();

  // 繪製下邊界
  beginShape();
  for (let i = 0; i < bottomPoints.length; i++) {
    let waveOffset = sin(frameCount * waveSpeed + i * waveFrequency) * amp;
    let driftOffset = (noise(i, driftTime) - 0.5) * currentDriftAmp;
    vertex(bottomPoints[i].x, bottomPoints[i].y + waveOffset + driftOffset);
  }
  endShape();

  // 2. 繪製包裹寶石的垂直垂直射線 (雷射籠效果)
  line(gem.x - gem.r, gemTopY, gem.x - gem.r, gemBotY);
  line(gem.x + gem.r, gemTopY, gem.x + gem.r, gemBotY);
  pop();

  // 顯示目前的關卡
  fill(255);
  noStroke();
  textSize(20);
  textAlign(LEFT);
  text(`Level: ${level}`, 20, 50);

  // 提示滑鼠位置
  fill(255, 200);
  noStroke();
  circle(mouseX, mouseY, 8);
}

function checkCollision() {
  let amp = getCurrentAmplitude();
  let currentDriftAmp = (level >= 3 && gameState === 'PLAYING' && guardState === 'IDLE') ? map(level, 3, 10, 15, driftAmplitude, true) : 0;
  let driftTime = frameCount * driftSpeed;

  // 1. 檢查是否超出畫面左右
  if (mouseX < 0 || mouseX > width) gameState = 'GAMEOVER';

  // 2. 核心邏輯：計算當前 mouseX 位置對應的上下邊界
  let spacing = width / (numPoints - 1);
  let segment = floor(mouseX / spacing);
  
  if (segment >= 0 && segment < numPoints - 1) {
    let x0 = topPoints[segment].x;
    let x1 = topPoints[segment + 1].x;
    let pct = (mouseX - x0) / (x1 - x0);

    // 計算當前段落兩個端點的動態偏移
    let wave0 = sin(frameCount * waveSpeed + segment * waveFrequency) * amp;
    let wave1 = sin(frameCount * waveSpeed + (segment + 1) * waveFrequency) * amp;

    let drift0 = (noise(segment, driftTime) - 0.5) * currentDriftAmp;
    let drift1 = (noise(segment + 1, driftTime) - 0.5) * currentDriftAmp;

    let currentWaveOffset = lerp(wave0, wave1, pct);
    let currentDriftOffset = lerp(drift0, drift1, pct);

    // 線性插值取得當前滑鼠位置的上下限制
    let currentTopY = lerp(topPoints[segment].y, topPoints[segment + 1].y, pct) + currentWaveOffset + currentDriftOffset;
    let currentBottomY = lerp(bottomPoints[segment].y, bottomPoints[segment + 1].y, pct) + currentWaveOffset + currentDriftOffset;

    if (mouseY <= currentTopY || mouseY >= currentBottomY) {
      gameState = 'GAMEOVER';
    }
  }

  // 4. 檢查警衛巡視時的移動
  if (guardState === 'ACTIVE') {
    if (dist(mouseX, mouseY, lastMouseX, lastMouseY) > 3) {
      gameState = 'GAMEOVER';
    }
  }

  // 3. 檢查是否偷到寶石
  let d = dist(mouseX, mouseY, gem.x, gem.y);
  if (d < gem.r) gameState = 'WIN'; // 調整判定範圍，讓玩家更容易碰到寶石中心
}

function drawEndScreen(msg, clr) {
  drawMaze(); // 讓玩家看到下一關或目前的隧道位置

  // 半透明遮罩
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);

  drawStartButton(); // 顯示動態開始按鈕

  // 計算響應式圖片高度（視窗高度的 30%，最大不超過 300px）
  let endImgHeight = min(height * 0.3, 300);

  // 如果是失敗狀態，在文字上方顯示「輸了.png」圖片
  if (gameState === 'GAMEOVER') {
    push();
    imageMode(CENTER);
    let displayWidth = endImgHeight * (loseImg.width / loseImg.height);
    image(loseImg, width / 2, height / 2 - endImgHeight * 0.7, displayWidth, endImgHeight);
    pop();
  } else if (gameState === 'WIN') {
    // 如果是勝利狀態，在文字上方顯示「鑑定.png」圖片
    push();
    imageMode(CENTER);
    let displayWidth = endImgHeight * (winImg.width / winImg.height);
    image(winImg, width / 2, height / 2 - endImgHeight * 0.7, displayWidth, endImgHeight);
    pop();
  }

  fill(clr);
  textAlign(CENTER);
  textSize(28);
  text(msg, width / 2, height / 2 + 30);

  // 按鈕參數
  let btnW = 200;
  let btnH = 60;
  let btnY = height - 120;
  let restartX = width / 2 - 220; // 修正為與點擊偵測一致
  let continueX = width / 2 + 20;

  // 「重新開始」按鈕
  fill(100, 100, 100, 200);
  stroke(255);
  rect(restartX, btnY, btnW, btnH, 10);
  noStroke();
  fill(255);
  textSize(20);
  text("重新開始 (Lv.1)", restartX + btnW / 2, btnY + btnH / 2 + 7);

  // 「繼續挑戰」按鈕
  fill(0, 150, 0, 200);
  stroke(255);
  rect(continueX, btnY, btnW, btnH, 10);
  noStroke();
  fill(255);
  // 根據勝負狀態顯示不同的按鈕文字
  let continueText = (gameState === 'WIN') ? "進入下一關" : "繼續挑戰";
  text(continueText, continueX + btnW / 2, btnY + btnH / 2 + 7);
}

function mousePressed() {
  let currentAmplitude = (level >= 2) ? waveAmplitude : 0;
  let startOffset = sin(frameCount * waveSpeed) * currentAmplitude;
  let safeTop = topPoints[0].y + startOffset;
  let safeBottom = bottomPoints[0].y + startOffset;

  let btnW = 200;
  let btnH = 60;
  let btnY = height - 120;
  let restartX = width / 2 - 220;
  let continueX = width / 2 + 20;

  if (gameState === 'START') {
    // 初始畫面點擊隧道入口開始
    if (mouseX < 60 && mouseY > safeTop && mouseY < safeBottom) {
      enterMaze(); // 真正進入迷宮開始偵測碰撞
    }
  } else if (gameState === 'GAMEOVER' || gameState === 'WIN') {
    // 按下底部按鈕後，重設關卡並回到「預備開始」狀態，讓玩家手動點擊入口開始
    if (mouseX > restartX && mouseX < restartX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      level = 1;
      prepareLevel(); 
    }
    if (mouseX > continueX && mouseX < continueX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      if (gameState === 'WIN') level++;
      prepareLevel();
    }
  }
}

// 準備關卡 (顯示預備畫面，不偵測碰撞)
function prepareLevel() {
  initMaze();
  gameState = 'START'; 
  guardState = 'IDLE';
}

// 真正開始挑戰 (開始偵測碰撞與警衛巡邏)
function enterMaze() {
  gameState = 'PLAYING';
  levelStartTime = millis();
  nextGuardTime = millis() + random(3000, 6000);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initMaze();
  gameState = 'START';
}

function drawCheckAlert() {
  push();
  imageMode(CENTER);
  // 檢查.png 在中間出現，高度比例約為畫面 40%
  let h = min(height * 0.4, 400);
  let w = h * (checkImg.width / checkImg.height);
  
  // 加入輕微的縮放脈動感
  let pulse = 1 + sin(frameCount * 0.2) * 0.05;
  image(checkImg, width / 2, height / 2, w * pulse, h * pulse);
  pop();
}

function drawFlashlightEffect() {
  push();
  fill(0, 0, 0, 240); // 深色遮罩，增加深夜潛入感
  noStroke();
  
  // 探照燈移動軌跡 (S型移動掃描)
  let lx = map(sin(frameCount * 0.03), -1, 1, 100, width - 100);
  let ly = map(cos(frameCount * 0.02), -1, 1, 100, height - 100);
  let r = 180; // 探照燈亮度範圍

  beginShape();
  // 外部全螢幕矩形
  vertex(0, 0); vertex(width, 0); vertex(width, height); vertex(0, height);
  
  // 內部挖出一個圓形的洞 (逆時針繪製點以形成孔洞)
  beginContour();
  for (let i = 0; i <= 36; i++) {
    let a = TWO_PI * i / 36;
    vertex(lx + cos(-a) * r, ly + sin(-a) * r);
  }
  endContour();
  endShape(CLOSE);
  pop();
}
