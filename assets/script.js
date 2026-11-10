// Single-page portfolio — 라이브러리 없이 동작합니다.
(function () {
  "use strict";

  // 1) footer 연도
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // 2) 스크롤 위치에 따라 현재 섹션의 nav 항목 강조
  var links = Array.prototype.slice.call(document.querySelectorAll(".site-nav a[href^='#']"));
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (!sections.length) return;

  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function update() {
    var header = document.querySelector(".site-header");
    var offset = (header ? header.offsetHeight : 0) + window.innerHeight * 0.25;
    var current = null;

    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top - offset <= 0) current = sec.id;
    });

    // 페이지 맨 아래에 닿으면 마지막 섹션을 강조 (짧은 Contact 섹션 대응)
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) current = sections[sections.length - 1].id;

    setActive(current);
  }

  // 섹션 5개뿐이라 스크롤마다 직접 계산해도 부담이 없습니다.
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  window.addEventListener("hashchange", update);
  window.addEventListener("load", update);
  update();
})();
