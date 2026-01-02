const boardEl = document.getElementById("board");
const legendEl = document.getElementById("legend");
const placementsEl = document.getElementById("placements");
const monthSelect = document.getElementById("month-select");
const daySelect = document.getElementById("day-select");
const weekdaySelect = document.getElementById("weekday-select");
const solveBtn = document.getElementById("solve-js");
const loadJsonBtn = document.getElementById("load-json");
const statusText = document.getElementById("status-text");
const selectionLabel = document.getElementById("selection-label");

const ROWS = 6;
const COLS = 9;
const BOARD_LABELS = [
  ["JAN", "FEB", "MAR", "APR", "1", "2", "3", "MON", "TUE"],
  ["MAY", "4", "5", "6", "7", "8", "9", "WED", "BL"],
  ["JUN", "10", "11", "12", "13", "31", "15", "THU", "BL"],
  ["JUL", "16", "17", "18", "19", "20", "21", "FRI", "SAT"],
  ["AUG", "22", "23", "24", "25", "26", "27", "BL", "SUN"],
  ["SEP", "OCT", "NOV", "DEC", "28", "29", "30", "14", "EMPTY"],
];

const cellKey = (row, col) => `${row},${col}`;
const FORBIDDEN = [{ row: 5, col: 8 }];
const FORBIDDEN_SET = new Set(FORBIDDEN.map(({ row, col }) => cellKey(row, col)));

const PIECE_COLORS = {
  I5: "#38bdf8",
  T: "#ff5f52",
  U: "#fb923c",
  Z: "#a3e635",
  L1: "#facc15",
  P: "#f472b6",
  F: "#c084fc",
  W: "#14b8a6",
  L2: "#22d3ee",
  TL: "#fde047",
};

const PIECES = {
  I5: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  T: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 1],
  ],
  U: [
    [0, 0],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
  ],
  Z: [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 2],
  ],
  L1: [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [2, 2],
  ],
  P: [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  F: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 1],
  ],
  W: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  L2: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [3, 1],
  ],
  TL: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 1],
    [2, 1],
  ],
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = Array.from({ length: 31 }, (_, idx) => String(idx + 1));
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const PIECE_NAMES = Object.keys(PIECES);

const boardLabelPositions = new Map();
const keyToCoord = new Map();

for (let r = 0; r < ROWS; r += 1) {
  for (let c = 0; c < COLS; c += 1) {
    const label = BOARD_LABELS[r][c].toUpperCase();
    if (!boardLabelPositions.has(label)) {
      boardLabelPositions.set(label, []);
    }
    boardLabelPositions.get(label).push({ row: r, col: c });
    keyToCoord.set(cellKey(r, c), { row: r, col: c });
  }
}

const pieceNamesInPalette = Object.keys(PIECE_COLORS);
let currentHighlight = null;
let boardNodesByPiece = new Map();
let legendNodesByPiece = new Map();
let placementNodesByPiece = new Map();

const formatCellList = (cells) =>
  cells
    .map(({ row, col }) => `(${row + 1}, ${col + 1})`)
    .join(", ");

const setStatus = (text, variant = "muted") => {
  statusText.textContent = text;
  statusText.className = `status ${variant}`;
};

const updateSelectionLabel = () => {
  if (selectionLabel) {
    selectionLabel.textContent = `Selected: ${monthSelect.value} / ${daySelect.value} / ${weekdaySelect.value}`;
  }
};

const clearHighlights = () => {
  boardNodesByPiece.forEach((elements) =>
    elements.forEach((el) => el.classList.remove("highlighted")),
  );
  legendNodesByPiece.forEach((node) => node.classList.remove("highlighted"));
  placementNodesByPiece.forEach((node) => node.classList.remove("highlighted"));
};

const applyHighlight = (pieceName) => {
  clearHighlights();
  if (!pieceName) return;
  const boardNodes = boardNodesByPiece.get(pieceName) || [];
  boardNodes.forEach((node) => node.classList.add("highlighted"));
  legendNodesByPiece.get(pieceName)?.classList.add("highlighted");
  placementNodesByPiece.get(pieceName)?.classList.add("highlighted");
};

const setHighlight = (pieceName) => {
  currentHighlight = pieceName;
  applyHighlight(pieceName);
};

