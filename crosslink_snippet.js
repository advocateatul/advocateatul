/* ================= CROSSLINKS — RELATED LINE ON NOTES (Batch 4 fix of the batch-3 snippet) =================
   WHAT: Under each notes index item (.notes-index-item, which carries
   data-subj / data-ti), adds a "Related" line listing judgements and drafts
   that share a VERIFIED section number with that note, taken from
   crosslinks.json. Nothing is shown for a note with no crosslink entry.
   Also covers the open-topic view: the open topic's <h3> title is matched
   exactly against loaded note titles (EN or HI, unique match required);
   ambiguous or unmatched titles get no line — never a guess.
   DATA: crosslinks.json beside index.html, or window.LL_CROSSLINKS if the
   coordinator inlines it. If neither loads, nothing renders and nothing breaks.
   JUMPS: judgement buttons use the library search input event (the page's own
   cites-button mechanism); draft buttons use window.jumpToDraft. No IIFE
   internals are touched. The page re-renders #notesContent on every tab /
   search / open action, so a MutationObserver re-applies the lines each time.
   CAP: 4 judgements + 4 drafts per note, plus "+N more" counts, so long
   lists (e.g. a section shared by 30 judgements) never flood the index.
   BATCH 4 FIX (display-only; matching, caps and jumps unchanged):
   - Items are bilingual: drafts resolve id -> drafts.json title (title.hi in
     HI mode, title.en in EN mode) via window.AK_STORE.legalDraftsData;
     judgements resolve English caseName -> judgements.json caseNameHi in HI
     mode via window.AK_STORE.usefulJudgementsData. While the data has not
     arrived, the slug / English name is shown as fallback and the button
     text is upgraded IN PLACE when the "ak-data" event for that dataset
     arrives (the button keeps its key in data-ll-key, so the jump is
     untouched by the text upgrade).
   - Handwriting + ink: the line uses the notes handwriting stack
     ("Caveat", "Kalam", "Patrick Hand", "Segoe Print", cursive) and the
     notes ink (#1d4ed8 light, #8ab6ff dark). Inline styles cannot switch
     with the theme, so a small guarded <style id="ll-related-style"> is
     injected once carrying the .ll-related rules plus the
     html[data-theme="dark"] override — the same attribute selector the
     site's own notes CSS uses. The muted-gray color is gone.
   - Language toggle: a MutationObserver on <html lang> upgrades every
     existing line in place (labels, button texts, "+N more"/"और" text).
     It only edits text/attributes of existing nodes, never adds or removes
     nodes, so caps and counts are untouched. (The notes re-render on toggle
     also rebuilds lines via the existing #notesContent observer; the lang
     observer covers paths where lang changes without a re-render, e.g. the
     open-topic line.) */
