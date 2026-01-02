from __future__ import annotations
import json
from dataclasses import dataclass
from typing import List, Tuple, Set, Dict, Iterable, Optional

Cell = Tuple[int, int]  # (r, c) zero-based


BOARD_LABELS: List[List[str]] = [
    ["JAN", "FEB", "MAR", "APR", "1", "2", "3", "MON", "TUE"],
    ["MAY", "4", "5", "6", "7", "8", "9", "WED", "BL"],
    ["JUN", "10", "11", "12", "13", "31", "15", "THU", "BL"],
    ["JUL", "16", "17", "18", "19", "20", "21", "FRI", "SAT"],
    ["AUG", "22", "23", "24", "25", "26", "27", "BL", "SUN"],
    ["SEP", "OCT", "NOV", "DEC", "28", "29", "30", "14", "EMPTY"],
]


# -------------------------
# Geometry helpers
# -------------------------

def normalize(shape: Set[Cell]) -> Tuple[Cell, ...]:
    """Shift shape so its min row/col becomes (0,0). Return sorted tuple."""
    min_r = min(r for r, _ in shape)
    min_c = min(c for _, c in shape)
    shifted = {(r - min_r, c - min_c) for r, c in shape}
    return tuple(sorted(shifted))


def rotate90(shape: Set[Cell]) -> Set[Cell]:
    """Rotate shape 90 degrees clockwise around origin (0,0)."""
    # (r, c) -> (c, -r) then normalize later
    return {(c, -r) for r, c in shape}


def reflect(shape: Set[Cell]) -> Set[Cell]:
    """Mirror shape horizontally: (r,c)->(r,-c)."""
    return {(r, -c) for r, c in shape}


def all_orientations(cells: Iterable[Cell]) -> List[Tuple[Cell, ...]]:
    """
    Generate all unique rotations/reflections of a polyomino.
    Return list of normalized tuple shapes.
    """
    base = set(cells)
    seen = set()

    cur = base
    for _ in range(4):
        n = normalize(cur)
        seen.add(n)

        mirrored = reflect(cur)
        seen.add(normalize(mirrored))

        cur = rotate90(cur)

    return list(seen)


# -------------------------
# Exact cover via backtracking
# -------------------------

@dataclass(frozen=True)
class Placement:
    piece_name: str
    cells: Tuple[Cell, ...]  # absolute board cells occupied


def solve_exact_cover(
    placements_by_piece: Dict[str, List[Placement]],
    board_to_cover: Set[Cell],
    pieces: List[str],
) -> Optional[List[Placement]]:
    """
    Exact cover:
      - pick exactly 1 placement per piece
      - all cells in board_to_cover covered exactly once
    """

    # Build quick index: cell -> placements that cover it
    cell_to_placements: Dict[Cell, List[Placement]] = {cell: [] for cell in board_to_cover}
    for plist in placements_by_piece.values():
        for p in plist:
            for cell in p.cells:
                if cell in cell_to_placements:
                    cell_to_placements[cell].append(p)

    used_cells: Set[Cell] = set()
    used_pieces: Set[str] = set()
    solution: List[Placement] = []

    # For speed: map placement -> set(cells)
    p_cells_cache: Dict[Placement, Set[Cell]] = {}

    def pset(p: Placement) -> Set[Cell]:
        if p not in p_cells_cache:
            p_cells_cache[p] = set(p.cells)
        return p_cells_cache[p]

    def pick_next_cell() -> Optional[Cell]:
        """Choose uncovered cell with minimum remaining candidate placements (MRV)."""
        candidates = []
        for cell in board_to_cover:
            if cell in used_cells:
                continue
            # placements that don't conflict with already used cells/pieces
            viable = 0
            for p in cell_to_placements[cell]:
                if p.piece_name in used_pieces:
                    continue
                pc = pset(p)
                if pc & used_cells:
                    continue
                viable += 1
            candidates.append((viable, cell))
        if not candidates:
            return None
        candidates.sort(key=lambda x: x[0])
        # If a cell has 0 options -> dead end fast
        return candidates[0][1]

    def backtrack() -> bool:
        # success if all cover-cells are used and all pieces are used
        if len(used_cells) == len(board_to_cover) and len(used_pieces) == len(pieces):
            return True

        cell = pick_next_cell()
        if cell is None:
            return False

        # Try placements that cover this cell
        for p in cell_to_placements[cell]:
            if p.piece_name in used_pieces:
                continue
            pc = pset(p)
            if pc & used_cells:
                continue

            # place
            used_pieces.add(p.piece_name)
            used_cells.update(pc)
            solution.append(p)

            if backtrack():
                return True

            # undo
            solution.pop()
            used_cells.difference_update(pc)
            used_pieces.remove(p.piece_name)

        return False

    ok = backtrack()
    return solution if ok else None