const buildCellElement = (cell) => {
  const el = document.createElement("div");
  el.className = "cell";
  if (cell.isMustCover) el.classList.add("must-cover");
  if (cell.isForbidden) el.classList.add("forbidden");

  const mark = cell.piece;
  if (mark) {
    const color = PIECE_COLORS[mark] || "#94a3b8";
    el.style.background = `linear-gradient(135deg, ${color}33, ${color}55)`;
    el.style.borderColor = `${color}aa`;
  }

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = cell.label || `R${cell.row + 1}C${cell.col + 1}`;

  const markSpan = document.createElement("span");
  markSpan.className = "piece-mark";
  markSpan.textContent = mark ? mark : cell.isMustCover ? "•" : "";

  el.append(label, markSpan);
  return el;
};

const renderLegend = (placements) => {
  legendEl.innerHTML = "";
  legendNodesByPiece = new Map();
  const pieceList =
    placements.length > 0
      ? Array.from(new Set(placements.map((p) => p.name)))
      : pieceNamesInPalette;

  pieceList.forEach((name) => {
    const chip = document.createElement("span");
    chip.className = "legend-item";
    chip.style.background = PIECE_COLORS[name] || "#e2e8f0";
    chip.textContent = name;
    chip.addEventListener("mouseenter", () => setHighlight(name));
    chip.addEventListener("mouseleave", () => setHighlight(null));
    legendEl.appendChild(chip);
    legendNodesByPiece.set(name, chip);
  });
};

const renderPlacements = (placements) => {
  placementsEl.innerHTML = "";
  placementNodesByPiece = new Map();
  placements.forEach((p) => {
    const entry = document.createElement("div");
    entry.className = "placement-entry";
    entry.textContent = `${p.name}: ${formatCellList(p.cells)}`;
    entry.addEventListener("mouseenter", () => setHighlight(p.name));
    entry.addEventListener("mouseleave", () => setHighlight(null));
    placementsEl.appendChild(entry);
    placementNodesByPiece.set(p.name, entry);
  });
};

const renderBoard = (data) => {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = `repeat(${data.cols}, minmax(90px,1fr))`;
  boardNodesByPiece = new Map();
  data.cells.flat().forEach((cell) => {
    const el = buildCellElement(cell);
    boardEl.appendChild(el);
    if (cell.piece) {
      if (!boardNodesByPiece.has(cell.piece)) {
        boardNodesByPiece.set(cell.piece, []);
      }
      boardNodesByPiece.get(cell.piece).push(el);
      el.addEventListener("mouseenter", () => setHighlight(cell.piece));
      el.addEventListener("mouseleave", () => setHighlight(null));
    }
  });
};

const renderVisualization = (data) => {
  renderBoard(data);
  renderLegend(data.placements);
  renderPlacements(data.placements);
  applyHighlight(currentHighlight);
};

const showMessage = (msg, isError = false) => {
  boardEl.innerHTML = "";
  boardEl.style.gridTemplateColumns = "1fr";
  const box = document.createElement("div");
  box.className = "cell";
  if (isError) box.style.borderColor = "#f87171";
  box.innerHTML = `<span class="label">Status</span><span class="piece-mark">${msg}</span>`;
  boardEl.appendChild(box);
  renderLegend([]);
  placementsEl.innerHTML = "";
  currentHighlight = null;
};

const populateSelect = (selectEl, values) => {
  selectEl.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
};

const getLabelPosition = (label) => {
  const normalized = String(label).toUpperCase();
  const positions = boardLabelPositions.get(normalized);
  return positions ? positions[0] : null;
};

const normalizeShape = (cells) => {
  let minR = Infinity;
  let minC = Infinity;
  cells.forEach(([r, c]) => {
    if (r < minR) minR = r;
    if (c < minC) minC = c;
  });
  return cells
    .map(([r, c]) => [r - minR, c - minC])
    .sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
};

const rotate90 = (cells) => cells.map(([r, c]) => [c, -r]);
const reflectHorizontal = (cells) => cells.map(([r, c]) => [r, -c]);

