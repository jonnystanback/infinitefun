// Infinite Fun — boot
// ---------- loader: SVG stroke draw-in ----------
(async function initLoaderDraw() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;
  const placeholder = loader.querySelector("img");
  let svgText;
  try {
    const res = await fetch("assets/logo.svg");
    if (!res.ok) throw new Error("logo fetch failed");
    svgText = await res.text();
  } catch (err) {
    return; // keep the fallback pulse
  }

  const wrap = document.createElement("div");
  wrap.className = "loader-logo";
  wrap.innerHTML = svgText;
  const strokeSvg = wrap.querySelector("svg");
  if (!strokeSvg) return;

  // Duplicate the SVG: top layer = strokes (always visible once drawn),
  // bottom layer = fills (revealed via a vertical clip-path wipe).
  strokeSvg.classList.add("stroke-layer");
  const fillSvg = strokeSvg.cloneNode(true);
  fillSvg.classList.remove("stroke-layer");
  fillSvg.classList.add("fill-layer");
  wrap.appendChild(fillSvg);

  if (placeholder) placeholder.replaceWith(wrap);
  else loader.appendChild(wrap);

  // Sort the stroke paths left-to-right so the draw flows in reading order.
  const strokePaths = Array.from(strokeSvg.querySelectorAll("path"))
    .map((p) => ({ el: p, x: p.getBBox().x }))
    .sort((a, b) => a.x - b.x)
    .map((o) => o.el);

  strokePaths.forEach((p) => {
    const len = p.getTotalLength();
    p.style.stroke = "#000";
    p.style.strokeWidth = "2";
    p.style.fill = "transparent";
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
  });

  // The fill layer keeps its baked-in fill="black"; we just hide stroke.
  fillSvg.querySelectorAll("path").forEach((p) => {
    p.style.stroke = "none";
  });

  void strokeSvg.getBoundingClientRect();

  requestAnimationFrame(() => {
    const TOTAL_DRAW = 0.9;        // per-path stroke duration (s)
    const STAGGER_SPAN = 0.55;     // total spread of per-path starts (s)
    strokePaths.forEach((p, i) => {
      const delay = (i / Math.max(1, strokePaths.length - 1)) * STAGGER_SPAN;
      p.style.transition =
        `stroke-dashoffset ${TOTAL_DRAW}s cubic-bezier(.4,.0,.2,1) ${delay}s`;
      p.style.strokeDashoffset = "0";
    });

    // Kick off the ink-pour just as the last stroke is finishing.
    const pourAtMs = Math.max(0, (STAGGER_SPAN + TOTAL_DRAW - 0.1) * 1000);
    setTimeout(() => wrap.classList.add("is-poured"), pourAtMs);
  });
})();

// Infinite Fun — hero carousel
// 3 rows of marquee, alternating direction, all carousel assets distributed
// across them with no on-screen duplicates.

