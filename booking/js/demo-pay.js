/* DEMO ONLY: the neutral payment step that stands in for Stripe's checkout in this static demo. Nothing is charged or sent. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var id = new URLSearchParams(location.search).get('booking') || '';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function money(p) { return '£' + Math.floor(p / 100) + '.' + ('0' + p % 100).slice(-2); }
  function longDay(iso) { var t = new Date(iso.slice(0, 10) + 'T12:00:00Z'); return DAYS[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + MONTHS[t.getUTCMonth()] + ' ' + t.getUTCFullYear(); }
  function say(cls, text) { $('state').className = 'msg ' + cls; $('state').textContent = text; }
  function ended(text) { say('err', text); $('actions').hidden = true; $('again').hidden = false; }
  Promise.all([LKDemo.load('services.json'), LKDemo.load('config.json')]).then(function (rs) {
    var b = LKDemo.booking(id);
    if (!b) { ended('This demo booking is not in this browser tab. Please start again from the booking page.'); return; }
    var svc = rs[0].services.filter(function (s) { return s.id === b.service; })[0], ph = rs[1].physios[b.practitioner];
    var facts = $('facts'); facts.textContent = '';
    [['Treatment', svc.name], ['Physio', ph.name], ['Date', longDay(b.start)], ['Time', b.start.slice(11, 16) + ' (UK time)'], ['Deposit', money(b.deposit_pence)]].forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = r[0]; dd.textContent = r[1]; facts.appendChild(dt); facts.appendChild(dd);
    });
    facts.hidden = false;
    if (b.status === 'confirmed') { ended('This demo booking is already paid.'); return; }
    if (b.status !== 'held') { ended('The 15 minutes for this hold are over, so the time is free again. Please book again.'); return; }
    $('pay').textContent = 'Simulate a successful test payment of ' + money(b.deposit_pence);
    $('back').href = 'cancelled.html?booking=' + encodeURIComponent(id);
    $('actions').hidden = false;
    say('ok', 'Your time is held for ' + rs[1].hold_minutes + ' minutes while you pay.');
    $('pay').addEventListener('click', function () {
      var st = LKDemo.pay(id);
      if (st === 'confirmed') { location.href = 'success.html?booking=' + encodeURIComponent(id); }
      else { ended('The 15 minutes for this hold are over, so the time is free again. Please book again.'); }
    });
  });
})();
