/* The booking page: treatment -> physio and time -> details -> Stripe's payment page. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var cfg = null, services = [], service = null, chosen = null, busy = false, loadToken = 0;
  /* The reason for the visit is health information. It goes to our own server only (the front desk list): never to Google Analytics, never to HubSpot. */
  var REASONS = ['Back pain', 'Neck or shoulder pain', 'Knee', 'Hip', 'Foot or ankle', 'Sports injury', 'Recovery after surgery', 'Running or gait', 'Something else'];

  function pounds(p) { var v = p / 100; return '£' + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2)); }
  function track(name, params, done) { if (window.LarkTrack) { window.LarkTrack.event(name, params, done); } else if (done) { done(); } }
  function api(path, opts) {
    return fetch(path, opts).then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { status: r.status, body: b }; }); });
  }
  function show(el, on) { el.hidden = !on; }
  function notice(text) { var n = $('notice'); n.textContent = text || ''; show(n, !!text); if (text) { n.scrollIntoView({ block: 'nearest' }); } }
  function item(s, index) {
    return { item_id: s.id, item_name: s.name, item_list_id: 'treatments', item_list_name: 'Treatments', index: index, price: s.price_pence / 100, quantity: 1 };
  }
  function dayLabel(d) {
    var t = new Date(d + 'T12:00:00Z');
    return t.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
  function hhmm(iso) { return iso.substr(11, 5); }

  function renderServices() {
    var box = $('treatments');
    box.textContent = '';
    services.forEach(function (s, i) {
      var label = document.createElement('label'); label.className = 'choice';
      var radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'service'; radio.value = s.id;
      var span = document.createElement('span'); span.className = 'box';
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = s.name;
      var d1 = document.createElement('small'); d1.textContent = s.minutes + ' minutes · ' + pounds(s.price_pence);
      var d2 = document.createElement('small'); d2.textContent = 'Deposit to book: ' + pounds(s.deposit_pence);
      span.appendChild(nm); span.appendChild(d1); span.appendChild(d2); label.appendChild(radio); label.appendChild(span); box.appendChild(label);
      radio.addEventListener('change', function () {
        service = s; chosen = null;
        track('select_item', { item_list_id: 'treatments', item_list_name: 'Treatments', items: [item(s, i)] });
        setupPhysios(); findFirstDay(); update();
      });
    });
    track('view_item_list', { item_list_id: 'treatments', item_list_name: 'Treatments', items: services.map(item) });
  }

  function setupPhysios() {
    var sel = $('physio'), keep = sel.value;
    sel.textContent = '';
    var any = document.createElement('option'); any.value = ''; any.textContent = 'Any physio'; sel.appendChild(any);
    service.practitioners.forEach(function (p) {
      var o = document.createElement('option'); o.value = p; o.textContent = cfg.physios[p].name; sel.appendChild(o);
    });
    sel.value = service.practitioners.indexOf(keep) >= 0 ? keep : '';
    $('step-time').disabled = false;
  }

  function slotsFor(day) {
    var q = '/api/slots?service=' + encodeURIComponent(service.id) + '&date=' + encodeURIComponent(day) + ($('physio').value ? '&practitioner=' + encodeURIComponent($('physio').value) : '');
    return api(q).then(function (r) { return r.status === 200 ? (r.body.slots || []) : null; });
  }

  function addDays(d, n) { var t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().substr(0, 10); }

  /* the first day that has a free time, so the patient does not have to hunt for one */
  function findFirstDay() {
    var token = ++loadToken, day = $('date').value && $('date').value >= cfg.today ? $('date').value : cfg.today;
    $('times').textContent = ''; show($('no-times'), false);
    $('searching').hidden = false;
    (function next(tries) {
      if (token !== loadToken) { return; }
      if (day > cfg.last_bookable_date || tries > 45) {
        $('searching').hidden = true; $('date').value = cfg.today; renderTimes([]); return;
      }
      slotsFor(day).then(function (slots) {
        if (token !== loadToken) { return; }
        if (slots && slots.length) { $('searching').hidden = true; $('date').value = day; renderTimes(slots); return; }
        day = addDays(day, 1); next(tries + 1);
      });
    })(0);
  }

  function loadDay() {
    var token = ++loadToken, d = $('date').value;
    $('times').textContent = ''; show($('no-times'), false);
    if (!service || !d) { return; }
    slotsFor(d).then(function (slots) { if (token === loadToken) { renderTimes(slots || []); } });
  }

  function renderTimes(slots) {
    var t = $('times'); t.textContent = '';
    show($('no-times'), slots.length === 0 && !!service);
    var anyPhysio = !$('physio').value;
    slots.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'time';
      b.textContent = hhmm(s.start);
      if (anyPhysio) { var sm = document.createElement('small'); sm.textContent = cfg.physios[s.practitioner].name.split(' ')[0]; b.appendChild(sm); }
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        Array.prototype.forEach.call(t.children, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true'); chosen = s;
        track('select_slot', { item_id: service.id, physio: s.practitioner, slot_date: s.start.substr(0, 10), slot_time: hhmm(s.start) });
        update();
      });
      t.appendChild(b);
    });
  }

  function valid() {
    return service && chosen && $('name').value.trim() && /^\S+@\S+\.\S{2,}$/.test($('email').value.trim()) && $('phone').value.replace(/\D/g, '').length >= 7 && !/[^\d\s+()\-.]/.test($('phone').value);
  }

  function update() {
    $('pay').disabled = !valid() || busy;
    var s = $('summary');
    if (service && chosen) {
      s.textContent = service.name + ' with ' + cfg.physios[chosen.practitioner].name + ', ' + dayLabel(chosen.start.substr(0, 10)) + ' at ' + hhmm(chosen.start) + ' (UK time). Deposit to pay now: ' + pounds(service.deposit_pence) + '.';
      show(s, true);
      $('pay').textContent = 'Pay ' + pounds(service.deposit_pence) + ' deposit and book';
    } else { show(s, false); $('pay').textContent = 'Pay deposit and book'; }
  }

  function submit(e) {
    e.preventDefault(); notice('');
    if ($('pay').disabled) { return; }
    busy = true; update();
    api('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      service: service.id, practitioner: chosen.practitioner, start: chosen.start, name: $('name').value.trim(), email: $('email').value.trim(),
      phone: $('phone').value.trim(), reason: $('reason').value }) }).then(function (r) {
      if (r.status === 201 && r.body.checkout_url) {
        var go = function () { window.location.href = r.body.checkout_url; };
        var params = { currency: 'GBP', value: service.deposit_pence / 100, physio: chosen.practitioner,
                       items: [{ item_id: service.id, item_name: service.name, item_variant: chosen.practitioner, item_category: 'deposit', price: service.deposit_pence / 100, quantity: 1 }] };
        track('begin_checkout', params, go);
        return;
      }
      busy = false;
      if (r.status === 409) { notice('Sorry, that time has just been taken. Please choose another time.'); chosen = null; loadDay(); }
      else if (r.status === 429) { notice('You have several unpaid bookings open. Please pay for one of them, or wait 15 minutes, and try again.'); }
      else if (r.status === 400) { notice('Please check your name, email address and mobile number.'); }
      else { notice('Something went wrong on our side. Please try again in a moment, or call us on ' + cfg.phone + '.'); }
      update();
    }).catch(function () { busy = false; notice('We could not reach the booking system. Please try again, or call us on ' + (cfg ? cfg.phone : '0117 496 0418') + '.'); update(); });
  }

  function init() {
    Promise.all([api('/api/config'), api('/api/services')]).then(function (rs) {
      cfg = rs[0].body; services = rs[1].body.services || [];
      if (rs[0].status !== 200 || !services.length) { throw new Error('config'); }
      $('date').min = cfg.today; $('date').max = cfg.last_bookable_date; $('date').value = cfg.today;
      $('hold').textContent = cfg.hold_minutes;
      REASONS.forEach(function (r) { var o = document.createElement('option'); o.value = r; o.textContent = r; $('reason').appendChild(o); });
      renderServices();
    }).catch(function () {
      $('treatments').textContent = '';
      notice('The booking system is not available right now. Please call us on 0117 496 0418.');
    });
    $('booking-form').addEventListener('submit', submit);
    ['name', 'email', 'phone'].forEach(function (id) { $(id).addEventListener('input', update); });
    $('date').addEventListener('change', function () { chosen = null; loadDay(); update(); });
    $('physio').addEventListener('change', function () { chosen = null; loadDay(); update(); });
  }
  init();
})();
