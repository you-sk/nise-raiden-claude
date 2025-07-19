const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            
            this.createSound('shoot', 150, 'square', 800, 400, 0.1);
            this.createSound('explosion', 200, 'noise', 0, 0, 0.3);
            this.createSound('powerup', 300, 'sine', 400, 800, 0.2);
            this.createSound('hit', 100, 'sawtooth', 200, 100, 0.2);
        } catch (e) {
            console.log('Web Audio API not supported');
        }
    }

    createSound(name, duration, type, freq1, freq2, volume) {
        this.sounds[name] = { duration, type, freq1, freq2, volume };
    }

    play(soundName) {
        if (!this.initialized || !this.sounds[soundName]) return;
        
        const sound = this.sounds[soundName];
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        if (sound.type === 'noise') {
            const bufferSize = this.audioContext.sampleRate * sound.duration / 1000;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(gainNode);
            
            gainNode.gain.setValueAtTime(sound.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration / 1000);
            
            source.start();
            source.stop(this.audioContext.currentTime + sound.duration / 1000);
        } else {
            oscillator.type = sound.type;
            oscillator.frequency.setValueAtTime(sound.freq1, this.audioContext.currentTime);
            if (sound.freq2 !== sound.freq1) {
                oscillator.frequency.exponentialRampToValueAtTime(sound.freq2, this.audioContext.currentTime + sound.duration / 1000);
            }
            
            gainNode.gain.setValueAtTime(sound.volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + sound.duration / 1000);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + sound.duration / 1000);
        }
    }
}

const soundManager = new SoundManager();

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
    backgroundOffset: 0,
    stars: [],
    combo: 0,
    comboTimer: 0,
    stage: 1,
    enemiesKilled: 0,
    bossSpawned: false,
    boss: null
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
        
        soundManager.play('shoot');
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

            soundManager.play('hit');

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
            gameState.enemiesKilled++;
            
            for (let i = 0; i < 15; i++) {
                gameState.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * this.width,
                    this.y + (Math.random() - 0.5) * this.height,
                    this.type === 'basic' ? '#e74c3c' : '#9b59b6',
                    'explosion'
                ));
            }
            
            for (let i = 0; i < 8; i++) {
                gameState.particles.push(new Particle(
                    this.x,
                    this.y,
                    '#ffaa00',
                    'explosion'
                ));
            }
            
            if (Math.random() < 0.1) {
                gameState.powerUps.push(new PowerUp(this.x, this.y));
            }
            
            gameState.combo++;
            gameState.comboTimer = 60;
            
            soundManager.play('explosion');
            
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
    constructor(x, y, color, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.color = color;
        
        if (type === 'explosion') {
            this.vx = (Math.random() - 0.5) * 12;
            this.vy = (Math.random() - 0.5) * 12;
            this.size = Math.random() * 6 + 2;
            this.life = 40;
            this.maxLife = 40;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.4;
        } else {
            this.vx = (Math.random() - 0.5) * 6;
            this.vy = (Math.random() - 0.5) * 6;
            this.size = 4;
            this.life = 30;
            this.maxLife = 30;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.life--;
        
        if (this.type === 'explosion') {
            this.rotation += this.rotationSpeed;
            this.size *= 0.98;
        }
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.life / this.maxLife;
        
        if (this.type === 'explosion') {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, this.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(-this.size, -this.size, this.size * 2, this.size * 2);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        }
        
        ctx.restore();
    }

    isDead() {
        return this.life <= 0;
    }
}

class Boss {
    constructor() {
        this.x = canvas.width / 2;
        this.y = -100;
        this.width = 120;
        this.height = 100;
        this.health = 50;
        this.maxHealth = 50;
        this.speed = 1;
        this.phase = 'entering';
        this.shootTimer = 0;
        this.moveTimer = 0;
        this.movePattern = 0;
        this.targetY = 150;
    }

