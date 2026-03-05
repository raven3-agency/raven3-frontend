(() => {
  const WORKER_URL = "https://raven3-newsletter.inforaven3.workers.dev";

  const form = document.getElementById("newsletter-form");
  const input = document.getElementById("newsletter-email");
  const btn = document.getElementById("newsletter-btn");
  const msg = document.getElementById("newsletter-msg");

  if (!form || !input || !btn || !msg) return;

  const escapeHtml = (str) =>
    String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m],
    );

  const normalizeEmail = (v) => v.trim().toLowerCase();

  const setIdle = () => {
    btn.disabled = false;
    btn.textContent = btn.dataset.idleText || "Subscribe";
    msg.textContent = "";
    input.readOnly = false;
    input.classList.remove("newsletter-success");
    btn.classList.remove("newsletter-bounce");
  };

  const setSending = () => {
    btn.disabled = true;
    btn.textContent = btn.dataset.sendingText || "Sending…";
    msg.textContent =
      msg.dataset.sendingText || "Processing subscription…";
  };

  const tpl = (template, vars) =>
    String(template).replace(/\{(\w+)\}/g, (_, k) =>
      k in vars ? vars[k] : "",
    );

  const setSuccess = (email, already) => {
    btn.disabled = true;
    btn.textContent = already
      ? btn.dataset.alreadyText || "Already subscribed ✓"
      : btn.dataset.successText || "Subscribed ✓";

    input.value = email;
    input.readOnly = true;

    input.classList.add("newsletter-success");
    btn.classList.add("newsletter-bounce");

    const safeEmail = escapeHtml(email);

    const fallback = already
      ? `Done: <strong>${safeEmail}</strong> was already subscribed.`
      : `Success: <strong>${safeEmail}</strong> has been subscribed.`;

    const template = already
      ? btn.dataset.alreadyMsg || msg.dataset.alreadyMsg
      : msg.dataset.successMsg;

    const html = template ? tpl(template, { email: safeEmail }) : fallback;

    msg.innerHTML = `
      <span class="newsletter-ok">
        <span class="newsletter-tick" aria-hidden="true">✓</span>
        <span>${html}</span>
      </span>
    `;
  };

  const setError = (text) => {
    btn.disabled = false;
    btn.textContent = btn.dataset.retryText || "Retry";
    msg.textContent =
      text ||
      msg.dataset.errorText ||
      "There was a problem. Please try again.";
  };

  setIdle();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (btn.disabled) return;

    const email = normalizeEmail(input.value);
    if (!email) return;

    setSending();

    try {
      const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setSuccess(email, !!data.already);
        return;
      }

      const message = data.message || "Subscription failed.";
      const details = typeof data.details === "string" ? data.details : "";
      setError(details ? `${message} (${details.slice(0, 140)})` : message);
    } catch {
      setError("Network error. Check your connection and try again.");
    }
  });

  window.raven3NewsletterReset = () => {
    input.value = "";
    setIdle();
  };
})();