const allOrientations = (cells) => {
  const seen = new Set();
  const orientations = [];
  let current = cells;

  for (let i = 0; i < 4; i += 1) {
    const normalized = normalizeShape(current);
    const key = JSON.stringify(normalized);
    if (!seen.has(key)) {
      seen.add(key);
      orientations.push(normalized);
    }

    const mirrored = normalizeShape(reflectHorizontal(current));
    const mirrorKey = JSON.stringify(mirrored);
    if (!seen.has(mirrorKey)) {
      seen.add(mirrorKey);
      orientations.push(mirrored);
    }

    current = rotate90(current);
  }

  return orientations;
};

const generatePlacementsForPiece = (pieceName, cells, mustCoverSet) => {
  const placements = [];
  const orientations = allOrientations(cells);

  orientations.forEach((orient) => {
    let maxRow = 0;
    let maxCol = 0;
    orient.forEach(([r, c]) => {
      if (r > maxRow) maxRow = r;
      if (c > maxCol) maxCol = c;
    });

    for (let baseR = 0; baseR <= ROWS - (maxRow + 1); baseR += 1) {
      for (let baseC = 0; baseC <= COLS - (maxCol + 1); baseC += 1) {
        const absCells = orient.map(([r, c]) => ({
          row: baseR + r,
          col: baseC + c,
        }));
        const absKeys = absCells.map(({ row, col }) => cellKey(row, col));

        const conflictsForbidden = absKeys.some((key) => FORBIDDEN_SET.has(key));
        const conflictsMustCover = absKeys.some((key) => mustCoverSet.has(key));
        if (conflictsForbidden || conflictsMustCover) continue;

        placements.push({
          name: pieceName,
          cells: absCells,
          cellKeys: absKeys,
        });
      }
    }
  });

  return placements;
};

const buildPlacementsIndex = (placementsByPiece, boardToCover) => {
  const cellToPlacements = new Map();
  boardToCover.forEach((key) => cellToPlacements.set(key, []));

  placementsByPiece.forEach((placements) => {
    placements.forEach((placement) => {
      placement.cellKeys.forEach((key) => {
        if (cellToPlacements.has(key)) {
          cellToPlacements.get(key).push(placement);
        }
      });
    });
  });

  return cellToPlacements;
};

const pickNextCell = (boardToCover, usedCells, usedPieces, cellToPlacements) => {
  let bestKey = null;
  let bestCount = Infinity;

  boardToCover.forEach((cellKey) => {
    if (usedCells.has(cellKey)) return;

    const placements = cellToPlacements.get(cellKey) || [];
    let viable = 0;
    for (const placement of placements) {
      if (usedPieces.has(placement.name)) continue;
      let conflict = false;
      for (const key of placement.cellKeys) {
        if (usedCells.has(key)) {
          conflict = true;
          break;
        }
      }
      if (!conflict) {
        viable += 1;
      }
    }

    if (viable < bestCount) {
      bestCount = viable;
      bestKey = cellKey;
    }
  });

  return bestKey;
};

const solveExactCover = (placementsByPiece, boardToCover) => {
  const pieces = Array.from(placementsByPiece.keys());
  const placementsArray = pieces.map((name) => placementsByPiece.get(name) || []);
  if (placementsArray.some((arr) => arr.length === 0)) {
    return null;
  }

  const cellToPlacements = buildPlacementsIndex(placementsArray, boardToCover);
  const usedCells = new Set();
  const usedPieces = new Set();
  const solution = [];

  const backtrack = () => {
    if (usedCells.size === boardToCover.size && usedPieces.size === pieces.length) {
      return true;
    }

    const cellKey = pickNextCell(boardToCover, usedCells, usedPieces, cellToPlacements);
    if (!cellKey) return false;

    const candidates = cellToPlacements.get(cellKey) || [];
    for (const placement of candidates) {
      if (usedPieces.has(placement.name)) continue;
      let conflict = false;
      for (const key of placement.cellKeys) {
        if (usedCells.has(key)) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      usedPieces.add(placement.name);
      placement.cellKeys.forEach((key) => usedCells.add(key));
      solution.push(placement);

      if (backtrack()) {
        return true;
      }

      solution.pop();
      placement.cellKeys.forEach((key) => usedCells.delete(key));
      usedPieces.delete(placement.name);
    }

    return false;
  };

  const ok = backtrack();
  return ok ? solution : null;
};

const buildBoardPayload = (mustCoverSet, placements) => {
  const cells = [];
  const assignment = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => null),
  );

  placements.forEach((placement) => {
    placement.cells.forEach(({ row, col }) => {
      assignment[row][col] = placement.name;
    });
  });

  for (let r = 0; r < ROWS; r += 1) {
    const row = [];
    for (let c = 0; c < COLS; c += 1) {
      const key = cellKey(r, c);
      row.push({
        row: r,
        col: c,
        label: BOARD_LABELS[r][c],
        piece: assignment[r][c],
        isMustCover: mustCoverSet.has(key),
        isForbidden: FORBIDDEN_SET.has(key),
      });
    }
    cells.push(row);
  }

  const placementsPayload = placements.map((p) => ({
    name: p.name,
    cells: p.cells.map(({ row, col }) => ({ row, col })),
  }));

  return {
    rows: ROWS,
    cols: COLS,
    boardLabels: BOARD_LABELS,
    cells,
    must_cover: Array.from(mustCoverSet).map((key) => keyToCoord.get(key)),
    forbidden: FORBIDDEN,
    placements: placementsPayload,
  };
};