# -------------------------
# Puzzle wiring
# -------------------------

def generate_placements_for_piece(
    piece_name: str,
    piece_cells: Iterable[Cell],
    rows: int,
    cols: int,
    forbidden: Set[Cell],
    must_cover: Set[Cell],
) -> List[Placement]:
    """
    Generate all valid placements of one piece on the board:
      - within bounds
      - not on forbidden
      - not on must_cover (cells that must stay empty: JAN/2/FRI)
    """
    placements: List[Placement] = []
    for orient in all_orientations(piece_cells):
        # Determine bounding box size
        max_r = max(r for r, _ in orient)
        max_c = max(c for _, c in orient)

        for r0 in range(rows - max_r):
            for c0 in range(cols - max_c):
                abs_cells = tuple((r0 + r, c0 + c) for r, c in orient)

                # Bounds are already ensured by loops; now check forbidden / must_cover
                abs_set = set(abs_cells)
                if abs_set & forbidden:
                    continue
                if abs_set & must_cover:
                    continue

                placements.append(Placement(piece_name, abs_cells))

    return placements


def print_solution_grid(
    rows: int,
    cols: int,
    forbidden: Set[Cell],
    must_cover: Set[Cell],
    solution: List[Placement],
) -> None:
    grid = [["." for _ in range(cols)] for _ in range(rows)]

    for r, c in forbidden:
        grid[r][c] = "#"

    for r, c in must_cover:
        grid[r][c] = " "  # keep-open windows

    # Place pieces
    for p in solution:
        mark = p.piece_name[0].upper()
        for r, c in p.cells:
            grid[r][c] = mark

    col_widths = [
        max(len(BOARD_LABELS[r][c]) for r in range(rows))
        if BOARD_LABELS
        else 3
        for c in range(cols)
    ]
    col_widths = [max(w, 3) for w in col_widths]

    def fmt_row(values: List[str]) -> str:
        return " ".join(f"{val:^{col_widths[c]}}" for c, val in enumerate(values))

    header = "     " + " ".join(f"C{c+1:^{col_widths[c]}}" for c in range(cols))
    print("Calendar layout (labels / pieces):")
    print(header)

    for r in range(rows):
        labels = BOARD_LABELS[r] if BOARD_LABELS else [""] * cols
        label_line = fmt_row(labels)
        fills = []
        for c in range(cols):
            cell_char = grid[r][c]
            fills.append("·" if cell_char == "." else cell_char)
        fill_line = fmt_row(fills)

        print(f"R{r+1:<2} L {label_line}")
        print(f"R{r+1:<2} P {fill_line}")
        print()


def print_piece_ascii(name: str, cells: Iterable[Cell]) -> None:
    shape = normalize(set(cells))
    max_r = max(r for r, _ in shape)
    max_c = max(c for _, c in shape)
    grid = [["." for _ in range(max_c + 1)] for _ in range(max_r + 1)]
    for r, c in shape:
        grid[r][c] = "#"
    body = "\n".join(" ".join(row) for row in grid)
    print(f"{name} ({len(shape)} cells):\n{body}\n")


def export_solution_json(
    path: str,
    rows: int,
    cols: int,
    forbidden: Set[Cell],
    must_cover: Set[Cell],
    solution: List[Placement],
) -> None:
    grid_assignment = [["" for _ in range(cols)] for _ in range(rows)]
    for p in solution:
        for r, c in p.cells:
            grid_assignment[r][c] = p.piece_name

    cells_payload: List[List[Dict[str, object]]] = []
    for r in range(rows):
        row_payload: List[Dict[str, object]] = []
        for c in range(cols):
            label = ""
            if r < len(BOARD_LABELS) and c < len(BOARD_LABELS[r]):
                label = BOARD_LABELS[r][c]
            row_payload.append(
                {
                    "row": r,
                    "col": c,
                    "label": label,
                    "piece": grid_assignment[r][c] or None,
                    "isMustCover": (r, c) in must_cover,
                    "isForbidden": (r, c) in forbidden,
                }
            )
        cells_payload.append(row_payload)

    placements_payload = [
        {
            "name": p.piece_name,
            "cells": [{"row": r, "col": c} for r, c in p.cells],
        }
        for p in solution
    ]

    data = {
        "rows": rows,
        "cols": cols,
        "boardLabels": BOARD_LABELS,
        "cells": cells_payload,
        "must_cover": [{"row": r, "col": c} for r, c in must_cover],
        "forbidden": [{"row": r, "col": c} for r, c in forbidden],
        "placements": placements_payload,
    }

    with open(path, "w", encoding="utf-8") as fp:
        json.dump(data, fp, ensure_ascii=False, indent=2)


