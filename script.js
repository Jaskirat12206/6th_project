// ===== GAME CONFIG =====
const LEVELS = [
    { speed: 2.5, spawnRate: 1800, dirtyChance: 0.20, dropsNeeded: 8,  timeLimit: 30 },
    { speed: 3.5, spawnRate: 1400, dirtyChance: 0.30, dropsNeeded: 12, timeLimit: 30 },
    { speed: 5.0, spawnRate: 1000, dirtyChance: 0.40, dropsNeeded: 16, timeLimit: 30 },
];

const MILESTONES = [
    { score: 50,  msg: "💧 50 points! A family has clean water!" },
    { score: 150, msg: "🌊 150 points! A village well is forming!" },
    { score: 300, msg: "⭐ 300 points! True Water Guardian!" },
];

const CONFETTI_COLORS = ['#FFC907', '#0077C0', '#FFFFFF', '#43A047', '#E53935', '#FF9800'];

// ===== GAME STATE =====
let score          = 0;
let lives          = 3;
let level          = 1;
let dropsCaught    = 0;
let dropsThisLevel = 0;
let dropsNeeded    = 8;
let timeLeft       = 30;
let gameRunning    = false;
let levelingUp     = false;
let drops          = [];
let shownMilestones = new Set();
let dropInterval   = null;
let timerInterval  = null;
let animFrame      = null;
let bucketX        = 50;
let msgTimeout     = null;

// ===== GET ELEMENTS =====
const $ = id => document.getElementById(id);

const gameArea      = $('game-area');
const bucketEl      = $('bucket');
const bucketWater   = $('bucket-water');
const scoreDisplay  = $('score-display');
const levelDisplay  = $('level-display');
const livesDisplay  = $('lives-display');
const timerDisplay  = $('timer-display');
const timerBar      = $('timer-bar');
const progressBar   = $('progress-bar');
const progressText  = $('progress-text');
const messageArea   = $('message-area');
const gameOverlay   = $('game-over-overlay');
const levelUpBanner = $('level-up-banner');
const disqBanner    = $('disq-banner');
const cursorEl      = $('custom-cursor');

// ===== CURSOR + BUCKET MOVEMENT =====
document.addEventListener('mousemove', function(e) {
    cursorEl.style.left = e.clientX + 'px';
    cursorEl.style.top  = e.clientY + 'px';
    if(gameRunning && !levelingUp) {
        moveBucket(e.clientX);
    }
});

document.addEventListener('touchmove', function(e) {
    e.preventDefault();
    if(gameRunning && !levelingUp) {
        moveBucket(e.touches[0].clientX);
    }
}, { passive: false });

function moveBucket(x) {
    const rect = gameArea.getBoundingClientRect();
    const pct  = Math.max(5, Math.min(95, ((x - rect.left) / rect.width) * 100));
    bucketX = pct;
    bucketEl.style.left = pct + '%';
}

// ===== BUTTON EVENTS =====
$('btn-reset').addEventListener('click', startGame);
$('btn-play-again').addEventListener('click', startGame);

// ===== START GAME =====
function startGame() {
    // Reset all state variables
    score          = 0;
    lives          = 3;
    level          = 1;
    dropsCaught    = 0;
    dropsThisLevel = 0;
    dropsNeeded    = LEVELS[0].dropsNeeded;
    timeLeft       = LEVELS[0].timeLimit;
    gameRunning    = true;
    levelingUp     = false;
    drops          = [];
    shownMilestones = new Set();

    // Clear all existing drops from screen
    gameArea.querySelectorAll('.drop, .splash, .score-popup').forEach(function(el) {
        el.remove();
    });

    // Clear all intervals and animation frames
    clearInterval(dropInterval);
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);

    // Reset visual elements
    bucketWater.style.height = '0%';
    bucketEl.style.left      = '50%';
    bucketX                  = 50;
    timerBar.classList.remove('danger');
    timerDisplay.style.color = '';
    timerBar.style.width     = '100%';
    gameOverlay.classList.remove('show');

    // Update HUD and progress
    updateHUD();
    updateProgress();

    // Show welcome message
    showMessage('💧 Catch the clean drops! Avoid dirty ones!', 3000);

    // Start game systems
    startSpawning();
    startTimer();
    gameLoop();
}

