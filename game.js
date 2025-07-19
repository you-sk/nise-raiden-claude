const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const gameState = {
    score: 0,
    lives: 3,
    power: 1,
    gameOver: false,
    gameStarted: false,
    keys: {},
    bullets: [],
    enemies: [],
    enemyBullets: [],
    powerUps: [],
    particles: [],
    lastShot: 0,
    enemySpawnTimer: 0,
    backgroundOffset: 0
};

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 100;
        this.width = 40;
        this.height = 50;
        this.speed = 5;
        this.invulnerable = false;
        this.invulnerableTime = 0;
    }

    update() {
        if (gameState.keys['ArrowLeft'] || gameState.keys['a'] || gameState.keys['A']) {
            this.x = Math.max(this.width / 2, this.x - this.speed);
        }
        if (gameState.keys['ArrowRight'] || gameState.keys['d'] || gameState.keys['D']) {
            this.x = Math.min(canvas.width - this.width / 2, this.x + this.speed);
        }
        if (gameState.keys['ArrowUp'] || gameState.keys['w'] || gameState.keys['W']) {
            this.y = Math.max(this.height / 2, this.y - this.speed);
        }
        if (gameState.keys['ArrowDown'] || gameState.keys['s'] || gameState.keys['S']) {
            this.y = Math.min(canvas.height - this.height / 2, this.y + this.speed);
        }

        if (this.invulnerable) {
            this.invulnerableTime--;
            if (this.invulnerableTime <= 0) {
                this.invulnerable = false;
            }
        }

        if (gameState.keys[' '] && Date.now() - gameState.lastShot > 150) {
            this.shoot();
            gameState.lastShot = Date.now();
        }
    }

    shoot() {
        const bulletSpeed = 10;
        
        if (gameState.power >= 1) {
            gameState.bullets.push(new Bullet(this.x, this.y - this.height / 2, 0, -bulletSpeed));
        }
        if (gameState.power >= 2) {
            gameState.bullets.push(new Bullet(this.x - 15, this.y - this.height / 2, -1, -bulletSpeed));
            gameState.bullets.push(new Bullet(this.x + 15, this.y - this.height / 2, 1, -bulletSpeed));
        }
        if (gameState.power >= 3) {
            gameState.bullets.push(new Bullet(this.x - 25, this.y - this.height / 2, -2, -bulletSpeed));
            gameState.bullets.push(new Bullet(this.x + 25, this.y - this.height / 2, 2, -bulletSpeed));
        }
    }

    draw() {
        ctx.save();
        
        if (this.invulnerable && Math.floor(this.invulnerableTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        ctx.fillStyle = '#3498db';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 2);
        ctx.lineTo(this.x - this.width / 2, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y + this.height / 3);
        ctx.lineTo(this.x + this.width / 2, this.y + this.height / 2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#2980b9';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y - this.height / 3);
        ctx.lineTo(this.x - this.width / 4, this.y + this.height / 3);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x + this.width / 4, this.y + this.height / 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    hit() {
        if (!this.invulnerable) {
            gameState.lives--;
            gameState.power = Math.max(1, gameState.power - 1);
            this.invulnerable = true;
            this.invulnerableTime = 120;
            
            for (let i = 0; i < 20; i++) {
                gameState.particles.push(new Particle(this.x, this.y, '#3498db'));
            }

            if (gameState.lives <= 0) {
                gameState.gameOver = true;
            }
        }
    }
}

class Bullet {
    constructor(x, y, vx, vy, isEnemy = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.width = isEnemy ? 6 : 4;
        this.height = isEnemy ? 12 : 20;
        this.isEnemy = isEnemy;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        if (this.isEnemy) {
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
        }
    }

    isOffScreen() {
        return this.y < -this.height || this.y > canvas.height + this.height || 
               this.x < -this.width || this.x > canvas.width + this.width;
    }
}

class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'basic' ? 30 : 50;
        this.height = type === 'basic' ? 30 : 40;
        this.health = type === 'basic' ? 1 : 3;
        this.speed = type === 'basic' ? 2 : 1.5;
        this.score = type === 'basic' ? 100 : 300;
        this.shootTimer = 0;
        this.movePattern = Math.random() < 0.5 ? 'straight' : 'zigzag';
        this.zigzagPhase = 0;
    }

    update() {
        if (this.movePattern === 'straight') {
            this.y += this.speed;
        } else {
            this.y += this.speed;
            this.x += Math.sin(this.zigzagPhase) * 2;
            this.zigzagPhase += 0.1;
        }

        this.shootTimer++;
        if (this.shootTimer > (this.type === 'basic' ? 120 : 80)) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = 3;
        gameState.enemyBullets.push(new Bullet(
            this.x, 
            this.y + this.height / 2, 
            Math.cos(angle) * speed, 
            Math.sin(angle) * speed, 
            true
        ));
    }

    draw() {
        if (this.type === 'basic') {
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
            ctx.fillStyle = '#c0392b';
            ctx.fillRect(this.x - this.width / 3, this.y - this.height / 3, this.width * 2/3, this.height * 2/3);
        } else {
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + this.height / 2);
            ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2);
            ctx.lineTo(this.x, this.y - this.height / 3);
            ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2);
            ctx.closePath();
            ctx.fill();
        }
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            gameState.score += this.score;
            for (let i = 0; i < 10; i++) {
                gameState.particles.push(new Particle(this.x, this.y, this.type === 'basic' ? '#e74c3c' : '#9b59b6'));
            }
            
            if (Math.random() < 0.1) {
                gameState.powerUps.push(new PowerUp(this.x, this.y));
            }
            
            return true;
        }
        return false;
    }

    isOffScreen() {
        return this.y > canvas.height + this.height;
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 2;
        this.pulsePhase = 0;
    }

    update() {
        this.y += this.speed;
        this.pulsePhase += 0.1;
    }

    draw() {
        const scale = 1 + Math.sin(this.pulsePhase) * 0.2;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(-this.width / 2, 0);
        ctx.lineTo(0, this.height / 2);
        ctx.lineTo(this.width / 2, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#27ae60';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P', 0, 0);
        
        ctx.restore();
    }

    isOffScreen() {
        return this.y > canvas.height + this.height;
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.color = color;
        this.life = 30;
        this.maxLife = 30;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life--;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

const player = new Player();

function spawnEnemy() {
    gameState.enemySpawnTimer++;
    
    const spawnRate = Math.max(30, 120 - Math.floor(gameState.score / 1000) * 10);
    
    if (gameState.enemySpawnTimer > spawnRate) {
        const x = Math.random() * (canvas.width - 60) + 30;
        const type = Math.random() < 0.8 ? 'basic' : 'strong';
        gameState.enemies.push(new Enemy(x, -30, type));
        gameState.enemySpawnTimer = 0;
    }
}

function checkCollisions() {
    gameState.bullets.forEach((bullet, bulletIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (Math.abs(bullet.x - enemy.x) < (bullet.width + enemy.width) / 2 &&
                Math.abs(bullet.y - enemy.y) < (bullet.height + enemy.height) / 2) {
                gameState.bullets.splice(bulletIndex, 1);
                if (enemy.hit()) {
                    gameState.enemies.splice(enemyIndex, 1);
                }
            }
        });
    });

    gameState.enemyBullets.forEach((bullet, bulletIndex) => {
        if (!player.invulnerable &&
            Math.abs(bullet.x - player.x) < (bullet.width + player.width) / 2 &&
            Math.abs(bullet.y - player.y) < (bullet.height + player.height) / 2) {
            gameState.enemyBullets.splice(bulletIndex, 1);
            player.hit();
        }
    });

    gameState.enemies.forEach((enemy, enemyIndex) => {
        if (!player.invulnerable &&
            Math.abs(enemy.x - player.x) < (enemy.width + player.width) / 2 &&
            Math.abs(enemy.y - player.y) < (enemy.height + player.height) / 2) {
            gameState.enemies.splice(enemyIndex, 1);
            player.hit();
        }
    });

    gameState.powerUps.forEach((powerUp, index) => {
        if (Math.abs(powerUp.x - player.x) < (powerUp.width + player.width) / 2 &&
            Math.abs(powerUp.y - player.y) < (powerUp.height + player.height) / 2) {
            gameState.powerUps.splice(index, 1);
            gameState.power = Math.min(3, gameState.power + 1);
            gameState.score += 500;
        }
    });
}

