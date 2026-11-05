/* Tiendline — interface behaviour, language toggle, navigation and motion */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var storageKey = "lang";
  var waBase = "https://wa.me/543437405474?text=";
  var currentLang = "en";

  try {
    var stored = window.localStorage.getItem(storageKey);
    if (stored === "es" || stored === "en") {
      currentLang = stored;
    }
  } catch (error) {
    currentLang = "en";
  }

  var header = document.getElementById("site-header");
  var menuToggle = document.getElementById("menu-toggle");
  var langToggle = document.getElementById("lang-toggle");
  var langCurrent = langToggle ? langToggle.querySelector(".lang-current") : null;
  var langNext = langToggle ? langToggle.querySelector(".lang-next") : null;
  var track = document.getElementById("projects-track");
  var prevButton = document.getElementById("projects-prev");
  var nextButton = document.getElementById("projects-next");

  function setYear() {
    var year = document.getElementById("year");
    if (year) {
      year.textContent = String(new Date().getFullYear());
    }
  }

  function updateMenuLabel() {
    if (!menuToggle || !header) {
      return;
    }
    var isOpen = header.classList.contains("nav-open");
    if (currentLang === "es") {
      menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    } else {
      menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    }
  }

  function updateLanguageButton() {
    if (!langToggle) {
      return;
    }
    if (langCurrent) {
      langCurrent.textContent = currentLang.toUpperCase();
    }
    if (langNext) {
      langNext.textContent = currentLang === "es" ? "EN" : "ES";
    }
    langToggle.setAttribute(
      "aria-label",
      currentLang === "es" ? "Cambiar a inglés" : "Switch to Spanish"
    );
    updateMenuLabel();
  }

  function updatePlanLinks() {
    var links = document.querySelectorAll("[data-plan]");
    for (var i = 0; i < links.length; i += 1) {
      var plan = links[i].getAttribute("data-plan");
      var message =
        currentLang === "es"
          ? "Hola, estoy interesado en el plan " + plan + "."
          : "Hello, I'm interested in the " + plan + " plan.";
      links[i].setAttribute("href", waBase + encodeURIComponent(message));
    }
  }

  function applyTranslations(dictionary, language) {
    document.documentElement.lang = language;

    var isErrorPage = document.body.classList.contains("error-page");
    if (isErrorPage && dictionary["error-title"]) {
      document.title = dictionary["error-title"] + " | Tiendline";
    } else if (dictionary.PrincipalTitle) {
      document.title = dictionary.PrincipalTitle;
    }

    var description = document.querySelector('meta[name="description"]');
    if (!isErrorPage && description && dictionary["meta-description"]) {
      description.setAttribute("content", dictionary["meta-description"]);
    }

    var ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription && dictionary["meta-og-description"]) {
      ogDescription.setAttribute("content", dictionary["meta-og-description"]);
    }

    var twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription && dictionary["meta-og-description"]) {
      twitterDescription.setAttribute("content", dictionary["meta-og-description"]);
    }

    var elements = document.querySelectorAll("[lang-trans]");
    for (var i = 0; i < elements.length; i += 1) {
      var element = elements[i];
      var key = element.getAttribute("lang-trans");
      var value = dictionary[key];

      if (typeof value !== "string") {
        continue;
      }

      if (key.indexOf("-placeholder") !== -1) {
        element.setAttribute("placeholder", value);
      } else {
        element.innerHTML = value;
      }
    }
  }

  function loadTranslations(language) {
    var url = "assets/lang/" + language + ".json";

    if (!window.fetch) {
      return;
    }

    window
      .fetch(url, { cache: "no-cache" })
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Translation request failed");
        }
        return response.json();
      })
      .then(function (dictionary) {
        applyTranslations(dictionary, language);
        setYear();
      })
      .catch(function () {
        if (language !== "en") {
          loadTranslations("en");
        }
      });
  }

  function switchLanguage() {
    currentLang = currentLang === "es" ? "en" : "es";
    try {
      window.localStorage.setItem(storageKey, currentLang);
    } catch (error) {
      /* Storage can be unavailable; the switch still works for this view. */
    }
    updateLanguageButton();
    updatePlanLinks();
    loadTranslations(currentLang);
  }

  function closeMenu(restoreFocus) {
    if (!header || !menuToggle) {
      return;
    }
    header.classList.remove("nav-open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    updateMenuLabel();
    if (restoreFocus) {
      menuToggle.focus();
    }
  }

  function openMenu() {
    if (!header || !menuToggle) {
      return;
    }
    header.classList.add("nav-open");
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    updateMenuLabel();
  }

  function initNavigation() {
    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        if (header && header.classList.contains("nav-open")) {
          closeMenu(false);
        } else {
          openMenu();
        }
      });
    }

    var navLinks = document.querySelectorAll("#primary-nav a");
    for (var i = 0; i < navLinks.length; i += 1) {
      navLinks[i].addEventListener("click", function () {
        closeMenu(false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header && header.classList.contains("nav-open")) {
        closeMenu(true);
      }
    });

    var desktop = window.matchMedia("(min-width: 921px)");
    var onChange = function (event) {
      if (event.matches) {
        closeMenu(false);
      }
    };
    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onChange);
    } else if (typeof desktop.addListener === "function") {
      desktop.addListener(onChange);
    }
  }

  function initScrollSpy() {
    var links = document.querySelectorAll("#primary-nav a[href^='#']");
    var sections = [];
    var linkMap = {};

    for (var i = 0; i < links.length; i += 1) {
      var targetId = links[i].getAttribute("href").slice(1);
      var section = document.getElementById(targetId);
      if (section) {
        sections.push(section);
        linkMap[targetId] = links[i];
      }
    }

    if (!sections.length || !("IntersectionObserver" in window)) {
      return;
    }

    var setActive = function (id) {
      for (var j = 0; j < links.length; j += 1) {
        links[j].classList.remove("is-active");
        links[j].removeAttribute("aria-current");
      }
      if (linkMap[id]) {
        linkMap[id].classList.add("is-active");
        linkMap[id].setAttribute("aria-current", "location");
      }
    };

    var observer = new IntersectionObserver(
      function (entries) {
        for (var k = 0; k < entries.length; k += 1) {
          if (entries[k].isIntersecting) {
            setActive(entries[k].target.id);
          }
        }
      },
      { rootMargin: "-42% 0px -52% 0px", threshold: 0 }
    );

    for (var s = 0; s < sections.length; s += 1) {
      observer.observe(sections[s]);
    }
  }

  function initReveal() {
    var items = document.querySelectorAll(".reveal");

    if (!items.length) {
      return;
    }

    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      for (var i = 0; i < items.length; i += 1) {
        items[i].classList.add("is-visible");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, instance) {
        for (var j = 0; j < entries.length; j += 1) {
          if (entries[j].isIntersecting) {
            entries[j].target.classList.add("is-visible");
            instance.unobserve(entries[j].target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    for (var k = 0; k < items.length; k += 1) {
      observer.observe(items[k]);
    }
  }

  function initCounters() {
    var counters = document.querySelectorAll("[data-count]");

    if (!counters.length) {
      return;
    }

    var animate = function (element) {
      var target = parseInt(element.getAttribute("data-count"), 10);
      if (isNaN(target)) {
        return;
      }

      if (reduceMotion.matches) {
        element.textContent = String(target);
        return;
      }

      var duration = 1400;
      var started = null;

      var step = function (timestamp) {
        if (started === null) {
          started = timestamp;
        }
        var progress = Math.min((timestamp - started) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.textContent = String(target);
        }
      };

      window.requestAnimationFrame(step);
    };

    if (!("IntersectionObserver" in window)) {
      for (var i = 0; i < counters.length; i += 1) {
        counters[i].textContent = counters[i].getAttribute("data-count");
      }
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, instance) {
        for (var j = 0; j < entries.length; j += 1) {
          if (entries[j].isIntersecting) {
            animate(entries[j].target);
            instance.unobserve(entries[j].target);
          }
        }
      },
      { threshold: 0.55 }
    );

    for (var k = 0; k < counters.length; k += 1) {
      observer.observe(counters[k]);
    }
  }

  function initProjects() {
    if (!track || !prevButton || !nextButton) {
      return;
    }

    var getStep = function () {
      var card = track.querySelector(".project-card");
      if (!card) {
        return 360;
      }
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 24;
      return card.getBoundingClientRect().width + gap;
    };

    var updateArrows = function () {
      var maxScroll = track.scrollWidth - track.clientWidth;
      prevButton.disabled = track.scrollLeft <= 2;
      nextButton.disabled = track.scrollLeft >= maxScroll - 2;
    };

    var scroll = function (direction) {
      track.scrollBy({
        left: getStep() * direction,
        behavior: reduceMotion.matches ? "auto" : "smooth"
      });
    };

    prevButton.addEventListener("click", function () {
      scroll(-1);
    });

    nextButton.addEventListener("click", function () {
      scroll(1);
    });

    track.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);

    track.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scroll(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        scroll(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        track.scrollTo({ left: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      } else if (event.key === "End") {
        event.preventDefault();
        track.scrollTo({
          left: track.scrollWidth,
          behavior: reduceMotion.matches ? "auto" : "smooth"
        });
      }
    });

    updateArrows();
  }

  function init() {
    setYear();
    updateLanguageButton();
    updatePlanLinks();
    initNavigation();
    initScrollSpy();
    initReveal();
    initCounters();
    initProjects();

    if (langToggle) {
      langToggle.addEventListener("click", switchLanguage);
    }

    loadTranslations(currentLang);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
