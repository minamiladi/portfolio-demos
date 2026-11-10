/* DEMO ONLY. Stands in for the clinic's booking server, so this static copy of the site works with no server, no payment and
   nothing sent anywhere.
   - Free times come from data/slots.json, made in advance by the real app's own slot engine (UK time with GMT/BST, bank holidays
     such as 28 Dec 2026, the lunch break, the 10-minute gap after each appointment, each physio's days). Days before tomorrow
     (UK) are never offered.
   - A booking lives only in this browser tab (sessionStorage). Its time disappears for later bookings, like on the real site,
     and an unpaid hold ends after 15 minutes, like on the real site.
   - The payment is a neutral demo step. Google Analytics events are recorded on the page to show them, never sent. */
(function () {
  'use strict';
  var me = document.currentScript;
  var BASE = me && me.src ? me.src.replace(/js\/demo-api\.js(\?.*)?$/, '') : '';
  var realFetch = window.fetch.bind(window);
  var HOLD_MIN = 15;
  var mem = {};
  var store = {
    get: function (k, d) {
      try { var v = window.sessionStorage.getItem('lkdemo_' + k); return v ? JSON.parse(v) : d; } catch (e) { return k in mem ? mem[k] : d; }
    },
    set: function (k, v) {
      try { window.sessionStorage.setItem('lkdemo_' + k, JSON.stringify(v)); } catch (e) { mem[k] = v; }
    }
  };
  var cache = {};
  function load(name) {
    if (!cache[name]) { cache[name] = realFetch(BASE + 'data/' + name, { cache: 'no-cache' }).then(function (r) { return r.json(); }); }
    return cache[name];
  }
  load('config.json').then(function (c) { HOLD_MIN = c.hold_minutes || 15; }, function () {});

  function ukDate(d) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
    catch (e) { return d.toISOString().slice(0, 10); }
  }
  function addDays(day, n) { var t = new Date(day + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function mins(hhmm) { return parseInt(hhmm.slice(0, 2), 10) * 60 + parseInt(hhmm.slice(3, 5), 10); }
  function hex(n) {
    var a = new Uint8Array(n), s = '', i;
    if (window.crypto && window.crypto.getRandomValues) { window.crypto.getRandomValues(a); } else { for (i = 0; i < n; i++) { a[i] = Math.floor(Math.random() * 256); } }
    for (i = 0; i < n; i++) { s += ('0' + a[i].toString(16)).slice(-2); }
    return s;
  }

  /* The demo calendar runs from tomorrow (UK) to the last day in the data. If the data has run out (after 31 March 2027),
     the demo uses its own fixed calendar from the first day in the data, and the bar says so. */
  function calendar(cfg) {
    var tomorrow = addDays(ukDate(new Date()), 1), first = cfg.demo_first, last = cfg.demo_last;
    if (tomorrow > last) { return { today: first, frozen: true, now: addDays(first, -1) + 'T09:00:00Z', last: last }; }
    return { today: tomorrow < first ? first : tomorrow, frozen: false, now: new Date().toISOString(), last: last };
  }

  function json(status, body) { return Promise.resolve(new Response(JSON.stringify(body), { status: status, headers: { 'Content-Type': 'application/json' } })); }

  /* bookings in this tab; an unpaid hold ends after 15 minutes and its time is free again (as on the real site) */
  function bookings() {
    var b = store.get('bookings', {}), changed = false, now = Date.now();
    Object.keys(b).forEach(function (id) {
      if (b[id].status === 'held' && now - new Date(b[id].created).getTime() >= HOLD_MIN * 60000) { b[id].status = 'released'; changed = true; }
    });
    if (changed) { store.set('bookings', b); }
    return b;
  }
  function saveBookings(b) { store.set('bookings', b); }

  function clashes(svcs, b, service, practitioner, date, hhmm) {
    var mine = svcs[service];
    return Object.keys(b).some(function (id) {
      var x = b[id];
      if ((x.status !== 'held' && x.status !== 'confirmed') || x.practitioner !== practitioner || x.start.slice(0, 10) !== date) { return false; }
      var ts = mins(x.start.slice(11, 16)), te = ts + svcs[x.service].minutes, ss = mins(hhmm), se = ss + mine.minutes;
      return ss < te + 10 && ts < se + 10;           /* each appointment also takes the 10 minutes after it */
    });
  }

  function endOf(x, svcs) {
    var e = mins(x.start.slice(11, 16)) + svcs[x.service].minutes;
    return x.start.slice(0, 11) + ('0' + Math.floor(e / 60)).slice(-2) + ':' + ('0' + e % 60).slice(-2) + ':00' + x.start.slice(19);
  }

  function api(url, opts) {
    var u = new URL(url, location.href), path = u.pathname.replace(/^.*?\/api\//, '/api/'), method = ((opts && opts.method) || 'GET').toUpperCase();
    var needSlots = path === '/api/slots' || (path === '/api/bookings' && method === 'POST');
    return Promise.all([load('config.json'), load('services.json'), needSlots ? load('slots.json') : null]).then(function (all) {
      var cfg = all[0], svcList = all[1].services, slots = all[2], cal = calendar(cfg), svcs = {}, m;
      svcList.forEach(function (s) { svcs[s.id] = s; });
      var b = bookings();
      if (path === '/api/config' && method === 'GET') {
        return json(200, { name: cfg.name, timezone: cfg.timezone, currency: cfg.currency, phone: cfg.phone, today: cal.today, now: cal.now,
                           last_bookable_date: cal.last, hold_minutes: cfg.hold_minutes, full_refund_hours: cfg.full_refund_hours,
                           ga4_measurement_id: '', physios: cfg.physios });
      }
      if (path === '/api/services' && method === 'GET') { return json(200, { services: svcList }); }
      if (path === '/api/slots' && method === 'GET') {
        var service = u.searchParams.get('service'), date = u.searchParams.get('date') || '', prac = u.searchParams.get('practitioner') || '';
        if (!svcs[service]) { return json(400, { error: 'unknown treatment' }); }
        if (prac && svcs[service].practitioners.indexOf(prac) < 0) { return json(400, { error: 'that physio does not do this treatment' }); }
        if (date < cal.today || date > cal.last) { return json(200, { slots: [] }); }
        var day = (slots.slots[service] || {})[date], out = [];
        if (day) {
          Object.keys(day.p).forEach(function (p) {
            if (prac && p !== prac) { return; }
            day.p[p].forEach(function (t) { if (!clashes(svcs, b, service, p, date, t)) { out.push({ start: date + 'T' + t + ':00' + day.o, practitioner: p }); } });
          });
        }
        out.sort(function (x, y) { return x.start < y.start ? -1 : x.start > y.start ? 1 : (x.practitioner < y.practitioner ? -1 : 1); });
        return json(200, { slots: out });
      }
      if (path === '/api/bookings' && method === 'POST') {
        var q = {}; try { q = JSON.parse((opts && opts.body) || '{}'); } catch (e) { q = {}; }
        var s = svcs[q.service];
        if (!s || !q.start || !q.practitioner || !q.name || !q.email || !q.phone) { return json(400, { error: 'missing details' }); }
        var d0 = q.start.slice(0, 10), t0 = q.start.slice(11, 16), dd = (slots.slots[q.service] || {})[d0];
        var offered = dd && dd.p[q.practitioner] && dd.p[q.practitioner].indexOf(t0) >= 0 && q.start.slice(19) === dd.o && d0 >= cal.today && d0 <= cal.last;
        if (!offered || clashes(svcs, b, q.service, q.practitioner, d0, t0)) { return json(409, { error: 'that time is not free' }); }
        var id = 'demo_' + hex(8);
        b[id] = { booking_id: id, service: q.service, practitioner: q.practitioner, start: q.start, deposit_pence: s.deposit_pence, price_pence: s.price_pence,
                  status: 'held', name: String(q.name).slice(0, 100), email: String(q.email).slice(0, 200), phone: String(q.phone).slice(0, 40),
                  reason: String(q.reason || '').slice(0, 60), token: 'demo-' + hex(12), created: new Date().toISOString() };
        saveBookings(b);
        return json(201, { booking_id: id, status: 'held', checkout_url: BASE + 'booking/demo-pay.html?booking=' + encodeURIComponent(id) });
      }
      if ((m = path.match(/^\/api\/bookings\/([^/]+)(\/sync|\/cancel)?$/))) {
        var x = b[decodeURIComponent(m[1])];
        if (!x) { return json(404, { error: 'not found' }); }
        var view = { booking_id: x.booking_id, service: x.service, practitioner: x.practitioner, start: x.start, end: endOf(x, svcs), status: x.status,
                     deposit_pence: x.deposit_pence, currency: cfg.currency };
        if (x.status === 'cancelled') { view.refund = x.refund || 'none'; }
        if (!m[2] && method === 'GET') { return json(200, view); }
        if (m[2] === '/sync' && method === 'POST') { return json(200, { status: x.status }); }
        if (m[2] === '/cancel' && method === 'POST') {
          var body = {}; try { body = JSON.parse((opts && opts.body) || '{}'); } catch (e) { body = {}; }
          if (body.token !== x.token) { return json(403, { error: 'wrong token' }); }
          var hours = (new Date(x.start) - new Date(cal.now)) / 3600000;
          if (x.status !== 'confirmed' || hours <= 0) { return json(409, { error: 'this booking cannot be cancelled' }); }
          x.status = 'cancelled'; x.refund = hours >= cfg.full_refund_hours ? 'full' : 'none'; saveBookings(b);
          return json(200, { status: 'cancelled', refund: x.refund });
        }
      }
      return json(404, { error: 'not found' });
    });
  }

  window.fetch = function (input, opts) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    if (/(^|\/)api\//.test(new URL(url, location.href).pathname)) { return api(url, opts); }
    return realFetch(input, opts);
  };

  /* Google Analytics: record exactly what the page hands to Google's tag (the same event names and parameters), show it on the
     confirmation page, and send nothing. */
  function clean(href) { try { var r = new URL(href); return r.origin + r.pathname; } catch (e) { return ''; } }
  function record(name, params) {
    var list = store.get('ga4', []); list.push({ event: name, params: params }); store.set('ga4', list.slice(-40));
  }
  var tracker = {
    event: function (name, params, done) {
      var p = {};
      Object.keys(params || {}).forEach(function (k) { if (typeof params[k] !== 'function') { p[k] = params[k]; } });
      p.page_location = clean(location.href);
      if (done) { p.transport_type = 'beacon'; }
      record(name, JSON.parse(JSON.stringify(p)));
      if (done) { setTimeout(done, 0); }
    },
    sent: []
  };
  try { Object.defineProperty(window, 'LarkTrack', { configurable: true, get: function () { return tracker; }, set: function () { /* the demo keeps its recorder */ } }); }
  catch (e) { window.LarkTrack = tracker; }
  /* the page view the real tag sends on pages that load it (the booking page starts a new list) */
  var ga = me && me.getAttribute('data-ga');
  if (ga) {
    if (ga === 'start') { store.set('ga4', []); }
    record('page_view', { page_location: clean(location.href), page_referrer: clean(document.referrer) });
  }

  /* helpers for the demo pages */
  window.LKDemo = {
    load: load, store: store,
    booking: function (id) { return bookings()[id] || null; },
    pay: function (id) {
      var b = bookings(); if (!b[id]) { return null; }
      if (b[id].status === 'held') { b[id].status = 'confirmed'; b[id].paid = new Date().toISOString(); saveBookings(b); }
      return b[id].status;
    },
    calendar: function () { return load('config.json').then(calendar); }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('demo-cal');
    var day = function (d) { return new Date(d + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); };
    if (el) { LKDemo.calendar().then(function (c) { if (c.frozen) { el.textContent = ' This demo’s calendar runs from ' + day(c.today) + ' to ' + day(c.last) + '.'; el.hidden = false; } }); }
  });
})();