const computeMustCoverSet = () => {
  const monthPos = getLabelPosition(monthSelect.value);
  const dayPos = getLabelPosition(daySelect.value);
  const weekdayPos = getLabelPosition(weekdaySelect.value);

  if (!monthPos || !dayPos || !weekdayPos) {
    throw new Error("Selected cells are missing on the board.");
  }

  const mustPositions = [monthPos, dayPos, weekdayPos];
  const mustSet = new Set(mustPositions.map(({ row, col }) => cellKey(row, col)));
  return { mustSet, mustPositions };
};

const runBrowserSolver = () => {
  let mustCover;
  try {
    const { mustSet } = computeMustCoverSet();
    mustCover = mustSet;
  } catch (err) {
    setStatus(err.message, "error");
    showMessage("Invalid selection", true);
    return;
  }

  setStatus("Solving…", "pending");

  const placementsByPiece = new Map();
  PIECE_NAMES.forEach((name) => {
    placementsByPiece.set(name, generatePlacementsForPiece(name, PIECES[name], mustCover));
  });

  const boardToCover = new Set();
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const key = cellKey(r, c);
      if (FORBIDDEN_SET.has(key) || mustCover.has(key)) continue;
      boardToCover.add(key);
    }
  }

  const solution = solveExactCover(placementsByPiece, boardToCover);
  if (!solution) {
    setStatus("No solution for this date", "error");
    const payload = buildBoardPayload(mustCover, []);
    renderVisualization(payload);
    return;
  }

  setStatus("Solved in-browser", "success");
  const payload = buildBoardPayload(mustCover, solution);
  renderVisualization(payload);
};

const loadFromJson = async () => {
  try {
    setStatus("Loading solution.json…", "pending");
    const res = await fetch(`solution.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderVisualization(data);
    setStatus("Loaded solution.json", "success");
  } catch (err) {
    console.error(err);
    setStatus("solution.json not found. Run python solver first.", "error");
    showMessage("Missing solution.json", true);
  }
};

const previewSelection = () => {
  try {
    const { mustSet } = computeMustCoverSet();
    const payload = buildBoardPayload(mustSet, []);
    renderVisualization(payload);
    setStatus("Pick a date and click Solve.", "muted");
    updateSelectionLabel();
  } catch (err) {
    setStatus(err.message, "error");
    showMessage("Invalid selection", true);
  }
};

const init = () => {
  populateSelect(monthSelect, MONTHS);
  populateSelect(daySelect, DAYS);
  populateSelect(weekdaySelect, WEEKDAYS);

  monthSelect.value = "JAN";
  daySelect.value = "1";
  weekdaySelect.value = "MON";

  monthSelect.addEventListener("change", previewSelection);
  daySelect.addEventListener("change", previewSelection);
  weekdaySelect.addEventListener("change", previewSelection);

  solveBtn.addEventListener("click", runBrowserSolver);
  loadJsonBtn.addEventListener("click", loadFromJson);

  previewSelection();
  updateSelectionLabel();
};

if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}
