/* The cancel link in the confirmation email: .../booking/cancel.html?booking=<id>&token=<token>. No analytics on this page (the address holds a secret token). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var q = new URLSearchParams(location.search), id = q.get('booking') || '', token = q.get('token') || '';
  var cfg = null, booking = null;

  function set(cls, text) { $('state').className = 'msg ' + cls; $('state').textContent = text; }
  function api(path, opts) { return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; }); }); }

  function show() {
    var day = new Date(booking.start.substr(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    var facts = $('facts'); facts.textContent = '';
    [['Treatment', booking.serviceName], ['Physio', booking.physioName], ['Date', day], ['Time', booking.start.substr(11, 5) + ' (UK time)'], ['Deposit paid', '£' + (booking.deposit_pence / 100).toFixed(2)]].forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1]; facts.appendChild(dt); facts.appendChild(dd);
    });
    facts.hidden = false;
    var hoursLeft = (new Date(booking.start) - new Date(cfg.now)) / 3600000;
    var rule = $('rule');
    rule.textContent = hoursLeft >= cfg.full_refund_hours
      ? 'You are cancelling at least ' + cfg.full_refund_hours + ' hours before your appointment, so we will refund your deposit in full.'
      : 'Your appointment is less than ' + cfg.full_refund_hours + ' hours away, so if you cancel now we keep the deposit. If that is a problem, please call us.';
    rule.hidden = false;
    $('cancel').hidden = false;
  }

  $('cancel').addEventListener('click', function () {
    $('cancel').disabled = true;
    api('/api/bookings/' + encodeURIComponent(id) + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token }) }).then(function (r) {
      if (r.status === 200) {
        $('title').textContent = 'Your appointment is cancelled';
        set('ok', r.body.refund === 'full' ? 'Your appointment is cancelled and your deposit will be refunded in full. It can take a few days to reach your card.' : 'Your appointment is cancelled. We keep the deposit because it was less than 24 hours before the appointment.');
        $('cancel').hidden = true; $('rule').hidden = true;
      } else if (r.status === 403) { set('err', 'This cancel link is not right. Please use the link in your confirmation email, or call us on 0117 496 0418.'); $('cancel').disabled = false; }
      else if (r.status === 409) { set('err', 'This appointment cannot be cancelled online (it may already be cancelled, or it has started). Please call us on 0117 496 0418.'); $('cancel').hidden = true; }
      else { set('err', 'We could not cancel it just now. Please try again, or call us on 0117 496 0418.'); $('cancel').disabled = false; }
    }).catch(function () { set('err', 'We could not reach the booking system. Please try again.'); $('cancel').disabled = false; });
  });

  if (!id || !token) { set('err', 'This cancel link is incomplete. Please use the link in your confirmation email, or call us on 0117 496 0418.'); return; }
  Promise.all([api('/api/bookings/' + encodeURIComponent(id)), api('/api/services'), api('/api/config')]).then(function (rs) {
    if (rs[0].status !== 200) { set('err', 'We could not find this booking. Please call us on 0117 496 0418.'); return; }
    booking = rs[0].body; cfg = rs[2].body;
    var svc = (rs[1].body.services || []).filter(function (s) { return s.id === booking.service; })[0] || { name: booking.service };
    booking.serviceName = svc.name; booking.physioName = ((cfg.physios || {})[booking.practitioner] || {}).name || booking.practitioner;
    if (booking.status === 'cancelled') { set('ok', 'This appointment has already been cancelled.'); return; }
    if (booking.status !== 'confirmed') { set('err', 'This booking is not confirmed, so there is nothing to cancel.'); return; }
    set('ok', 'Please check the appointment below.');
    show();
  }).catch(function () { set('err', 'We could not reach the booking system. Please try again, or call us on 0117 496 0418.'); });
})();
