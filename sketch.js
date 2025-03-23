// Game Entities and UI
let player1, player2;
let platforms = [];
let platformWidth = 100;
let platformHeight = 20;
let platformSpacing = 100;
let worldHeight = 3000;
let goalHeight = -2000;
let groundHeight = 20;
let backgroundImage;
let startButton;
let dividerWidth = 20;  

// Physics and Mechanics
let gravity = 0.6;
let jumpAcceleration = -12;
let attackCooldownTime = 1000;  // Cooldown time in milliseconds (1 second)
let attackDisplacement = 50;    // Base displacement amount for attacks

// Game State
let gameState = "menu";  // Track game state (menu, playing, endgame)
let player1NameInput, player2NameInput;
let player1Name = "Player 1", player2Name = "Player 2";
let player1Wins = 0, player2Wins = 0; // Track player wins/losses

// Power-Ups
let powerUps = [];
let powerUpSpawnInterval = 5000; // Spawn a power-up every 5 seconds
let lastPowerUpSpawn = 0;

// Player Animations
let player1Animations = {};
let player2Animations = {};

function preload() {
  // Load animations for player 1
  player1Animations.standing = loadImage("player-1-standing.png");
  player1Animations.running = [loadImage("player-1-running/tile000.png"), loadImage("player-1-running/tile001.png"), loadImage("player-1-running/tile002.png"), loadImage("player-1-running/tile003.png")];
  player1Animations.jumping = loadImage("player-1-jumping.png")
  player1Animations.attacking = [loadImage("player-1-attacking/tile000.png"), loadImage("player-1-attacking/tile001.png"), loadImage("player-1-attacking/tile002.png"), loadImage("player-1-attacking/tile003.png"), loadImage("player-1-attacking/tile004.png")];

  // Load animations for player 2
  player2Animations.standing = loadImage("player-2-standing.png");
  player2Animations.running = [loadImage("player-2-running/tile000.png"), loadImage("player-2-running/tile001.png"), loadImage("player-2-running/tile002.png"), loadImage("player-2-running/tile003.png")];
  player2Animations.jumping = loadImage("player-2-jumping.png")
  player2Animations.attacking = [loadImage("player-2-attacking/tile000.png"), loadImage("player-2-attacking/tile001.png"), loadImage("player-2-attacking/tile002.png"), loadImage("player-2-attacking/tile003.png"), loadImage("player-2-attacking/tile004.png")];

  backgroundImage = loadImage("background.jpg");
}

function setup() {
  createCanvas(820, 800); // Increase the width for the divider (800 + 20px divider)

  // Create input fields and start button for the main menu
  player1NameInput = createInput("Player 1");
  player1NameInput.position(width / 4 - 60, height / 2 - 100);

  player2NameInput = createInput("Player 2");
  player2NameInput.position(3 * width / 4 - 60, height / 2 - 100);

  startButton = createButton('Start Game');
  startButton.position(width / 2 - 40, height / 2);
  startButton.mousePressed(startGame);
}

function startGame() {
  // Set player names from input fields
  player1Name = player1NameInput.value();
  player2Name = player2NameInput.value();

  // Hide input fields and start button
  player1NameInput.hide();
  player2NameInput.hide();
  startButton.hide();

  // Create two players
  player1 = new Player(150, worldHeight - 50, 'red', 65, 68, 87, 'Z', player1Animations); // A, D, W for movement, Z for attack
  player2 = new Player(650, worldHeight - 50, 'blue', LEFT_ARROW, RIGHT_ARROW, UP_ARROW, '/', player2Animations); // Arrow keys for movement, / for attack

  generateInitialPlatforms();
  gameState = "playing";
}

