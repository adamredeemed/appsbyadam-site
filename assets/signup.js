/* The one sign-up form every page on appsbyadam.app uses (Max Sturtevant's checklist, G07/G08 + G15):
   a one-tap question, then the email; one input per step; the offer is the biggest thing; a "No thanks" text button,
   no corner x; full screen on phones, no picture there; shown after 6 s, then not again for 7 days on that page
   after a close or a sign-up. Buttons with [data-signup] open it any time.
   Settings come from <script type="application/json" id="signup-cfg"> on the page (built from site.json):
   {list, name, ask, answers:[[key,label]...], offer, sub, button, done, done_sub, image, colors:{bg,ink,accent,on,mute}}
   It saves to the Keyword DMs list (one Lead row per email per list); nothing is sent from here. */
(function () {
  var el = document.getElementById("signup-cfg"); if (!el) return;
  var c = JSON.parse(el.textContent), URL = "https://keyword-dms-08203886.base44.app/api/signup";
  var KEY = "aba_form_" + c.list, who = "", d = document;
  function h(tag, attrs, kids) { var e = d.createElement(tag); for (var k in attrs || {}) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } (kids || []).forEach(function (x) { e.appendChild(x); }); return e; }
  var col = c.colors || {}, shade = h("div", { class: "sf-shade", role: "dialog", "aria-modal": "true", "aria-labelledby": "sf-t1", hidden: "" });
  ["bg", "ink", "accent", "on", "mute"].forEach(function (k) { if (col[k]) shade.style.setProperty("--sf-" + k, col[k]); });
  var picks = (c.answers || []).map(function (a) { var b = h("button", { class: "sf-pick", type: "button", text: a[1] }); b.onclick = function () { who = a[0]; show(2); setTimeout(function () { email.focus(); }, 50); }; return b; });
  var email = h("input", { type: "email", placeholder: "you@email.com", autocomplete: "email", required: "", "aria-label": "Your email" });
  var trap = h("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", class: "sf-trap", "aria-hidden": "true" });
  var err = h("p", { class: "sf-err", role: "alert" }), go = h("button", { class: "sf-go", type: "submit", text: c.button || "Send it to me" });
  var form = h("form", { novalidate: "" }, [email, trap, err, go]);
  function no(t) { var b = h("button", { class: "sf-no", type: "button", text: t }); b.onclick = close; return b; }
  var s1 = h("div", { class: "sf-step" }, [h("p", { class: "sf-ask", id: "sf-t1", text: c.ask })].concat(picks, [no("No thanks")]));
  var s2 = h("div", { class: "sf-step" }, [h("p", { class: "sf-offer", text: c.offer }), h("p", { class: "sf-sub", text: c.sub }), form, no("No thanks, close")]);
  var back = h("button", { class: "sf-go", type: "button", text: "Back to the page" }); back.onclick = close;
  var s3 = h("div", { class: "sf-step" }, [h("p", { class: "sf-offer sf-small", text: c.done || "Check your inbox" }), h("p", { class: "sf-sub", text: c.done_sub || "" }), back]);
  var dots = h("div", { class: "sf-dots", "aria-hidden": "true" }, [h("i"), h("i")]);
  var side = h("div", { class: "sf-side" }, [dots, s1, s2, s3]);
  var box = h("div", { class: "sf-box" + (c.image ? "" : " sf-nopic") }, c.image ? [h("div", { class: "sf-pic", style: "background-image:url('" + c.image + "')", "aria-hidden": "true" }), side] : [side]);
  shade.appendChild(box); d.body.appendChild(shade);
  var steps = [s1, s2, s3], last = null;
  function show(n) { steps.forEach(function (s, i) { s.hidden = i !== n - 1; }); dots.children[0].className = "on"; dots.children[1].className = n >= 2 ? "on" : ""; }
  function seen() { try { localStorage.setItem(KEY, Date.now()); } catch (e) {} }
  function open() { if (!shade.hidden) return; last = d.activeElement; show(who ? 2 : 1); shade.hidden = false; d.documentElement.classList.add("sf-open"); (who ? email : picks[0] || email).focus(); }
  function close() { shade.hidden = true; d.documentElement.classList.remove("sf-open"); seen(); if (last && last.focus) last.focus(); }
  shade.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  shade.addEventListener("click", function (e) { if (e.target === shade) close(); });
  form.onsubmit = function (e) {
    e.preventDefault(); var v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { err.textContent = "That email doesn't look right."; return; }
    err.textContent = ""; go.disabled = true; go.classList.add("busy");
    fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ list: c.list, email: v, answer: who || "other", website: trap.value }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || "failed"); }); })
      .then(function () { seen(); show(3); back.focus(); })
      .catch(function (x) { err.textContent = x && x.message && x.message !== "failed" && x.message.length < 80 ? x.message : "Something went wrong. Please try again."; })
      .then(function () { go.disabled = false; go.classList.remove("busy"); });
  };
  d.querySelectorAll("[data-signup]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
  var recent = false; try { recent = Date.now() - (+localStorage.getItem(KEY) || 0) < 7 * 864e5; } catch (e) {}
  if (/[?&]form=now/.test(location.search)) open(); else if (!recent && c.delay !== 0) setTimeout(open, c.delay || 6000);
})();
