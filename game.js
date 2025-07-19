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
            this.createSound('laser', 500, 'sawtooth', 100, 50, 0.15);
            this.createSound('missile', 400, 'triangle', 200, 50, 0.2);
            this.createSound('shield', 200, 'sine', 600, 600, 0.1);
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
    boss: null,
    laser: null,
    missiles: [],
    shield: 0,
    shieldMax: 3,
    weaponType: 'bullet',
    backgroundObjects: [],
    screenShake: 0,
    scoreMultiplier: 1,
    rank: 'ROOKIE',
    totalScore: 0
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

        if (gameState.keys[' ']) {
            this.handleWeaponFire();
        }
        
        if (gameState.keys['1']) {
            gameState.weaponType = 'bullet';
        } else if (gameState.keys['2']) {
            gameState.weaponType = 'laser';
        } else if (gameState.keys['3']) {
            gameState.weaponType = 'missile';
        }
    }

    handleWeaponFire() {
        if (gameState.weaponType === 'bullet' && Date.now() - gameState.lastShot > 150) {
            this.shoot();
            gameState.lastShot = Date.now();
        } else if (gameState.weaponType === 'laser') {
            this.fireLaser();
        } else if (gameState.weaponType === 'missile' && Date.now() - gameState.lastShot > 500) {
            this.fireMissile();
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
    
    fireLaser() {
        if (!gameState.laser) {
            gameState.laser = new Laser(this.x, this.y - this.height / 2);
            soundManager.play('laser');
        }
    }
    
    fireMissile() {
        gameState.missiles.push(new Missile(this.x, this.y - this.height / 2));
        soundManager.play('missile');
    }

    draw() {
        ctx.save();
        
        if (this.invulnerable && Math.floor(this.invulnerableTime / 5) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        if (gameState.shield > 0) {
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.sin(Date.now() * 0.01) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
            ctx.stroke();
        }

        for (let i = 0; i < 3; i++) {
            gameState.particles.push(new Particle(
                this.x + (Math.random() - 0.5) * 10,
                this.y + this.height / 2,
                '#00ccff',
                'trail'
            ));
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
            if (gameState.shield > 0) {
                gameState.shield--;
                soundManager.play('shield');
                for (let i = 0; i < 10; i++) {
                    gameState.particles.push(new Particle(this.x, this.y, '#00ffff', 'shield'));
                }
                return;
            }
            
            gameState.lives--;
            gameState.power = Math.max(1, gameState.power - 1);
            this.invulnerable = true;
            this.invulnerableTime = 120;
            
            for (let i = 0; i < 20; i++) {
                gameState.particles.push(new Particle(this.x, this.y, '#3498db'));
            }

            soundManager.play('hit');
            gameState.screenShake = 20;

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
        
        switch(type) {
            case 'basic':
                this.width = 30;
                this.height = 30;
                this.health = 1;
                this.speed = 2;
                this.score = 100;
                this.movePattern = Math.random() < 0.5 ? 'straight' : 'zigzag';
                break;
            case 'strong':
                this.width = 50;
                this.height = 40;
                this.health = 3;
                this.speed = 1.5;
                this.score = 300;
                this.movePattern = Math.random() < 0.5 ? 'straight' : 'zigzag';
                break;
            case 'rotating':
                this.width = 40;
                this.height = 40;
                this.health = 2;
                this.speed = 1.5;
                this.score = 200;
                this.movePattern = 'circular';
                this.angle = 0;
                this.centerX = x;
                this.radius = 50;
                break;
            case 'splitter':
                this.width = 45;
                this.height = 45;
                this.health = 2;
                this.speed = 1.8;
                this.score = 250;
                this.movePattern = 'straight';
                break;
            case 'sniper':
                this.width = 35;
                this.height = 35;
                this.health = 1;
                this.speed = 1;
                this.score = 150;
                this.movePattern = 'hover';
                this.targetY = y + 150;
                break;
        }
        
        this.shootTimer = 0;
        this.zigzagPhase = 0;
    }

    update() {
        switch(this.movePattern) {
            case 'straight':
                this.y += this.speed;
                break;
            case 'zigzag':
                this.y += this.speed;
                this.x += Math.sin(this.zigzagPhase) * 2;
                this.zigzagPhase += 0.1;
                break;
            case 'circular':
                this.y += this.speed * 0.5;
                this.angle += 0.05;
                this.x = this.centerX + Math.cos(this.angle) * this.radius;
                this.centerX = Math.max(this.radius, Math.min(canvas.width - this.radius, this.centerX));
                break;
            case 'hover':
                if (this.y < this.targetY) {
                    this.y += this.speed * 2;
                } else {
                    this.x += Math.sin(Date.now() * 0.002) * this.speed;
                }
                break;
        }

        this.shootTimer++;
        const shootDelay = this.type === 'sniper' ? 60 : this.type === 'basic' ? 120 : 80;
        if (this.shootTimer > shootDelay) {
            this.shoot();
            this.shootTimer = 0;
        }
    }

    shoot() {
        switch(this.type) {
            case 'sniper':
                const sniperAngle = Math.atan2(player.y - this.y, player.x - this.x);
                gameState.enemyBullets.push(new Bullet(
                    this.x, 
                    this.y + this.height / 2, 
                    Math.cos(sniperAngle) * 6, 
                    Math.sin(sniperAngle) * 6, 
                    true
                ));
                break;
            case 'rotating':
                for (let i = 0; i < 4; i++) {
                    const rotAngle = (Math.PI / 2) * i + this.angle;
                    gameState.enemyBullets.push(new Bullet(
                        this.x, 
                        this.y, 
                        Math.cos(rotAngle) * 3, 
                        Math.sin(rotAngle) * 3, 
                        true
                    ));
                }
                break;
            default:
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
    }

    draw() {
        ctx.save();
        
        switch(this.type) {
            case 'basic':
                ctx.fillStyle = '#e74c3c';
                ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
                ctx.fillStyle = '#c0392b';
                ctx.fillRect(this.x - this.width / 3, this.y - this.height / 3, this.width * 2/3, this.height * 2/3);
                break;
                
            case 'strong':
                ctx.fillStyle = '#9b59b6';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y + this.height / 2);
                ctx.lineTo(this.x - this.width / 2, this.y - this.height / 2);
                ctx.lineTo(this.x, this.y - this.height / 3);
                ctx.lineTo(this.x + this.width / 2, this.y - this.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'rotating':
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.fillStyle = '#f39c12';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#d68910';
                for (let i = 0; i < 4; i++) {
                    ctx.save();
                    ctx.rotate((Math.PI / 2) * i);
                    ctx.fillRect(-this.width / 2, -3, this.width / 2, 6);
                    ctx.restore();
                }
                break;
                
            case 'splitter':
                ctx.fillStyle = '#1abc9c';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#16a085';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width / 3, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'sniper':
                ctx.fillStyle = '#e67e22';
                ctx.translate(this.x, this.y);
                const sniperAngle = Math.atan2(player.y - this.y, player.x - this.x);
                ctx.rotate(sniperAngle + Math.PI/2);
                ctx.beginPath();
                ctx.moveTo(0, -this.height / 2);
                ctx.lineTo(-this.width / 3, this.height / 2);
                ctx.lineTo(this.width / 3, this.height / 2);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#d35400';
                ctx.fillRect(-2, -this.height / 2, 4, this.height / 2);
                break;
        }
        
        ctx.restore();
    }

    hit() {
        this.health--;
        if (this.health <= 0) {
            const scoreWithMultiplier = this.score * gameState.scoreMultiplier;
            gameState.score += scoreWithMultiplier;
            gameState.totalScore += scoreWithMultiplier;
            gameState.enemiesKilled++;
            
            // コンボでマルチプライヤー上昇
            if (gameState.combo > 0 && gameState.combo % 5 === 0) {
                gameState.scoreMultiplier = Math.min(8, gameState.scoreMultiplier + 1);
            }
            
            if (this.type === 'splitter' && this.y > 50) {
                for (let i = 0; i < 3; i++) {
                    const angle = (Math.PI * 2 / 3) * i;
                    const newEnemy = new Enemy(
                        this.x + Math.cos(angle) * 30,
                        this.y + Math.sin(angle) * 30,
                        'basic'
                    );
                    newEnemy.speed = 3;
                    gameState.enemies.push(newEnemy);
                }
            }
            
            const colors = {
                'basic': '#e74c3c',
                'strong': '#9b59b6',
                'rotating': '#f39c12',
                'splitter': '#1abc9c',
                'sniper': '#e67e22'
            };
            
            for (let i = 0; i < 15; i++) {
                gameState.particles.push(new Particle(
                    this.x + (Math.random() - 0.5) * this.width,
                    this.y + (Math.random() - 0.5) * this.height,
                    colors[this.type] || '#e74c3c',
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
    constructor(x, y, type = null) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 2;
        this.pulsePhase = 0;
        this.type = type || (Math.random() < 0.7 ? 'power' : 'shield');
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
        
        if (this.type === 'shield') {
            ctx.fillStyle = '#00ccff';
            ctx.strokeStyle = '#0099cc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 0, 0);
        } else {
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
        }
        
        ctx.restore();
    }

    isOffScreen() {
        return this.y > canvas.height + this.height;
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = canvas.height;
        this.damage = 2;
        this.life = 30;
    }

    update() {
        this.x = player.x;
        this.life--;
        
        if (!gameState.keys[' ']) {
            gameState.laser = null;
        }
    }

    draw() {
        const gradient = ctx.createLinearGradient(this.x - this.width/2, 0, this.x + this.width/2, 0);
        gradient.addColorStop(0, 'rgba(255, 0, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - this.width/2, 0, this.width, this.y);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(this.x - 2, 0, 4, this.y);
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = -5;
        this.width = 8;
        this.height = 20;
        this.target = null;
        this.speed = 8;
    }

    update() {
        if (!this.target || this.target.health <= 0) {
            this.findTarget();
        }
        
        if (this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.vx = (dx / distance) * this.speed;
            this.vy = (dy / distance) * this.speed;
        } else {
            this.vy = -this.speed;
        }
        
        this.x += this.vx;
        this.y += this.vy;
        
        gameState.particles.push(new Particle(
            this.x,
            this.y + this.height/2,
            '#ff6600',
            'missile_trail'
        ));
    }

    findTarget() {
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        gameState.enemies.forEach(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x - this.x, 2) + 
                Math.pow(enemy.y - this.y, 2)
            );
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });
        
        if (gameState.boss) {
            const bossDistance = Math.sqrt(
                Math.pow(gameState.boss.x - this.x, 2) + 
                Math.pow(gameState.boss.y - this.y, 2)
            );
            if (bossDistance < closestDistance) {
                closestEnemy = gameState.boss;
            }
        }
        
        this.target = closestEnemy;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.atan2(this.vy, this.vx) + Math.PI/2);
        
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(-2, -this.height/2, 4, 8);
        
        ctx.restore();
    }

    isOffScreen() {
        return this.y < -this.height || this.y > canvas.height + this.height ||
               this.x < -this.width || this.x > canvas.width + this.width;
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
        } else if (type === 'trail') {
            this.vx = (Math.random() - 0.5) * 2;
            this.vy = 3;
            this.size = Math.random() * 3 + 1;
            this.life = 20;
            this.maxLife = 20;
        } else if (type === 'missile_trail') {
            this.vx = (Math.random() - 0.5) * 1;
            this.vy = 2;
            this.size = Math.random() * 4 + 2;
            this.life = 15;
            this.maxLife = 15;
        } else if (type === 'shield') {
            const angle = Math.random() * Math.PI * 2;
            this.vx = Math.cos(angle) * 8;
            this.vy = Math.sin(angle) * 8;
            this.size = 3;
            this.life = 25;
            this.maxLife = 25;
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
        const rand = Math.random();
        let type;
        
        if (gameState.stage >= 3) {
            if (rand < 0.4) type = 'basic';
            else if (rand < 0.6) type = 'strong';
            else if (rand < 0.75) type = 'rotating';
            else if (rand < 0.9) type = 'splitter';
            else type = 'sniper';
        } else if (gameState.stage >= 2) {
            if (rand < 0.5) type = 'basic';
            else if (rand < 0.75) type = 'strong';
            else if (rand < 0.9) type = 'rotating';
            else type = 'splitter';
        } else {
            type = rand < 0.8 ? 'basic' : 'strong';
        }
        
        gameState.enemies.push(new Enemy(x, -30, type));
        gameState.enemySpawnTimer = 0;
    }
}

function checkCollisions() {
    // レーザーの当たり判定
    if (gameState.laser) {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (Math.abs(gameState.laser.x - enemy.x) < (gameState.laser.width + enemy.width) / 2) {
                if (enemy.hit()) {
                    gameState.enemies.splice(enemyIndex, 1);
                }
            }
        });
        
        if (gameState.boss && 
            Math.abs(gameState.laser.x - gameState.boss.x) < (gameState.laser.width + gameState.boss.width) / 2) {
            gameState.boss.hit();
            if (gameState.boss.health <= 0) {
                gameState.boss = null;
            }
        }
    }
    
    // ミサイルの当たり判定
    gameState.missiles.forEach((missile, missileIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            if (Math.abs(missile.x - enemy.x) < (missile.width + enemy.width) / 2 &&
                Math.abs(missile.y - enemy.y) < (missile.height + enemy.height) / 2) {
                gameState.missiles.splice(missileIndex, 1);
                if (enemy.hit()) {
                    gameState.enemies.splice(enemyIndex, 1);
                }
                for (let i = 0; i < 20; i++) {
                    gameState.particles.push(new Particle(
                        missile.x, missile.y, '#ff6600', 'explosion'
                    ));
                }
            }
        });
        
        if (gameState.boss && 
            Math.abs(missile.x - gameState.boss.x) < (missile.width + gameState.boss.width) / 2 &&
            Math.abs(missile.y - gameState.boss.y) < (missile.height + gameState.boss.height) / 2) {
            gameState.missiles.splice(missileIndex, 1);
            if (gameState.boss.hit()) {
                gameState.boss = null;
            }
            for (let i = 0; i < 20; i++) {
                gameState.particles.push(new Particle(
                    missile.x, missile.y, '#ff6600', 'explosion'
                ));
            }
        }
    });

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
            
            if (powerUp.type === 'shield') {
                gameState.shield = Math.min(gameState.shieldMax, gameState.shield + 1);
                soundManager.play('shield');
            } else {
                gameState.power = Math.min(3, gameState.power + 1);
                soundManager.play('powerup');
            }
            
            gameState.score += 500;
        }
    });
}