def main():
    # Board size: 6x9 (R1..R6, C1..C9)
    rows, cols = 6, 9

    # Forbidden cell: C9R6 -> (R6,C9) in 1-based => (5,8) in 0-based
    forbidden = {(5, 8)}

    # MUST-STAY-EMPTY windows for "Jan 2 Fri" — ЗАДАЙ ТУТ!
    # Формат: (row-1, col-1)
    # Приклад (НЕПРАВИЛЬНИЙ для тебе): must_cover = {(0,0), (0,5), (3,8)}
    must_cover: Set[Cell] = {
        (0, 0),  # JAN
        (0, 5),  # day 2
        (3, 7),  # FRI
    }

    # Cells that must be covered = all existing cells minus forbidden minus must_cover
    all_cells = {(r, c) for r in range(rows) for c in range(cols)}
    board_to_cover = all_cells - forbidden - must_cover

    # ---- Define your 9 pieces here as 5-cell polyominoes (pentomino-like) ----
    # Координати у локальній системі (0,0) довільні, normalize зробить своє.
    #
    # ВАЖЛИВО: нижче наведені ПРИКЛАДИ форм.
    # Ти маєш підставити СВОЇ 9 деталей (з фото) точно у клітинках.
    #
    # Якщо хочеш — скажи, чи всі деталі по 5 клітинок (пентоміно),
    # і я під твої форми заповню їх тут.

    PIECES: Dict[str, List[Cell]] = {
        "I5": [(0, 0), (0, 1), (0, 2), (0, 3), (0, 4)],
        "T": [
            (0, 0),
            (0, 1),
            (0, 2),
            (0, 3),
            (1, 1),
        ],
        "U": [
            (0, 0),
            (0, 2),
            (1, 0),
            (1, 1),
            (1, 2),
        ],
        "Z": [
            (0, 0),
            (0, 1),
            (1, 1),
            (2, 1),
            (2, 2),
        ],
        "L1": [
            (0, 0),
            (1, 0),
            (2, 0),
            (2, 1),
            (2, 2),
        ],
        "P": [
            (0, 0),
            (0, 1),
            (1, 0),
            (1, 1),
            (2, 1),
        ],
        "F": [
            (0, 0),
            (0, 1),
            (1, 1),
            (1, 2),
            (2, 1),
        ],
        "W": [
            (0, 0),
            (1, 0),
            (1, 1),
            (2, 1),
            (3, 1),
        ],
        "L2": [
            (0, 0),
            (1, 0),
            (2, 0),
            (3, 0),
            (3, 1),
        ],
        "TL": [
            (0, 0),
            (0, 1),
            (0, 2),
            (1, 1),
            (2, 1),
        ],
    }

    print("Piece atlas:")
    for name, cells in PIECES.items():
        print_piece_ascii(name, cells)

    piece_names = list(PIECES.keys())

    # Generate placements per piece
    placements_by_piece: Dict[str, List[Placement]] = {}
    for name, cells in PIECES.items():
        placements_by_piece[name] = generate_placements_for_piece(
            piece_name=name,
            piece_cells=cells,
            rows=rows,
            cols=cols,
            forbidden=forbidden,
            must_cover=must_cover,
        )

        if not placements_by_piece[name]:
            print(f"WARNING: no placements for piece {name} (check must_cover/forbidden/forms)")

    # Solve
    sol = solve_exact_cover(
        placements_by_piece=placements_by_piece,
        board_to_cover=board_to_cover,
        pieces=piece_names,
    )

    if sol is None:
        print("No solution found. (Most likely: wrong must_cover coords or piece shapes mismatch.)")
        return

    # Print solution grid
    print_solution_grid(rows, cols, forbidden, must_cover, sol)
    export_solution_json(
        path="solution.json",
        rows=rows,
        cols=cols,
        forbidden=forbidden,
        must_cover=must_cover,
        solution=sol,
    )
    print("Saved visualization payload to solution.json")
    print("\nPlacements (piece -> cells):")
    for p in sol:
        cells1 = [(r + 1, c + 1) for r, c in p.cells]  # 1-based
        print(f"{p.piece_name}: {cells1}")


if __name__ == "__main__":
    main()
