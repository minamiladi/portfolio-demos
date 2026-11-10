/* The page Stripe sends the patient back to. It asks OUR server (which asks Stripe) whether the deposit was paid: the address
   alone proves nothing. When the booking is confirmed it sends the GA4 'purchase' event ONCE per booking (a reload sends nothing). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var id = new URLSearchParams(location.search).get('booking') || '';
  var tries = 0;

  function set(cls, title, text) { $('title').textContent = title; $('state').className = 'msg ' + cls; $('state').textContent = text; }
  function api(path, opts) { return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; }); }); }
  function pounds(p) { return '£' + (p / 100).toFixed(2); }

  function sentBefore() {
    try { return !!localStorage.getItem('lark_purchase_' + id); } catch (e) { return window.__larkSent === id; }
  }
  function markSent() {
    window.__larkSent = id;
    try { localStorage.setItem('lark_purchase_' + id, String(Date.now())); } catch (e) { /* storage blocked: only this page view is protected */ }
  }

  function confirmed(b) {
    Promise.all([api('/api/services'), api('/api/config')]).then(function (rs) {
      var svc = (rs[0].body.services || []).filter(function (s) { return s.id === b.service; })[0] || { name: b.service };
      var cfg = rs[1].body || {}, ph = (cfg.physios || {})[b.practitioner] || { name: b.practitioner };
      set('ok', 'Your appointment is confirmed', 'Thank you! We have emailed your confirmation. See you soon.');
      var facts = $('facts'); facts.textContent = '';
      var day = new Date(b.start.substr(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
      [['Treatment', svc.name], ['Physio', ph.name], ['Date', day], ['Time', b.start.substr(11, 5) + ' (UK time)'], ['Deposit paid', pounds(b.deposit_pence)], ['Reference', b.booking_id]].forEach(function (r) {
        var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1]; facts.appendChild(dt); facts.appendChild(dd);
      });
      facts.hidden = false; $('more').hidden = false;
      if (!sentBefore() && window.LarkTrack) {
        markSent();
        var params = { transaction_id: b.booking_id, value: b.deposit_pence / 100, currency: 'GBP',
                       items: [{ item_id: b.service, item_name: svc.name, item_variant: b.practitioner, item_category: 'deposit', price: b.deposit_pence / 100, quantity: 1 }] };
        window.LarkTrack.event('purchase', params);
      }
    });
  }

  function check() {
    tries++;
    api('/api/bookings/' + encodeURIComponent(id) + '/sync', { method: 'POST' }).then(function (r) {
      var st = r.body && r.body.status;
      if (r.status === 404) { set('err', 'We could not find this booking', 'We could not find this booking. If you paid, please call us on 0117 496 0418.'); return; }
      if (st === 'confirmed') { return api('/api/bookings/' + encodeURIComponent(id)).then(function (g) { confirmed(g.body); }); }
      if (st === 'released' || st === 'conflict_refunded') {
        set('err', st === 'released' ? 'Your time was not held' : 'That time was taken', st === 'released'
          ? 'Your payment did not arrive in time, so the time has been released. Please book again.'
          : 'Sorry: that time was taken just before your payment arrived. Your deposit is being refunded. Please book another time.');
        return;
      }
      if (st === 'cancelled') { set('err', 'Booking cancelled', 'This booking has been cancelled.'); return; }
      if (tries < 30) { set('ok', 'Checking your payment', 'We are waiting for your payment to arrive...'); setTimeout(check, 2500); }
      else { set('err', 'Still waiting', 'Your payment is taking longer than usual. You will get an email when it arrives. Reference: ' + id + '. Or call us on 0117 496 0418.'); }
    }).catch(function () {
      if (tries < 30) { setTimeout(check, 3000); } else { set('err', 'We could not check your booking', 'We could not check your booking. Reference: ' + id + '. Please call us on 0117 496 0418.'); }
    });
  }

  if (!id) { set('err', 'No booking given', 'No booking was given. If you paid, please call us on 0117 496 0418.'); } else { check(); }
})();
