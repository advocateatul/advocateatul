/* ================= C6 RESEARCH REPORT — LOGIC (coordinator: ship as research_logic.js beside index.html) =================
   HOW IT GATHERS ITEMS (no keyword guessing):
   - Each topic below lists VERIFIED section keys. A key is listed only if that
     exact family+number token was found in at least one dataset's parsed
     sections (notes.json sections strings, judgements.json sections arrays,
     drafts.json sections prose + titles). Both old and new codes are listed
     explicitly where both occur (e.g. BNSS:483 and CRPC:439); nothing is
     inferred through an equivalence table at runtime.
   - An item joins the report iff one of its own parsed section tokens is in
     the topic's list. Judgement tokens come straight from the sections array;
     note/draft tokens are parsed from their own sections strings (ranges
     expanded, max span 60, subsections stripped, bare "Sec n" groups inherit
     the subject family for notes).
   - Typed input is accepted ONLY as (a) an exact topic label (EN or HI,
     case-insensitive) or (b) a section key such as "BNSS 483" / "483 BNSS".
     Anything else shows the topic list with a "no verified report" message —
     it never falls back to keyword search.
   DATA SOURCES: window.AK_STORE (usefulJudgementsData / handwrittenNotesData /
   legalDraftsData) filled by the page's own akLoad; this script triggers
   akLoad when data is missing and re-renders on the page's "ak-data" event.
   JUMPS reuse existing public paths only: library search input event (same as
   the page's own cites buttons), window.jumpToDraft, notes search input +
   programmatic click on the rendered .notes-index-item (same delegated handler
   the page itself uses). No IIFE internals are touched. */
