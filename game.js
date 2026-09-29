// River Shrine - A peaceful 3D river journey game
// Performance-optimized with efficient rendering and object pooling

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
const game = {
    started: false,
    over: false,
    distance: 0,
    lanterns: 0,
    speed: 3,
    maxSpeed: 8,
    speedIncrement: 0.0005,
    riverWidth: 400,
    perspective: 300
};

// Player boat
const boat = {
    x: 0,
    y: 0,
    width: 40,
    height: 60,
    targetX: 0,
    speed: 0.15
};

// Object pools for performance
const obstacles = [];
const lanternObjects = [];
const waterRipples = [];
const riverBends = [];
const trees = [];

let lastSpawnDistance = 0;
let lastLanternDistance = 0;
let lastTreeDistance = 0;
let riverOffset = 0;
let bendOffset = 0;

// Helper: Create pseudo-3D perspective
function get3DPosition(x, z, distance) {
    const scale = game.perspective / (game.perspective + distance);
    const screenX = canvas.width / 2 + (x - riverOffset) * scale;
    const screenY = canvas.height * 0.8 - distance * 0.5 + z;
    return { x: screenX, y: screenY, scale };
}

// Helper: Check collision
function checkCollision(obj1, obj2) {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y;
}

// Initialize boat position
function initBoat() {
    boat.x = canvas.width / 2 - boat.width / 2;
    boat.y = canvas.height * 0.8;
    boat.targetX = boat.x;
}

// Spawn obstacle
function spawnObstacle() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const offsetFromCenter = (Math.random() * 80 + 60) * side;

    obstacles.push({
        x: offsetFromCenter,
        distance: 0,
        size: 30 + Math.random() * 20,
        type: 'rock'
    });
}

// Spawn lantern
function spawnLantern() {
    const offsetFromCenter = (Math.random() - 0.5) * (game.riverWidth * 0.6);

    lanternObjects.push({
        x: offsetFromCenter,
        distance: 0,
        collected: false,
        float: Math.random() * Math.PI * 2
    });
}

// Spawn trees on riverbank
function spawnTrees() {
    const side = Math.random() < 0.5 ? -1 : 1;
    const offsetFromCenter = (game.riverWidth / 2 + 100 + Math.random() * 100) * side;

    trees.push({
        x: offsetFromCenter,
        distance: 0,
        size: 40 + Math.random() * 40,
        side: side
    });
}

// Create water ripple effect
function createRipple(x, y) {
    waterRipples.push({
        x: x,
        y: y,
        radius: 0,
        maxRadius: 30,
        alpha: 1
    });
}

