// System
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d", { alpha: false });
let canvasWidthScaled = canvas.width;
let canvasHeightScaled = canvas.height;
let lastFrameTime;

// Player
let playerX = 0;
let playerY = 0;
let playerVel = 0;
let playerAngle = 0;
let gravity = -1400;
let bounceVelMin = 1000;
let bounceVel = bounceVelMin;
let bounceVelHitIncrease = 120;
let bounceVelMissDecrease = 120;
let flipAngleVel = 0;
let uprightFix = false;
let totalAngleDeltaThisBounce = 0;
let blinkDelay = 3.0;
let blinkTime = 0.5;
let fallOut = false;
let fallOutTime = 0.0;
let fallOutLeft = false;
let totalFlips = 0;
let flipsThisBounce = 0;

// Trampoline
let trampShakeAmount = 0;
let trampShakeDecayPct = 0.9;
let trampShakeAngle = 0;
let trampShakeAngleSpeed = 4000.0;

// Camera
let camScale = 0.7;
let camDecayDelay = 0;
let camScaleBounce = 0.0;
let camScaleBounceDecayPct = 0.8;

// Input
let touch = false

// Menu
let mainMenu = true;
let mainMenuTouch = false;

// UI
let popups = [];

canvas.addEventListener("mousedown", e => { touch = true }, false);
canvas.addEventListener("mouseup", e => { touch = false }, false);
canvas.addEventListener("touchstart", e => { touch = true; e.preventDefault(); }, false );
canvas.addEventListener("touchend", e => { touch = false; e.preventDefault(); }, false );
canvas.addEventListener("touchcancel", e => { touch = false; e.preventDefault(); }, false );

function Reset()
{
    playerX = 0;
    playerY = 0;
    bounceVel = bounceVelMin;
    playerVel = bounceVel;
    playerAngle = 0;
    flipAngleVel = 0;
    uprightFix = false;
    totalAngleDeltaThisBounce = 0;
    trampShakeAmount = 0;
    trampShakeAngle = 0;
    camScale = 0.7;
    camDecayDelay = 0;
    fallOut = false;
    totalFlips = 0;
    flipsThisBounce = 0;
}

function GameLoop(curTime)
{
    let dt = Math.min((curTime - (lastFrameTime || curTime)) / 1000.0, 0.2);  // Cap to 200ms (5fps)
    lastFrameTime = curTime;

    UpdateUI(dt);
    UpdatePlayer(dt);
    UpdateCamera(dt);
    UpdateTrampoline(dt);

    // Clear background
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#AADDFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Set camera scale
    ctx.save();
    ctx.scale(camScale + camScaleBounce, camScale + camScaleBounce);
    canvasWidthScaled = canvas.width/(camScale + camScaleBounce);
    canvasHeightScaled = canvas.height/(camScale + camScaleBounce);
    ctx.translate((canvasWidthScaled - canvas.width)*0.5, (canvasHeightScaled - canvas.height));

    // Draw everything
    DrawTrampoline();
    DrawPlayer();
    DrawUI();

    ctx.restore();
    window.requestAnimationFrame(GameLoop);
}