(function () {
  "use strict";
  /* ---- shared jump helpers (guarded: journey/crosslink snippets reuse them) ---- */
  function llJump() {
    if (window.llJump) return window.llJump;
    function evInput(el) { try { el.dispatchEvent(new Event("input", { bubbles: true })); } catch (e) {} }
    function toLib(name) {
      var inp = document.getElementById("librarySectionSearch");
      var sec = document.getElementById("library");
      if (inp) { inp.value = name; evInput(inp); }
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth" });
    }
    function toDraft(id) {
      try { if (window.akLoad) window.akLoad("legalDraftsData"); } catch (e) {}
      if (window.jumpToDraft) { window.jumpToDraft(id); return; }
      var s = document.getElementById("drafts");
      if (s && s.scrollIntoView) s.scrollIntoView({ behavior: "smooth" });
    }
    function toNote(subj, ti, titleEn) {
      var sec = document.getElementById("notes");
      var inp = document.getElementById("notesSearchInput");
      if (inp) { inp.value = titleEn || ""; evInput(inp); }
      var btn = document.querySelector('.notes-index-item[data-subj="' + subj + '"][data-ti="' + ti + '"]');
      if (btn) { btn.click(); return; }
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: "smooth" });
    }
    window.llJump = { judgment: toLib, draft: toDraft, note: toNote };
    return window.llJump;
  }
  /* ---- section parsing ---- */
  function expandList(txt) {
    var out = [];
    String(txt).split(",").forEach(function (part) {
      part = part.replace(/\([^)]*\)/g, "").trim();
      if (!part) return;
      var rg = part.match(/^(\d+)[a-z]?\s*[-–]\s*(\d+)[a-z]?$/);
      if (rg) {
        var a = parseInt(rg[1], 10), b = parseInt(rg[2], 10);
        if (b >= a && b - a <= 60) { for (var n = a; n <= b; n++) out.push(String(n)); }
        return;
      }
      if (/^\d+[a-z]?$/.test(part)) out.push(part.toLowerCase());
    });
    return out;
  }
  function normFam(f) { f = String(f).toUpperCase(); return f === "CRPC" ? "CRPC" : f; }
  function parseProse(text, defaultFam) {
    var toks = {}, i, m;
    text = String(text || "");
    if (!text) return toks;
    var secRe = /(?:sec\.?|section)\s*([0-9][0-9a-z,\s\-–\(\)]*?)\s*(BNS|BNSS|BSA|IPC|CrPC|IEA|CPC|NDPS|NI|IT|HSA|TPA|CPA|HMA|POCSO|MVA|UAPA|PMLA|DV)?\b/gi;
    while ((m = secRe.exec(text)) !== null) {
      var nums = expandList(m[1].replace(/[A-Za-z]+/g, ""));
      var fam = m[2] ? normFam(m[2]) : defaultFam;
      if (!fam) continue;
      nums.forEach(function (n) { toks[fam + ":" + n] = 1; });
    }
    var famRe = /\b(BNS|BNSS|BSA|IPC|CrPC|IEA|CPC|NDPS|NI)\s+([0-9]+[a-z]?(?:\s*\([^)]*\))?(?:\s*[,/]\s*[0-9]+[a-z]?)*)/gi;
    while ((m = famRe.exec(text)) !== null) {
      expandList(m[2]).forEach(function (n) { toks[normFam(m[1]) + ":" + n] = 1; });
    }
    var artRe = /\bArt\.?\s*([0-9]+)\b/gi;
    while ((m = artRe.exec(text)) !== null) { toks["ART:" + m[1]] = 1; }
    return toks;
  }
  function parseJudgSecs(secs) {
    var toks = {};
    (secs || []).forEach(function (s) {
      var t = String(s).replace(/\(.*\)/, "").replace(/-/g, "").trim();
      var m = t.match(/^([A-Za-z]+)\s+([0-9]+[A-Za-z]?)$/);
      if (m) toks[normFam(m[1]) + ":" + m[2].toLowerCase()] = 1;
    });
    return toks;
  }
  /* ---- verified topics: every key below occurs in at least one dataset ---- */
  var TOPICS = [
    { id: "bail", en: "Bail", hi: "जमानत", sections: ["BNSS:478", "BNSS:480", "BNSS:482", "BNSS:483", "BNSS:484", "BNSS:187", "CRPC:436", "CRPC:437", "CRPC:438", "CRPC:439", "CRPC:440", "CRPC:167"] },
    { id: "fir", en: "FIR & Investigation", hi: "FIR और जाँच", sections: ["BNSS:173", "BNSS:175", "BNSS:180", "BNSS:187", "BNSS:192", "BNSS:193", "CRPC:154", "CRPC:156", "CRPC:161", "CRPC:167", "CRPC:172", "CRPC:173"] },
    { id: "arrest", en: "Arrest Rights", hi: "गिरफ्तारी के अधिकार", sections: ["BNSS:35", "CRPC:41", "ART:22"] },
    { id: "murder", en: "Murder & Homicide", hi: "हत्या", sections: ["BNS:100", "BNS:101", "BNS:103", "BNS:106", "BNS:109", "IPC:299", "IPC:300", "IPC:302", "IPC:304", "IPC:304a", "IPC:307"] },
    { id: "sexual", en: "Sexual Offences", hi: "यौन अपराध", sections: ["BNS:63", "BNS:64", "BNS:74", "BNS:75", "IPC:375", "IPC:376", "IPC:354"] },
    { id: "cheating", en: "Cheating & Fraud", hi: "धोखाधड़ी", sections: ["BNS:316", "BNS:318", "BNS:336", "IPC:405", "IPC:406", "IPC:415", "IPC:420", "IPC:471"] },
    { id: "quashing", en: "Quashing of FIR / Proceedings", hi: "FIR / कार्यवाही रद्द करना", sections: ["BNSS:528", "CRPC:482"] },
    { id: "maintenance", en: "Maintenance", hi: "भरण-पोषण", sections: ["BNSS:144", "CRPC:125"] },
    { id: "evidence", en: "Dying Declaration & Confession", hi: "मृत्युकालिक कथन और इकबालिया बयान", sections: ["BSA:26", "BSA:23", "IEA:32", "IEA:25"] },
    { id: "cheque", en: "Cheque Bounce", hi: "चेक बाउंस", sections: ["NI:138", "NI:141"] },
    { id: "anticipatory-bail", en: "Anticipatory Bail", hi: "अग्रिम ज़मानत", sections: ["BNSS:482", "CRPC:438"] },
    { id: "domestic-violence", en: "Domestic Violence & Cruelty", hi: "घरेलू हिंसा और क्रूरता", sections: ["BNS:85", "IPC:498a", "DV:3", "DV:12", "DV:18", "DV:31"] },
    { id: "cyber-crime", en: "Cyber Crime", hi: "साइबर अपराध", sections: ["IT:66a", "IT:66d", "IT:67", "IT:67b", "IT:79", "IT:80", "IT:85"] },
    { id: "ndps", en: "NDPS — Drug Offences", hi: "NDPS — नशीले पदार्थों के अपराध", sections: ["NDPS:8", "NDPS:20", "NDPS:21", "NDPS:22", "NDPS:27a", "NDPS:36", "NDPS:36a", "NDPS:37", "NDPS:50", "NDPS:52", "NDPS:60", "NDPS:63"] },
    { id: "pocso", en: "POCSO — Offences Against Children", hi: "POCSO — बच्चों के विरुद्ध अपराध", sections: ["POCSO:3", "POCSO:4", "POCSO:5", "POCSO:6", "POCSO:29", "POCSO:94"] },
    { id: "hurt-assault", en: "Hurt & Assault", hi: "चोट और हमला", sections: ["BNS:114", "BNS:115", "BNS:116", "BNS:117", "IPC:319", "IPC:323", "IPC:325", "IPC:326"] },
    { id: "kidnapping", en: "Kidnapping", hi: "अपहरण", sections: ["BNS:137", "IPC:363", "IPC:366"] },
    { id: "dowry-death", en: "Dowry Death", hi: "दहेज मृत्यु", sections: ["BNS:80", "BNS:85", "IPC:304b", "IPC:498a"] },
    { id: "criminal-appeal", en: "Criminal Appeal", hi: "आपराधिक अपील", sections: ["BNSS:413", "BNSS:415", "BNSS:419", "CRPC:372", "CRPC:374", "CRPC:378"] },
    { id: "discharge", en: "Discharge", hi: "उन्मोचन", sections: ["BNSS:250", "BNSS:262", "BNSS:263", "CRPC:227", "CRPC:239"] },
    { id: "defamation", en: "Defamation", hi: "मानहानि", sections: ["BNS:356", "IPC:499", "IPC:500"] },
    { id: "abetment-conspiracy", en: "Abetment & Conspiracy", hi: "दुष्प्रेरण और षड्यंत्र", sections: ["BNS:61", "IPC:120b"] },
    { id: "attempt", en: "Attempt", hi: "प्रयास", sections: ["BNS:62", "IPC:511"] },
    { id: "acid-grievous-hurt", en: "Acid Attack & Grievous Hurt", hi: "तेज़ाब हमला और गंभीर चोट", sections: ["BNS:124", "BNS:117", "IPC:326"] },
    { id: "criminal-intimidation", en: "Criminal Intimidation", hi: "आपराधिक धमकी", sections: ["BNS:351", "IPC:506"] },
    { id: "theft", en: "Theft & Snatching", hi: "चोरी और छीना-झपटी", sections: ["BNS:303", "BNS:304", "IPC:380"] },
    { id: "electronic-evidence", en: "Electronic Evidence", hi: "इलेक्ट्रॉनिक साक्ष्य", sections: ["BSA:62", "BSA:63", "IEA:65a", "IEA:65b"] },
    { id: "offences-against-state", en: "Offences Against the State", hi: "राज्य के विरुद्ध अपराध", sections: ["BNS:152", "IPC:124a"] },
    { id: "witness-examination", en: "Witness Examination", hi: "गवाहों की परीक्षा", sections: ["BSA:146", "BSA:149", "BSA:157", "BSA:142", "BSA:162"] },
    { id: "compounding", en: "Compounding of Offences", hi: "अपराधों का शमन", sections: ["BNSS:359", "CRPC:320"] },
    { id: "criminal-trespass", en: "Criminal Trespass", hi: "आपराधिक अतिचार", sections: ["BNS:329", "BNS:330"] },
    { id: "stalking-voyeurism", en: "Stalking & Voyeurism", hi: "पीछा करना और ताक-झाँक", sections: ["BNS:77", "BNS:78"] },
    { id: "robbery", en: "Robbery", hi: "लूट", sections: ["BNS:309", "IPC:390"] },
    { id: "unlawful-assembly-rioting", en: "Unlawful Assembly & Rioting", hi: "विधिविरुद्ध जमाव और बलवा", sections: ["BNS:189", "BNS:190", "IPC:147", "IPC:149"] }
  ];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lang() { return document.documentElement.lang === "hi" ? "hi" : "en"; }
  function store(id) { try { return (window.AK_STORE && window.AK_STORE[id]) || null; } catch (e) { return null; } }
  function gather(topic) {
    var set = {};
    topic.sections.forEach(function (s) { set[s] = 1; });
    var out = { judgments: [], notes: [], drafts: [] };
    var jd = store("usefulJudgementsData");
    (jd && jd.items ? jd.items : []).forEach(function (j) {
      var tk = parseJudgSecs(j.sections);
      var hit = Object.keys(tk).filter(function (k) { return set[k]; });
      if (hit.length) out.judgments.push({ name: j.caseName, nameHi: j.caseNameHi || "", cit: j.citation || "", secs: hit });
    });
    var nd = store("handwrittenNotesData");
    if (nd) {
      var famMap = { bns: "BNS", bnss: "BNSS", bsa: "BSA", cpc: "CPC" };
      Object.keys(nd).forEach(function (subj) {
        (nd[subj] || []).forEach(function (t, ti) {
          var tk = parseProse(t.sections || "", famMap[subj] || null);
          var hit = Object.keys(tk).filter(function (k) { return set[k]; });
          if (hit.length) out.notes.push({ subj: subj, ti: ti, titleEn: (t.title && t.title.en) || "", titleHi: (t.title && t.title.hi) || "", secs: hit });
        });
      });
    }
    var dd = store("legalDraftsData");
    (dd && dd.drafts ? dd.drafts : []).forEach(function (d) {
      var tk = parseProse(((d.sections && d.sections.en) || "") + " " + ((d.title && d.title.en) || ""), null);
      var hit = Object.keys(tk).filter(function (k) { return set[k]; });
      if (hit.length) out.drafts.push({ id: d.id, titleEn: (d.title && d.title.en) || "", titleHi: (d.title && d.title.hi) || "", secs: hit });
    });
    return out;
  }
  function dataReady() {
    return !!(store("usefulJudgementsData") || store("handwrittenNotesData") || store("legalDraftsData"));
  }
  function ensureData(cb) {
    try {
      if (window.akLoad) { window.akLoad("usefulJudgementsData"); window.akLoad("handwrittenNotesData"); window.akLoad("legalDraftsData"); }
    } catch (e) {}
    if (dataReady()) { cb(); return; }
    var done = false;
    function onAk() { if (!done && dataReady()) { done = true; cb(); } }
    document.addEventListener("ak-data", onAk);
    setTimeout(function () { if (!done) { done = true; cb(); } }, 4000);
  }
  var currentTopic = null, currentReport = null;
  function renderReport(topic) {
    currentTopic = topic;
    var box = document.getElementById("llReportOut");
    if (!box) return;
    var rep = gather(topic);
    currentReport = rep;
    var l = lang();
    var h = "";
    h += "<h3>" + esc(topic.en) + " · " + esc(topic.hi) + "</h3>";
    h += "<p class=\"ll-rep-meta\">Sections · धाराएँ: " + esc(topic.sections.join(" · ")) + "</p>";
    h += "<p class=\"ll-rep-meta\">" + rep.judgments.length + " judgements · " + rep.notes.length + " notes · " + rep.drafts.length + " drafts — " +
      (l === "hi" ? "केवल सत्यापित धारा-मिलान दिखाए गए हैं।" : "Only verified section matches are shown.") + "</p>";
    function group(titleEn, titleHi, items, kind) {
      if (!items.length) return "";
      var g = "<h4>" + esc(titleEn) + " · " + esc(titleHi) + " (" + items.length + ")</h4><ul class=\"ll-rep-list\">";
      items.forEach(function (it, i) {
        var nm = esc(it.name || it.titleEn) + (it.nameHi || it.titleHi ? " / " + esc(it.nameHi || it.titleHi) : "");
        var sub = it.cit ? " — " + esc(it.cit) : "";
        g += "<li><span>" + nm + sub + "</span> <span class=\"ll-rep-secs\">" + esc(it.secs.join(" · ")) + "</span> " +
          "<button type=\"button\" class=\"ll-rep-go\" data-kind=\"" + kind + "\" data-idx=\"" + i + "\">" + (l === "hi" ? "खोलें ↗" : "Open ↗") + "</button></li>";
      });
      return g + "</ul>";
    }
    h += group("Judgements", "निर्णय", rep.judgments, "judgment");
    h += group("Study notes", "अध्ययन नोट्स", rep.notes, "note");
    h += group("Drafts", "प्रारूप", rep.drafts, "draft");
    if (!rep.judgments.length && !rep.notes.length && !rep.drafts.length) {
      h += "<p>" + (l === "hi" ? "इस विषय के लिए कोई सत्यापित मिलान नहीं मिला।" : "No verified matches found for this topic.") + "</p>";
    }
    h += "<p class=\"ll-rep-note\">" + (l === "hi"
      ? "संक्षिप्त विवरण अध्ययन के लिए हैं, कानूनी सलाह नहीं। हमेशा मूल अधिनियम से जाँच करें।"
      : "Summaries are for study only, not legal advice. Always verify with the bare Act.") + "</p>";
    box.innerHTML = h;
    box.querySelectorAll(".ll-rep-go").forEach(function (b) {
      b.addEventListener("click", function () {
        var kind = b.getAttribute("data-kind"), idx = parseInt(b.getAttribute("data-idx"), 10);
        var j = llJump();
        if (kind === "judgment") j.judgment(rep.judgments[idx].name);
        else if (kind === "note") { var n = rep.notes[idx]; j.note(n.subj, n.ti, n.titleEn); }
        else if (kind === "draft") j.draft(rep.drafts[idx].id);
      });
    });
    var pr = document.getElementById("llReportPrint");
    if (pr) pr.disabled = false;
  }
  function printReport() {
    if (!currentTopic || !currentReport) return;
    var t = currentTopic, r = currentReport;
    var html = "<html><head><meta charset=\"utf-8\"><title>" + esc(t.en) + " — Research Report</title></head><body style=\"font-family:system-ui,sans-serif;line-height:1.6\">";
    html += "<h1>" + esc(t.en) + " · " + esc(t.hi) + "</h1><p>Sections: " + esc(t.sections.join(" · ")) + "</p>";
    function grp(title, items, fmt) {
      if (!items.length) return "";
      var g = "<h2>" + title + " (" + items.length + ")</h2><ul>";
      items.forEach(function (it) { g += "<li>" + fmt(it) + "</li>"; });
      return g + "</ul>";
    }
    html += grp("Judgements", r.judgments, function (it) { return esc(it.name) + (it.cit ? " — " + esc(it.cit) : "") + " [" + esc(it.secs.join(", ")) + "]"; });
    html += grp("Study notes", r.notes, function (it) { return esc(it.titleEn) + " [" + esc(it.secs.join(", ")) + "]"; });
    html += grp("Drafts", r.drafts, function (it) { return esc(it.titleEn) + " [" + esc(it.secs.join(", ")) + "]"; });
    html += "<p><small>Study only, not legal advice. Always verify with the bare Act.</small></p></body></html>";
    var w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(function () { try { w.print(); } catch (e) {} }, 400);
  }
  function resolveInput(raw) {
    var q = String(raw || "").trim().toLowerCase();
    if (!q) return null;
    for (var i = 0; i < TOPICS.length; i++) {
      if (q === TOPICS[i].en.toLowerCase() || q === TOPICS[i].hi.toLowerCase()) return TOPICS[i];
    }
    var m = q.match(/^([a-z]+)\s+(\d+[a-z]?)$/) || q.match(/^(\d+[a-z]?)\s+([a-z]+)$/);
    if (m) {
      var fam, num;
      if (/^\d/.test(m[1])) { num = m[1]; fam = m[2]; } else { fam = m[1]; num = m[2]; }
      fam = fam.toUpperCase();
      if (fam === "CRPC") fam = "CRPC";
      var key = fam + ":" + num;
      return { id: "section:" + key, en: key, hi: key, sections: [key] };
    }
    return { id: "__nomatch__", en: raw, hi: raw, sections: [] };
  }
  function boot() {
    var list = document.getElementById("llTopicList");
    if (list) {
      TOPICS.forEach(function (t) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "vocab-cat ll-topic-btn";
        b.textContent = t.en + " · " + t.hi;
        b.addEventListener("click", function () {
          var out = document.getElementById("llReportOut");
          if (out) out.innerHTML = "<p>Loading… / लोड हो रहा है…</p>";
          ensureData(function () { renderReport(t); });
        });
        list.appendChild(b);
      });
    }
    var form = document.getElementById("llReportForm");
    if (form) form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var inp = document.getElementById("llReportInput");
      var topic = resolveInput(inp ? inp.value : "");
      var out = document.getElementById("llReportOut");
      if (!topic) { if (inp) inp.focus(); return; }
      if (topic.id === "__nomatch__") {
        if (out) out.innerHTML = "<p>" + (lang() === "hi"
          ? "इस विषय के लिए कोई सत्यापित रिपोर्ट नहीं है। कृपया ऊपर दी गई सूची से कोई विषय चुनें, या कोई धारा लिखें (जैसे BNSS 483)।"
          : "No verified report exists for that input. Please pick a topic from the list above, or type a section (e.g. BNSS 483).") + "</p>";
        return;
      }
      if (out) out.innerHTML = "<p>Loading… / लोड हो रहा है…</p>";
      ensureData(function () { renderReport(topic); });
    });
    var pr = document.getElementById("llReportPrint");
    if (pr) { pr.disabled = true; pr.addEventListener("click", printReport); }
    document.addEventListener("ak-data", function () {
      if (currentTopic && document.getElementById("llReportOut") && document.getElementById("llReportOut").innerHTML) {
        /* Re-render only if a report is already on screen and data just arrived. */
        try { renderReport(currentTopic); } catch (e) {}
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
