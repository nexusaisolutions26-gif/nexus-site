/*
 * Nexus AI Solutions - Affiliate click tracking.
 * Loaded on every public page. Captures ?ref=<ID> from the URL and persists
 * it in localStorage for 90 days. When the user clicks any link.fastpaydirect
 * Stripe URL, this injects utm_content=aff_<ID> so the payment_poller can
 * credit the affiliate when the transaction completes.
 */
(function () {
  var KEY = "nexus_ref";
  var TTL_DAYS = 90;

  function get() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed.id || !parsed.exp) return null;
      if (Date.now() > parsed.exp) {
        localStorage.removeItem(KEY);
        return null;
      }
      return parsed.id;
    } catch (e) { return null; }
  }

  function set(id) {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        id: id,
        exp: Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000,
      }));
    } catch (e) { /* swallow */ }
  }

  // 1. Capture ?ref=ID from URL on landing
  try {
    var qs = new URLSearchParams(window.location.search);
    var refId = qs.get("ref");
    if (refId) {
      // Validate: lowercase alphanumeric, max 20 chars
      if (/^[a-z0-9]{1,20}$/.test(refId.toLowerCase())) {
        set(refId.toLowerCase());
      }
    }
  } catch (e) { /* swallow */ }

  // 2. On click of any Stripe payment link, append utm_content=aff_<ID>
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href*='link.fastpaydirect.com']");
    if (!a) return;
    var refId = get();
    if (!refId) return;
    try {
      var url = new URL(a.href);
      // Don't overwrite an existing utm_content (in case page already set one)
      if (!url.searchParams.get("utm_content")) {
        url.searchParams.set("utm_content", "aff_" + refId);
        a.href = url.toString();
      } else if (!url.searchParams.get("utm_content").startsWith("aff_")) {
        // Existing UTM content is non-affiliate; preserve original by appending suffix
        url.searchParams.set("utm_content", url.searchParams.get("utm_content") + "_aff_" + refId);
        a.href = url.toString();
      }
    } catch (e) { /* swallow */ }
  }, true);
})();
