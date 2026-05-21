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

function buildRow(track, files) {
  // Duplicate the file list so the marquee can translate -50% → 0
  // (or 0 → -50%) and loop seamlessly.
  const sequence = files.concat(files);
  const frag = document.createDocumentFragment();
  for (const f of sequence) {
    // Use the compressed JPG version from assets/carousel/sm/
    const baseNoExt = f.replace(/\.(png|jpe?g)$/i, "");
    const img = document.createElement("img");
    img.src = `assets/carousel/sm/${encodeURIComponent(baseNoExt)}.jpg`;
    img.alt = "";
    img.decoding = "async";
    frag.appendChild(img);
  }
  track.appendChild(frag);
}

function initCarousel() {
  const stack = document.getElementById("carousel-stack");
  if (!stack) return;
  const rows = stack.querySelectorAll(".carousel-row");
  const tracks = stack.querySelectorAll(".carousel-track");
  if (tracks.length === 0) return;

  // Hide the stack until everything's ready so we don't show blank tiles
  // appearing in a half-scrolled animation.
  stack.classList.add("is-loading");

  const groups = splitIntoRows(CAROUSEL_FILES, tracks.length);
  tracks.forEach((track, i) => buildRow(track, groups[i]));

  rows.forEach((row) => {
    const speed = parseFloat(row.dataset.speed) || 90;
    const track = row.querySelector(".carousel-track");
    if (track) track.style.setProperty("--dur", `${speed}s`);
  });

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
  // Safety: in case some image stalls (slow mobile network etc.), force
  // reveal after 12s. Better to show a partial carousel than a stuck loader.
  setTimeout(scheduleReveal, 12000);
}

// Absolute last-resort: if anything in the boot chain stalls (SVG fetch
// failure, carousel never builds, etc.), unlock scroll and dismiss the
// loader after 14s no matter what.
setTimeout(() => {
  document.body.classList.remove("is-booting");
  const ld = document.getElementById("page-loader");
  if (ld) ld.style.opacity = "0";
}, 14000);

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