function draw() {
  if (gameState === "menu") {
    image(backgroundImage, 0, 0, width, height);

    // Title
    textSize(32);
    fill(0);
    textAlign(CENTER, CENTER);
    text("Enter Player Names and Press Start", width / 2, height / 4);

    // Power-up reference
    textSize(18);
    fill(0);
    textAlign(CENTER);
    text("Power-Up Effects:", width / 2, height / 2 + 100);

    // Red power-up description
    fill(255, 0, 0);  // Red color
    text("Red Power-Up: Displaces the opponent more", width / 2, height / 2 + 130);

    // Blue power-up description
    fill(0, 0, 255);  // Blue color
    text("Blue Power-Up: Freezes the opponent for 5 seconds", width / 2, height / 2 + 160);

  } else if (gameState === "playing") {
    image(backgroundImage, 0, 0, width, height);

    spawnPowerUp();

    player1.update(player2);
    player2.update(player1);

    displayPlayerView(player1, 0);                 // Left view for Player 1
    displayPlayerView(player2, width / 2 + dividerWidth); // Right view for Player 2

    drawDivider();

    for (let powerUp of powerUps) {
      if (powerUp.active) {
        if (powerUp.checkCollision(player1)) {
          player1.applyPowerUp(powerUp.type);
          powerUp.active = false;
        } else if (powerUp.checkCollision(player2)) {
          player2.applyPowerUp(powerUp.type);
          powerUp.active = false;
        }
      }
    }

    // Check if either player wins
    if (player1.y < goalHeight || player2.y < goalHeight) {
      if (player1.y < goalHeight) {
        player1Wins++;
      } else {
        player2Wins++;
      }
      gameState = "endgame";
    }

    // Generate new platforms as players move upward
    generateNewPlatforms();
  } else if (gameState === "endgame") {
    displayEndScreen();
  }
}

function displayPlayerView(player, offsetX) {
  push();
  translate(offsetX, 0); // Move to either the left or right side of the canvas
  let offsetY = height / 2 - player.y; // Center the player's view vertically
  translate(0, offsetY);   // Scroll the view based on player's position

  // Draw platforms
  for (let platform of platforms) {
    platform.display();
  }

  // Display power-ups
  for (let powerUp of powerUps) {
    powerUp.display();
  }

  // Draw ground
  fill(100);
  rect(0, worldHeight - groundHeight, width / 2 - dividerWidth / 2, groundHeight); // Adjust for split screen (half width minus divider)

  // Display the player
  player.display();

  pop();

  // Display equipped power-up in the top-left corner of the player's view
  displayPowerUp(player, offsetX);
}

// Function to display the equipped power-up in absolute screen coordinates
function displayPowerUp(player, offsetX) {
  push();  // Save transformation state
  textSize(16);
  let powerUpLabel = "";

  if (player.powerUpType === 'displacement') {
    powerUpLabel = "Power-Up: Displacement";
    fill(255, 0, 0);  // Red color for displacement power-up
  } else if (player.powerUpType === 'freezing') {
    powerUpLabel = "Power-Up: Freezing";
    fill(0, 0, 255);  // Blue color for freezing power-up
  } else {
    powerUpLabel = "Power-Up: None";
    fill(0);  // Default color (black) for no power-up
  }

  // Display the power-up text in the top-left corner of the player's screen
  textAlign(LEFT, TOP);
  text(powerUpLabel, offsetX + 10, 10);  // Adjust positioning based on offsetX for each player

  pop();  // Restore transformation state
}

function drawDivider() {
  fill(0); // Black divider
  rect(width / 2 - dividerWidth / 2, 0, dividerWidth, height);
}

function generateInitialPlatforms() {
  let y = worldHeight - 100;
  for (let i = 0; i < 20; i++) {
    let x = random(50, width / 2 - platformWidth - dividerWidth / 2 - 50);
    platforms.push(new Platform(x, y, platformWidth, platformHeight));
    y -= platformSpacing;
  }
}

function generateNewPlatforms() {
  // Get the highest platform in the world
  let highestPlatformY = platforms.reduce((min, platform) => Math.min(min, platform.y), Infinity);

  // If the highest platform is below the players, generate a new one
  if (highestPlatformY > player1.y - height || highestPlatformY > player2.y - height) {
    let newX = random(50, width / 2 - platformWidth - dividerWidth / 2 - 50);
    let newY = highestPlatformY - platformSpacing;
    platforms.push(new Platform(newX, newY, platformWidth, platformHeight));
  }
}

