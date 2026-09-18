(function () {
  "use strict";

  var STORAGE_KEY = "dong-ui-theme";
  var LIGHT_COLOR = "#f6f4ef";
  var DARK_COLOR = "#141414";

  function systemMode() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function storedMode() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "dark" || value === "light" ? value : null;
    } catch (_) {
      return null;
    }
  }

  function updateMeta(mode) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "theme-color");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", mode === "dark" ? DARK_COLOR : LIGHT_COLOR);
  }

  function updateButtons(mode) {
    document.querySelectorAll("[data-dong-theme-toggle]").forEach(function (button) {
      var dark = mode === "dark";
      button.setAttribute("aria-checked", dark ? "true" : "false");
      button.setAttribute(
        "aria-label",
        dark ? "Switch to light mode" : "Switch to dark mode"
      );
      button.setAttribute("title", dark ? "Use light theme" : "Use dark theme");
    });
  }

  function apply(mode) {
    var dark = mode === "dark";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = mode;
    updateMeta(mode);
    updateButtons(mode);
    return mode;
  }

  function current() {
    return storedMode() || systemMode();
  }

  function set(mode) {
    if (mode !== "light" && mode !== "dark") {
      return current();
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch (_) {
      // The theme still works for this page view when storage is unavailable.
    }
    return apply(mode);
  }

  function toggle() {
    return set(current() === "dark" ? "light" : "dark");
  }

  function bind() {
    document.querySelectorAll("[data-dong-theme-toggle]").forEach(function (button) {
      if (button.dataset.dongBound === "true") return;
      button.dataset.dongBound = "true";
      button.addEventListener("click", toggle);
    });
    updateButtons(current());
  }

  apply(current());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind, { once: true });
  } else {
    bind();
  }

  if (window.matchMedia) {
    var media = window.matchMedia("(prefers-color-scheme: dark)");
    var onSystemChange = function () {
      if (!storedMode()) apply(systemMode());
    };
    if (media.addEventListener) {
      media.addEventListener("change", onSystemChange);
    } else if (media.addListener) {
      media.addListener(onSystemChange);
    }
  }

  window.DongUI = {
    getTheme: current,
    setTheme: set,
    toggleTheme: toggle
  };
})();