const CAROUSEL_FILES = [
  "Frame 305.png","Frame 306.png","Frame 308.png","Frame 309.png","Frame 310.png",
  "Frame 311.png","Frame 312.png","Frame 313.png","Frame 314.png","Frame 315.png",
  "Frame 316.png","Frame 317.png","Frame 318.png","Frame 319.png","Frame 320.png",
  "Frame 321.png","Frame 322.png","Frame 323.png","Frame 324.png","Frame 325.png",
  "Frame 326.png","Frame 327.png","Frame 328.png","Frame 329.png","Frame 330.png",
  "Frame 331.png","Frame 332.png","Frame 333.png","Frame 334.png","Frame 335.png",
  "Frame 336.png","Frame 338.png","Group 37279.png",
  "Screenshot 2026-02-11 at 4.44.02 PM 4.png","Vinylmockup1 1.png",
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function splitIntoRows(items, rowCount) {
  // Shuffle then deal into N rows so each row has a unique random slice.
  // No file appears in more than one row, and no row has duplicates.
  const shuffled = shuffle(items);
  const rows = Array.from({ length: rowCount }, () => []);
  shuffled.forEach((file, i) => rows[i % rowCount].push(file));
  return rows.map((r) => shuffle(r));
}

// Resolved once per page load — mobile gets the smaller 220px-tall set,
// desktop gets the 360px set.
const CAROUSEL_FOLDER =
  window.matchMedia("(max-width: 720px)").matches
    ? "assets/carousel/sm-mobile"
    : "assets/carousel/sm";

function buildRow(track, files) {
  // Duplicate the file list so the marquee can translate -50% → 0
  // (or 0 → -50%) and loop seamlessly.
  const sequence = files.concat(files);
  const frag = document.createDocumentFragment();
  for (const f of sequence) {
    const baseNoExt = f.replace(/\.(png|jpe?g)$/i, "");
    const img = document.createElement("img");
    img.src = `${CAROUSEL_FOLDER}/${encodeURIComponent(baseNoExt)}.jpg`;
    img.alt = "";
    img.decoding = "async";
    img.fetchPriority = "high";
    frag.appendChild(img);
  }
  track.appendChild(frag);
}

function initCarousel() {
  const stack = document.getElementById("carousel-stack");
  if (!stack) return;
  const gridEl = document.getElementById("puzzle-grid");
  if (!gridEl) return;

  stack.classList.add("is-loading");

  const COLS = 12;
  const ROWS = 2;
  const TOTAL = COLS * ROWS;       // 24 slots
  const TILE_COUNT = TOTAL - 1;    // 23 tiles + 1 empty
  const pickedFiles = shuffle(CAROUSEL_FILES.slice()).slice(0, TILE_COUNT);

  // 2D grid of cell elements; null marks the empty slot
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  let empty = {
    r: (Math.random() * ROWS) | 0,
    c: (Math.random() * COLS) | 0,
  };

  function placeCell(cell, r, c) {
    cell.style.top = `${r * (100 / ROWS)}%`;
    cell.style.left = `${c * (100 / COLS)}%`;
  }

  let fIdx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === empty.r && c === empty.c) continue;
      const cell = document.createElement("div");
      cell.className = "puzzle-cell";
      placeCell(cell, r, c);
      const img = document.createElement("img");
      const baseNoExt = pickedFiles[fIdx++].replace(/\.(png|jpe?g)$/i, "");
      img.src = `${CAROUSEL_FOLDER}/${encodeURIComponent(baseNoExt)}.jpg`;
      img.alt = "";
      img.decoding = "async";
      img.fetchPriority = "high";
      cell.appendChild(img);
      gridEl.appendChild(cell);
      grid[r][c] = cell;
    }
  }

  // True sliding-puzzle motion: pick a direction, slide N adjacent tiles
  // toward the empty slot as a line. No tile ever jumps another.
  const DIRECTIONS = [
    { dr: 0, dc: -1 }, // empty pulls from the left  → tiles shift right
    { dr: 0, dc:  1 }, // empty pulls from the right → tiles shift left
    { dr: -1, dc: 0 }, // up
    { dr:  1, dc: 0 }, // down
  ];

  function tickPuzzle() {
    // Build the list of viable directions (need at least one tile to slide)
    const choices = [];
    for (const d of DIRECTIONS) {
      const sr = empty.r + d.dr;
      const sc = empty.c + d.dc;
      if (sr >= 0 && sr < ROWS && sc >= 0 && sc < COLS && grid[sr][sc]) {
        choices.push(d);
      }
    }
    if (choices.length === 0) return;
    const dir = choices[(Math.random() * choices.length) | 0];

    // Walk in the chosen direction from the empty slot, collecting tiles
    // until we hit a wall or a (shouldn't happen) gap.
    const line = [];
    let r = empty.r + dir.dr, c = empty.c + dir.dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r][c]) {
      line.push({ r, c, cell: grid[r][c] });
      r += dir.dr; c += dir.dc;
    }

    // Pick how many tiles in the line slide together (1 to min(line.length, 5))
    const maxN = Math.min(line.length, 5);
    const n = 1 + ((Math.random() * maxN) | 0);
    const moving = line.slice(0, n);

    // Compute new positions (one step toward empty = opposite of walk dir)
    const moves = moving.map((t) => ({
      cell: t.cell,
      from: { r: t.r, c: t.c },
      to:   { r: t.r - dir.dr, c: t.c - dir.dc },
    }));

    // Clear old slots first, then write new slots — order matters because
    // a tile may be moving into another moving tile's old slot.
    for (const m of moves) grid[m.from.r][m.from.c] = null;
    for (const m of moves) {
      grid[m.to.r][m.to.c] = m.cell;
      placeCell(m.cell, m.to.r, m.to.c);
    }

    // New empty is where the last tile in the slid line used to sit
    const last = moves[moves.length - 1].from;
    empty = { r: last.r, c: last.c };
  }

  setInterval(tickPuzzle, 1400);
  // First slide kicks off a beat after the loader dismisses to feel intentional
  setTimeout(tickPuzzle, 600);

  // Reveal once every image has loaded — but enforce a minimum display time
  // for the loader so it doesn't just flicker through on fast networks.
  const LOADER_MIN_MS = 3100;
  const loadStart = performance.now();
  const imgs = Array.from(stack.querySelectorAll("img"));
  let remaining = imgs.length;
  let scheduled = false;
  function scheduleReveal() {
    if (scheduled) return;
    scheduled = true;
    const elapsed = performance.now() - loadStart;
    const wait = Math.max(0, LOADER_MIN_MS - elapsed);
    setTimeout(() => {
      stack.classList.remove("is-loading");
      document.body.classList.remove("is-booting");
    }, wait);
  }
  function onOne() {
    remaining--;
    if (remaining <= 0) scheduleReveal();
  }
  imgs.forEach((img) => {
    if (img.complete && img.naturalWidth > 0) onOne();
    else {
      img.addEventListener("load", onOne, { once: true });
      img.addEventListener("error", onOne, { once: true });
    }
  });
  // Safety: in case some image stalls or fails, force reveal after 20s.
  // Long enough that mobile cellular usually finishes the carousel first.
  setTimeout(scheduleReveal, 20000);
}