function updateGameObjects() {
    player.update();
    
    gameState.bullets.forEach((bullet, index) => {
        bullet.update();
        if (bullet.isOffScreen()) {
            gameState.bullets.splice(index, 1);
        }
    });
    
    gameState.enemies.forEach((enemy, index) => {
        enemy.update();
        if (enemy.isOffScreen()) {
            gameState.enemies.splice(index, 1);
        }
    });
    
    gameState.enemyBullets.forEach((bullet, index) => {
        bullet.update();
        if (bullet.isOffScreen()) {
            gameState.enemyBullets.splice(index, 1);
        }
    });
    
    gameState.powerUps.forEach((powerUp, index) => {
        powerUp.update();
        if (powerUp.isOffScreen()) {
            gameState.powerUps.splice(index, 1);
        }
    });
    
    gameState.particles.forEach((particle, index) => {
        particle.update();
        if (particle.isDead()) {
            gameState.particles.splice(index, 1);
        }
    });
}

function drawBackground() {
    gameState.backgroundOffset += 1;
    if (gameState.backgroundOffset > 50) {
        gameState.backgroundOffset = 0;
    }
    
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let y = -50 + gameState.backgroundOffset; y < canvas.height + 50; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function draw() {
    drawBackground();
    
    player.draw();
    gameState.bullets.forEach(bullet => bullet.draw());
    gameState.enemies.forEach(enemy => enemy.draw());
    gameState.enemyBullets.forEach(bullet => bullet.draw());
    gameState.powerUps.forEach(powerUp => powerUp.draw());
    gameState.particles.forEach(particle => particle.draw());
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('power').textContent = gameState.power;
}

let animationId = null;

function gameLoop() {
    if (!gameState.gameStarted) return;
    
    if (!gameState.gameOver) {
        updateGameObjects();
        spawnEnemy();
        checkCollisions();
        draw();
        updateUI();
        animationId = requestAnimationFrame(gameLoop);
    } else {
        draw();
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = gameState.score;
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }
}

function startGame() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    gameState.score = 0;
    gameState.lives = 3;
    gameState.power = 1;
    gameState.gameOver = false;
    gameState.gameStarted = true;
    gameState.bullets = [];
    gameState.enemies = [];
    gameState.enemyBullets = [];
    gameState.powerUps = [];
    gameState.particles = [];
    gameState.enemySpawnTimer = 0;
    gameState.lastShot = 0;
    
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.invulnerable = false;
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    updateUI();
    gameLoop();
}

document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
    
    if (e.key === ' ' && gameState.gameOver) {
        startGame();
    }
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

document.getElementById('startButton').addEventListener('click', startGame);