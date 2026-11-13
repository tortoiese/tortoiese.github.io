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
    refreshProjects(true);
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
  // 4) 프로젝트 트리: 화면에 고정된 무대에서 스크롤 진행도(pos)로 모든 것을 움직입니다.
  //    pos = 0 → 첫 프로젝트 정위치, 1 → 둘째 … (정수 근처에서는 머무름)
  //    스크롤 이벤트에서는 요청만 하고, 실제 계산·쓰기는 rAF 한 번에 모아서 합니다.
  // ─────────────────────────────────────────────
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var headerEl = document.querySelector(".site-header");
  var trees = Array.prototype.slice.call(document.querySelectorAll(".ptrack")).map(function (track) {
    var list = track.querySelector(".ptree");
    var items = Array.prototype.slice.call(list.children);
    track.style.setProperty("--n", items.length);
    return {
      track: track, list: list, items: items,
      bodies: items.map(function (li) { return li.querySelector(".pnode-body"); }),
      inners: items.map(function (li) { return li.querySelector(".item-more"); }),
      cur: -1, drawn: -1, near: -1, top: 64, step: 1, gap: 132, shift: 0, stageH: 0
    };
  });

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { v = clamp01(v); return v * v * (3 - 2 * v); }

  // 내용이 무대보다 길면 비율을 유지한 채 줄여서 맞춤
  function fitTree(t) {
    var avail = t.stageH - 40;
    t.items.forEach(function (li, i) {
      var body = t.bodies[i], inner = t.inners[i];
      if (!body || !inner) return;
      body.classList.remove("is-tall");
      var s = 1;
      inner.style.setProperty("--fit", 1);
      var h = inner.offsetHeight;
      if (h > avail) {
        s = avail / h;                                   // 폭이 넓어지면 더 짧아지므로 반드시 맞음
        inner.style.setProperty("--fit", s.toFixed(4));
        var s2 = Math.min(1, avail / inner.offsetHeight); // 넓어진 폭 기준으로 한 번 더 키워 봄
        inner.style.setProperty("--fit", s2.toFixed(4));
        if (inner.offsetHeight * s2 <= avail + 1) s = s2;
        if (s < 0.72) { s = 0.72; body.classList.add("is-tall"); }
      }
      inner.style.setProperty("--fit", s.toFixed(4));
    });
  }

  function measureTrees() {
    var top = headerEl ? headerEl.offsetHeight : 64;
    trees.forEach(function (t) {
      t.track.parentNode.style.setProperty("--stage-top", top + "px");
      if (!t.list.offsetParent) return;                  // 지금 안 보이는 섹션
      var cs = getComputedStyle(t.list);
      t.gap = parseFloat(cs.getPropertyValue("--gap")) || 132;
      t.shift = parseFloat(cs.getPropertyValue("--shift")) || 0;
      t.top = top;
      t.stageH = t.list.offsetHeight;
      t.step = t.items.length > 1 ? (t.track.offsetHeight - t.stageH) / (t.items.length - 1) : 1;
      fitTree(t);
      t.drawn = -1;
    });
  }

  function drawTree(t) {
    var pos = t.cur;
    if (pos === t.drawn) return;
    t.drawn = pos;
    var near = Math.round(pos);
    // 전환 중에는 줄기가 오른쪽으로 밀렸다가, 정위치(정수)에서 왼쪽으로 돌아옴
    var sx = reduceMotion ? 0 : t.shift * Math.sin(Math.PI * Math.abs(pos - near));
    var ls = t.list.style;
    ls.setProperty("--sx", sx.toFixed(2) + "px");
    ls.setProperty("--trunk-y", (-pos * t.gap).toFixed(2) + "px");
    ls.setProperty("--prog", (pos * t.gap).toFixed(2) + "px");
    var half = t.stageH / 2;
    t.items.forEach(function (li, i) {
      var d = i - pos, ad = Math.abs(d), dy = d * t.gap;
      var st = li.style;
      st.setProperty("--dy", dy.toFixed(2) + "px");
      st.setProperty("--a", ease(1 - ad).toFixed(4));          // 로고: 이웃까지 걸쳐 서서히
      st.setProperty("--c", ease(1 - 2 * ad).toFixed(4));      // 내용: 절반 지점에서 완전히 교대
      st.setProperty("--o", clamp01((half - 70 - Math.abs(dy)) / 70).toFixed(3));
    });
    if (near !== t.near) {
      t.near = near;
      t.items.forEach(function (li, i) {
        li.classList.toggle("is-focus", i === near);
        li.classList.toggle("is-passed", i <= near);
      });
    }
  }

  var treeRaf = 0;
  function treeFrame() {
    treeRaf = 0;
    var again = false;
    trees.forEach(function (t) {
      if (!t.list.offsetParent) return;
      var n = t.items.length;
      var x = (t.top - t.track.getBoundingClientRect().top) / t.step;
      x = x < 0 ? 0 : x > n - 1 ? n - 1 : x;
      var k = Math.floor(x), f = x - k;
      var target = k + ease((f - 0.22) / 0.56);          // 앞뒤 22%는 정위치에 머무름
      if (t.cur < 0 || reduceMotion) t.cur = target;
      else {
        t.cur += (target - t.cur) * 0.2;                 // 휠 스크롤이 끊겨도 부드럽게 따라감
        if (Math.abs(target - t.cur) < 0.0008) t.cur = target; else again = true;
      }
      drawTree(t);
    });
    if (again) treeRaf = requestAnimationFrame(treeFrame);
  }
  function requestTree() { if (!treeRaf) treeRaf = requestAnimationFrame(treeFrame); }
  function refreshProjects(snap) {
    measureTrees();
    if (snap) trees.forEach(function (t) { t.cur = -1; });
    requestTree();
  }

  // 줄기의 로고를 누르면 그 프로젝트로 이동
  trees.forEach(function (t) {
    t.items.forEach(function (li, i) {
      var bud = li.querySelector(".bud"), title = li.querySelector(".item-title strong");
      if (!bud) return;
      function go() {
        var y = window.pageYOffset + t.track.getBoundingClientRect().top - t.top + i * t.step;
        window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
      }
      bud.setAttribute("role", "button");
      bud.setAttribute("tabindex", "0");
      bud.removeAttribute("aria-hidden");
      if (title) bud.setAttribute("aria-label", title.textContent + " 프로젝트 보기");
      bud.addEventListener("click", go);
      bud.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
      });
    });
    // 사진이 늦게 뜨면 내용 높이가 바뀌므로 다시 맞춤
    var fitTimer = 0;
    t.list.addEventListener("load", function () {
      clearTimeout(fitTimer);
      fitTimer = setTimeout(function () { refreshProjects(false); }, 120);
    }, true);
  });

  if (trees.length) {
    window.addEventListener("scroll", requestTree, { passive: true });
    window.addEventListener("resize", function () { refreshProjects(false); });
  }

  // 시작: 주소의 #섹션을 보여줌 (없으면 첫 화면)
  show(idFromHash());
  window.addEventListener("load", function () { if (!playing) updateTimelines(); refreshProjects(false); });
})();