// ===== TIMER =====
function startTimer() {
    clearInterval(timerInterval);

    timerInterval = setInterval(function() {
        if(!gameRunning || levelingUp) return;

        timeLeft--;
        timerDisplay.textContent = timeLeft;

        // Update timer bar width
        const config = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
        const pct    = (timeLeft / config.timeLimit) * 100;
        timerBar.style.width = pct + '%';

        // Danger zone - last 10 seconds
        if(timeLeft <= 10) {
            timerBar.classList.add('danger');
            timerDisplay.style.color = '#FF6B6B';
        }

        // Time is up!
        if(timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame(false, 'timeout');
        }
    }, 1000);
}

// ===== SPAWN DROPS =====
function startSpawning() {
    clearInterval(dropInterval);
    const config = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    dropInterval = setInterval(spawnDrop, config.spawnRate);
}

function spawnDrop() {
    if(!gameRunning || levelingUp) return;

    const config  = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    const isDirty = Math.random() < config.dirtyChance;
    const rect    = gameArea.getBoundingClientRect();
    const x       = Math.random() * (rect.width - 50) + 10;

    // Create drop element
    const el = document.createElement('div');
    el.classList.add('drop', isDirty ? 'dirty' : 'clean');
    el.style.left = x + 'px';
    el.style.top  = '-50px';

    // Add SVG shape
    if(isDirty) {
        el.innerHTML = `<svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2C18 2 4 18 4 28C4 36.8 10.3 43 18 43C25.7 43 32 36.8 32 28C32 18 18 2 18 2Z"
                fill="#8B4513" stroke="#5D2E0C" stroke-width="1.5"/>
            <text x="18" y="32" text-anchor="middle" font-size="16">☠️</text>
        </svg>`;
    } else {
        el.innerHTML = `<svg viewBox="0 0 36 44" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2C18 2 4 18 4 28C4 36.8 10.3 43 18 43C25.7 43 32 36.8 32 28C32 18 18 2 18 2Z"
                fill="#2196F3" stroke="rgba(0,100,200,0.3)" stroke-width="1"/>
            <ellipse cx="13" cy="20" rx="4" ry="6" fill="rgba(255,255,255,0.3)" transform="rotate(-20 13 20)"/>
        </svg>`;
    }

    // Store drop data in an object
    const drop = {
        el:      el,
        x:       x,
        y:       -50,
        speed:   config.speed + Math.random() * 1.5,
        isDirty: isDirty,
        caught:  false
    };

    drops.push(drop);
    gameArea.appendChild(el);
}

// ===== GAME LOOP =====
function gameLoop() {
    if(!gameRunning) return;

    const rect       = gameArea.getBoundingClientRect();
    const bucketLeft = (bucketX / 100) * rect.width;

    // Loop through all drops
    for(let i = drops.length - 1; i >= 0; i--) {
        const drop = drops[i];
        if(drop.caught) continue;

        // Move drop down
        drop.y += drop.speed;
        drop.el.style.top = drop.y + 'px';

        const cx           = drop.x + 17;
        const bucketBottom = rect.height - 12;
        const bucketTop    = bucketBottom - 50;

        // Check if caught by bucket
        if(drop.y + 42 >= bucketTop &&
           drop.y <= bucketBottom &&
           cx >= bucketLeft - 40 &&
           cx <= bucketLeft + 40) {

            drop.caught = true;
            catchDrop(drop, cx, drop.y);
            drop.el.remove();
            drops.splice(i, 1);

        // Check if missed (hit ground)
        } else if(drop.y > rect.height) {
            if(!drop.isDirty) {
                createSplash(drop.x + 17, rect.height - 10, '💦');
            }
            drop.el.remove();
            drops.splice(i, 1);
        }
    }

    animFrame = requestAnimationFrame(gameLoop);
}

