// Single-page portfolio — 라이브러리 없이 동작합니다.
// JS가 꺼져 있으면 모든 섹션이 한 페이지에 그대로 보입니다.
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  // 1) footer 연도
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ─────────────────────────────────────────────
  // 2) 메뉴 선택 이동: 고른 섹션 하나만 보여줍니다.
  //    주소는 #projects 처럼 바뀌어서 공유·뒤로가기가 됩니다.
  // ─────────────────────────────────────────────
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".site-nav a[href^='#']"));
  var viewIds = ["home"].concat(navLinks.map(function (a) { return a.getAttribute("href").slice(1); }));
  var views = {};
  viewIds.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) views[id] = el;
  });

  function idFromHash() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    return views[id] ? id : "home";
  }

  function show(id, opts) {
    opts = opts || {};
    if (!views[id]) id = "home";

    Object.keys(views).forEach(function (key) {
      views[key].classList.toggle("is-current", key === id);
    });
    navLinks.forEach(function (a) {
      var on = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    if (opts.push) {
      history.pushState(null, "", id === "home" ? location.pathname + location.search : "#" + id);
    }
    window.scrollTo(0, 0);

    // 키보드/스크린리더 사용자를 위해 새 섹션 제목으로 포커스 이동
    if (opts.focus) {
      var heading = views[id].querySelector("h1, h2");
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
    playTimelines(views[id]);
    updateProjects();
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href^='#']") : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var id = a.getAttribute("href").slice(1);

    if (id === "top") {               // "맨 위로"
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (views[id]) {                  // 메뉴 / 로고
      e.preventDefault();
      if (id !== idFromHash() || !location.hash) show(id, { push: id !== idFromHash(), focus: true });
      else window.scrollTo(0, 0);
    }
  });

  window.addEventListener("popstate", function () { show(idFromHash()); });

  // ─────────────────────────────────────────────
  // 3) 연대기 그래프: 화면 기준선(높이 45%)에 가장 가까운 노드가
  //    커지고 내용이 나타납니다. 이미 지나온 노드는 내용이 남습니다.
  // ─────────────────────────────────────────────
  var timelines = Array.prototype.slice.call(document.querySelectorAll(".timeline"));

  function setFocus(tl, items, focusIdx) {
    var top = tl.getBoundingClientRect().top;
    items.forEach(function (li, i) {
      li.classList.toggle("is-focus", i === focusIdx);
      li.classList.toggle("is-passed", i <= focusIdx);
    });
    var progress = 0;
    if (focusIdx >= 0) {
      // 진행선은 첫 노드 중심에서 시작해 현재 노드 중심에서 끝남
      progress = Math.max(0, items[focusIdx].getBoundingClientRect().top - top);
    }
    tl.style.setProperty("--progress", progress + "px");
  }

  function updateTimelines() {
    var line = window.innerHeight * 0.45;
    timelines.forEach(function (tl) {
      if (!tl.offsetParent) return;   // 지금 안 보이는 섹션
      var items = Array.prototype.slice.call(tl.children);
      var focusIdx = -1;
      items.forEach(function (li, i) {
        var mark = li.getBoundingClientRect().top + 16;   // 노드(점) 위치
        if (mark <= line) focusIdx = i;                   // 기준선을 지난 마지막 노드
      });
      // 아직 아무것도 기준선을 안 지났으면 첫 노드를 강조
      if (focusIdx === -1 && items.length) focusIdx = 0;
      setFocus(tl, items, focusIdx);
    });
  }

  // 마우스를 올리거나 키보드로 들어가면 그 노드를 바로 강조
  timelines.forEach(function (tl) {
    var items = Array.prototype.slice.call(tl.children);
    items.forEach(function (li, i) {
      li.addEventListener("mouseenter", function () { setFocus(tl, items, Math.max(i, currentIdx(items))); markFocus(items, i); });
      li.addEventListener("focusin", function () { setFocus(tl, items, Math.max(i, currentIdx(items))); markFocus(items, i); });
    });
  });
  function currentIdx(items) {
    var idx = -1;
    items.forEach(function (li, i) { if (li.classList.contains("is-passed")) idx = i; });
    return idx;
  }
  function markFocus(items, i) {
    items.forEach(function (li, j) { li.classList.toggle("is-focus", j === i); });
  }

  // 섹션에 들어올 때: 노드를 위에서부터 하나씩 차례로 켭니다.
  // 스크롤할 길이가 있으면 그다음부터는 스크롤 위치가 노드를 정합니다.
  var playTimer = [];
  var playing = false;
  function playTimelines(view) {
    playTimer.forEach(clearTimeout);
    playTimer = [];
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var list = view ? Array.prototype.slice.call(view.querySelectorAll(".timeline")) : [];
    if (!list.length || reduce) { playing = false; updateTimelines(); return; }

    playing = true;
    var line = window.innerHeight * 0.45;
    list.forEach(function (tl) {
      var items = Array.prototype.slice.call(tl.children);
      // 처음 화면 기준선까지 보이는 노드만 차례로 켬 (그 아래는 스크롤로)
      var last = 0;
      items.forEach(function (li, i) { if (li.getBoundingClientRect().top + 16 <= line) last = i; });
      if (document.documentElement.scrollHeight <= window.innerHeight + 4) last = items.length - 1;
      setFocus(tl, items, -1);
      for (var i = 0; i <= last; i++) {
        (function (i) {
          playTimer.push(setTimeout(function () { setFocus(tl, items, i); }, 250 + i * 450));
        })(i);
      }
      playTimer.push(setTimeout(function () { playing = false; }, 250 + last * 450 + 50));
    });
  }

  // 차례 연출 중에는 스크롤 이벤트로 덮어쓰지 않고,
  // 사용자가 직접 스크롤을 시작하면(휠/터치/키보드) 연출을 멈추고 스크롤을 따릅니다.
  function stopPlaying() {
    if (!playing) return;
    playTimer.forEach(clearTimeout);
    playTimer = [];
    playing = false;
    updateTimelines();
  }
  window.addEventListener("wheel", stopPlaying, { passive: true });
  window.addEventListener("touchmove", stopPlaying, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)) stopPlaying();
  });
  window.addEventListener("scroll", function () {
    if (!playing) updateTimelines();
  }, { passive: true });
  window.addEventListener("resize", updateTimelines);

  // ─────────────────────────────────────────────
  // 4) 프로젝트: 화면 기준선에 닿은 프로젝트가 펼쳐지고, 지나가면 접힙니다.
  // ─────────────────────────────────────────────
  var projectLists = Array.prototype.slice.call(document.querySelectorAll(".project-list"));
  function updateProjects() {
    var header = document.querySelector(".site-header");
    var line = (header ? header.offsetHeight : 64) + 40;       // 정위치: 프로젝트 윗변이 오는 높이
    var slotH = Math.max(200, window.innerHeight - line);      // 정위치에서 프로젝트가 차지하는 높이
    projectLists.forEach(function (list) {
      if (!list.offsetParent) return;
      var items = Array.prototype.slice.call(list.children);
      var best = 0, bestP = -1;
      items.forEach(function (it, i) {
        var r = it.getBoundingClientRect();
        // 정위치에서 얼마나 벗어났는지 (0 = 정위치). 위로 지나갔는지, 아래에서 오는지 모두 포함
        var d = Math.max(0, r.top - line, line + slotH - r.bottom) / slotH;
        var t = Math.min(1, Math.max(0, (d - 0.12) / 0.5));     // 0.12까지는 정위치로 머무름
        var p = 1 - t * t * (3 - 2 * t);
        it.style.setProperty("--p", p.toFixed(3));
        if (p > bestP) { bestP = p; best = i; }
      });
      items.forEach(function (it, i) {
        it.classList.toggle("is-focus", i === best);
        it.classList.toggle("is-passed", i <= best);
      });
      list.style.setProperty("--slot-h", slotH + "px");   // 헤더 높이가 달라도 CSS와 어긋나지 않게
      var lr = list.getBoundingClientRect();
      var maxH = Math.max(0, lr.height - slotH);
      list.style.setProperty("--progress", Math.min(maxH, Math.max(0, line - lr.top)) + "px");
    });
  }
  window.addEventListener("scroll", updateProjects, { passive: true });
  window.addEventListener("resize", updateProjects);
  window.addEventListener("hashchange", updateProjects);
  // 시작: 주소의 #섹션을 보여줌 (없으면 첫 화면)
  show(idFromHash());
  window.addEventListener("load", function () { if (!playing) updateTimelines(); updateProjects(); });
})();
