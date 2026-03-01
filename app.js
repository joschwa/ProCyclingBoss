// ---- CONFIG ----
// Put your real player prefixes here (matches file names):
// data/<prefix>_scores.txt and data/<prefix>_w_scores.txt
const players = [
    { id: "player1", prefix: "yahaha" },
    { id: "player2", prefix: "papaya" },
  ];
  
  const DATA_DIR = "data"; // folder containing the txt files
  
  // ---- DOM ----
  const gridEl = document.getElementById("grid");
  const statusEl = document.getElementById("status");
  const categoryEl = document.getElementById("category");
  const reloadBtn = document.getElementById("reload");
  
  // ---- TSV parsing ----
  function parseScoresTsv(text) {
    // Handles:
    // TOTAL\t2519
    // rider-slug\t123
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
  
    if (lines.length === 0) {
      throw new Error("File is empty.");
    }
  
    const first = lines[0].split("\t");
    if (first.length < 2 || first[0].toUpperCase() !== "TOTAL") {
      throw new Error("First row must be: TOTAL<TAB><number>");
    }
  
    const total = Number(first[1]);
    if (!Number.isFinite(total)) {
      throw new Error(`Invalid TOTAL score: "${first[1]}"`);
    }
  
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split("\t");
      if (parts.length < 2) continue;
  
      const name = parts[0].trim();
      const score = Number(parts[1]);
  
      rows.push({
        name,
        score: Number.isFinite(score) ? score : 0,
      });
    }
  
    return { total, rows };
  }
  
  function displayNameFromPrefix(prefix) {
    // if prefix is already the player name, keep it.
    // You can customize this if your prefixes are like "josh" but you want "Josh".
    return prefix.replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
  
  function formatCategoryLabel(cat) {
    return cat === "w" ? "Women" : "Men";
  }
  
  function buildFilePath(prefix, cat) {
    const suffix = cat === "w" ? "_w_scores.txt" : "_scores.txt";
    return `${DATA_DIR}/${prefix}${suffix}`;
  }
  
  // ---- Rendering ----
  function renderPlayerPanel(player, cat, parsed) {
    const playerName = displayNameFromPrefix(player.prefix);
    const total = parsed.total;
  
    // Sort rows by score desc (optional; remove if you want file order)
    const rows = [...parsed.rows].sort((a, b) => b.score - a.score);
  
    const panel = document.createElement("article");
    panel.className = "panel";
  
    panel.innerHTML = `
      <div class="panel-header">
        <h2 class="player-name">${playerName}</h2>
        <div class="total">${formatCategoryLabel(cat)} total: <strong>${total}</strong></div>
      </div>
  
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cyclist</th>
              <th style="text-align:right;">Score</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${escapeHtml(r.name)}</td>
                <td class="score">${r.score}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  
    return panel;
  }
  
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  // ---- Loading ----
  async function loadAndRender(cat) {
    statusEl.textContent = `Loading ${formatCategoryLabel(cat)} scores...`;
    gridEl.innerHTML = "";
  
    const results = await Promise.allSettled(
      players.map(async (p) => {
        const path = buildFilePath(p.prefix, cat);
        const resp = await fetch(path, { cache: "no-store" });
        if (!resp.ok) {
          throw new Error(`Failed to load ${path} (${resp.status})`);
        }
        const text = await resp.text();
        const parsed = parseScoresTsv(text);
        return { player: p, parsed };
      })
    );
  
    let okCount = 0;
    let failCount = 0;
  
    for (const r of results) {
      if (r.status === "fulfilled") {
        okCount++;
        const { player, parsed } = r.value;
        gridEl.appendChild(renderPlayerPanel(player, cat, parsed));
      } else {
        failCount++;
        const errPanel = document.createElement("article");
        errPanel.className = "panel";
        errPanel.innerHTML = `
          <div class="panel-header">
            <h2 class="player-name">Error</h2>
            <div class="total">Could not load player file.</div>
          </div>
          <div style="padding: 12px 14px; color: #ffd2d2;">
            ${escapeHtml(r.reason?.message ?? String(r.reason))}
          </div>
        `;
        gridEl.appendChild(errPanel);
      }
    }
  
    statusEl.textContent =
      failCount === 0
        ? `Loaded ${okCount} player file(s).`
        : `Loaded ${okCount} player file(s), ${failCount} failed.`;
  }
  
  // ---- Events ----
  categoryEl.addEventListener("change", () => {
    loadAndRender(categoryEl.value);
  });
  
  reloadBtn.addEventListener("click", () => {
    loadAndRender(categoryEl.value);
  });

  // Initial render
  loadAndRender(categoryEl.value);
  loadLastUpdated();