(function () {
  "use strict";
  var byNote = null; /* noteId -> {judgments:[], drafts:[]} */
  var noteTitles = null; /* title string -> noteId (only when unique) */
  var draftMap = null; /* draft id -> {en,hi} (or string title) */
  var judgmentMap = null; /* English caseName -> caseNameHi */
  /* Judgement click value: true = ship the DISPLAY (localized) name as the
     library-search value in HI mode; false = always the English caseName.
     Harness-verified (see report.md): the Hindi name lands on the exact
     library result, so localized click ships. The display text and the
     click value are kept in sync by upgradeAll() on every language change. */
  var JUDGMENT_CLICK_LOCALIZED = true;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lang() { return document.documentElement.lang === "hi" ? "hi" : "en"; }
  function evInput(el) { try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {} }
  function goJudgment(name) {
    var inp = document.getElementById("librarySectionSearch");
    if (inp) { inp.value = name; evInput(inp); }
    var sec = document.getElementById("library");
    if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth" });
  }
  function goDraft(id) {
    try { if (window.akLoad) window.akLoad("legalDraftsData"); } catch (e) {}
    if (window.jumpToDraft) { window.jumpToDraft(id); return; }
    var s = document.getElementById("drafts");
    if (s && s.scrollIntoView) s.scrollIntoView({ behavior: "smooth" });
  }
  /* --- Guarded theme-aware style: created once, never duplicated. --- */
  function ensureStyle() {
    if (document.getElementById("ll-related-style")) return;
    var st = document.createElement("style");
    st.id = "ll-related-style";
    st.textContent =
      ".ll-related{font-family:\"Caveat\",\"Kalam\",\"Patrick Hand\",\"Segoe Print\",cursive;font-size:.95rem;line-height:1.7;color:#1d4ed8;padding:2px 4px 12px;}" +
      "html[data-theme=\"dark\"] .ll-related{color:#8ab6ff;}";
    (document.head || document.documentElement).appendChild(st);
  }
  /* --- Bilingual lookups (rebuilt from AK_STORE whenever it is present). --- */
  function refreshMaps() {
    try {
      var dd = window.AK_STORE && window.AK_STORE.legalDraftsData;
      if (dd && dd.drafts) {
        draftMap = {};
        dd.drafts.forEach(function (d) { if (d && d.id) draftMap[d.id] = d.title || d.id; });
      }
    } catch (e) {}
    try {
      var jd = window.AK_STORE && window.AK_STORE.usefulJudgementsData;
      if (jd && jd.items) {
        judgmentMap = {};
        jd.items.forEach(function (j) { if (j && j.caseName && j.caseNameHi) judgmentMap[j.caseName] = j.caseNameHi; });
      }
    } catch (e) {}
  }
  function draftText(id, l) {
    var m = draftMap && draftMap[id];
    if (!m) return id;
    if (typeof m === "string") return m;
    return m[l] || m.en || id;
  }
  function judgmentText(enName, l) {
    if (l !== "hi") return enName;
    return (judgmentMap && judgmentMap[enName]) || enName;
  }
  function clickValue(kind, key, l) {
    if (kind === "j" && JUDGMENT_CLICK_LOCALIZED) return judgmentText(key, l);
    return key;
  }
  /* --- In-place upgrade: relocalizes every existing line, adds nothing. --- */
  function upgradeAll() {
    refreshMaps();
    var l = lang();
    var lines = document.querySelectorAll(".ll-related");
    for (var i = 0; i < lines.length; i++) {
      var div = lines[i];
      var spans = div.querySelectorAll("[data-ll-role]");
      for (var s = 0; s < spans.length; s++) {
        var sp = spans[s], role = sp.getAttribute("data-ll-role");
        if (role === "label") sp.textContent = (l === "hi" ? "🔗 संबंधित: " : "🔗 Related: ");
        else if (role === "jhead") sp.textContent = (l === "hi" ? "निर्णय: " : "Judgements: ");
        else if (role === "dhead") sp.textContent = (l === "hi" ? "प्रारूप: " : "Drafts: ");
        else if (role === "more") {
          var n = sp.getAttribute("data-ll-more") || "0";
          sp.textContent = " +" + n + " " + (l === "hi" ? "और" : "more");
        }
      }
      var btns = div.querySelectorAll("button[data-ll-kind]");
      for (var b = 0; b < btns.length; b++) {
        var btn = btns[b], kind = btn.getAttribute("data-ll-kind"), key = btn.getAttribute("data-ll-key");
        if (!key) continue;
        btn.textContent = (kind === "j") ? judgmentText(key, l) : draftText(key, l);
        btn.setAttribute("data-ll-click", clickValue(kind, key, l));
      }
    }
  }
  function buildLine(noteId) {
    if (!byNote) return null;
    var rel = byNote[noteId];
    if (!rel || (!rel.judgments.length && !rel.drafts.length)) return null;
    refreshMaps();
    var l = lang();
    var div = document.createElement("div");
    div.className = "ll-related";
    div.setAttribute("data-ll-note", noteId);
    /* Font/size/padding inline (buttons inherit the font); color lives ONLY
       in the injected stylesheet so the dark-mode override can win. */
    div.style.cssText = "font-family:\"Caveat\",\"Kalam\",\"Patrick Hand\",\"Segoe Print\",cursive;font-size:.95rem;line-height:1.7;padding:2px 4px 12px;";
    var label = document.createElement("span");
    label.setAttribute("data-ll-role", "label");
    label.textContent = (l === "hi" ? "🔗 संबंधित: " : "🔗 Related: ");
    div.appendChild(label);
    function addBtns(items, kind, cap) {
      items.slice(0, cap).forEach(function (key, i) {
        if (i) div.appendChild(document.createTextNode(", "));
        var b = document.createElement("button");
        b.type = "button";
        b.style.cssText = "background:none;border:none;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;";
        b.setAttribute("data-ll-kind", kind);
        b.setAttribute("data-ll-key", key);
        b.setAttribute("data-ll-click", clickValue(kind, key, l));
        b.textContent = (kind === "j") ? judgmentText(key, l) : draftText(key, l);
        /* Click value is read at click time (not closed over), so a later
           language upgrade that changes data-ll-click is honoured. The
           draft key itself never changes: goDraft always gets the id. */
        b.addEventListener("click", function () {
          var cv = b.getAttribute("data-ll-click") || b.getAttribute("data-ll-key");
          if (kind === "j") goJudgment(cv); else goDraft(cv);
        });
        div.appendChild(b);
      });
      if (items.length > cap) {
        var more = document.createElement("span");
        more.setAttribute("data-ll-role", "more");
        more.setAttribute("data-ll-more", String(items.length - cap));
        more.textContent = " +" + (items.length - cap) + " " + (l === "hi" ? "और" : "more");
        div.appendChild(more);
      }
    }
    if (rel.judgments.length) {
      var jh = document.createElement("span");
      jh.setAttribute("data-ll-role", "jhead");
      jh.textContent = (l === "hi" ? "निर्णय: " : "Judgements: ");
      div.appendChild(jh);
      addBtns(rel.judgments, "j", 4);
    }
    if (rel.drafts.length) {
      if (rel.judgments.length) div.appendChild(document.createTextNode(" · "));
      var dh = document.createElement("span");
      dh.setAttribute("data-ll-role", "dhead");
      dh.textContent = (l === "hi" ? "प्रारूप: " : "Drafts: ");
      div.appendChild(dh);
      addBtns(rel.drafts, "d", 4);
    }
    return div;
  }
  function buildTitles() {
    var data = window.AK_STORE && window.AK_STORE.handwrittenNotesData;
    if (!data) return;
    var counts = {}, map = {};
    Object.keys(data).forEach(function (subj) {
      (data[subj] || []).forEach(function (t, ti) {
        ["en", "hi"].forEach(function (k) {
          var title = t.title && t.title[k];
          if (!title) return;
          counts[title] = (counts[title] || 0) + 1;
          map[title] = subj + ":" + ti;
        });
      });
    });
    noteTitles = {};
    Object.keys(map).forEach(function (title) { if (counts[title] === 1) noteTitles[title] = map[title]; });
  }
  function scan() {
    var container = document.getElementById("notesContent");
    if (!container || !byNote) return;
    container.querySelectorAll(".notes-index-item").forEach(function (btn) {
      if (btn.getAttribute("data-ll-related") === "1") return;
      btn.setAttribute("data-ll-related", "1");
      var line = buildLine(btn.getAttribute("data-subj") + ":" + btn.getAttribute("data-ti"));
      if (line && btn.parentNode) btn.parentNode.insertBefore(line, btn.nextSibling);
    });
    /* Open-topic view: no index items, but an <h3> title is present. */
    if (!container.querySelector(".notes-index-item") && !container.querySelector(".ll-related")) {
      var h3 = container.querySelector("h3");
      var title = h3 && h3.firstChild ? (h3.firstChild.textContent || "").trim() : "";
      if (title && noteTitles && noteTitles[title]) {
        var line2 = buildLine(noteTitles[title]);
        if (line2) container.appendChild(line2);
      }
    }
  }
  function loadCrosslinks(doc) {
    ensureStyle();
    byNote = {};
    (doc.entries || []).forEach(function (e) {
      (e.note_ids || []).forEach(function (nid) {
        if (!byNote[nid]) byNote[nid] = { judgments: [], drafts: [] };
        (e.judgment_ids || []).forEach(function (j) { if (byNote[nid].judgments.indexOf(j) === -1) byNote[nid].judgments.push(j); });
        (e.draft_ids || []).forEach(function (d) { if (byNote[nid].drafts.indexOf(d) === -1) byNote[nid].drafts.push(d); });
      });
    });
    buildTitles();
    refreshMaps();
    scan();
    upgradeAll();
    var container = document.getElementById("notesContent");
    if (container && window.MutationObserver) new MutationObserver(scan).observe(container, { childList: true, subtree: true });
    /* Language toggle: upgrade existing lines in place. Re-renders also
       rebuild lines via the #notesContent observer; this covers lang
       changes without a re-render (notably the open-topic line). */
    if (window.MutationObserver && !loadCrosslinks._langObs) {
      loadCrosslinks._langObs = true;
      new MutationObserver(function () { upgradeAll(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    }
  }
  try {
    if (window.akLoad) {
      window.akLoad("handwrittenNotesData");
      window.akLoad("legalDraftsData");
      window.akLoad("usefulJudgementsData");
    }
  } catch (e) {}
  document.addEventListener("ak-data", function (e) {
    if (!e) return;
    if (e.detail === "handwrittenNotesData") { buildTitles(); scan(); }
    else if (e.detail === "legalDraftsData" || e.detail === "usefulJudgementsData") { refreshMaps(); upgradeAll(); scan(); }
  });
  if (window.LL_CROSSLINKS) { loadCrosslinks(window.LL_CROSSLINKS); return; }
  fetch("crosslinks.json").then(function (r) { return r.json(); }).then(loadCrosslinks).catch(function () { /* no data: no related lines, nothing breaks */ });
})();