// Absolute last-resort: if anything in the boot chain stalls (SVG fetch
// failure, carousel never builds, etc.), unlock scroll and dismiss the
// loader after 22s no matter what.
setTimeout(() => {
  document.body.classList.remove("is-booting");
  const ld = document.getElementById("page-loader");
  if (ld) ld.style.opacity = "0";
}, 22000);

initCarousel();

// ---------- ping-pong video loop ----------
// Plays forward, then steps backward via rAF, then forward again, ad infinitum.
// We avoid playbackRate = -1 because cross-browser support is patchy.
function setupPingPong(video) {
  let reversing = false;
  let rafId = null;
  let lastTs = 0;

  function stepBackward(ts) {
    if (!reversing) return;
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    let next = video.currentTime - dt;
    if (next <= 0 || isNaN(next)) {
      video.currentTime = 0;
      reversing = false;
      video.play();
      return;
    }
    video.currentTime = next;
    rafId = requestAnimationFrame(stepBackward);
  }

  video.addEventListener("ended", () => {
    reversing = true;
    lastTs = performance.now();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(stepBackward);
  });

  // Some browsers won't fire "ended" if loop is set, so make sure loop is off.
  video.loop = false;
}

document.querySelectorAll("video.js-pingpong").forEach(setupPingPong);

// ---------- reveal animations ----------
// Hero + carousels stay visible on load (no fade) to avoid lag at first paint.
// Site nav fades in on a 1s timer.
// Thesis (black box) fades in on a delay, independent of scroll.
// Everything else fades in when scrolled into view.
(function setupReveals() {
  // Header itself stays visible immediately; only its contents fade in.
  const navItems = document.querySelectorAll(".site-nav .logo, .site-nav .nav-link");
  navItems.forEach((el) => el.classList.add("fade-in"));
  setTimeout(() => navItems.forEach((el) => el.classList.add("is-visible")), 1000);

  // Black box is already there from page load — label + headline fade in on
  // a timer; body paragraphs fade in when scrolled into view (added to the
  // observer list below).
  const thesisCard = document.querySelector(".thesis-card");
  if (thesisCard) {
    const label = thesisCard.querySelector(".thesis-label");
    const headline = thesisCard.querySelector(".thesis-headline");

    if (label) label.classList.add("fade-in");
    if (headline) headline.classList.add("fade-in");

    setTimeout(() => label && label.classList.add("is-visible"), 1000);
    setTimeout(() => headline && headline.classList.add("is-visible"), 1400);
  }

  if (!("IntersectionObserver" in window)) return;

  // Selectors that should fade in once visible — everything below the fold.
  const SELECTORS = [
    ".thesis-body p",
    ".founders-title",
    ".founders-pfps",
    ".founders-body",
    "#founders > .founders-inner > .cta",
    ".cs-header",
    ".cs-tile",
    "#testimonials > .section-label",
    ".testimonial-marquee",
    "#pricing > .section-label",
    ".pricing-card",
  ];

  const targets = new Set();
  for (const sel of SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => targets.add(el));
  }
  targets.forEach((el) => el.classList.add("fade-in"));

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
  );

  targets.forEach((el) => io.observe(el));
})();

// ---------- testimonial marquee ----------
// Right-to-left scrolling strip. We duplicate the cards once so the keyframe
// can translate -50% and the seam is invisible — as long as the duplicated
// total is wider than the viewport, the loop reads as continuous.
(function setupTestimonialMarquee() {
  const track = document.getElementById("testimonial-track");
  if (!track) return;
  const originals = Array.from(track.children);
  if (originals.length === 0) return;
  for (const card of originals) {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  }
})();