function updateGameObjects() {
    player.update();
    
    if (gameState.boss) {
        gameState.boss.update();
    }
    
    if (gameState.laser) {
        gameState.laser.update();
    }
    
    gameState.missiles.forEach((missile, index) => {
        missile.update();
        if (missile.isOffScreen()) {
            gameState.missiles.splice(index, 1);
        }
    });
    
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
            gameState.scoreMultiplier = 1;
        }
    }
    
    if (gameState.screenShake > 0) {
        gameState.screenShake--;
    }
    
    gameState.backgroundObjects.forEach((obj, index) => {
        obj.update();
        if (obj.isOffScreen()) {
            gameState.backgroundObjects.splice(index, 1);
        }
    });
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

class BackgroundObject {
    constructor() {
        this.type = Math.random() < 0.7 ? 'planet' : 'station';
        this.x = Math.random() * canvas.width;
        this.y = -200;
        this.speed = 0.5 + Math.random() * 0.5;
        
        if (this.type === 'planet') {
            this.radius = 50 + Math.random() * 100;
            this.color1 = `hsl(${Math.random() * 360}, 50%, 30%)`;
            this.color2 = `hsl(${Math.random() * 360}, 50%, 20%)`;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = (Math.random() - 0.5) * 0.01;
        } else {
            this.width = 80 + Math.random() * 60;
            this.height = 100 + Math.random() * 80;
            this.lights = [];
            for (let i = 0; i < 10; i++) {
                this.lights.push({
                    x: Math.random() * this.width - this.width/2,
                    y: Math.random() * this.height - this.height/2,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }
    }
    
    update() {
        this.y += this.speed;
        if (this.type === 'planet') {
            this.rotation += this.rotationSpeed;
        }
    }
    
    draw() {
        ctx.save();
        ctx.globalAlpha = 0.6;
        
        if (this.type === 'planet') {
            const gradient = ctx.createRadialGradient(
                this.x - this.radius/3, this.y - this.radius/3, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, this.color1);
            gradient.addColorStop(1, this.color2);
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, 0, this.radius - i * 20, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        } else {
            ctx.fillStyle = '#2c3e50';
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            
            ctx.fillStyle = '#34495e';
            ctx.fillRect(this.x - this.width/2 + 10, this.y - this.height/2 + 10, 
                        this.width - 20, this.height - 20);
            
            this.lights.forEach(light => {
                ctx.fillStyle = `rgba(255, 255, 100, ${0.5 + Math.sin(Date.now() * 0.001 + light.phase) * 0.5})`;
                ctx.fillRect(this.x + light.x - 2, this.y + light.y - 2, 4, 4);
            });
        }
        
        ctx.restore();
    }
    
    isOffScreen() {
        return this.y - (this.type === 'planet' ? this.radius : this.height/2) > canvas.height;
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
    
    // 背景オブジェクト（惑星、宇宙ステーション）
    gameState.backgroundObjects.forEach(obj => {
        obj.draw();
    });
    
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
    
    // 新しい背景オブジェクトを生成
    if (Math.random() < 0.005) {
        gameState.backgroundObjects.push(new BackgroundObject());
    }
}

function draw() {
    ctx.save();
    
    // 画面揺れエフェクト
    if (gameState.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * gameState.screenShake;
        const shakeY = (Math.random() - 0.5) * gameState.screenShake;
        ctx.translate(shakeX, shakeY);
    }
    
    drawBackground();
    
    player.draw();
    gameState.bullets.forEach(bullet => bullet.draw());
    gameState.missiles.forEach(missile => missile.draw());
    if (gameState.laser) {
        gameState.laser.draw();
    }
    gameState.enemies.forEach(enemy => enemy.draw());
    if (gameState.boss) {
        gameState.boss.draw();
    }
    gameState.enemyBullets.forEach(bullet => bullet.draw());
    gameState.powerUps.forEach(powerUp => powerUp.draw());
    gameState.particles.forEach(particle => particle.draw());
    
    ctx.restore();
    
    // UI要素は揺れない
    if (gameState.combo > 1) {
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`COMBO x${gameState.combo}`, canvas.width - 20, 60);
    }
    
    if (gameState.scoreMultiplier > 1) {
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`x${gameState.scoreMultiplier} MULTIPLIER`, canvas.width - 20, 90);
    }
    
    if (gameState.stage > 1) {
        ctx.fillStyle = '#3498db';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`STAGE ${gameState.stage}`, 20, 60);
    }
    
    // ランク表示
    ctx.fillStyle = '#2ecc71';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`RANK: ${gameState.rank}`, 20, 90);
    
    // 武器表示
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Weapon: ${gameState.weaponType.toUpperCase()} (1-3 to switch)`, 20, canvas.height - 20);
    
    // シールド表示
    ctx.fillText(`Shield: ${'◆'.repeat(gameState.shield)}${'◇'.repeat(gameState.shieldMax - gameState.shield)}`, 20, canvas.height - 40);
}

function updateUI() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('lives').textContent = gameState.lives;
    document.getElementById('power').textContent = gameState.power;
    
    // ランク更新
    if (gameState.totalScore >= 50000 && gameState.rank !== 'ACE') {
        gameState.rank = 'ACE';
    } else if (gameState.totalScore >= 20000 && gameState.rank !== 'VETERAN') {
        gameState.rank = 'VETERAN';
    } else if (gameState.totalScore >= 5000 && gameState.rank !== 'PILOT') {
        gameState.rank = 'PILOT';
    }
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