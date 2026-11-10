/* Google Analytics 4 for the booking pages.
   - The Measurement ID comes from the server (GA4_MEASUREMENT_ID). Empty = no tag is loaded and nothing is sent.
   - No personal data is ever sent: no name, email, phone, free text, no health information (the reason for the visit), and no query string
     (page_location and page_referrer are addresses without ?..., on the page view and on every event).
   - LarkTrack.event(name, params, done): sends one event. With `done` (used when the patient is about to be sent to Stripe) the event
     is sent with transport_type 'beacon', and done() is called when Google's tag says it has sent it, or after 2 seconds at the latest. */
(function () {
  'use strict';
  var queue = [], id = '', ready = false, sent = [];
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  function cleanLocation() { return location.origin + location.pathname; }
  function cleanReferrer() {
    try { var r = new URL(document.referrer); return r.origin + r.pathname; } catch (e) { return ''; }
  }

  function send(item) {
    var params = {};
    Object.keys(item.params || {}).forEach(function (k) { params[k] = item.params[k]; });
    sent.push({ name: item.name, params: item.params || {}, t: Date.now() });
    params.page_location = cleanLocation();                    /* every event carries the address without ?... (the booking number is in the query) */
    if (item.done) {
      var finished = false;
      var finish = function () { if (!finished) { finished = true; item.done(); } };
      params.transport_type = 'beacon';
      params.event_callback = finish;
      setTimeout(finish, 2000);
    }
    window.gtag('event', item.name, params);
  }

  function flush() {
    ready = true;
    while (queue.length) { send(queue.shift()); }
  }

  function giveUp() {
    ready = true;
    queue.splice(0).forEach(function (q) { if (q.done) { q.done(); } });
  }

  window.LarkTrack = {
    event: function (name, params, done) {
      var item = { name: name, params: params, done: done };
      if (!ready) { queue.push(item); return; }
      if (id) { send(item); } else if (done) { done(); }
    },
    sent: sent
  };

  fetch('/api/config', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) {
    id = (c && c.ga4_measurement_id) || '';
    if (!id) { giveUp(); return; }
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', id, { page_location: cleanLocation(), page_referrer: cleanReferrer(), send_page_view: true });
    flush();
  }).catch(giveUp);
})();