function UpdatePlayer(dt)
{
    let playerTouch = touch && !mainMenuTouch;

    // Falling out?
    if (fallOut)
    {
        let fallOutPct = fallOutTime / 1.0;
        playerX = Math.cos(fallOutPct * Math.PI * 0.5) * 400.0 * (fallOutLeft ? -1.0 : 1.0) * bounceVel*0.001;
        playerY = Math.sin(fallOutPct * Math.PI) * 200.0 * bounceVel*0.001;
        playerAngle += 800.0 * dt * (fallOutLeft ? -1.0 : 1.0);

        fallOutTime -= dt;
        if (fallOutTime <= 0.0)
        {
            Reset();
        }
        return;
    }

    // Flipping?
    if (playerTouch && playerY > 100)
    {
        uprightFix = false;
        flipAngleVel += (720.0 - flipAngleVel)*0.1;
    }
    // Not flipping
    else
    {
        if (uprightFix)
        {
            playerAngle *= 0.8;
            if (Math.abs(playerAngle) < 0.01)
            {
                uprightFix = false;
            }
        }
        
        flipAngleVel *= 0.7;
    }

    // Clamp angle to -180 -> 180
    let prevPlayerAngle = playerAngle;
    playerAngle += flipAngleVel * dt;
    totalAngleDeltaThisBounce += playerAngle - prevPlayerAngle;
    flipsThisBounce = Math.floor((totalAngleDeltaThisBounce + 90.0) / 360.0);
    if (playerAngle >= 180.0)
    {
        playerAngle -= 360.0;
    }
    else if (playerAngle < -180.0)
    {
        playerAngle += 360;
    }

    // Move player
    playerVel += gravity * dt;
    playerY += playerVel * dt;

    // Hit trampoline?
    if (playerY <= 0.0)
    {
        // Start trampoline shake
        trampShakeAmount = 16.0;
        trampShakeAngle = 0;

        // Fall out?
        if (Math.abs(playerAngle) > 30.0)
        {
            fallOut = true;
            fallOutTime = 1.0;
            fallOutLeft = Math.random() < 0.5;

            AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "miss", "#F42");
        }
        else
        {
            // Set bounce velocity
            let didAFlip = totalAngleDeltaThisBounce >= 270;
            let perfectJump = Math.abs(playerAngle) < 6.5;
            if (didAFlip)
            {
                bounceVel += perfectJump ? (bounceVelHitIncrease * 1.5) : bounceVelHitIncrease;
            }
            else
            {
                bounceVel = Math.max(bounceVel - bounceVelMissDecrease, bounceVelMin);
            }

            if (didAFlip && perfectJump && !mainMenu)
            {
                camScaleBounce = 0.025;
            }

            if (didAFlip)
            {
                totalFlips += flipsThisBounce;

                if (perfectJump)
                {
                    AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "perfect!", "#FF0");
                }
                else
                {
                    AddPopup(canvas.width*0.5 + 100, canvas.height - 100, "good", "#0F4");
                }
            }
        }

        // Reset for new bounce
        playerY = 0.0;
        playerVel = bounceVel;
        uprightFix = true;
        totalAngleDeltaThisBounce = 0;
        flipsThisBounce = 0;
    }

    // Update blink
    blinkDelay -= dt;
    blinkTime -= dt;
    if (blinkDelay <= 0.0)
    {
        blinkDelay = 1.0 + (Math.random()*3.0);
        blinkTime = 0.1 + (Math.random()*0.1);
    }
}

function UpdateCamera(dt)
{
    // Calculate desired scale
    let desiredCamScale = (300.0 / Math.max(playerY, 300.0)) * 1.4;
    if (desiredCamScale < camScale)
    {
        camDecayDelay = 3.0;
    }
    else
    {
        camDecayDelay -= dt;
    }    
    desiredCamScale = Math.min(camScale, desiredCamScale);

    // Lerp to it
    camScale += (desiredCamScale - camScale) * 0.2;

    // Lerp out after hold delay is over
    if (camDecayDelay <= 0.0)
    {
        camScale += (0.7 - camScale) * 0.001;
    }

    camScaleBounce *= camScaleBounceDecayPct;
}

function UpdateTrampoline(dt)
{
    // Update shake
    trampShakeAmount *= trampShakeDecayPct;
    trampShakeAngle += trampShakeAngleSpeed * dt;
}

function UpdateUI(dt)
{
    // Main menu touch logic
    if (touch)
    {
        if (mainMenu)
        {
            mainMenuTouch = true;
        }
        mainMenu = false;
    }
    else
    {
        mainMenuTouch = false;
    }

    // Update popups
    popups.forEach((popup, index, object) =>
    {
        popup.time += dt;
        if (popup.time >= 1.0)
        {
            object.splice(index, 1);
        }
    });
}

function DrawLine(x1, y1, x2, y2, color, width)
{
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function DrawRectangle(width, height, color)
{
    let halfWidth = width * 0.5;
    let halfHeight = height * 0.5;

    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-halfWidth, -halfHeight);
    ctx.lineTo(halfWidth, -halfHeight);
    ctx.lineTo(halfWidth, halfHeight);
    ctx.lineTo(-halfWidth, halfHeight);
    ctx.lineTo(-halfWidth, -halfHeight);
    ctx.fill();
    ctx.restore();
}

function DrawText(text, x, y, angle, size, align, color)
{
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `bold ${size}px Arial`;
    ctx.fillStyle = color;
    ctx.textAlign = align.toLowerCase();
    ctx.fillText(text, 0, 0);
    ctx.restore();
}

