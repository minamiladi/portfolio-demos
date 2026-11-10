/* DEMO ONLY: after the patient cancels with the email's link, show what the live system does next. Nothing is sent. */
(function () {
  'use strict';
  var id = new URLSearchParams(location.search).get('booking') || '', shown = false;
  function money(p) { return '£' + Math.floor(p / 100) + '.' + ('0' + p % 100).slice(-2); }
  function el(tag, cls, text) { var x = document.createElement(tag); if (cls) { x.className = cls; } if (text !== undefined) { x.textContent = text; } return x; }
  function check() {
    if (shown) { return; }
    var b = LKDemo.booking(id);
    if (!b || b.status !== 'cancelled' || document.getElementById('title').textContent !== 'Your appointment is cancelled') { return; }
    shown = true;
    var full = b.refund === 'full';
    var bs = el('section', 'demo-box'); bs.id = 'demo-behind';
    bs.appendChild(el('p', 'demo-tag', 'Demo: simulated'));
    bs.appendChild(el('h2', '', 'Behind the scenes (simulated: nothing was sent)'));
    var ul = el('ul', 'demo-list');
    ul.appendChild(el('li', '', full ? 'Stripe: the deposit of ' + money(b.deposit_pence) + ' is refunded in full to the card (test mode).'
                                    : 'Stripe: no refund, because the appointment is less than 24 hours away.'));
    ul.appendChild(el('li', '', 'HubSpot: the booking record moves to “Closed lost”, with the line “CANCELLED by the patient; deposit ' +
                                (full ? 'refunded in full' : 'kept (less than 24 hours’ notice)') + '”.'));
    ul.appendChild(el('li', '', 'Front desk list: the booking now shows “' + (full ? 'Refunded' : 'Cancelled (deposit kept)') + '”, and the time is free for other patients.'));
    ul.appendChild(el('li', '', 'Google Analytics: nothing. This page has no analytics, because its address holds the secret cancel link.'));
    bs.appendChild(ul);
    var host = document.getElementById('state').parentNode;
    host.insertBefore(bs, document.getElementById('state').nextSibling);
  }
  new MutationObserver(check).observe(document.getElementById('title'), { childList: true, characterData: true, subtree: true });
  check();
})();
