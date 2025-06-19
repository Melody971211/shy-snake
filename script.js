// 遊戲相關變數
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameWrapper = document.getElementById('gameWrapper'); // 新增遊戲畫布的包裹層
const scoreDisplay = document.getElementById('score');
const timeDisplay = document.getElementById('time');
const startButton = document.getElementById('startButton');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreDisplay = document.getElementById('finalScore');
const finalTimeDisplay = document.getElementById('finalTime');
const playerNameInput = document.getElementById('playerNameInput');
const saveScoreButton = document.getElementById('saveScoreButton');
const restartButton = document.getElementById('restartButton');
const leaderboardList = document.getElementById('leaderboardList');

const gridSize = 20; // 每個方塊的大小
const canvasSize = 400; // 畫布大小

let snake; // 蛇的身體部分
let food; // 食物位置
let dx; // 蛇在 X 軸的移動方向 (1: 右, -1: 左)
let dy; // 蛇在 Y 軸的移動方向 (1: 下, -1: 上)
let score;
let gameInterval; // 遊戲主循環的計時器
let gameRunning = false;
let playTime;
let timerInterval; // 計時器的計時器
let changingDirection = false; // 旗標，用於防止在同一幀內多次改變方向

// 觸控相關變數
let touchStartX = 0;
let touchStartY = 0;
const minSwipeDistance = 30; // 最小滑動距離，避免誤觸

// 儲存排行榜的 localStorage 鍵名
const LEADERBOARD_KEY = 'snakeLeaderboard';

// --- 遊戲繪圖與核心邏輯 ---

// 繪製單個方塊
function drawRect(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
    ctx.strokeStyle = '#2c3e50'; // 邊框顏色
    ctx.strokeRect(x * gridSize, y * gridSize, gridSize, gridSize); // 繪製邊框
}

// 繪製蛇
function drawSnake() {
    snake.forEach((segment, index) => {
        // 為蛇身添加漸變色，增加質感
        const hue = (index / snake.length) * 120 + 90; // 從綠色到淺綠色
        const saturation = 70 + (index % 2) * 10;
        const lightness = 50 + (index % 2) * 5;
        const segmentColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        drawRect(segment.x, segment.y, segmentColor);
    });
}

// 繪製食物
function drawFood() {
    // 食物使用圓形，並添加光澤感
    const foodX = food.x * gridSize + gridSize / 2;
    const foodY = food.y * gridSize + gridSize / 2;
    const radius = gridSize / 2 * 0.8; // 稍微小一點

    ctx.beginPath();
    ctx.arc(foodX, foodY, radius, 0, Math.PI * 2);

    // 放射狀漸變，模擬光澤
    const gradient = ctx.createRadialGradient(foodX, foodY, radius * 0.2, foodX, foodY, radius);
    gradient.addColorStop(0, '#f1c40f'); // 黃色中心
    gradient.addColorStop(1, '#e67e22'); // 橘色邊緣
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();
}

// 生成隨機食物位置
function generateFood() {
    let newFoodX, newFoodY;
    let collision;
    do {
        newFoodX = Math.floor(Math.random() * (canvasSize / gridSize));
        newFoodY = Math.floor(Math.random() * (canvasSize / gridSize));
        // 確保食物不會生成在蛇身上
        collision = snake.some(segment => segment.x === newFoodX && segment.y === newFoodY);
    } while (collision);
    food = { x: newFoodX, y: newFoodY };
}

// 更新遊戲狀態
function updateGame() {
    if (!gameRunning) return;

    // 清空畫布
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    // 計算新的蛇頭位置
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // 碰撞檢測
    // 碰到牆壁
    if (head.x < 0 || head.x >= canvasSize / gridSize ||
        head.y < 0 || head.y >= canvasSize / gridSize) {
        gameOver();
        return;
    }
    // 碰到自己
    // 注意：這裡從 i=4 開始檢查，因為蛇短於4節時不可能撞到自己。
    // 如果蛇很短就發生碰撞，可能是因為遊戲速度過快或邏輯問題。
    for (let i = 4; i < snake.length; i++) { // 從第4節開始檢查，避免剛開始就撞到自己
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    // 將新蛇頭加入蛇身
    snake.unshift(head);

    // 判斷是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreDisplay.textContent = score;
        generateFood(); // 重新生成食物
    } else {
        snake.pop(); // 移除蛇尾 (如果沒吃到食物)
    }

    drawFood();
    drawSnake();
    changingDirection = false; // 允許下次方向改變
}

