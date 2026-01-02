# 🗓️ Calendar Puzzle Solver & Visualizer

<p align="center">
  <a href="https://mi4i0.github.io/calendar-puzzle/"><strong>Live Demo</strong></a> •
  <a href="https://github.com/mi4i0/calendar-puzzle"><strong>GitHub Repo</strong></a>
</p>

Interactive playground for the classic 6×9 calendar pentomino puzzle: pick any month/day/weekday and watch the solver tile the board while leaving those cells exposed.

---

## ✨ Highlights

- **Python exact-cover solver** (`solver.py`) — generates textual layouts and exports rich `solution.json` files.
- **In-browser solver & UI** (`index.html` + `visualizer.js`) — slick controls, hover highlighting, and instant results powered by a JavaScript backtracking engine.
- **Deployment-ready** — static assets only, so GitHub Pages hosting is a breeze.

---

## 🚀 Quick Start

| Task | Commands / Actions |
| --- | --- |
| Solve via Python | ```bash<br>python solver.py<br>```<br>Outputs ASCII grid + `solution.json`. |
| Run the web UI locally | Serve the folder with any static server (VS Code Live Server, `python -m http.server`, etc.) and open `index.html`. |
| Online demo | https://mi4i0.github.io/calendar-puzzle/ |

### What you can do in the browser
1. Pick month / day / weekday from the control panel.
2. Click **Solve (JS)** to run the solver on-device.
3. Optional: **Load solution.json** to visualize a Python-generated layout.
4. Hover cells / legend chips / placement lines to highlight corresponding pentominoes.

---

## 🌐 Deploying to GitHub Pages

1. Push the repo to GitHub.
2. In **Settings → Pages**, choose branch `master` (or `main`) and root folder `/`.
3. Wait for the build to finish — that’s it! The demo above is hosted exactly this way.

Need a custom domain? Point a CNAME at `mi4i0.github.io` and add the domain in the Pages settings.

---

## 🧩 File Map

| File | What it does |
| --- | --- |
| `solver.py` | Python exact-cover engine + JSON exporter. |
| `index.html` | UI shell, layout, and embedded styles. |
| `visualizer.js` | Browser solver, renderer, highlighting, and JSON loader. |
| `favicon.svg` | Custom calendar icon used by the site. |
| `solution.json` | Generated data file (git-ignored by default). |

---

Enjoy exploring and extending the daily calendar challenge — tweak colors, add alternate puzzle modes, or hook the solver into other polyomino adventures! 🎉