// Update game state
function update() {
    if (!game.started || game.over) return;

    // Update distance and speed
    game.distance += game.speed;
    game.speed = Math.min(game.speed + game.speedIncrement, game.maxSpeed);

    // Update boat position (smooth movement)
    boat.x += (boat.targetX - boat.x) * boat.speed;

    // Generate river bends
    bendOffset += Math.sin(game.distance * 0.01) * 0.3;
    riverOffset += (bendOffset - riverOffset) * 0.05;

    // Spawn obstacles
    if (game.distance - lastSpawnDistance > 150 + Math.random() * 100) {
        spawnObstacle();
        lastSpawnDistance = game.distance;
    }

    // Spawn lanterns
    if (game.distance - lastLanternDistance > 120 + Math.random() * 80) {
        spawnLantern();
        lastLanternDistance = game.distance;
    }

    // Spawn trees
    if (game.distance - lastTreeDistance > 100 + Math.random() * 50) {
        spawnTrees();
        lastTreeDistance = game.distance;
    }

    // Update and check obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.distance += game.speed;

        const pos = get3DPosition(obs.x, 0, obs.distance);
        const obsSize = obs.size * pos.scale;

        // Check collision with boat
        if (Math.abs(obs.distance - game.distance) < 100) {
            const boatCenterX = boat.x + boat.width / 2;
            const obsCenterX = pos.x;
            const collisionDist = (boat.width + obsSize) / 2;

            if (Math.abs(boatCenterX - obsCenterX) < collisionDist &&
                obs.distance > game.distance - 20) {
                gameOver();
            }
        }

        // Remove off-screen obstacles
        if (obs.distance > game.distance + 800) {
            obstacles.splice(i, 1);
        }
    }

    // Update and check lanterns
    for (let i = lanternObjects.length - 1; i >= 0; i--) {
        const lantern = lanternObjects[i];
        lantern.distance += game.speed;
        lantern.float += 0.05;

        if (!lantern.collected && Math.abs(lantern.distance - game.distance) < 80) {
            const pos = get3DPosition(lantern.x, 0, lantern.distance);
            const boatCenterX = boat.x + boat.width / 2;
            const collisionDist = 30;

            if (Math.abs(boatCenterX - pos.x) < collisionDist) {
                lantern.collected = true;
                game.lanterns++;
                createRipple(pos.x, pos.y);
            }
        }

        // Remove off-screen lanterns
        if (lantern.distance > game.distance + 800) {
            lanternObjects.splice(i, 1);
        }
    }

    // Update trees
    for (let i = trees.length - 1; i >= 0; i--) {
        const tree = trees[i];
        tree.distance += game.speed;

        if (tree.distance > game.distance + 1000) {
            trees.splice(i, 1);
        }
    }

    // Update ripples
    for (let i = waterRipples.length - 1; i >= 0; i--) {
        const ripple = waterRipples[i];
        ripple.radius += 1.5;
        ripple.alpha -= 0.02;

        if (ripple.alpha <= 0) {
            waterRipples.splice(i, 1);
        }
    }

    // Check riverbank collision
    const boatCenterX = boat.x + boat.width / 2;
    const canvasCenterX = canvas.width / 2;
    const riverWidthAtBoat = game.riverWidth * 0.8;

    if (Math.abs(boatCenterX - canvasCenterX - riverOffset * 2) > riverWidthAtBoat / 2) {
        gameOver();
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#E0F6FF');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

    // Draw distant mountains
    ctx.fillStyle = '#9D8FB5';
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 100) {
        ctx.lineTo(i, canvas.height * 0.4 - Math.sin(i * 0.01) * 50);
    }
    ctx.lineTo(canvas.width, canvas.height * 0.6);
    ctx.lineTo(0, canvas.height * 0.6);
    ctx.closePath();
    ctx.fill();

    // Draw river
    const riverGradient = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
    riverGradient.addColorStop(0, '#6BB6E8');
    riverGradient.addColorStop(1, '#4A90C8');
    ctx.fillStyle = riverGradient;

    // River perspective shape
    const centerX = canvas.width / 2;
    const horizonY = canvas.height * 0.6;
    const bottomY = canvas.height;
    const topWidth = game.riverWidth * 0.3;
    const bottomWidth = game.riverWidth * 1.2;

    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2 + riverOffset * 0.5, horizonY);
    ctx.lineTo(centerX + topWidth / 2 + riverOffset * 0.5, horizonY);
    ctx.lineTo(centerX + bottomWidth / 2 + riverOffset * 2, bottomY);
    ctx.lineTo(centerX - bottomWidth / 2 + riverOffset * 2, bottomY);
    ctx.closePath();
    ctx.fill();

    // Draw water ripples on river
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
        const waveY = horizonY + (bottomY - horizonY) * (i / 5) + Math.sin(game.distance * 0.05 + i) * 10;
        const waveWidth = topWidth + (bottomWidth - topWidth) * (i / 5);
        ctx.beginPath();
        ctx.moveTo(centerX - waveWidth / 2 + riverOffset * (1 + i * 0.3), waveY);
        ctx.quadraticCurveTo(
            centerX + riverOffset * (1 + i * 0.3),
            waveY + Math.sin(game.distance * 0.05 + i) * 5,
            centerX + waveWidth / 2 + riverOffset * (1 + i * 0.3),
            waveY
        );
        ctx.stroke();
    }

    // Draw trees (sorted by distance)
    trees.sort((a, b) => a.distance - b.distance);
    trees.forEach(tree => {
        const pos = get3DPosition(tree.x, 0, tree.distance);
        const treeSize = tree.size * pos.scale;

        if (pos.y > horizonY - 50 && pos.y < bottomY && treeSize > 5) {
            // Tree trunk
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(pos.x - treeSize * 0.15, pos.y - treeSize, treeSize * 0.3, treeSize);

            // Tree foliage
            ctx.fillStyle = '#2D5016';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y - treeSize * 0.8, treeSize * 0.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw obstacles (sorted by distance)
    obstacles.sort((a, b) => a.distance - b.distance);
    obstacles.forEach(obs => {
        const pos = get3DPosition(obs.x, 0, obs.distance);
        const obsSize = obs.size * pos.scale;

        if (pos.y > horizonY && pos.y < bottomY && obsSize > 8) {
            // Rock
            ctx.fillStyle = '#696969';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, obsSize / 2, 0, Math.PI * 2);
            ctx.fill();

            // Rock highlight
            ctx.fillStyle = '#909090';
            ctx.beginPath();
            ctx.arc(pos.x - obsSize * 0.15, pos.y - obsSize * 0.15, obsSize / 4, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw lanterns
    lanternObjects.forEach(lantern => {
        if (lantern.collected) return;

        const floatOffset = Math.sin(lantern.float) * 10;
        const pos = get3DPosition(lantern.x, floatOffset, lantern.distance);
        const lanternSize = 20 * pos.scale;

        if (pos.y > horizonY && pos.y < bottomY && lanternSize > 5) {
            // Lantern glow
            const glowGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, lanternSize * 1.5);
            glowGradient.addColorStop(0, 'rgba(255, 200, 100, 0.6)');
            glowGradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, lanternSize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Lantern body
            ctx.fillStyle = '#FF6B6B';
            ctx.fillRect(pos.x - lanternSize / 2, pos.y - lanternSize / 2, lanternSize, lanternSize);

            // Lantern light
            ctx.fillStyle = '#FFD93D';
            ctx.fillRect(pos.x - lanternSize / 3, pos.y - lanternSize / 3, lanternSize * 0.66, lanternSize * 0.66);
        }
    });

    // Draw water ripples
    waterRipples.forEach(ripple => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.alpha * 0.8})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Draw boat
    ctx.save();
    ctx.translate(boat.x + boat.width / 2, boat.y + boat.height / 2);

    // Boat tilt based on movement
    const tilt = (boat.targetX - boat.x) * 0.001;
    ctx.rotate(tilt);

    // Boat shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(-boat.width / 2, boat.height / 2, boat.width, 10);

    // Boat body
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-boat.width / 2, -boat.height / 2);
    ctx.lineTo(boat.width / 2, -boat.height / 2);
    ctx.lineTo(boat.width / 3, boat.height / 2);
    ctx.lineTo(-boat.width / 3, boat.height / 2);
    ctx.closePath();
    ctx.fill();

    // Boat detail
    ctx.fillStyle = '#654321';
    ctx.fillRect(-boat.width / 3, -boat.height / 3, boat.width * 0.66, boat.height * 0.66);

    ctx.restore();

    // Update UI
    document.getElementById('score').textContent = `Distance: ${Math.floor(game.distance)}m`;
    document.getElementById('lanterns').textContent = `Lanterns: ${game.lanterns}`;
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Game over
function gameOver() {
    if (game.over) return;

    game.over = true;
    game.started = false;

    document.getElementById('finalScore').textContent = `Distance: ${Math.floor(game.distance)}m`;
    document.getElementById('finalLanterns').textContent = `Lanterns Collected: ${game.lanterns}`;
    document.getElementById('gameOver').style.display = 'block';
}

// Start game
function startGame() {
    game.started = true;
    document.getElementById('instructions').classList.add('hidden');

    setTimeout(() => {
        document.getElementById('instructions').style.display = 'none';
    }, 500);
}

// Mouse/touch controls
canvas.addEventListener('click', (e) => {
    if (!game.started && !game.over) {
        startGame();
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (game.started && !game.over) {
        boat.targetX = e.clientX - boat.width / 2;
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (game.started && !game.over) {
        e.preventDefault();
        const touch = e.touches[0];
        boat.targetX = touch.clientX - boat.width / 2;
    }
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (!game.started && !game.over && (e.key === ' ' || e.key === 'Enter')) {
        startGame();
    }

    if (game.started && !game.over) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            boat.targetX = Math.max(0, boat.targetX - 30);
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            boat.targetX = Math.min(canvas.width - boat.width, boat.targetX + 30);
        }
    }
});

// Initialize and start game loop
initBoat();
gameLoop();
