/* ================= CROSSLINKS — RELATED LINE ON NOTES (coordinator: ship as crosslink_snippet.js beside index.html, or inline before </body>) =================
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
   lists (e.g. a section shared by 30 judgements) never flood the index. */
(function () {
  "use strict";
  var byNote = null; /* noteId -> {judgments:[], drafts:[]} */
  var noteTitles = null; /* title string -> noteId (only when unique) */
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
  function buildLine(noteId) {
    if (!byNote) return null;
    var rel = byNote[noteId];
    if (!rel || (!rel.judgments.length && !rel.drafts.length)) return null;
    var l = lang();
    var div = document.createElement("div");
    div.className = "ll-related";
    div.style.cssText = "font-size:.82rem;line-height:1.7;color:var(--muted,#555);padding:2px 4px 12px;";
    var label = document.createElement("span");
    label.textContent = (l === "hi" ? "🔗 संबंधित: " : "🔗 Related: ");
    div.appendChild(label);
    function addBtns(items, kind, cap) {
      items.slice(0, cap).forEach(function (nm, i) {
        if (i) div.appendChild(document.createTextNode(", "));
        var b = document.createElement("button");
        b.type = "button";
        b.style.cssText = "background:none;border:none;padding:0;font:inherit;color:inherit;text-decoration:underline;cursor:pointer;";
        b.textContent = nm;
        b.addEventListener("click", function () { if (kind === "j") goJudgment(nm); else goDraft(nm); });
        div.appendChild(b);
      });
      if (items.length > cap) {
        var more = document.createElement("span");
        more.textContent = " +" + (items.length - cap) + " " + (l === "hi" ? "और" : "more");
        div.appendChild(more);
      }
    }
    if (rel.judgments.length) {
      var jh = document.createElement("span");
      jh.textContent = (l === "hi" ? "निर्णय: " : "Judgements: ");
      div.appendChild(jh);
      addBtns(rel.judgments, "j", 4);
    }
    if (rel.drafts.length) {
      if (rel.judgments.length) div.appendChild(document.createTextNode(" · "));
      var dh = document.createElement("span");
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
    byNote = {};
    (doc.entries || []).forEach(function (e) {
      (e.note_ids || []).forEach(function (nid) {
        if (!byNote[nid]) byNote[nid] = { judgments: [], drafts: [] };
        (e.judgment_ids || []).forEach(function (j) { if (byNote[nid].judgments.indexOf(j) === -1) byNote[nid].judgments.push(j); });
        (e.draft_ids || []).forEach(function (d) { if (byNote[nid].drafts.indexOf(d) === -1) byNote[nid].drafts.push(d); });
      });
    });
    buildTitles();
    scan();
    var container = document.getElementById("notesContent");
    if (container && window.MutationObserver) new MutationObserver(scan).observe(container, { childList: true, subtree: true });
  }
  try { if (window.akLoad) window.akLoad("handwrittenNotesData"); } catch (e) {}
  document.addEventListener("ak-data", function (e) {
    if (e && e.detail === "handwrittenNotesData") { buildTitles(); scan(); }
  });
  if (window.LL_CROSSLINKS) { loadCrosslinks(window.LL_CROSSLINKS); return; }
  fetch("crosslinks.json").then(function (r) { return r.json(); }).then(loadCrosslinks).catch(function () { /* no data: no related lines, nothing breaks */ });
})();
