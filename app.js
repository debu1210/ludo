/**
 * Ludo Quest - Core Game Engine
 * Architecture: Stateful Turn Management & Matrix-to-Track Mapping
 */

const TEAMS = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

const MAIN_TRACK_COORDINATES = [
    {r:7, c:1}, {r:7, c:2}, {r:7, c:3}, {r:7, c:4}, {r:7, c:5}, {r:7, c:6},
    {r:6, c:7}, {r:5, c:7}, {r:4, c:7}, {r:3, c:7}, {r:2, c:7}, {r:1, c:7},
    {r:1, c:8},
    {r:1, c:9}, {r:2, c:9}, {r:3, c:9}, {r:4, c:9}, {r:5, c:9}, {r:6, c:9},
    {r:7, c:10}, {r:7, c:11}, {r:7, c:12}, {r:7, c:13}, {r:7, c:14}, {r:7, c:15},
    {r:8, c:15},
    {r:9, c:15}, {r:9, c:14}, {r:9, c:13}, {r:9, c:12}, {r:9, c:11}, {r:9, c:10},
    {r:10, c:9}, {r:11, c:9}, {r:12, c:9}, {r:13, c:9}, {r:14, c:9}, {r:15, c:9},
    {r:15, c:8},
    {r:15, c:7}, {r:14, c:7}, {r:13, c:7}, {r:12, c:7}, {r:11, c:7}, {r:10, c:7},
    {r:9, c:6}, {r:9, c:5}, {r:9, c:4}, {r:9, c:3}, {r:9, c:2}, {r:9, c:1},
    {r:8, c:1}
];

const TEAM_TRACK_CONFIG = {
    RED:    { startTrackIdx: 0,  homeEntranceIdx: 50, runCoords: [{r:8, c:2}, {r:8, c:3}, {r:8, c:4}, {r:8, c:5}, {r:8, c:6}] },
    GREEN:  { startTrackIdx: 13, homeEntranceIdx: 11, runCoords: [{r:2, c:8}, {r:3, c:8}, {r:4, c:8}, {r:5, c:8}, {r:6, c:8}] },
    YELLOW: { startTrackIdx: 26, homeEntranceIdx: 24, runCoords: [{r:8, c:14}, {r:8, c:13}, {r:8, c:12}, {r:8, c:11}, {r:8, c:10}] },
    BLUE:   { startTrackIdx: 39, homeEntranceIdx: 37, runCoords: [{r:14, c:8}, {r:13, c:8}, {r:12, c:8}, {r:11, c:8}, {r:10, c:8}] }
};

const SAFE_CELLS_GLOBAL = [
    {r:7, c:1},  {r:9, c:2},  {r:6, c:7},  {r:2, c:6}, 
    {r:7, c:15}, {r:9, c:14}, {r:10, c:9}, {r:14, c:10}
];