function DrawTrampoline()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height - 120);

    DrawRectangle(canvasWidthScaled, 240, "#00D846");   // Grass
    DrawLine(-196, -20, -196, 80, "#000", 12);          // Left pole
    DrawLine(196, -20, 196, 80, "#000", 12);            // Right pole
    ctx.translate(0, Math.sin(trampShakeAngle * Math.PI/180.0) * trampShakeAmount);
    DrawLine(-200, 0, 200, 0, "#000", 12);              // Mesh

    ctx.restore();
}

function DrawPlayer()
{
    ctx.save();
    ctx.translate(canvas.width * 0.5 + playerX, (canvas.height - 188) - playerY);
    ctx.rotate(playerAngle * Math.PI/180.0);

    ctx.translate(0, -40);
    DrawRectangle(80, 96, "#FF9600");       // Head
    if (blinkTime > 0.0)
    {
        ctx.translate(-4, 4);
        DrawRectangle(40, 40, "#000");      // Eye
        ctx.translate(4, 4);
        DrawRectangle(34, 34, "#FF9600");   // Eye
        ctx.translate(-12, 0);
    }
    else
    {
        ctx.translate(-4, 4);
        DrawRectangle(40, 40, "#FFF");      // Eye
        ctx.translate(-8, 4);
        DrawRectangle(16, 24, "#000");      // Pupil
    }

    if (!touch || mainMenuTouch)
    {
        ctx.translate(8, 40);
        DrawLine(0, 0, 0, 60, "#000", 8);   // Leg
    }
    else
    {
        ctx.translate(8, 40);
        DrawLine(0, 0, -30, 20, "#000", 8); // Leg (upper)
        DrawLine(-30, 20, 0, 40, "#000", 8);// Leg (lower)
    }

    ctx.restore();
}

function DrawUI()
{
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (mainMenu)
    {
        let titleTxt = "oh, flip";
        DrawText(titleTxt, canvas.width*0.5, 160, -5*Math.PI/180.0, 170, "center", "#000");
        DrawText(titleTxt, (canvas.width*0.5) - 10, 155, -5*Math.PI/180.0, 170, "center", "#FF9600");

        let subtitleTxt = "a game about backflips";
        DrawText(subtitleTxt, (canvas.width*0.5), 240, -5*Math.PI/180.0, 50, "center", "#000");
        DrawText(subtitleTxt, (canvas.width*0.5) - 4, 235, -5*Math.PI/180.0, 50, "center", "#FFF");

        let instructionsTxt = "land flips to gain height - complete goals to feel good";
        DrawText(instructionsTxt, (canvas.width*0.5), canvas.height - 20, 0.0, 25, "center", "#000");
        DrawText(instructionsTxt, (canvas.width*0.5) - 3, canvas.height - 23, 0.0, 25, "center", "#FFF");
    }
    else
    {
        let heightFt = Math.floor(playerY / 40.0);
        let heightTxt = `Height: ${heightFt} ft`;
        DrawText(heightTxt, 20, 30, 0.0, 25, "left", "#000");
        DrawText(heightTxt, 18, 28, 0.0, 25, "left", "#FFF");

        let flipsTxt = `Total Flips: ${totalFlips}`;
        DrawText(flipsTxt, 20, 62, 0.0, 25, "left", "#000");
        DrawText(flipsTxt, 18, 60, 0.0, 25, "left", "#FFF");
    }

    // Draw popups
    popups.forEach(popup =>
    {
        let popupPct = Math.min(popup.time / 0.1, 1.0);
        let offsetAnglePct = Math.min(popup.time / 0.4, 1.0);
        let xOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 25.0;
        let yOffset = Math.sin(offsetAnglePct * Math.PI * 0.5) * 50.0;
        DrawText(popup.text, popup.x + xOffset, popup.y - yOffset, -5*Math.PI/180.0, 30 + Math.sin(popupPct * Math.PI * 0.75) * 25.0, "center", "#000");
        DrawText(popup.text, (popup.x + xOffset) - 3, (popup.y - yOffset) - 3, -5*Math.PI/180.0, 30 + Math.sin(popupPct * Math.PI * 0.75) * 25.0, "center", popup.color);
    });

    ctx.restore();
}

function AddPopup(x, y, text, color)
{
    popups.push({x: x, y: y, text: text, color: color, time: 0.0});
}

Reset();
window.requestAnimationFrame(GameLoop);