class Player {
  constructor(x, y, color, leftKey, rightKey, jumpKey, attackKey, animations) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 50;
    this.color = color;
    this.speed = 5;
    this.velocityY = 0;
    this.isJumping = false;
    this.leftKey = leftKey;
    this.rightKey = rightKey;
    this.jumpKey = jumpKey;
    this.attackKey = attackKey;
    this.attackCooldown = 0;
    this.freezeTime = 0;
    this.animations = animations;
    this.currentAnimation = "standing";
    this.animationFrame = 0;
    this.attackPower = attackDisplacement;
    this.facingRight = true;  // Add facing direction tracker

    this.attackPowerBase = attackDisplacement;
    this.attackPower = this.attackPowerBase;
    this.powerUpType = null;  // Track the type of power-up ('displacement' or 'freezing')
  }

  // Only keep the latest power-up equipped
  applyPowerUp(type) {
    // Overwrite any previously equipped power-up
    if (type === 'displacement') {
      this.attackPower = this.attackPowerBase * 2; // Double the attack power
      this.powerUpType = 'displacement';
    } else if (type === 'freezing') {
      this.powerUpType = 'freezing'; // Set for freezing attack
    }
  }

  update() {
    if (this.freezeTime <= 0) {
      // Update facing direction based on movement
      if (keyIsDown(this.leftKey)) {
        this.x -= this.speed;
        this.currentAnimation = "running";
        this.facingRight = false;
      } else if (keyIsDown(this.rightKey)) {
        this.x += this.speed;
        this.currentAnimation = "running";
        this.facingRight = true;  // Facing left
      } else {
        this.currentAnimation = "standing";
      }
    } else {
      this.freezeTime -= deltaTime;
    }

    // Apply gravity
    this.velocityY += gravity;

    // Calculate next position
    let nextY = this.y + this.velocityY;

    // Collision detection with platforms and the ground
    let onPlatform = false;
    for (let platform of platforms) {
      if (this.x + this.width > platform.x && this.x < platform.x + platform.width) {
        // Check if player is on top of the platform
        if (this.y + this.height <= platform.y && nextY + this.height > platform.y) {
          this.y = platform.y - this.height;
          this.velocityY = 0;
          this.isJumping = false;
          onPlatform = true;
          break;
        }
        // Check if player is below the platform
        else if (this.y >= platform.y + platform.height && nextY < platform.y + platform.height) {
          this.y = platform.y + platform.height;
          this.velocityY = 0;
          break;
        }
      }
    }

    // Apply vertical movement after collision checks
    this.y += this.velocityY;

    // Stop falling through the ground
    if (this.y >= worldHeight - this.height) {
      this.y = worldHeight - this.height;
      this.velocityY = 0;
      this.isJumping = false;
    }

    if (this.isJumping) {
      this.currentAnimation = "jumping";
    }

    // Reduce cooldown timer if it's active
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime;
      if (this.attackCooldown < 0) {
        this.attackCooldown = 0;
      }
    }

    // Ensure the player stays within their screen
    this.x = constrain(this.x, 0, width / 2 - dividerWidth / 2 - this.width);
  }

  display() {
    push(); // Save the current transformation state

    if (!this.facingRight) {
      // If facing left, translate to x position + width and scale by -1 to flip horizontally
      translate(this.x + this.width, this.y);
      scale(-1, 1);
    } else {
      // If facing right, just translate to position
      translate(this.x, this.y);
    }

    let currentImage;

    if (this.currentAnimation === 'running') {
      currentImage = this.animations.running[this.animationFrame % this.animations.running.length];
      if (frameCount % 5 === 0) {
        this.animationFrame++;
      }
    } else if (this.currentAnimation === 'jumping') {
      currentImage = this.animations.jumping;
    } else if (this.currentAnimation === 'attacking') {
      currentImage = this.animations.attacking[this.animationFrame % this.animations.attacking.length];
      if (frameCount % 5 === 0) {
        this.animationFrame++;
      }
    } else {
      currentImage = this.animations.standing;
    }

    // Draw the image at origin (0,0) since we've already translated
    image(currentImage, 0, 0, this.width, this.height);

    pop(); // Restore the transformation state
  }

  attack(otherPlayer) {
    if (this.attackCooldown === 0) {
      this.currentAnimation = "attacking";
      this.animationFrame = 0;

      // Check if the power-up type is 'freezing'
      if (this.powerUpType === 'freezing') {
        // Apply freezing effect
        otherPlayer.freezeTime = 5000; // Freeze for 5 seconds
        this.powerUpType = null; // Clear the power-up after use

      } else if (this.powerUpType === 'displacement') {
        // Apply displacement attack
        let direction = this.facingRight ? 1 : -1;
        let displacement = direction * this.attackPower;
        otherPlayer.x += displacement;
        otherPlayer.x = constrain(
          otherPlayer.x,
          0,
          width / 2 - dividerWidth / 2 - otherPlayer.width
        );
        this.powerUpType = null; // Clear the power-up after use

      } else {
        // Standard attack without power-up
        let direction = this.facingRight ? 1 : -1;
        let displacement = direction * this.attackPowerBase;
        otherPlayer.x += displacement;
        otherPlayer.x = constrain(
          otherPlayer.x,
          0,
          width / 2 - dividerWidth / 2 - otherPlayer.width
        );
      }

      this.attackCooldown = attackCooldownTime; // Set the cooldown for next attack
    }
  }
}