let gameState = {
    currentTurnIdx: 0, 
    diceValue: 1,
    hasRolled: false,
    winners: [],
    tokens: {
        RED:    [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
        GREEN:  [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
        YELLOW: [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
        BLUE:   [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}]
    }
};

const boardContainer = document.getElementById('board-cells-container');
const ludoBoard = document.getElementById('ludo-board');
const diceEl = document.getElementById('game-dice');
const rollBtn = document.getElementById('roll-btn');
const resetBtn = document.getElementById('reset-btn');
const msgEl = document.getElementById('game-message');
const winModal = document.getElementById('win-modal');
const modalRestartBtn = document.getElementById('modal-restart-btn');

function initGame() {
    generateTrackCells();
    createTokenElements();
    updateUIElements();
    attachGlobalListeners();
    resetState();
}

function generateTrackCells() {
    boardContainer.innerHTML = '';
    
    MAIN_TRACK_COORDINATES.forEach((coord, idx) => {
        const cell = document.createElement('div');
        cell.className = 'track-cell';
        cell.style.gridArea = `${coord.r} / ${coord.c}`;
        cell.dataset.type = 'main';
        cell.dataset.index = idx;
        
        if(idx === 0)  cell.classList.add('red-start');
        if(idx === 13) cell.classList.add('green-start');
        if(idx === 26) cell.classList.add('yellow-start');
        if(idx === 39) cell.classList.add('blue-start');
        
        boardContainer.appendChild(cell);
    });

    TEAMS.forEach(color => {
        TEAM_TRACK_CONFIG[color].runCoords.forEach((coord, idx) => {
            const cell = document.createElement('div');
            cell.className = `track-cell home-run-cell ${color.toLowerCase()}-home-run`;
            cell.style.gridArea = `${coord.r} / ${coord.c}`;
            cell.dataset.type = 'homerun';
            cell.dataset.color = color;
            cell.dataset.index = idx;
            boardContainer.appendChild(cell);
        });
    });
}

function createTokenElements() {
    document.querySelectorAll('.token').forEach(el => el.remove());

    TEAMS.forEach(color => {
        for (let i = 0; i < 4; i++) {
            const token = document.createElement('div');
            token.className = `token token-${color.toLowerCase()}`;
            token.dataset.color = color;
            token.dataset.index = i;
            token.tabIndex = 0;
            token.addEventListener('click', () => handleTokenInteraction(color, i));
            token.addEventListener('keydown', (e) => {
                if(e.key === 'Enter' || e.key === ' ') handleTokenInteraction(color, i);
            });
            positionTokenDOM(token, color, i);
        }
    });
}

function positionTokenDOM(tokenEl, color, index) {
    const tokenState = gameState.tokens[color][index];
    
    if (tokenState.pos === 'NEST') {
        const slot = document.querySelector(`.token-slot.${color.toLowerCase()}-token-slot[data-index="${index}"]`);
        if(slot) slot.appendChild(tokenEl);
    } else if (tokenState.pos === 'HOME') {
        const homeCenter = document.querySelector('.center-home');
        if(homeCenter) homeCenter.appendChild(tokenEl);
    } else {
        let targetCell;
        if (tokenState.pos === 'TRACK') {
            const trackIdx = tokenState.actualTrackIdx;
            targetCell = document.querySelector(`.track-cell[data-type="main"][data-index="${trackIdx}"]`);
        } else if (tokenState.pos === 'HOMERUN') {
            const runIdx = tokenState.stepCount - 51;
            targetCell = document.querySelector(`.track-cell[data-type="homerun"][data-color="${color}"][data-index="${runIdx}"]`);
        }
        
        if (targetCell) {
            targetCell.appendChild(tokenEl);
            resolveCollisionsAndStacking(targetCell);
        }
    }
}

function resolveCollisionsAndStacking(cellElement) {
    const tokensInCell = cellElement.querySelectorAll('.token');
    tokensInCell.forEach((tok, idx) => {
        tok.style.transform = tokensInCell.length > 1 
            ? `scale(0.8) translate(${(idx % 2) * 8 - 4}px, ${Math.floor(idx / 2) * 8 - 4}px)`
            : 'none';
    });
}

function triggerDiceRoll() {
    if (gameState.hasRolled) return;

    SFX.playDiceRoll(); // Audio Hook Triggered

    gameState.diceValue = Math.floor(Math.random() * 6) + 1;
    gameState.hasRolled = true;

    animateDiceFace(gameState.diceValue);

    const activeTeam = TEAMS[gameState.currentTurnIdx];
    const moveableTokens = getMoveableTokens(activeTeam, gameState.diceValue);

    if (moveableTokens.length === 0) {
        msgEl.innerText = `Player ${activeTeam} rolled a ${gameState.diceValue}. No legal moves!`;
        setTimeout(advanceTurn, 1500);
    } else {
        msgEl.innerText = `Player ${activeTeam} rolled a ${gameState.diceValue}. Select a piece to move.`;
        highlightMoveableTokens(moveableTokens);
    }
}

function handleTokenInteraction(color, index) {
    const activeTeam = TEAMS[gameState.currentTurnIdx];
    if (color !== activeTeam || !gameState.hasRolled) return;

    const moveable = getMoveableTokens(activeTeam, gameState.diceValue);
    if (!moveable.includes(index)) return;

    clearTokenHighlights();
    moveToken(color, index, gameState.diceValue);
}

function moveToken(color, index, rollValue) {
    SFX.playMoveToken(); // Audio Hook Triggered
    
    const token = gameState.tokens[color][index];
    const config = TEAM_TRACK_CONFIG[color];

    if (token.pos === 'NEST' && rollValue === 6) {
        token.pos = 'TRACK';
        token.stepCount = 0;
        token.actualTrackIdx = config.startTrackIdx;
    } else if (token.pos !== 'NEST') {
        token.stepCount += rollValue;
        
        if (token.stepCount >= 56) {
            token.pos = 'HOME';
            token.stepCount = 56;
        } else if (token.stepCount > 50) {
            token.pos = 'HOMERUN';
        } else {
            token.pos = 'TRACK';
            token.actualTrackIdx = (config.startTrackIdx + token.stepCount) % 52;
        }
    }

    const tokenEl = document.querySelector(`.token-${color.toLowerCase()}[data-index="${index}"]`);
    positionTokenDOM(tokenEl, color, index);

    if (token.pos === 'TRACK' && !isCellSafeGlobal(token.actualTrackIdx)) {
        evaluateCombatCaptures(token.actualTrackIdx, color);
    }

    if (checkVictoryCondition(color)) {
        if (!gameState.winners.includes(color)) {
            gameState.winners.push(color);
            displayWinnerOverlay();
            return;
        }
    }

    if (rollValue === 6) {
        gameState.hasRolled = false;
        msgEl.innerText = `${color} rolled a 6! Roll again.`;
        updateUIElements();
    } else {
        advanceTurn();
    }
}

function evaluateCombatCaptures(trackIdx, attackingColor) {
    TEAMS.forEach(opposingColor => {
        if (opposingColor === attackingColor) return;

        gameState.tokens[opposingColor].forEach((token, idx) => {
            if (token.pos === 'TRACK' && token.actualTrackIdx === trackIdx) {
                SFX.playCapture(); // Audio Hook Triggered
                
                token.pos = 'NEST';
                token.stepCount = -1;
                token.actualTrackIdx = null;

                const defeatedTokenEl = document.querySelector(`.token-${opposingColor.toLowerCase()}[data-index="${idx}"]`);
                positionTokenDOM(defeatedTokenEl, opposingColor, idx);
                msgEl.innerText = `⚔️ Player ${attackingColor} captured Player ${opposingColor}!`;
            }
        });
    });
}

function getMoveableTokens(color, rollValue) {
    const tokens = gameState.tokens[color];
    let indices = [];

    tokens.forEach((tok, idx) => {
        if (tok.pos === 'NEST' && rollValue === 6) {
            indices.push(idx);
        } else if (tok.pos !== 'NEST' && tok.pos !== 'HOME') {
            if (tok.stepCount + rollValue <= 56) {
                indices.push(idx);
            }
        }
    });
    return indices;
}

function isCellSafeGlobal(trackIdx) {
    const targetCoord = MAIN_TRACK_COORDINATES[trackIdx];
    return SAFE_CELLS_GLOBAL.some(safe => safe.r === targetCoord.r && safe.c === targetCoord.c);
}

function checkVictoryCondition(color) {
    return gameState.tokens[color].every(tok => tok.pos === 'HOME');
}

function advanceTurn() {
    clearTokenHighlights();
    do {
        gameState.currentTurnIdx = (gameState.currentTurnIdx + 1) % 4;
    } while (gameState.winners.includes(TEAMS[gameState.currentTurnIdx]) && gameState.winners.length < 4);

    gameState.hasRolled = false;
    updateUIElements();
}

function updateUIElements() {
    const activeColor = TEAMS[gameState.currentTurnIdx];
    
    TEAMS.forEach(color => {
        const card = document.getElementById(`card-${color}`);
        const status = document.getElementById(`status-${color}`);
        if(card && status) {
            if (color === activeColor) {
                card.classList.add('active-turn');
                status.innerText = gameState.hasRolled ? 'Choosing...' : 'Rolling';
            } else {
                card.classList.remove('active-turn');
                status.innerText = gameState.winners.includes(color) ? 'Finished' : 'Waiting';
            }
        }
    });

    if(!gameState.hasRolled) {
        msgEl.innerText = `Player ${activeColor}'s turn. Roll the dice!`;
    }
}

function highlightMoveableTokens(tokenIndices) {
    const activeColor = TEAMS[gameState.currentTurnIdx].toLowerCase();
    tokenIndices.forEach(idx => {
        const tokenEl = document.querySelector(`.token-${activeColor}[data-index="${idx}"]`);
        if(tokenEl) tokenEl.classList.add('moveable-highlight');
    });
}

function clearTokenHighlights() {
    document.querySelectorAll('.token').forEach(el => el.classList.remove('moveable-highlight'));
}

function animateDiceFace(value) {
    const faces = document.querySelectorAll('.dice-face');
    faces.forEach(face => face.style.display = 'none');
    
    const targetFace = document.querySelector(`.dice-face.face-${value}`);
    if(targetFace) targetFace.style.display = 'flex';
}

function displayWinnerOverlay() {
    SFX.playVictory(); // Audio Hook Triggered
    
    const rankList = document.getElementById('rank-list');
    if(rankList) {
        rankList.innerHTML = gameState.winners.map((color, idx) => `<li><strong>#${idx + 1}</strong>: Player ${color}</li>`).join('');
        document.getElementById('winner-name-text').innerText = `Player ${gameState.winners[0]} Dominated the Match!`;
        winModal.classList.add('active');
    }
}

function resetState() {
    gameState = {
        currentTurnIdx: 0,
        diceValue: 1,
        hasRolled: false,
        winners: [],
        tokens: {
            RED:    [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
            GREEN:  [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
            YELLOW: [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}],
            BLUE:   [{pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}, {pos: 'NEST', stepCount: -1}]
        }
    };
    winModal.classList.remove('active');
    animateDiceFace(1);
    createTokenElements();
    updateUIElements();
}

function attachGlobalListeners() {
    rollBtn.onclick = triggerDiceRoll;
    diceEl.onclick = triggerDiceRoll;
    diceEl.onkeydown = (e) => { if(e.key === 'Enter' || e.key === ' ') triggerDiceRoll(); };
    resetBtn.onclick = resetState;
    modalRestartBtn.onclick = resetState;
}

window.addEventListener('DOMContentLoaded', initGame);