// ===== CATCH DROP =====
function catchDrop(drop, x, y) {
    if(drop.isDirty) {
        // Dirty drop caught — lose a life
        lives--;
        createSplash(x, y, '💀');
        showPopup(x, y, 'DIRTY! -1❤️', '#E53935');
        shakeScreen();
        updateHUD();

        // Check disqualification
        if(lives <= 0) {
            showDisqualified();
            return;
        }

    } else {
        // Clean drop caught — earn points
        const pts = 10 * level;
        score += pts;
        dropsCaught++;
        dropsThisLevel++;

        createSplash(x, y, '💧');
        showPopup(x, y, '+' + pts, '#FFC907');
        updateHUD();
        updateProgress();
        checkMilestone();

        // Check if level is complete
        if(dropsThisLevel >= dropsNeeded) {
            if(level >= 3) {
                setTimeout(function() { endGame(true); }, 400);
            } else {
                setTimeout(levelUp, 400);
            }
        }
    }
}

// ===== LEVEL UP =====
function levelUp() {
    levelingUp = true;
    clearInterval(dropInterval);
    clearInterval(timerInterval);

    // Remove all drops
    drops.forEach(function(d) { d.el.remove(); });
    drops = [];

    // Go to next level
    level++;
    dropsThisLevel = 0;

    const config = LEVELS[Math.min(level - 1, LEVELS.length - 1)];
    dropsNeeded  = config.dropsNeeded;
    timeLeft     = config.timeLimit;

    // Show level up banner
    $('levelup-sub').textContent = 'Level ' + level;
    levelUpBanner.classList.add('show');
    launchCelebration(false);

    // After 2.5 seconds start next level
    setTimeout(function() {
        levelUpBanner.classList.remove('show');
        levelingUp = false;
        timerBar.classList.remove('danger');
        timerDisplay.style.color = '';
        timerBar.style.width = '100%';
        updateHUD();
        updateProgress();
        showMessage('🚀 Level ' + level + '! Faster drops incoming!', 2000);
        startSpawning();
        startTimer();
    }, 2500);
}

// ===== DISQUALIFIED =====
function showDisqualified() {
    gameRunning = false;
    clearInterval(dropInterval);
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);

    drops.forEach(function(d) { d.el.remove(); });
    drops = [];

    disqBanner.classList.add('show');
    shakeScreen();

    setTimeout(function() {
        disqBanner.classList.remove('show');
        endGame(false, 'disqualified');
    }, 2200);
}

// ===== SPLASH EFFECT =====
function createSplash(x, y, emoji) {
    const el      = document.createElement('div');
    el.classList.add('splash');
    el.textContent = emoji;
    el.style.left  = (x - 14) + 'px';
    el.style.top   = (y - 8) + 'px';
    gameArea.appendChild(el);
    setTimeout(function() { el.remove(); }, 600);
}

// ===== SCORE POPUP =====
function showPopup(x, y, text, color) {
    const el          = document.createElement('div');
    el.classList.add('score-popup');
    el.textContent    = text;
    el.style.color    = color;
    el.style.left     = (x - 35) + 'px';
    el.style.top      = (y - 16) + 'px';
    el.style.textShadow = '0 0 8px ' + color;
    gameArea.appendChild(el);
    setTimeout(function() { el.remove(); }, 900);
}

// ===== SCREEN SHAKE =====
function shakeScreen() {
    gameArea.classList.remove('shaking');
    void gameArea.offsetWidth; // Force reflow
    gameArea.classList.add('shaking');
    setTimeout(function() { gameArea.classList.remove('shaking'); }, 400);
}

