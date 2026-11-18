/* The one sign-up form every page on appsbyadam.app uses (Max Sturtevant's checklist, G07/G08 + G15):
   a one-tap question, then the email, then (when texting is on) the phone; one input per step; the offer is the
   biggest thing; a "No thanks" text button, no corner x (unless a test tries one); full screen on phones, no picture
   there; shown after 6 s, then not again for 7 days on that page after a close or a sign-up. [data-signup] opens it.
   Settings: <script type="application/json" id="signup-cfg"> on the page (built from site.json):
   {list, name, ask, answers:[[key,label]...], offer, sub, button, done, done_sub, image, colors, delay, type, close,
    sms:{ask, sub, button, skip, consent}, test:{id, variants:{a:{...overrides}, b:{...}}}}
   A/B test: each visitor gets one version for good (saved on the device); its keys override the settings above
   (offer, sub, button, ask, answers, type "classic" = no question, close "x", delay, image).
   Counts each step (visit, view, answer, email, phone, phone_skip, close1-3) to Keyword DMs /api/form-event: counts
   only, nothing about the person. Saves sign-ups to the Keyword DMs list; nothing is sent from here. */
(function () {
  var el = document.getElementById("signup-cfg"); if (!el) return;
  var c = JSON.parse(el.textContent), API = "https://keyword-dms-08203886.base44.app/api/";
  var KEY = "aba_form_" + c.list, who = "", d = document, variant = "base", store = null;
  try { store = window.localStorage; } catch (e) {}
  if (c.test && c.test.variants) {   // sticky version for this visitor
    var ks = Object.keys(c.test.variants), tk = "aba_test_" + c.test.id, pick = null;
    try { pick = store && store.getItem(tk); } catch (e) {}
    if (ks.indexOf(pick) < 0) { pick = ks[Math.floor(Math.random() * ks.length)]; try { store && store.setItem(tk, pick); } catch (e) {} }
    var o = c.test.variants[pick] || {}; for (var k in o) c[k] = o[k];
    variant = c.test.id + "-" + pick;
  }
  function ping(ev) {
    var body = JSON.stringify({ list: c.list, event: ev, variant: variant });
    try { if (navigator.sendBeacon && navigator.sendBeacon(API + "form-event", new Blob([body], { type: "text/plain" }))) return; } catch (e) {}
    try { fetch(API + "form-event", { method: "POST", body: body, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }
  function h(tag, attrs, kids) { var e = d.createElement(tag); for (var k in attrs || {}) { if (k === "text") e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } (kids || []).forEach(function (x) { e.appendChild(x); }); return e; }
  function post(data) {
    data.list = c.list; data.variant = variant;
    return fetch(API + "signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || "failed"); }); });
  }
  function fail(box) { return function (x) { box.textContent = x && x.message && x.message !== "failed" && x.message.length < 80 ? x.message : "Something went wrong. Please try again."; }; }
  var col = c.colors || {}, shade = h("div", { class: "sf-shade", role: "dialog", "aria-modal": "true", "aria-labelledby": "sf-t1", hidden: "" });
  ["bg", "ink", "accent", "on", "mute"].forEach(function (k) { if (col[k]) shade.style.setProperty("--sf-" + k, col[k]); });
  var classic = c.type === "classic" || !c.ask, sms = c.sms || null, cur = 1, viewed = false, mail = "";
  var picks = (c.answers || []).map(function (a) { var b = h("button", { class: "sf-pick", type: "button", text: a[1] }); b.onclick = function () { who = a[0]; ping("answer"); show(2); setTimeout(function () { email.focus(); }, 50); }; return b; });
  var email = h("input", { type: "email", placeholder: "you@email.com", autocomplete: "email", required: "", "aria-label": "Your email" });
  var trap = h("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off", class: "sf-trap", "aria-hidden": "true" });
  var err = h("p", { class: "sf-err", role: "alert" }), go = h("button", { class: "sf-go", type: "submit", text: c.button || "Send it to me" });
  var form = h("form", { novalidate: "" }, [email, trap, err, go]);
  function no(t) { var b = h("button", { class: "sf-no", type: "button", text: t }); b.onclick = close; return b; }
  var s1 = h("div", { class: "sf-step" }, [h("p", { class: "sf-ask", id: "sf-t1", text: c.ask || "" })].concat(picks, [no("No thanks")]));
  var s2 = h("div", { class: "sf-step" }, [h("p", { class: "sf-offer", id: classic ? "sf-t1" : null, text: c.offer }), h("p", { class: "sf-sub", text: c.sub }), form, no("No thanks, close")]);
  if (classic) s1.firstChild.removeAttribute("id"); else s2.firstChild.removeAttribute("id");
  var back = h("button", { class: "sf-go", type: "button", text: "Back to the page" }); back.onclick = close;
  var s3 = h("div", { class: "sf-step" }, [h("p", { class: "sf-offer sf-small", text: c.done || "Check your inbox" }), h("p", { class: "sf-sub", text: c.done_sub || "" }), back]);
  var steps = [s1, s2, s3], phone = null;
  if (sms) {   // the text step (Max: email first, then "finish by adding your number"); box starts unticked
    phone = h("input", { type: "tel", placeholder: "(555) 555-0123", autocomplete: "tel", inputmode: "tel", "aria-label": "Your mobile number" });
    var tick = h("input", { type: "checkbox", id: "sf-ok" }), perr = h("p", { class: "sf-err", role: "alert" });
    var pgo = h("button", { class: "sf-go", type: "submit", text: sms.button || "Text me" });
    var pform = h("form", { novalidate: "" }, [phone, h("label", { class: "sf-consent", for: "sf-ok" }, [tick, h("span", { text: sms.consent })]), perr, pgo]);
    var skip = h("button", { class: "sf-no", type: "button", text: sms.skip || "No thanks, email is fine" });
    skip.onclick = function () { ping("phone_skip"); show(4); back.focus(); };
    pform.onsubmit = function (e) {
      e.preventDefault();
      if (phone.value.replace(/\D/g, "").length < 10) { perr.textContent = "Please enter a US mobile number."; return; }
      if (!tick.checked) { perr.textContent = "Tick the box to get texts."; return; }
      perr.textContent = ""; pgo.disabled = true;
      post({ email: mail, phone: phone.value, consent: true, step: "phone", answer: who || "other" })
        .then(function () { ping("phone"); show(4); back.focus(); }, fail(perr)).then(function () { pgo.disabled = false; });
    };
    steps.splice(2, 0, h("div", { class: "sf-step" }, [h("p", { class: "sf-offer sf-small", text: sms.ask || "Want it by text too?" }), h("p", { class: "sf-sub", text: sms.sub || "" }), pform, skip]));
  }
  var dots = h("div", { class: "sf-dots", "aria-hidden": "true" }, steps.slice(classic ? 1 : 0, -1).map(function () { return h("i"); }));
  var side = h("div", { class: "sf-side" }, [dots].concat(steps));
  var kids = c.image ? [h("div", { class: "sf-pic", style: "background-image:url('" + c.image + "')", "aria-hidden": "true" }), side] : [side];
  if (c.close === "x") { var x = h("button", { class: "sf-x", type: "button", "aria-label": "Close", text: "×" }); x.onclick = close; kids.push(x); }
  var box = h("div", { class: "sf-box" + (c.image ? "" : " sf-nopic") }, kids);
  shade.appendChild(box); d.body.appendChild(shade);
  function show(n) { cur = n; steps.forEach(function (s, i) { s.hidden = i !== n - 1; }); var off = classic ? 2 : 1; [].forEach.call(dots.children, function (dt, i) { dt.className = i + off <= n ? "on" : ""; }); }
  function seen() { try { store && store.setItem(KEY, Date.now()); } catch (e) {} }
  function open() { if (!shade.hidden) return; last = d.activeElement; if (!viewed) { viewed = true; ping("view"); } show(who || classic ? 2 : 1); shade.hidden = false; d.documentElement.classList.add("sf-open"); (cur === 2 ? email : picks[0] || email).focus(); }
  var last = null, done = steps.length;
  function close() { if (shade.hidden) return; if (cur < done) ping("close" + cur); /* close1 = question, close2 = email, close3 = phone */ shade.hidden = true; d.documentElement.classList.remove("sf-open"); seen(); if (last && last.focus) last.focus(); }
  shade.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  shade.addEventListener("click", function (e) { if (e.target === shade) close(); });
  form.onsubmit = function (e) {
    e.preventDefault(); var v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { err.textContent = "That email doesn't look right."; return; }
    err.textContent = ""; go.disabled = true; go.classList.add("busy");
    post({ email: v, answer: who || "other", website: trap.value })
      .then(function () { mail = v; seen(); ping("email"); show(3); (phone || back).focus(); }, fail(err))
      .then(function () { go.disabled = false; go.classList.remove("busy"); });
  };
  d.querySelectorAll("[data-signup]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); open(); }); });
  ping("visit");
  var recent = false; try { recent = Date.now() - (+(store && store.getItem(KEY)) || 0) < 7 * 864e5; } catch (e) {}
  if (/[?&]form=now/.test(location.search)) open(); else if (!recent && c.delay !== 0) setTimeout(open, c.delay || 6000);
})();