// 處理鍵盤輸入 (WASD 控制)
function changeDirection(event) {
    if (changingDirection || !gameRunning) return; // 如果正在改變方向或遊戲未運行，則忽略

    const keyPressed = event.key.toLowerCase(); // 轉換為小寫，方便判斷

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingLeft = dx === -1;
    const goingRight = dx === 1;

    // 修正：檢查按鍵是否是 WASD 之一，避免其他按鍵也觸發 changingDirection
    if (['w', 'a', 's', 'd'].includes(keyPressed)) {
        if (keyPressed === 'a' && !goingRight) { // 'a' 鍵向左
            dx = -1;
            dy = 0;
            changingDirection = true;
        } else if (keyPressed === 'w' && !goingDown) { // 'w' 鍵向上
            dx = 0;
            dy = -1;
            changingDirection = true;
        } else if (keyPressed === 'd' && !goingLeft) { // 'd' 鍵向右
            dx = 1;
            dy = 0;
            changingDirection = true;
        } else if (keyPressed === 's' && !goingUp) { // 's' 鍵向下
            dx = 0;
            dy = 1;
            changingDirection = true;
        }
        event.preventDefault(); // 防止滾動頁面
    }
}

// 處理觸控開始事件
function handleTouchStart(event) {
    if (!gameRunning) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

// 處理觸控移動事件 (用於滑動方向判斷)
function handleTouchMove(event) {
    // 遊戲進行中才阻止默認行為，避免影響頁面滾動
    if (gameRunning) {
        event.preventDefault();
    }
}

// 處理觸控結束事件
function handleTouchEnd(event) {
    if (changingDirection || !gameRunning) return;

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    const goingUp = dy === -1;
    const goingDown = dy === 1;
    const goingLeft = dx === -1;
    const goingRight = dx === 1;

    if (absDeltaX > absDeltaY && absDeltaX >= minSwipeDistance) { // 水平滑動
        if (deltaX > 0 && !goingLeft) { // 向右滑動
            dx = 1;
            dy = 0;
            changingDirection = true;
        } else if (deltaX < 0 && !goingRight) { // 向左滑動
            dx = -1;
            dy = 0;
            changingDirection = true;
        }
    } else if (absDeltaY > absDeltaX && absDeltaY >= minSwipeDistance) { // 垂直滑動
        if (deltaY > 0 && !goingUp) { // 向下滑動
            dx = 0;
            dy = 1;
            changingDirection = true;
        } else if (deltaY < 0 && !goingDown) { // 向上滑動
            dx = 0;
            dy = -1;
            changingDirection = true;
        }
    }
}

// 遊戲計時器
function startTimer() {
    stopTimer(); // 確保每次開始前先清除舊的計時器
    timerInterval = setInterval(() => {
        playTime++;
        timeDisplay.textContent = playTime;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null; // 清除引用
}

// 遊戲開始
function startGame() {
    if (gameRunning) return; // 避免重複開始

    // 確保所有變數被完全重置
    snake = [{ x: 10, y: 10 }]; // 蛇的初始位置 (中間偏左，向右移動)
    dx = 1; // 初始向右
    dy = 0;
    score = 0;
    playTime = 0;
    changingDirection = false; // 重置方向改變旗標

    scoreDisplay.textContent = score;
    timeDisplay.textContent = playTime;
    gameOverOverlay.classList.remove('show'); // 隱藏遊戲結束畫面
    playerNameInput.value = ''; // 清空輸入框

    gameWrapper.classList.add('game-active'); // 添加活躍邊框到 wrapper

    generateFood(); // 生成第一個食物

    gameRunning = true;
    // 設定遊戲更新頻率 (毫秒)。可調整此值來改變遊戲速度
    clearInterval(gameInterval); // 確保清除舊的 interval
    gameInterval = setInterval(updateGame, 100); // 100ms 更新一次
    startTimer(); // 開始計時

    startButton.textContent = "遊戲中...";
    startButton.disabled = true; // 遊戲開始後禁用開始按鈕
}

// 遊戲結束
function gameOver() {
    gameRunning = false;
    clearInterval(gameInterval); // 停止遊戲更新
    gameInterval = null; // 清除引用
    stopTimer(); // 停止計時
    gameWrapper.classList.remove('game-active'); // 移除活躍邊框

    finalScoreDisplay.textContent = score;
    finalTimeDisplay.textContent = playTime;
    gameOverOverlay.classList.add('show'); // 顯示遊戲結束畫面

    startButton.textContent = "開始遊戲"; // 恢復按鈕文字
    startButton.disabled = false; // 啟用開始按鈕
}

// --- 排行榜功能 ---

// 從 localStorage 載入排行榜數據
function loadLeaderboard() {
    try {
        const leaderboardData = localStorage.getItem(LEADERBOARD_KEY);
        return leaderboardData ? JSON.parse(leaderboardData) : [];
    } catch (e) {
        console.error("載入排行榜數據時發生錯誤:", e);
        // 如果數據損壞，可能需要清除舊數據以防止循環報錯
        // localStorage.removeItem(LEADERBOARD_KEY);
        return []; // 錯誤時返回空數組
    }
}

// 儲存排行榜數據到 localStorage
function saveLeaderboard(leaderboard) {
    try {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
    } catch (e) {
        console.error("儲存排行榜數據時發生錯誤:", e);
    }
}

// 渲染排行榜
function renderLeaderboard() {
    const leaderboard = loadLeaderboard();
    // 按分數降序排列，分數相同時按時間升序排列 (時間越短越好)
    leaderboard.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.playTime - b.playTime;
    });

    leaderboardList.innerHTML = ''; // 清空現有列表

    // 只顯示前10名
    leaderboard.slice(0, 10).forEach((entry, index) => {
        const listItem = document.createElement('li');
        // 格式化時間戳
        // 使用 try-catch 處理可能的時間戳轉換錯誤
        let formattedTime = '無效時間';
        try {
            formattedTime = new Date(entry.timestamp).toLocaleString('zh-TW', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false // 24小時制
            });
        } catch (e) {
            console.warn("格式化時間戳時發生錯誤:", entry.timestamp, e);
        }

        listItem.innerHTML = `
            <span class="player-name">${index + 1}. ${entry.playerName ? entry.playerName.substring(0, 15) : '匿名玩家'}</span>
            <span class="score-time">分數: ${entry.score} | 時間: ${entry.playTime}秒</span>
            <span class="time-stamp">${formattedTime}</span>
        `;
        leaderboardList.appendChild(listItem);
    });
}