// ===== SHOW MESSAGE =====
function showMessage(text, duration) {
    clearTimeout(msgTimeout);
    messageArea.textContent = text;
    messageArea.classList.add('show');
    msgTimeout = setTimeout(function() {
        messageArea.classList.remove('show');
    }, duration);
}

// ===== CHECK MILESTONES =====
function checkMilestone() {
    MILESTONES.forEach(function(m) {
        if(score >= m.score && !shownMilestones.has(m.score)) {
            shownMilestones.add(m.score);
            showMessage(m.msg, 3000);
        }
    });
}

// ===== UPDATE HUD =====
function updateHUD() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = 'LEVEL ' + level;
    timerDisplay.textContent = timeLeft;

    // Update lives display
    let livesHTML = '';
    for(let i = 0; i < 3; i++) {
        livesHTML += i < lives ? '❤️' : '🖤';
    }
    livesDisplay.innerHTML = livesHTML;

    // Update bucket water level
    const waterPct = (dropsThisLevel / dropsNeeded) * 80;
    bucketWater.style.height = waterPct + '%';
}

// ===== UPDATE PROGRESS =====
function updateProgress() {
    const pct = (dropsThisLevel / dropsNeeded) * 100;
    progressBar.style.width = pct + '%';
    progressText.textContent = dropsThisLevel + ' / ' + dropsNeeded + ' drops';
}

// ===== CELEBRATION EFFECT =====
function launchCelebration(isWin) {
    const count = isWin ? 150 : 50;

    // Launch confetti
    for(let i = 0; i < count; i++) {
        setTimeout(function() {
            const piece = document.createElement('div');
            piece.classList.add('confetti-piece');

            const color    = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
            const size     = Math.random() * 12 + 6;
            const isCircle = Math.random() > 0.5;

            piece.style.left            = Math.random() * 100 + '%';
            piece.style.background      = color;
            piece.style.borderRadius    = isCircle ? '50%' : '2px';
            piece.style.width           = size + 'px';
            piece.style.height          = size + 'px';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.animationDelay  = (Math.random() * 0.5) + 's';

            document.body.appendChild(piece);
            setTimeout(function() { piece.remove(); }, 4000);
        }, i * 15);
    }

    // Expanding rings on win
    if(isWin) {
        for(let r = 0; r < 4; r++) {
            setTimeout(function() {
                const ring = document.createElement('div');
                ring.classList.add('celebrate-ring');
                ring.style.borderColor = CONFETTI_COLORS[r % CONFETTI_COLORS.length];
                document.body.appendChild(ring);
                setTimeout(function() { ring.remove(); }, 1000);
            }, r * 250);
        }
    }
}

// ===== END GAME =====
function endGame(won, reason) {
    gameRunning = false;
    clearInterval(dropInterval);
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);

    // Remove all drops
    drops.forEach(function(d) { d.el.remove(); });
    drops = [];

    // Update stats
    $('stat-score').textContent  = score;
    $('stat-caught').textContent = dropsCaught;
    $('stat-level').textContent  = level;

    // Set message based on result
    if(won) {
        $('over-icon').textContent    = '🏆';
        $('over-title').textContent   = 'YOU WIN!';
        $('over-title').className     = 'over-title win';
        $('over-message').textContent = 'You brought clean water to the village! 💧';
        launchCelebration(true);

    } else if(reason === 'timeout') {
        $('over-icon').textContent    = '⏰';
        $('over-title').textContent   = "TIME'S UP!";
        $('over-title').className     = 'over-title lose';
        $('over-message').textContent = "The village ran out of time! Try again!";

    } else {
        $('over-icon').textContent    = '☠️';
        $('over-title').textContent   = 'DISQUALIFIED!';
        $('over-title').className     = 'over-title lose';
        $('over-message').textContent = 'Too many dirty drops! The water is contaminated!';
    }

    // Show overlay after short delay
    setTimeout(function() {
        gameOverlay.classList.add('show');
    }, 400);
}

// ===== AUTO START =====
startGame();