class Platform {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  display() {
    fill(0, 150, 0);
    rect(this.x, this.y, this.width, this.height);
  }
}

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 20;
    this.height = 20;
    this.color = random() > 0.5 ? 'red' : 'blue'; // Randomly decide power-up type (red = displacement, blue = freezing)
    this.type = this.color === 'red' ? 'displacement' : 'freezing'; // Set the type based on color
    this.active = true;
  }

  display() {
    if (this.active) {
      fill(this.color);
      rect(this.x, this.y, this.width, this.height);
    }
  }

  checkCollision(player) {
    if (!this.active) return false;

    return (
      player.x < this.x + this.width &&
      player.x + player.width > this.x &&
      player.y < this.y + this.height &&
      player.y + player.height > this.y
    );
  }
}

// Modify the spawnPowerUp function to spawn either type of power-up
function spawnPowerUp() {
  if (millis() - lastPowerUpSpawn > powerUpSpawnInterval) {
    // Select a random platform
    if (platforms.length > 0) {
      let platform = random(platforms);
      let powerUpX = platform.x + platform.width / 2 - 10; // Center on platform
      let powerUpY = platform.y - 30; // Place above platform
      powerUps.push(new PowerUp(powerUpX, powerUpY)); // Spawn new power-up
      lastPowerUpSpawn = millis();
    }
  }
}

function displayEndScreen() {
  // background(150);
  image(backgroundImage, 0, 0, width, height);
  textSize(32);
  fill(0);
  textAlign(CENTER, CENTER);
  text("Game Over!", width / 2, height / 4);

  textSize(24);
  text(`${player1Name} Wins: ${player1Wins}`, width / 2, height / 2 - 50);
  text(`${player2Name} Wins: ${player2Wins}`, width / 2, height / 2 + 50);

  textSize(16);
  text("Press 'R' to restart", width / 2, height * 0.75);
}

function keyPressed() {
  if (gameState === "playing") {
    // Player 1 jump (W key)
    if (keyCode === 87 && !player1.isJumping) {
      player1.velocityY = jumpAcceleration;
      player1.isJumping = true;
    }

    // Player 2 jump (Up Arrow)
    if (keyCode === UP_ARROW && !player2.isJumping) {
      player2.velocityY = jumpAcceleration;
      player2.isJumping = true;
    }

    // Player 1 attack (Z key)
    if (keyCode === 90) {
      player1.attack(player2);
    }

    // Player 2 attack (/ key)
    if (keyCode === 191) {
      player2.attack(player1);
    }
  } else if (gameState === "endgame" && keyCode === 82) { // 'R' key to restart
    resetGame();
  }
}

function resetGame() {
  gameState = "menu";
  platforms = []
  powerUps = []; // Clear all power-ups
  lastPowerUpSpawn = 0;
  player1NameInput.show();
  player2NameInput.show();
  startButton.show();
}