// 儲存分數到排行榜
function addScoreToLeaderboard(playerName, score, playTime) {
    const leaderboard = loadLeaderboard();
    const timestamp = Date.now(); // 儲存毫秒時間戳
    leaderboard.push({ playerName, score, playTime, timestamp });
    saveLeaderboard(leaderboard);
    renderLeaderboard(); // 更新顯示
}

// --- 頁面可見性處理 (遊戲自動暫停/恢復) ---
function handleVisibilityChange() {
    if (document.hidden && gameRunning) {
        // 如果頁面不可見且遊戲正在運行，則暫停遊戲
        clearInterval(gameInterval);
        gameInterval = null; // 清除引用
        stopTimer();
        gameRunning = false; // 設置為暫停狀態
        startButton.textContent = "遊戲已暫停 (點擊恢復)";
        startButton.disabled = false; // 啟用按鈕讓玩家可以手動恢復或重新開始
    } else if (!document.hidden && !gameRunning && startButton.textContent === "遊戲已暫停 (點擊恢復)") {
        // 如果頁面可見，且遊戲處於暫停狀態 (通過檢查按鈕文字判斷)
        // 這裡可以選擇自動恢復或等待玩家點擊
        // 為簡潔起見，我們讓它保持暫停，等待玩家點擊按鈕恢復
        // 如果要自動恢復，可以取消下面的兩行註釋並註釋掉上面的按鈕文字設置
        // gameRunning = true;
        // gameInterval = setInterval(updateGame, 100);
        // startTimer();
        // startButton.textContent = "遊戲中...";
        // startButton.disabled = true;
    }
}

// --- 事件監聽器與初始化 ---
startButton.addEventListener('click', startGame);
document.addEventListener('keydown', changeDirection);

// 觸控事件監聽 (確保 passive: false)
gameWrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
gameWrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
gameWrapper.addEventListener('touchend', handleTouchEnd, { passive: false });


saveScoreButton.addEventListener('click', () => {
    const playerName = playerNameInput.value.trim();
    if (playerName) {
        addScoreToLeaderboard(playerName, score, playTime);
        gameOverOverlay.classList.remove('show'); // 隱藏遊戲結束畫面
        // 不自動開始，讓玩家選擇重新開始
    } else {
        alert('請輸入您的名稱！');
        playerNameInput.focus(); // 讓輸入框重新獲得焦點
    }
});

restartButton.addEventListener('click', () => {
    gameOverOverlay.classList.remove('show');
    startGame();
});

// 頁面可見性改變事件
document.addEventListener('visibilitychange', handleVisibilityChange);


// 頁面載入時初始化排行榜並繪製初始畫面
document.addEventListener('DOMContentLoaded', () => {
    renderLeaderboard();
    // 初始繪製食物，讓畫面不那麼空
    // 這裡不需要臨時創建蛇，只需確保食物位置有效即可
    snake = []; // 確保 snake 為空陣列，以便 generateFood 不會誤判
    generateFood();
    drawFood();
    // 設置初始的蛇頭方向，以便 startGame 能正確接續
    dx = 1; // 預設向右
    dy = 0;
});