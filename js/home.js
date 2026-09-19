/* Doublevision Agency — home page interactions
   Generative media tiles, hero particles, scroll-linked effects,
   drag scrollers and the before/after slider. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var TAU = Math.PI * 2;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  /* ---------- rAF-throttled scroll bus ---------- */
  var scrollTasks = [];
  var scrollQueued = false;

  function runScrollTasks() {
    scrollQueued = false;
    for (var i = 0; i < scrollTasks.length; i++) scrollTasks[i]();
  }

  function queueScroll() {
    if (!scrollQueued) {
      scrollQueued = true;
      requestAnimationFrame(runScrollTasks);
    }
  }

  window.addEventListener("scroll", queueScroll, { passive: true });
  window.addEventListener("resize", queueScroll);

  /* ---------- Split text into words ---------- */
  // [data-split] → blur-in headline, [data-words] → scroll-lit statement.
  function splitWords(el) {
    var index = 0;
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());

    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          var span = document.createElement("span");
          span.className = "word";
          span.setAttribute("aria-hidden", "true");
          span.style.setProperty("--w", index++);
          span.textContent = part;
          frag.appendChild(span);
        });
        el.replaceChild(frag, node);
      } else if (node.nodeType === 1) {
        node.classList.add("word");
        node.setAttribute("aria-hidden", "true");
        node.style.setProperty("--w", index++);
      }
    });

    return el.querySelectorAll(".word");
  }

  document.querySelectorAll("[data-split]").forEach(splitWords);

  document.querySelectorAll("[data-words]").forEach(function (el) {
    var words = splitWords(el);
    if (reduceMotion) return;

    scrollTasks.push(function () {
      var rect = el.getBoundingClientRect();
      var vh = window.innerHeight;
      // 0 when the block's top hits 85% of the viewport, 1 when its bottom reaches 45%.
      var progress = clamp((vh * 0.85 - rect.top) / (rect.height + vh * 0.4), 0, 1);
      var lit = Math.round(progress * words.length);
      for (var i = 0; i < words.length; i++) {
        words[i].classList.toggle("is-lit", i < lit);
      }
    });
  });

  /* ---------- Hero: scroll progress + arc flattening ---------- */
  var hero = document.querySelector(".hero2");
  var arc = document.querySelector("[data-arc]");

  if (hero && !reduceMotion) {
    scrollTasks.push(function () {
      var rect = hero.getBoundingClientRect();
      if (rect.bottom < 0) return;
      var p = clamp(-rect.top / (rect.height * 0.7), 0, 1);
      hero.style.setProperty("--hero-p", p.toFixed(3));
      if (arc) arc.style.setProperty("--p", p.toFixed(3));
    });
  }

  /* ---------- Stacking cards ---------- */
  document.querySelectorAll("[data-stack]").forEach(function (stack) {
    var cards = Array.prototype.slice.call(stack.querySelectorAll(".stack__card"));
    if (reduceMotion) return;

    scrollTasks.push(function () {
      cards.forEach(function (card, i) {
        var next = cards[i + 1];
        var cover = 0;
        if (next) {
          var a = card.getBoundingClientRect();
          var b = next.getBoundingClientRect();
          // how far the next card has slid over this one
          cover = clamp(1 - (b.top - a.top) / a.height, 0, 1);
        }
        card.firstElementChild.style.setProperty("--cover", cover.toFixed(3));
      });
    });
  });

  /* ---------- Cursor spotlight on cards ---------- */
  if (canHover) {
    document.querySelectorAll(".spot").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", e.clientX - rect.left + "px");
        card.style.setProperty("--my", e.clientY - rect.top + "px");
      });
    });
  }

  /* ---------- Generative media tiles ----------
     Each .media gets a canvas running a monochrome scene.
     Add data-video="path/to/clip.mp4" to use real footage instead. */

  function hash(x, y, z) {
    var n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }

  var scenes = {
    // the brand mark: two ring systems drifting in and out of alignment
    rings: function (c, w, h, t) {
      c.fillStyle = "#0a0a0a";
      c.fillRect(0, 0, w, h);
      var off = Math.sin(t * 0.7) * w * 0.16;
      var max = Math.max(w, h) * 0.75;
      c.lineWidth = Math.max(1, w * 0.006);
      for (var i = 0; i < 7; i++) {
        var r = (t * w * 0.07 + (i * max) / 7) % max;
        c.strokeStyle = "rgba(255,255,255," + (1 - r / max).toFixed(3) + ")";
        c.beginPath();
        c.arc(w / 2 - off, h / 2, r, 0, TAU);
        c.stroke();
        c.beginPath();
        c.arc(w / 2 + off, h / 2, r, 0, TAU);
        c.stroke();
      }
    },

    bars: function (c, w, h, t) {
      c.fillStyle = "#0a0a0a";
      c.fillRect(0, 0, w, h);
      var n = 11;
      var gap = w * 0.03;
      var bw = (w * 0.8 - gap * (n - 1)) / n;
      c.fillStyle = "#fff";
      for (var i = 0; i < n; i++) {
        var v = 0.12 + 0.88 * Math.abs(Math.sin(t * 1.9 + i * 0.75) * Math.cos(t * 0.8 + i * 1.31));
        var bh = v * h * 0.6;
        c.globalAlpha = 0.35 + v * 0.65;
        c.fillRect(w * 0.1 + i * (bw + gap), (h - bh) / 2, bw, bh);
      }
      c.globalAlpha = 1;
    },

    waves: function (c, w, h, t) {
      c.fillStyle = "#f4f4f4";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#0a0a0a";
      for (var l = 0; l < 9; l++) {
        var y0 = (h * (l + 1)) / 10;
        c.lineWidth = Math.max(1, w * 0.004 * (1 + l * 0.35));
        c.beginPath();
        for (var x = 0; x <= w; x += 4) {
          var y = y0 + Math.sin(x / (w * 0.16) + t * 1.4 + l * 0.6) * h * 0.035 * (1 + Math.sin(t * 0.6 + l));
          if (x === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    },

    // dot grid swelling around a wandering focal point
    halftone: function (c, w, h, t) {
      c.fillStyle = "#0a0a0a";
      c.fillRect(0, 0, w, h);
      var step = w / 12;
      var fx = w / 2 + Math.cos(t * 0.8) * w * 0.3;
      var fy = h / 2 + Math.sin(t * 0.6) * h * 0.3;
      c.fillStyle = "#fff";
      for (var y = step / 2; y < h; y += step) {
        for (var x = step / 2; x < w; x += step) {
          var d = Math.hypot(x - fx, y - fy) / (w * 0.9);
          var r = step * 0.48 * clamp(1 - d, 0.06, 1);
          c.beginPath();
          c.arc(x, y, r, 0, TAU);
          c.fill();
        }
      }
    },

    grid: function (c, w, h, t) {
      c.fillStyle = "#0a0a0a";
      c.fillRect(0, 0, w, h);
      var cols = 6;
      var size = w / cols;
      var rows = Math.ceil(h / size);
      var beat = Math.floor(t * 2.2);
      var mix = t * 2.2 - beat;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var a = hash(i, j, beat) > 0.62 ? 1 : 0;
          var b = hash(i, j, beat + 1) > 0.62 ? 1 : 0;
          var v = a + (b - a) * mix;
          if (v < 0.02) continue;
          c.fillStyle = "rgba(255,255,255," + v.toFixed(3) + ")";
          c.fillRect(i * size + 2, j * size + 2, size - 4, size - 4);
        }
      }
    },

    orbit: function (c, w, h, t) {
      c.fillStyle = "#0a0a0a";
      c.fillRect(0, 0, w, h);
      var cx = w / 2;
      var cy = h / 2;
      c.fillStyle = "#fff";
      c.beginPath();
      c.arc(cx, cy, w * 0.09, 0, TAU);
      c.fill();
      for (var k = 1; k <= 4; k++) {
        var rad = w * (0.12 + k * 0.095);
        c.strokeStyle = "rgba(255,255,255,0.16)";
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(cx, cy, rad, rad * 1.45, 0, 0, TAU);
        c.stroke();
        for (var s = 0; s < 14; s++) {
          var ang = t * (1.5 / k) * (k % 2 ? 1 : -1) + k * 1.7 - s * 0.07;
          c.globalAlpha = 1 - s / 14;
          c.beginPath();
          c.arc(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad * 1.45, w * 0.022 * (1 - s / 20), 0, TAU);
          c.fill();
        }
        c.globalAlpha = 1;
      }
    },

    scan: function (c, w, h, t) {
      c.fillStyle = "#f4f4f4";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#0a0a0a";
      var band = h / 9;
      var shift = (t * band * 0.9) % (band * 2);
      c.save();
      c.translate(w / 2, h / 2);
      c.rotate(-0.5);
      for (var y = -h * 1.5; y < h * 1.5; y += band * 2) {
        c.fillRect(-w * 1.5, y + shift, w * 3, band * (0.55 + 0.35 * Math.sin(t + y * 0.01)));
      }
      c.restore();
      c.fillStyle = "#0a0a0a";
      c.beginPath();
      c.arc(w / 2, h / 2, w * 0.2, 0, TAU);
      c.fill();
      c.fillStyle = "#f4f4f4";
      c.beginPath();
      c.arc(w / 2 + Math.sin(t) * w * 0.04, h / 2, w * 0.1, 0, TAU);
      c.fill();
    }
  };

  var tiles = [];

  function sizeTile(tile) {
    var rect = tile.el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    // cap resolution: these are decorative, keep them cheap
    var scale = Math.min(window.devicePixelRatio || 1, 2) * Math.min(1, 280 / rect.width);
    tile.canvas.width = Math.round(rect.width * scale);
    tile.canvas.height = Math.round(rect.height * scale);
    drawTile(tile);
  }

  function drawTile(tile) {
    tile.scene(tile.ctx, tile.canvas.width, tile.canvas.height, tile.t);
  }

  function setupVideoTile(el, hoverOnly) {
    var video = document.createElement("video");
    video.src = el.dataset.video;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    el.appendChild(video);

    var inView = false;
    var hovered = false;

    function sync() {
      var shouldPlay = inView && (!hoverOnly || hovered) && !reduceMotion;
      el.classList.toggle("is-playing", shouldPlay);
      if (shouldPlay) video.play().catch(function () {});
      else video.pause();
    }

    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      sync();
    }).observe(el);

    el.addEventListener("pointerenter", function () { hovered = true; sync(); });
    el.addEventListener("pointerleave", function () { hovered = false; sync(); });
  }

  document.querySelectorAll(".media").forEach(function (el, index) {
    var hoverOnly = el.dataset.play === "hover" && canHover;

    if (el.dataset.video) {
      setupVideoTile(el, hoverOnly);
      return;
    }

    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    el.appendChild(canvas);

    var tile = {
      el: el,
      canvas: canvas,
      ctx: canvas.getContext("2d"),
      scene: scenes[el.dataset.scene] || scenes.rings,
      t: index * 2.3,
      inView: false,
      hovered: false,
      hoverOnly: hoverOnly
    };

    // hover targets the whole card so the label area counts too
    var hoverTarget = el.closest(".reel-card, .card--media") || el;
    hoverTarget.addEventListener("pointerenter", function () {
      tile.hovered = true;
      if (tile.hoverOnly) el.classList.add("is-playing");
    });
    hoverTarget.addEventListener("pointerleave", function () {
      tile.hovered = false;
      if (tile.hoverOnly) el.classList.remove("is-playing");
    });

    tiles.push(tile);
    sizeTile(tile);
  });

  if (tiles.length) {
    var tileObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].el === entry.target) {
              tiles[i].inView = entry.isIntersecting;
              // touch devices have no hover: play while on screen
              if (!tiles[i].hoverOnly && tiles[i].el.dataset.play === "hover") {
                tiles[i].el.classList.toggle("is-playing", entry.isIntersecting);
              }
            }
          }
        });
      },
      { rootMargin: "80px" }
    );

    tiles.forEach(function (tile) {
      tileObserver.observe(tile.el);
    });

    if ("ResizeObserver" in window) {
      var resizeObserver = new ResizeObserver(function (entries) {
        entries.forEach(function (entry) {
          for (var i = 0; i < tiles.length; i++) {
            if (tiles[i].el === entry.target) sizeTile(tiles[i]);
          }
        });
      });
      tiles.forEach(function (tile) {
        resizeObserver.observe(tile.el);
      });
    }
  }

  /* ---------- Hero particles ---------- */
  var particleCanvas = document.querySelector(".hero2__particles");
  var particles = [];
  var pctx = particleCanvas ? particleCanvas.getContext("2d") : null;
  var heroInView = true;

  function sizeParticles() {
    if (!particleCanvas) return;
    var rect = particleCanvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    particleCanvas.width = rect.width * dpr;
    particleCanvas.height = rect.height * dpr;

    var count = Math.round(clamp(rect.width / 14, 30, 110));
    particles = [];
    for (var i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * particleCanvas.width,
        y: Math.random() * particleCanvas.height,
        r: (0.5 + Math.random() * 1.4) * dpr,
        speed: (4 + Math.random() * 14) * dpr,
        phase: Math.random() * TAU
      });
    }
    drawParticles(0, 0);
  }

  function drawParticles(dt, time) {
    var w = particleCanvas.width;
    var h = particleCanvas.height;
    pctx.clearRect(0, 0, w, h);
    pctx.fillStyle = "#fff";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.y -= p.speed * dt;
      if (p.y < -4) {
        p.y = h + 4;
        p.x = Math.random() * w;
      }
      pctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(time * 0.8 + p.phase));
      pctx.beginPath();
      pctx.arc(p.x, p.y, p.r, 0, TAU);
      pctx.fill();
    }
    pctx.globalAlpha = 1;
  }

  if (particleCanvas) {
    sizeParticles();
    window.addEventListener("resize", sizeParticles);
    new IntersectionObserver(function (entries) {
      heroInView = entries[0].isIntersecting;
    }).observe(particleCanvas);
  }

  /* ---------- One animation loop for tiles + particles ---------- */
  var last = 0;

  function frame(now) {
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (!document.hidden) {
      for (var i = 0; i < tiles.length; i++) {
        var tile = tiles[i];
        if (!tile.inView) continue;
        if (tile.hoverOnly && !tile.hovered) continue;
        tile.t += dt * (tile.hovered ? 1.7 : 1);
        drawTile(tile);
      }
      if (particleCanvas && heroInView) drawParticles(dt, now / 1000);
    }

    requestAnimationFrame(frame);
  }

  if (!reduceMotion && (tiles.length || particleCanvas)) {
    requestAnimationFrame(function (now) {
      last = now;
      frame(now);
    });
  }

  /* ---------- Horizontal scrollers: buttons, drag, counter, autoplay ---------- */
  document.querySelectorAll("[data-scroller]").forEach(function (root) {
    var track = root.querySelector("[data-track]");
    var prev = root.querySelector("[data-prev]");
    var next = root.querySelector("[data-next]");
    var label = root.querySelector("[data-count-label]");
    if (!track) return;

    function itemStep() {
      var first = track.children[0];
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return first.getBoundingClientRect().width + gap;
    }

    function maxScroll() {
      return track.scrollWidth - track.clientWidth;
    }

    function go(dir) {
      track.scrollBy({ left: dir * itemStep(), behavior: reduceMotion ? "auto" : "smooth" });
    }

    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }

    function update() {
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= maxScroll() - 2;
      if (label) {
        var current = Math.round(track.scrollLeft / itemStep()) + 1;
        label.textContent = pad(current) + " / " + pad(track.children.length);
      }
    }

    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    // Mouse drag-to-scroll (touch already scrolls natively)
    var dragging = false;
    var moved = false;
    var startX = 0;
    var startLeft = 0;

    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });

    window.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        track.classList.add("is-dragging");
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });

    window.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      if (!moved) return;
      track.classList.remove("is-dragging");
      // settle on the nearest item
      var target = Math.round(track.scrollLeft / itemStep()) * itemStep();
      track.scrollTo({ left: clamp(target, 0, maxScroll()), behavior: reduceMotion ? "auto" : "smooth" });
    });

    // a drag should not trigger links inside the track
    track.addEventListener("click", function (e) {
      if (moved) {
        e.preventDefault();
        moved = false;
      }
    }, true);

    // Autoplay (testimonials)
    var delay = parseInt(root.dataset.autoplay, 10);
    if (delay && !reduceMotion) {
      var paused = false;
      var visible = false;

      root.addEventListener("pointerenter", function () { paused = true; });
      root.addEventListener("pointerleave", function () { paused = false; });
      root.addEventListener("focusin", function () { paused = true; });
      root.addEventListener("focusout", function () { paused = false; });

      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }, { threshold: 0.4 }).observe(root);

      setInterval(function () {
        if (paused || !visible || dragging || document.hidden) return;
        if (track.scrollLeft >= maxScroll() - 2) track.scrollTo({ left: 0, behavior: "smooth" });
        else go(1);
      }, delay);
    }
  });

  /* ---------- Before / after slider ---------- */
  document.querySelectorAll(".compare").forEach(function (compare) {
    var range = compare.querySelector(".compare__range");
    if (!range) return;

    function apply() {
      compare.style.setProperty("--pos", range.value + "%");
    }

    range.addEventListener("input", apply);
    apply();

    // a gentle nudge the first time it scrolls into view, to show it moves
    if (!reduceMotion && "IntersectionObserver" in window) {
      var hinted = false;
      new IntersectionObserver(function (entries, observer) {
        if (!entries[0].isIntersecting || hinted) return;
        hinted = true;
        observer.disconnect();

        var start = null;
        function hint(now) {
          if (start === null) start = now;
          var t = (now - start) / 1600;
          if (t >= 1 || document.activeElement === range) {
            range.value = 50;
            apply();
            return;
          }
          range.value = 50 + Math.sin(t * TAU) * 22 * (1 - t);
          apply();
          requestAnimationFrame(hint);
        }
        requestAnimationFrame(hint);
      }, { threshold: 0.6 }).observe(compare);
    }
  });

  // first paint of all scroll-linked values
  queueScroll();
})();
