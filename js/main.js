/* Doublevision Agency — shared behaviour for all pages */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Active nav link ---------- */
  var page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach(function (link) {
    if (link.getAttribute("href") === page && !link.classList.contains("btn")) {
      link.setAttribute("aria-current", "page");
    }
  });

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".site-nav");

  function setNav(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("is-open"));
    });

    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) setNav(false);
    });
  }

  /* ---------- Header border on scroll ---------- */
  var header = document.querySelector(".site-header");
  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Double-vision pointer parallax ---------- */
  var doubleZones = document.querySelectorAll("[data-double-zone]");
  if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
    doubleZones.forEach(function (zone) {
      zone.addEventListener("pointermove", function (e) {
        var rect = zone.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        zone.style.setProperty("--dx", (x * 36).toFixed(1) + "px");
        zone.style.setProperty("--dy", (y * 24).toFixed(1) + "px");
      });

      zone.addEventListener("pointerleave", function () {
        zone.style.removeProperty("--dx");
        zone.style.removeProperty("--dy");
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Stat counters ---------- */
  var counters = document.querySelectorAll("[data-count]");

  function runCounter(el) {
    var target = parseFloat(el.dataset.count);
    var suffix = el.dataset.suffix || "";
    var duration = 1400;
    var start = null;

    function tick(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    var countObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) {
      countObserver.observe(el);
    });
  }

  /* ---------- Blog filters ---------- */
  var filters = document.querySelectorAll(".filter");
  var posts = document.querySelectorAll(".post[data-category]");

  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var category = btn.dataset.filter;

      filters.forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });

      posts.forEach(function (post) {
        post.hidden = category !== "all" && post.dataset.category !== category;
      });
    });
  });

  /* ---------- Contact form (client-side only) ---------- */
  var form = document.querySelector("#contact-form");

  if (form) {
    var status = form.querySelector(".form__status");
    var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validate(field) {
      var input = field.querySelector("input, select, textarea");
      var error = field.querySelector(".field__error");
      if (!input || !error) return true;

      var value = input.value.trim();
      var message = "";

      if (input.required && !value) {
        message = "This field is required.";
      } else if (input.type === "email" && value && !emailPattern.test(value)) {
        message = "Please enter a valid email address.";
      }

      field.classList.toggle("has-error", Boolean(message));
      input.setAttribute("aria-invalid", String(Boolean(message)));
      error.textContent = message;
      return !message;
    }

    form.querySelectorAll(".field").forEach(function (field) {
      var input = field.querySelector("input, select, textarea");
      if (!input) return;
      input.addEventListener("blur", function () {
        validate(field);
      });
      input.addEventListener("input", function () {
        if (field.classList.contains("has-error")) validate(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var valid = true;
      var firstInvalid = null;
      form.querySelectorAll(".field").forEach(function (field) {
        if (!validate(field)) {
          valid = false;
          if (!firstInvalid) firstInvalid = field.querySelector("input, select, textarea");
        }
      });

      if (!valid) {
        status.hidden = true;
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // TODO: replace with a real endpoint (fetch POST, Formspree, Netlify Forms…).
      var name = form.elements.name.value.trim().split(" ")[0];
      status.textContent = "Thanks, " + name + ". We've got your message and will reply within one business day.";
      status.hidden = false;
      form.reset();
      status.focus();
    });
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
