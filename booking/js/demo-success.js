/* DEMO ONLY: once the (simulated) payment is confirmed, show what the live system does next: the confirmation email, the HubSpot
   contact and booking record, the Google Analytics events and the front desk list. All of it is built here in the page, with the
   same wording as the live app, and none of it is sent anywhere. */
(function () {
  'use strict';
  var id = new URLSearchParams(location.search).get('booking') || '', shown = false;
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function money(p) { return '£' + Math.floor(p / 100) + '.' + ('0' + p % 100).slice(-2); }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) { x.className = cls; } if (text !== undefined) { x.textContent = text; } return x; }
  function table(list) {
    var t = el('table', 'demo-t');
    list.forEach(function (r) { var tr = el('tr'); tr.appendChild(el('th', '', r[0])); tr.appendChild(el('td', '', r[1])); t.appendChild(tr); });
    return t;
  }
  /* the live app's rule for HubSpot phone numbers: UK numbers in E.164 (+44...), anything else as typed */
  function e164(phone) {
    var raw = (phone || '').trim(), d = raw.replace(/\D/g, ''), n = null;
    if (raw.charAt(0) === '+') { n = d.indexOf('44') === 0 ? d.slice(2) : null; }
    else if (d.indexOf('0044') === 0) { n = d.slice(4); }
    else if (d.charAt(0) === '0' && d.charAt(1) !== '0') { n = d.slice(1); }
    else if (d.indexOf('44') === 0 && (d.length === 12 || d.length === 13)) { n = d.slice(2); }
    if (n === null) { return raw; }
    if (n.charAt(0) === '0') { n = n.slice(1); }
    return (n.length === 9 || n.length === 10) ? '+44' + n : raw;
  }
  function render(rs) {
    var b = LKDemo.booking(id); if (!b || b.status !== 'confirmed') { return; }
    var svc = rs[0].services.filter(function (s) { return s.id === b.service; })[0], cfg = rs[1], clinic = rs[2], ph = cfg.physios[b.practitioner];
    var t = new Date(b.start.slice(0, 10) + 'T12:00:00Z'), dn = t.getUTCDate(), wd = DAYS[t.getUTCDay()], mo = MONTHS[t.getUTCMonth()], yr = t.getUTCFullYear();
    var zone = b.start.slice(19) === '+01:00' ? 'BST' : 'GMT', hm = b.start.slice(11, 16);
    var em = parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3), 10) + svc.minutes;
    var end = ('0' + Math.floor(em / 60)).slice(-2) + ':' + ('0' + em % 60).slice(-2);
    var day = wd + ' ' + dn + ' ' + mo + ' ' + yr, rest = b.price_pence - b.deposit_pence;
    var room = (clinic.rooms || {})[b.practitioner] || '';
    var first = b.name.trim().split(' ')[0], last = b.name.trim().split(' ').slice(1).join(' ').trim();
    var rules = 'Cancel at least ' + cfg.full_refund_hours + ' hours before your appointment and we refund your deposit in full. If you cancel later than that, or do not come, we keep the deposit.';
    var host = document.getElementById('more').parentNode;
    var note = el('p', 'demo-note', 'Demo: nothing was emailed or sent. The email and what the live system records are shown below.');
    document.getElementById('state').insertAdjacentElement('afterend', note);

    /* 1. the confirmation email */
    var box = el('section', 'demo-box'); box.id = 'demo-email';
    box.appendChild(el('p', 'demo-tag', 'Demo: preview'));
    box.appendChild(el('h2', '', 'The confirmation email'));
    box.appendChild(el('p', 'demo-small', 'In the live version the clinic emails this to the patient once Stripe confirms the deposit (one email per booking). In this demo it is only shown here.'));
    var mail = el('div', 'demo-email');
    mail.appendChild(table([['From', cfg.name + ' <' + clinic.contact_email + '>'], ['To', b.email],
      ['Subject', 'Your appointment at ' + cfg.name + ': ' + wd.slice(0, 3) + ' ' + dn + ' ' + mo.slice(0, 3) + ' ' + yr + ', ' + hm + ' ' + zone]]));
    var body = el('div', 'demo-mailbody');
    body.appendChild(el('h3', '', 'Your appointment is confirmed'));
    body.appendChild(el('p', '', 'Hi ' + first + ','));
    var facts = table([['Treatment', svc.name + ' (' + svc.minutes + ' minutes)'], ['Physio', ph.name + ' (' + room + ')'], ['Date', day],
      ['Time', hm + ' ' + zone + ' (UK time), until ' + end], ['Where', cfg.name + ', ' + clinic.address], ['Deposit paid', money(b.deposit_pence)],
      ['To pay on the day', money(rest) + ' (the deposit comes off your bill)']]);
    facts.className += ' demo-facts'; body.appendChild(facts);
    body.appendChild(el('h4', '', 'Need to cancel?'));
    body.appendChild(el('p', '', rules));
    var a = el('a', 'cta', 'Cancel this appointment'); a.id = 'demo-cancel-link';
    a.href = 'cancel.html?booking=' + encodeURIComponent(b.booking_id) + '&token=' + encodeURIComponent(b.token);
    var pa = el('p'); pa.appendChild(a); body.appendChild(pa);
    body.appendChild(el('p', '', 'Or call us on ' + cfg.phone + '.'));
    body.appendChild(el('p', 'demo-small', 'Booking reference: ' + b.booking_id + '. Please do not send us medical details by email.'));
    mail.appendChild(body); box.appendChild(mail);
    box.appendChild(el('p', 'demo-small', 'Try it: the cancel button above works in this demo too.'));
    host.appendChild(box);

    /* 2. behind the scenes */
    var bs = el('section', 'demo-box'); bs.id = 'demo-behind';
    bs.appendChild(el('p', 'demo-tag', 'Demo: simulated'));
    bs.appendChild(el('h2', '', 'Behind the scenes (simulated: nothing was sent)'));
    bs.appendChild(el('h3', '', 'HubSpot: one contact'));
    bs.appendChild(table([['First name', first], ['Last name', last], ['Email', b.email], ['Phone', e164(b.phone)]]));
    bs.appendChild(el('h3', '', 'HubSpot: one booking record (a deal) linked to the contact'));
    bs.appendChild(table([
      ['Deal name', 'Online booking - ' + b.name + ' - ' + svc.name + ' - ' + wd.slice(0, 3) + ' ' + dn + ' ' + mo.slice(0, 3) + ' ' + yr + ' ' + hm + ' (' + ph.name.split(' ')[0] + ')'],
      ['Stage', 'Appointment scheduled'], ['Amount', (b.price_pence / 100).toFixed(2) + ' (GBP)'],
      ['Description', ['Online booking ' + b.booking_id, 'Treatment: ' + svc.name + ' (' + svc.minutes + ' minutes)', 'Physio: ' + ph.name,
        'Appointment: ' + day + ', ' + hm + ' ' + zone + ' (UK time)', 'Deposit paid online: ' + money(b.deposit_pence) + ' (Stripe)',
        'To pay on the day: ' + money(rest)].join('\n')]]));
    bs.appendChild(el('p', 'demo-small', 'The reason for the visit never goes to HubSpot: it is health information, so it stays in the clinic’s own front desk list.'));
    bs.appendChild(el('h3', '', 'Google Analytics 4: the booking funnel'));
    bs.appendChild(el('p', 'demo-small', 'Exactly what this visit’s pages hand to Google’s tag, in order. No name, email, phone or reason for the visit, and no web address with ?… in it.'));
    var evs = LKDemo.store.get('ga4', []), ol = el('ol', 'demo-ga-list'); ol.id = 'demo-ga';
    evs.forEach(function (x) {
      var p = x.params || {}, parts = [], li = el('li');
      Object.keys(p).forEach(function (k) { if (k !== 'items') { parts.push(k + ': ' + (p[k] === '' ? '(none)' : p[k])); } });
      if (p.items) { parts.push('items: ' + p.items.map(function (i) { return i.item_id + (i.item_variant ? ' (' + i.item_variant + ')' : '') + ' ' + i.price; }).join(', ')); }
      li.appendChild(el('code', 'demo-ev', x.event)); li.appendChild(el('span', '', parts.join(' \u00b7 '))); ol.appendChild(li);
    });
    if (!evs.length) { ol.appendChild(el('li', '', '(no events recorded in this tab)')); }
    bs.appendChild(ol);
    var raw = el('details', 'demo-raw'), pre = el('pre', 'demo-ga');
    raw.appendChild(el('summary', '', 'The same events as raw JSON'));
    pre.textContent = evs.map(function (x) { return x.event + ' ' + JSON.stringify(x.params, null, 1); }).join('\n\n');
    raw.appendChild(pre); bs.appendChild(raw);
    bs.appendChild(el('h3', '', 'The front desk list (password protected)'));
    var dd = ('0' + dn).slice(-2);
    bs.appendChild(table([['Date', wd.slice(0, 3) + ' ' + dd + ' ' + mo.slice(0, 3) + ' ' + yr], ['Time', hm], ['Physio', ph.name], ['Treatment', svc.name],
      ['Patient', b.name], ['Phone', b.phone], ['Reason for visit', b.reason], ['Paid?', 'Paid']]));
    host.appendChild(bs);
  }
  /* runs once the page itself has shown the confirmed booking */
  var facts = document.getElementById('facts');
  function tick() {
    if (shown || facts.hidden) { return; }
    shown = true;
    Promise.all([LKDemo.load('services.json'), LKDemo.load('config.json'), LKDemo.load('clinic.json')]).then(render);
  }
  new MutationObserver(tick).observe(facts, { attributes: true, attributeFilter: ['hidden'] });
  tick();
})();
