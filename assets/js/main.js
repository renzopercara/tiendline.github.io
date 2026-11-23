/* Tiendline — interface behaviour, language toggle, navigation and motion */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var storageKey = "lang";
  var currentLang = "es";
  var renderedLang = "es";

  try {
    var stored = window.localStorage.getItem(storageKey);
    if (stored === "es" || stored === "en") {
      currentLang = stored;
    }
  } catch (error) {
    currentLang = "es";
  }

  var header = document.getElementById("site-header");
  var menuToggle = document.getElementById("menu-toggle");
  var langButtons = document.querySelectorAll("[data-lang]");

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
    for (var i = 0; i < langButtons.length; i += 1) {
      var button = langButtons[i];
      var language = button.getAttribute("data-lang");
      var isActive = language === currentLang;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
      if (language === "es") {
        button.setAttribute("aria-label", isActive ? "ES — Español, idioma seleccionado" : "ES — Cambiar a español");
        button.setAttribute("title", isActive ? "Español" : "Cambiar a español");
      } else {
        button.setAttribute("aria-label", isActive ? "EN — English, selected language" : "EN — Switch to English");
        button.setAttribute("title", isActive ? "English" : "Switch to English");
      }
    }
    updateMenuLabel();
  }

  function applyTranslations(dictionary, language) {
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

    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && dictionary["meta-og-title"]) {
      ogTitle.setAttribute("content", dictionary["meta-og-title"]);
    }

    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      ogLocale.setAttribute("content", language === "es" ? "es_AR" : "en_US");
    }

    var twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle && dictionary["meta-og-title"]) {
      twitterTitle.setAttribute("content", dictionary["meta-og-title"]);
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

    var labeled = document.querySelectorAll("[data-i18n-aria-label]");
    for (var j = 0; j < labeled.length; j += 1) {
      var labelKey = labeled[j].getAttribute("data-i18n-aria-label");
      var labelValue = dictionary[labelKey];
      if (typeof labelValue === "string") {
        labeled[j].setAttribute("aria-label", labelValue);
      }
    }

    document.documentElement.lang = language === "es" ? "es-AR" : "en";
  }

  function loadTranslations(language) {
    var url = "/assets/lang/" + language + ".json";

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
        if (language !== currentLang) {
          return;
        }
        applyTranslations(dictionary, language);
        renderedLang = language;
        updateLanguageButton();
        setYear();
      })
      .catch(function () {
        if (language !== currentLang) {
          return;
        }
        currentLang = renderedLang;
        try {
          window.localStorage.setItem(storageKey, currentLang);
        } catch (error) {
          /* Storage can be unavailable; the rendered language still matches. */
        }
        updateLanguageButton();
      });
  }

  function setLanguage(language) {
    if (language !== "es" && language !== "en") {
      return;
    }
    if (language === currentLang) {
      return;
    }
    currentLang = language;
    try {
      window.localStorage.setItem(storageKey, currentLang);
    } catch (error) {
      /* Storage can be unavailable; the switch still works for this view. */
    }
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

  function getHeaderFocusables() {
    if (!header) {
      return [];
    }
    var nodes = header.querySelectorAll("a[href], button:not([disabled])");
    return Array.prototype.filter.call(nodes, function (node) {
      return node.offsetParent !== null;
    });
  }

  function openMenu() {
    if (!header || !menuToggle) {
      return;
    }
    header.classList.add("nav-open");
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    updateMenuLabel();

    var firstLink = header.querySelector("#primary-nav a");
    if (firstLink) {
      window.setTimeout(function () {
        if (header.classList.contains("nav-open")) {
          firstLink.focus();
        }
      }, 60);
    }
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
          closeMenu(true);
        } else {
          openMenu();
        }
      });
    }

    var navLinks = document.querySelectorAll("#primary-nav a");
    for (var i = 0; i < navLinks.length; i += 1) {
      navLinks[i].addEventListener("click", function () {
        var href = this.getAttribute("href");
        closeMenu(false);
        if (href && href.charAt(0) === "#") {
          var target = document.getElementById(href.slice(1));
          if (target) {
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          }
        }
      });
    }

    document.addEventListener("keydown", function (event) {
      if (!header || !header.classList.contains("nav-open")) {
        return;
      }

      if (event.key === "Escape") {
        closeMenu(true);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      var focusables = getHeaderFocusables();
      if (!focusables.length) {
        return;
      }

      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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

  function init() {
    setYear();
    initNavigation();
    initScrollSpy();

    for (var i = 0; i < langButtons.length; i += 1) {
      langButtons[i].addEventListener("click", function () {
        setLanguage(this.getAttribute("data-lang"));
      });
    }

    // The HTML is delivered in Spanish. Only fetch a dictionary when the
    // stored preference is English; keep the Spanish DOM until it applies.
    if (currentLang === "en") {
      loadTranslations("en");
    } else {
      updateLanguageButton();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