    update() {
        if (this.phase === 'entering') {
            this.y += this.speed;
            if (this.y >= this.targetY) {
                this.phase = 'fighting';
            }
            return;
        }

        this.moveTimer++;
        if (this.moveTimer > 120) {
            this.movePattern = (this.movePattern + 1) % 3;
            this.moveTimer = 0;
        }

        if (this.movePattern === 0) {
            this.x += Math.sin(this.moveTimer * 0.02) * 3;
        } else if (this.movePattern === 1) {
            this.x = canvas.width / 2 + Math.sin(this.moveTimer * 0.03) * 200;
        } else {
            this.x = canvas.width / 2 + Math.cos(this.moveTimer * 0.02) * 150;
            this.y = this.targetY + Math.sin(this.moveTimer * 0.02) * 50;
        }

        this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));

        this.shootTimer++;
        if (this.shootTimer > 30) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        const patterns = Math.floor(this.health / 10);
        
        if (patterns >= 4) {
            for (let i = 0; i < 5; i++) {
                const angle = (Math.PI / 4) + (i * Math.PI / 8);
                gameState.enemyBullets.push(new Bullet(
                    this.x,
                    this.y + this.height / 2,
                    Math.cos(angle) * 4,
                    Math.sin(angle) * 4,
                    true
                ));
            }
        } else if (patterns >= 2) {
            for (let i = 0; i < 3; i++) {
                const angle = Math.PI / 2 + (i - 1) * 0.3;
                gameState.enemyBullets.push(new Bullet(
                    this.x + (i - 1) * 30,
                    this.y + this.height / 2,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    true
                ));
            }
        } else {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            for (let i = -1; i <= 1; i++) {
                gameState.enemyBullets.push(new Bullet(
                    this.x,
                    this.y + this.height / 2,
                    Math.cos(angle + i * 0.2) * 5,
                    Math.sin(angle + i * 0.2) * 5,
                    true
                ));
            }
        }
    }

    draw() {
        ctx.fillStyle = '#8e44ad';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + this.height);
        ctx.lineTo(this.x - this.width / 2, this.y);
        ctx.lineTo(this.x - this.width / 3, this.y - this.height / 4);
        ctx.lineTo(this.x, this.y - this.height / 3);
        ctx.lineTo(this.x + this.width / 3, this.y - this.height / 4);
        ctx.lineTo(this.x + this.width / 2, this.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#662d91';
        ctx.fillRect(this.x - this.width / 3, this.y, this.width * 2 / 3, this.height * 2 / 3);

        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x - 5, this.y + this.height / 2, 10, 20);
        ctx.fillRect(this.x - this.width / 3, this.y + this.height / 3, 15, 15);
        ctx.fillRect(this.x + this.width / 3 - 15, this.y + this.height / 3, 15, 15);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(10, 10, canvas.width - 20, 20);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(10, 10, (canvas.width - 20) * (this.health / this.maxHealth), 20);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(10, 10, canvas.width - 20, 20);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', canvas.width / 2, 25);
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            gameState.score += 5000;
            gameState.stage++;
            gameState.enemiesKilled = 0;
            gameState.bossSpawned = false;
            gameState.boss = null;
            
            for (let i = 0; i < 50; i++) {
                gameState.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * this.width,
                    this.y + (Math.random() - 0.5) * this.height,
                    '#8e44ad',
                    'explosion'
                ));
            }
            
            for (let i = 0; i < 3; i++) {
                gameState.powerUps.push(new PowerUp(
                    this.x + (Math.random() - 0.5) * this.width,
                    this.y
                ));
            }
            
            return true;
        }
        
        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * this.width,
                this.y + (Math.random() - 0.5) * this.height,
                '#ffaa00',
                'explosion'
            ));
        }
        
        return false;
    }
}

const player = new Player();

function spawnEnemy() {
    if (gameState.enemiesKilled >= 30 && !gameState.bossSpawned && !gameState.boss) {
        gameState.boss = new Boss();
        gameState.bossSpawned = true;
        return;
    }
    
    if (gameState.boss) {
        return;
    }
    
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
        
        if (gameState.boss && 
            Math.abs(bullet.x - gameState.boss.x) < (bullet.width + gameState.boss.width) / 2 &&
            Math.abs(bullet.y - gameState.boss.y) < (bullet.height + gameState.boss.height) / 2) {
            gameState.bullets.splice(bulletIndex, 1);
            if (gameState.boss.hit()) {
                gameState.boss = null;
            }
        }
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
    
    if (gameState.boss && !player.invulnerable &&
        Math.abs(gameState.boss.x - player.x) < (gameState.boss.width + player.width) / 2 &&
        Math.abs(gameState.boss.y - player.y) < (gameState.boss.height + player.height) / 2) {
        player.hit();
    }

    gameState.powerUps.forEach((powerUp, index) => {
        if (Math.abs(powerUp.x - player.x) < (powerUp.width + player.width) / 2 &&
            Math.abs(powerUp.y - player.y) < (powerUp.height + player.height) / 2) {
            gameState.powerUps.splice(index, 1);
            gameState.power = Math.min(3, gameState.power + 1);
            gameState.score += 500;
            soundManager.play('powerup');
        }
    });
}

function updateGameObjects() {
    player.update();
    
    if (gameState.boss) {
        gameState.boss.update();
    }
    
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
    
    if (gameState.comboTimer > 0) {
        gameState.comboTimer--;
        if (gameState.comboTimer === 0) {
            gameState.combo = 0;
        }
    }
}

class Star {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speed = this.size * 0.5;
        this.brightness = Math.random() * 0.5 + 0.5;
    }

    update() {
        this.y += this.speed;
        if (this.y > canvas.height) {
            this.y = -10;
            this.x = Math.random() * canvas.width;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.brightness})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

function initStars() {
    for (let i = 0; i < 100; i++) {
        gameState.stars.push(new Star());
    }
}

function drawBackground() {
    gameState.backgroundOffset += 1;
    if (gameState.backgroundOffset > 50) {
        gameState.backgroundOffset = 0;
    }
    
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    gameState.stars.forEach(star => {
        star.update();
        star.draw();
    });
    
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let y = -50 + gameState.backgroundOffset; y < canvas.height + 50; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function draw() {
    drawBackground();
    
    player.draw();
    gameState.bullets.forEach(bullet => bullet.draw());
    gameState.enemies.forEach(enemy => enemy.draw());
    if (gameState.boss) {
        gameState.boss.draw();
    }
    gameState.enemyBullets.forEach(bullet => bullet.draw());
    gameState.powerUps.forEach(powerUp => powerUp.draw());
    gameState.particles.forEach(particle => particle.draw());
    
    if (gameState.combo > 1) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`COMBO x${gameState.combo}`, canvas.width - 20, 60);
    }
    
    if (gameState.stage > 1) {
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`STAGE ${gameState.stage}`, 20, 60);
    }
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
    gameState.stars = [];
    gameState.combo = 0;
    gameState.comboTimer = 0;
    gameState.stage = 1;
    gameState.enemiesKilled = 0;
    gameState.bossSpawned = false;
    gameState.boss = null;
    
    initStars();
    soundManager.init();
    
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