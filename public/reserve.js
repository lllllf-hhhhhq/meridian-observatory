/* ============================================================
   Meridian — the reservation desk
   Client-side validation, then a POST to the /api/reserve
   function that writes the confirmation through the mail relay.
   Nothing is claimed as sent unless the desk answered.
   ============================================================ */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var form = document.getElementById("reserve-form");
  if (!form) return;

  var success = document.getElementById("reserve-success");
  var again = document.getElementById("reserve-again");
  var formError = document.getElementById("form-error");
  var submitBtn = document.getElementById("res-submit");

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  var FIELDS = {
    date:  { el: document.getElementById("res-date"),  msg: "Choose the evening you would like to attend." },
    time:  { el: document.getElementById("res-time"),  msg: "Choose a session time." },
    party: { el: document.getElementById("res-party"), msg: "Choose how many guests are coming, from 1 to 6." },
    email: { el: document.getElementById("res-email"), msg: "Add an email address we can confirm to." }
  };

  function errorSlot(field) {
    var holder = field.el.closest(".field");
    var slot = holder.querySelector(".field-error");
    if (!slot) {
      slot = document.createElement("p");
      slot.className = "field-error";
      slot.id = "err-" + field.el.id;
      holder.appendChild(slot);
    }
    return slot;
  }

  function validateOne(key, override) {
    var field = FIELDS[key];
    var v = (field.el.value || "").trim();
    var msg = "";

    if (key === "email") {
      if (!v) msg = field.msg;
      else if (!EMAIL_RE.test(v)) msg = "That address looks incomplete. Check for a missing @ or domain.";
    } else if (key === "party") {
      if (!v) msg = field.msg;
      else if (+v < 1 || +v > 6) msg = "Parties are between 1 and 6 guests.";
    } else if (!v) {
      msg = field.msg;
    }

    if (!msg && override) msg = override;

    var slot = errorSlot(field);
    var helpId = field.el.getAttribute("aria-describedby") || "";

    if (msg) {
      slot.textContent = msg;
      field.el.classList.add("is-invalid");
      field.el.setAttribute("aria-invalid", "true");
      if (helpId.indexOf(slot.id) === -1) {
        field.el.setAttribute("aria-describedby", (helpId + " " + slot.id).trim());
      }
      return false;
    }

    slot.textContent = "";
    field.el.classList.remove("is-invalid");
    field.el.removeAttribute("aria-invalid");
    field.el.setAttribute("aria-describedby",
      helpId.split(" ").filter(function (id) { return id && id !== slot.id; }).join(" "));
    return true;
  }

  function validateAll() {
    var bad = [];
    Object.keys(FIELDS).forEach(function (key) {
      if (!validateOne(key)) bad.push(key);
    });
    return bad;
  }

  Object.keys(FIELDS).forEach(function (key) {
    var el = FIELDS[key].el;
    var revalidate = function () { if (el.classList.contains("is-invalid")) validateOne(key); };
    el.addEventListener("change", revalidate);
    el.addEventListener("blur", revalidate);
    el.addEventListener("input", revalidate);
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    formError.hidden = true;

    var bad = validateAll();
    if (bad.length) {
      formError.textContent = bad.length === 1
        ? "One field needs your attention before we can hold a place."
        : "A few fields need your attention before we can hold a place.";
      formError.hidden = false;
      FIELDS[bad[0]].el.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Holding your place\u2026";

    var payload = {
      date: FIELDS.date.el.value,
      time: FIELDS.time.el.value,
      party: FIELDS.party.el.value,
      email: FIELDS.email.el.value.trim()
    };

    fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (data) { return { status: res.status, data: data }; })
        .catch(function () { return { status: res.status, data: {} }; });
    }).then(function (out) {
      if (out.status === 422 && out.data.field && FIELDS[out.data.field]) {
        validateOne(out.data.field, out.data.message);
        formError.textContent = "A few fields need your attention before we can hold a place.";
        formError.hidden = false;
        FIELDS[out.data.field].el.focus();
        return;
      }
      if (!out.data.ok) {
        formError.textContent = out.data.message ||
          "The reservation desk did not answer. Try again in a moment.";
        formError.hidden = false;
        return;
      }
      showHeld();
    }).catch(function () {
      formError.textContent =
        "We could not reach the reservation desk. Check your connection and try again.";
      formError.hidden = false;
    }).then(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = "Reserve a session";
    });
  });

  function showHeld() {
    var d = FIELDS.date.el;
    var t = FIELDS.time.el;
    var p = FIELDS.party.el;
    var m = FIELDS.email.el;
    var addr = m.value.trim();

    document.getElementById("recap-date").textContent = d.options[d.selectedIndex].textContent;
    document.getElementById("recap-time").textContent = t.value;
    document.getElementById("recap-party").textContent =
      p.value + (p.value === "1" ? " guest" : " guests");
    document.getElementById("recap-email").textContent = addr;

    document.getElementById("success-body").textContent =
      "A confirmation is on its way to " + addr + ". Bring it to the door; " +
      "the session begins promptly and the instruments come out of their cases first.";

    form.hidden = true;
    success.hidden = false;
    success.querySelector(".success-title").focus();
  }

  again.addEventListener("click", function () {
    form.reset();
    Object.keys(FIELDS).forEach(function (key) {
      var field = FIELDS[key];
      field.el.classList.remove("is-invalid");
      field.el.removeAttribute("aria-invalid");
      var slot = field.el.closest(".field").querySelector(".field-error");
      if (slot) slot.textContent = "";
    });
    formError.hidden = true;
    success.hidden = true;
    form.hidden = false;
    FIELDS.date.el.focus();
  });
})();
