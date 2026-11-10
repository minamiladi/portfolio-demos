/* Sanbouk Drive website assistant: DEMO copy of the delivered chat widget (portfolio sample, fictional company).
 *
 * Same look and form as the delivered widget, with three differences:
 *  - the suggested questions replay answers recorded in the real test run (window.SBK_RECORDED, Groq openai/gpt-oss-120b),
 *    word for word with their sources; typing is off and nothing is sent to any server;
 *  - the sources open the company's documents as pages of this demo;
 *  - the call-back form checks the fields like the real server, sends nothing, and shows the e-mail the sales team would get
 *    (mobile masked). */
(function () {
  'use strict';
  if (window.__sbkAssistant) { return; }
  window.__sbkAssistant = true;

  var DATA = window.SBK_RECORDED || { items: [] };
  var script = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var siteRoot = '';
  try { siteRoot = new URL('../../', script.src).href; } catch (e) { siteRoot = location.origin + '/'; }
  siteRoot = siteRoot.replace(/\/*$/, '/');

  var AR = (document.documentElement.getAttribute('lang') || 'en').toLowerCase().indexOf('ar') === 0;
  var LANG = AR ? 'ar' : 'en';
  var T = {
    en: {
      open: 'Chat with us', title: 'Sanbouk Drive assistant', sub: 'Answers from our own content, with the source', close: 'Close chat', send: 'Send',
      placeholder: 'Typing is off in this demo', hello: 'Hello! I\'m the Sanbouk Drive assistant. Ask me about prices, deposit, insurance, delivery, branches, opening hours, documents or rental terms.',
      demo: 'Recorded answers from the real test run (Groq, gpt-oss-120b). Typing is off in this demo; the live version runs on the client\'s own server.',
      demo2: 'Pick a question below. Phone numbers are placeholders.',
      source: 'Source', sources: 'Sources', callback: 'Request a call-back', formTitle: 'Request a call-back',
      name: 'Name', phone: 'Mobile number', email: 'Email', interest: 'What do you need?', time: 'Best time to call', consent: 'I agree that Sanbouk Drive may contact me about this request.',
      submit: 'Send request', cancel: 'Back to chat', fix: 'Please check the highlighted fields.', phoneHint: 'For example 05XXXXXXXX',
      metaModel: 'Recorded answer · {model} · {ms} ms in the test', metaFixed: 'Recorded answer · fixed reply, no AI call',
      sent: 'Demo only: nothing was sent. On the live site this request goes to the sales inbox and the leads file. This is the e-mail the sales team would get (mobile masked):',
      mailHead: 'E-mail preview (not sent)', oldForm: 'Demo only: nothing was sent.',
      err_name: 'Please enter your name.', err_phone: 'Please enter a valid mobile number, for example 05XXXXXXXX or +9665XXXXXXXX.',
      err_email: 'Please enter a valid email address.', err_consent: 'Please agree to be contacted so we can call you back.',
      err_long: 'This text is too long.', err_secret: 'Please do not enter ID, Iqama, passport or card numbers.'
    },
    ar: {
      open: 'تحدث معنا', title: 'مساعد سنبوك درايف', sub: 'إجابات من محتوانا فقط، مع المصدر', close: 'إغلاق المحادثة', send: 'إرسال',
      placeholder: 'الكتابة متوقفة في هذا العرض', hello: 'أهلًا بك! أنا مساعد سنبوك درايف. اسألني عن الأسعار والضمان والتأمين والتوصيل والفروع ومواعيد العمل والمستندات وشروط التأجير.',
      demo: 'إجابات مسجّلة من التجربة الحقيقية على نموذج gpt-oss-120b من Groq. الكتابة متوقفة في هذا العرض؛ النسخة الحقيقية تعمل على خادم العميل نفسه.',
      demo2: 'اختر سؤالًا من الأسئلة التالية. أرقام الهواتف بديلة للعرض.',
      source: 'المصدر', sources: 'المصادر', callback: 'اطلب اتصالًا', formTitle: 'طلب اتصال',
      name: 'الاسم', phone: 'رقم الجوال', email: 'البريد الإلكتروني', interest: 'ما الذي تحتاجه؟', time: 'أنسب وقت للاتصال', consent: 'أوافق على تواصل سنبوك درايف معي بخصوص هذا الطلب.',
      submit: 'إرسال الطلب', cancel: 'العودة إلى المحادثة', fix: 'يرجى مراجعة الحقول المظللة.', phoneHint: 'مثال: 05XXXXXXXX',
      metaModel: 'إجابة مسجّلة · {model} · {ms} ملّي ثانية في التجربة', metaFixed: 'إجابة مسجّلة · رد ثابت بدون استدعاء الذكاء الاصطناعي',
      sent: 'نسخة للعرض فقط: لم يُرسَل أي شيء. في الموقع الحقيقي يصل هذا الطلب إلى بريد فريق المبيعات وملف العملاء المهتمين. هذا هو البريد الذي سيصل إلى الفريق (رقم الجوال مخفي):',
      mailHead: 'معاينة البريد (لم يُرسَل)', oldForm: 'نسخة للعرض فقط: لم يُرسَل أي شيء.',
      err_name: 'يرجى إدخال اسمك.', err_phone: 'يرجى إدخال رقم جوال صحيح، مثل 05XXXXXXXX أو +9665XXXXXXXX.',
      err_email: 'يرجى إدخال بريد إلكتروني صحيح.', err_consent: 'يرجى الموافقة على التواصل معك حتى نتصل بك.',
      err_long: 'هذا النص طويل جدًا.', err_secret: 'يرجى عدم إدخال رقم الهوية أو الإقامة أو الجواز أو البطاقة.'
    }
  }[LANG];
  var CHIPS = (DATA.items || []).filter(function (it) { return it.page === LANG; });

  /* ------------------------------------------------------------------ styles (the delivered widget's, plus the demo parts) */
  var css = [
    '#sbk-assistant{position:fixed;inset-block-end:16px;inset-inline-end:16px;z-index:2147483000;font:16px/1.5 "Noto Sans Arabic",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1d2731;direction:' + (AR ? 'rtl' : 'ltr') + ';text-align:start;box-sizing:border-box}',
    '#sbk-assistant *,#sbk-assistant *::before,#sbk-assistant *::after{box-sizing:border-box;font-family:inherit}',
    '#sbk-assistant .sbk-open{display:inline-flex;align-items:center;gap:8px;min-height:48px;padding:10px 18px;border:0;border-radius:999px;background:var(--sea,#0b4f6c);color:#fff;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}',
    '#sbk-assistant .sbk-open:hover{background:#093e55}',
    '#sbk-assistant button:focus-visible,#sbk-assistant input:focus-visible,#sbk-assistant textarea:focus-visible,#sbk-assistant a:focus-visible{outline:3px solid #e4572e;outline-offset:2px}',
    '#sbk-assistant .sbk-panel{display:none;flex-direction:column;position:fixed;inset-block-end:16px;inset-inline-end:16px;inline-size:min(380px,calc(100vw - 24px));block-size:min(560px,calc(100vh - 32px));background:#fffdf8;border:1px solid var(--line,#d9cdb6);border-radius:14px;box-shadow:0 10px 34px rgba(0,0,0,.3);overflow:hidden}',
    '#sbk-assistant.sbk-on .sbk-panel{display:flex}#sbk-assistant.sbk-on .sbk-open{display:none}',
    '#sbk-assistant .sbk-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;background:var(--sea,#0b4f6c);color:#fff}',
    '#sbk-assistant .sbk-head h2{margin:0;font-size:16px;line-height:1.3;font-weight:700;color:#fff}#sbk-assistant .sbk-head p{margin:0;font-size:12px;opacity:.9}',
    '#sbk-assistant .sbk-x{flex:none;inline-size:36px;block-size:36px;border:0;border-radius:8px;background:rgba(255,255,255,.15);color:#fff;font-size:20px;line-height:1;cursor:pointer}',
    '#sbk-assistant .sbk-log{flex:1;overflow-y:auto;overflow-x:hidden;padding:12px;display:flex;flex-direction:column;gap:10px;background:#fffdf8}',
    '#sbk-assistant .sbk-msg{max-inline-size:88%;padding:9px 12px;border-radius:12px;overflow-wrap:anywhere;word-break:break-word;white-space:pre-wrap;unicode-bidi:plaintext}',
    '#sbk-assistant .sbk-me{align-self:flex-end;background:var(--sea,#0b4f6c);color:#fff;border-end-end-radius:4px}',
    '#sbk-assistant .sbk-bot{align-self:flex-start;background:#f4e9d4;color:#1d2731;border-end-start-radius:4px}',
    '#sbk-assistant bdi{unicode-bidi:isolate;direction:ltr;white-space:nowrap}',
    '#sbk-assistant .sbk-src{margin-block-start:8px;padding-block-start:6px;border-block-start:1px solid rgba(0,0,0,.15);font-size:13px;white-space:normal}',
    '#sbk-assistant .sbk-src strong{display:block;margin-block-end:2px}#sbk-assistant .sbk-src ul{margin:0;padding-inline-start:18px}',
    '#sbk-assistant .sbk-src a{color:#0b4f6c;text-decoration:underline;overflow-wrap:anywhere}',
    '#sbk-assistant .sbk-chips{display:flex;flex-wrap:wrap;gap:6px}#sbk-assistant .sbk-chip{border:1px solid var(--sea,#0b4f6c);background:#fff;color:var(--sea,#0b4f6c);border-radius:999px;padding:6px 12px;font-size:14px;cursor:pointer;text-align:start;unicode-bidi:plaintext}',
    '#sbk-assistant .sbk-chip[data-asked]{background:#eef5f8}',
    '#sbk-assistant .sbk-cb{align-self:flex-start;border:1px solid var(--coral,#e4572e);background:#fff;color:#a63413;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer}',
    '#sbk-assistant .sbk-foot{display:flex;gap:8px;padding:10px;border-block-start:1px solid var(--line,#d9cdb6);background:#fff;align-items:flex-end}',
    '#sbk-assistant .sbk-foot textarea{flex:1;min-inline-size:0;resize:none;block-size:44px;max-block-size:96px;padding:10px;border:1px solid #8b8272;border-radius:10px;font-size:16px;background:#fff;color:#1d2731}',
    '#sbk-assistant .sbk-foot textarea[disabled]{background:#f1ede4;color:#5a5448;cursor:not-allowed}',
    '#sbk-assistant .sbk-send{flex:none;min-block-size:44px;padding:0 16px;border:0;border-radius:10px;background:var(--coral,#e4572e);color:#fff;font-weight:700;font-size:16px;cursor:pointer}',
    '#sbk-assistant .sbk-send[disabled]{opacity:.55;cursor:default}',
    '#sbk-assistant form.sbk-lead{display:flex;flex-direction:column;gap:8px;padding:12px;overflow-y:auto;flex:1;background:#fffdf8}',
    '#sbk-assistant form.sbk-lead h3{margin:0;font-size:17px}#sbk-assistant .sbk-f label{display:block;font-weight:700;font-size:14px;margin-block-end:2px}',
    '#sbk-assistant .sbk-f input[type=text],#sbk-assistant .sbk-f input[type=tel],#sbk-assistant .sbk-f input[type=email],#sbk-assistant .sbk-f textarea{inline-size:100%;padding:9px 10px;border:1px solid #8b8272;border-radius:8px;font-size:16px;background:#fff;color:#1d2731}',
    '#sbk-assistant .sbk-f input[type=tel],#sbk-assistant .sbk-f input[type=email]{direction:ltr;text-align:start}',
    '#sbk-assistant .sbk-f [aria-invalid=true]{border-color:#b3261e;border-width:2px}#sbk-assistant .sbk-err{color:#b3261e;font-size:13px;min-block-size:0}',
    '#sbk-assistant .sbk-hint{font-size:12px;color:#5a5448}#sbk-assistant .sbk-consent{display:flex;gap:8px;align-items:flex-start;font-size:14px}',
    '#sbk-assistant .sbk-consent input{margin-block-start:4px;inline-size:18px;block-size:18px;flex:none}',
    '#sbk-assistant .sbk-row{display:flex;gap:8px;flex-wrap:wrap}#sbk-assistant .sbk-row button{flex:1;min-block-size:44px;border-radius:10px;font-weight:700;font-size:16px;cursor:pointer}',
    '#sbk-assistant .sbk-primary{border:0;background:var(--coral,#e4572e);color:#fff}#sbk-assistant .sbk-secondary{border:1px solid #8b8272;background:#fff;color:#1d2731}',
    '#sbk-assistant .sbk-demo{padding:8px 10px;border-radius:8px;background:#fff6d6;border:1px solid #e9d38a;color:#4a3b00;font-size:12.5px;line-height:1.45}',
    '#sbk-assistant .sbk-demo p{margin:0}#sbk-assistant .sbk-demo p+p{margin-block-start:4px}',
    '#sbk-assistant .sbk-meta{margin-block-start:6px;font-size:11.5px;color:#5a5448;white-space:normal}',
    '#sbk-assistant .sbk-mail{align-self:stretch;background:#fff;border:1px solid var(--line,#d9cdb6);border-radius:10px;padding:10px;font-size:12.5px;direction:ltr;text-align:left;unicode-bidi:isolate}',
    '#sbk-assistant .sbk-mail strong{display:block;margin-block-end:4px;font-size:13px}#sbk-assistant .sbk-mail .h{color:#5a5448;overflow-wrap:anywhere}',
    '#sbk-assistant .sbk-mail pre{margin:8px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font-family:inherit;font-size:12.5px;line-height:1.5}',
    '@media (max-width:480px){#sbk-assistant .sbk-panel{inset-inline:0;inset-block-end:0;inline-size:100vw;block-size:min(85vh,100vh);border-radius:14px 14px 0 0}#sbk-assistant{inset-block-end:12px;inset-inline-end:12px}}',
    '@media (prefers-reduced-motion:no-preference){#sbk-assistant .sbk-panel{animation:sbk-in .18s ease-out}@keyframes sbk-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}}'
  ].join('\n');

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') { n.textContent = attrs[k]; } else if (k === 'class') { n.className = attrs[k]; } else { n.setAttribute(k, attrs[k]); }
    });
    (children || []).forEach(function (c) { if (c) { n.appendChild(c); } });
    return n;
  }

  /* phone numbers and e-mail addresses always read left-to-right, also inside an Arabic sentence */
  function fillText(node, text) {
    var re = /(\+?\d[\d\s]{6,}\d|[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/g, last = 0, m;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) { node.appendChild(document.createTextNode(text.slice(last, m.index))); }
      var b = document.createElement('bdi'); b.setAttribute('dir', 'ltr'); b.textContent = m[0]; node.appendChild(b);
      last = m.index + m[0].length;
    }
    if (last < text.length) { node.appendChild(document.createTextNode(text.slice(last))); }
  }

  var DOC_PAGES = {
    'docs/FAQ_sheet.xlsx': 'sources/faq.html#',
    'docs/Rental_Terms_EN.docx': 'sources/terms-en.html#clause-',
    'docs/Rental_Terms_AR.docx': 'sources/terms-ar.html#clause-',
    'docs/Sanbouk_Rate_Card_Nov2026.pdf': 'sources/rate-card.html#'
  };
  function sourceUrl(c) {
    var doc = String(c.doc || ''), loc = String(c.loc || '');
    if (doc.indexOf('site/') === 0) { return siteRoot + doc.slice(5) + (loc ? '#' + loc : ''); }
    if (DOC_PAGES[doc]) { return siteRoot + DOC_PAGES[doc] + loc; }
    return '';
  }

  /* ------------------------------------------------------------------ build */
  var root = el('div', { id: 'sbk-assistant', lang: LANG, dir: AR ? 'rtl' : 'ltr' });
  var style = el('style'); style.textContent = css;
  var openBtn = el('button', { type: 'button', class: 'sbk-open', 'aria-expanded': 'false', 'aria-controls': 'sbk-panel', text: T.open });
  var panel = el('div', { class: 'sbk-panel', id: 'sbk-panel', role: 'dialog', 'aria-modal': 'false', 'aria-labelledby': 'sbk-title' });
  var closeBtn = el('button', { type: 'button', class: 'sbk-x', 'aria-label': T.close, text: '×' });
  var head = el('div', { class: 'sbk-head' }, [el('div', {}, [el('h2', { id: 'sbk-title', text: T.title }), el('p', { text: T.sub })]), closeBtn]);
  var log = el('div', { class: 'sbk-log', role: 'log', 'aria-live': 'polite', 'aria-label': T.title, tabindex: '0' });
  var input = el('textarea', { 'aria-label': T.placeholder, placeholder: T.placeholder, maxlength: '500', rows: '1', autocomplete: 'off', disabled: '' });
  var sendBtn = el('button', { type: 'button', class: 'sbk-send', text: T.send, disabled: '' });
  var foot = el('div', { class: 'sbk-foot' }, [input, sendBtn]);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(foot);
  root.appendChild(style); root.appendChild(openBtn); root.appendChild(panel);

  var formEl = null, chipsEl = null, asked = {};

  function scroll() { log.scrollTop = log.scrollHeight; }
  function addMsg(who, text, cites) {
    var d = el('div', { class: 'sbk-msg ' + (who === 'me' ? 'sbk-me' : 'sbk-bot') });
    d.setAttribute('data-who', who);
    var p = el('span', { class: 'sbk-text' }); fillText(p, text); d.appendChild(p);
    if (cites && cites.length) {
      var ul = el('ul');
      cites.forEach(function (c) {
        var url = sourceUrl(c), label = c.title || (c.doc + ' ' + c.loc);
        var li = el('li');
        if (url) { li.appendChild(el('a', { href: url, target: '_blank', rel: 'noopener', text: label })); } else { li.textContent = label; }
        ul.appendChild(li);
      });
      d.appendChild(el('div', { class: 'sbk-src' }, [el('strong', { text: cites.length > 1 ? T.sources : T.source }), ul]));
    }
    log.appendChild(d); scroll();
    return d;
  }
  function addCallbackButton() {
    var b = el('button', { type: 'button', class: 'sbk-cb', text: T.callback });
    b.addEventListener('click', showForm);
    log.appendChild(b); scroll();
  }
  function renderChips() {
    if (chipsEl) { chipsEl.remove(); }
    chipsEl = el('div', { class: 'sbk-chips' });
    CHIPS.forEach(function (it) {
      var c = el('button', { type: 'button', class: 'sbk-chip', 'data-id': it.id, text: it.q });
      if (asked[it.id]) { c.setAttribute('data-asked', ''); }
      c.addEventListener('click', function () { play(it); });
      chipsEl.appendChild(c);
    });
    log.appendChild(chipsEl); scroll();
  }

  /* ------------------------------------------------------------------ a recorded answer, word for word */
  function play(it) {
    asked[it.id] = true;
    if (chipsEl) { chipsEl.remove(); chipsEl = null; }
    addMsg('me', it.q);
    var d = addMsg('bot', it.a, it.cites);
    d.setAttribute('data-id', it.id);
    var meta = el('div', { class: 'sbk-meta' });
    (it.route === 'model' ? T.metaModel : T.metaFixed).split(/(\{model\}|\{ms\})/).forEach(function (part) {
      if (part === '{model}') { meta.appendChild(el('bdi', { dir: 'ltr', text: 'gpt-oss-120b' })); }
      else if (part === '{ms}') { meta.appendChild(el('bdi', { dir: 'ltr', text: String(it.ms) })); }
      else if (part) { meta.appendChild(document.createTextNode(part)); }
    });
    d.appendChild(meta);
    if (it.lead) { addCallbackButton(); }
    renderChips();
  }

  /* ------------------------------------------------------------------ the call-back form: checked like the server, sent nowhere */
  function digitsToAscii(s) {
    return String(s || '').replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x6F0); });
  }
  function stripInvisible(s) { return String(s || '').replace(/[​-‏‪-‮⁦-⁩﻿]/g, ''); }
  function normalizePhone(raw) {
    var s = digitsToAscii(stripInvisible(raw)).replace(/[\s\-().]/g, ''), d;
    if (!s || !/^\+?\d{6,17}$/.test(s)) { return null; }
    if (s.charAt(0) === '+') { d = s.slice(1); } else if (s.slice(0, 2) === '00') { d = s.slice(2); } else if (s.slice(0, 3) === '966') { d = s; }
    else if (s.charAt(0) === '0') { d = '966' + s.slice(1); } else if (/^5\d{8}$/.test(s)) { d = '966' + s; } else { return null; }
    if (!/^\d{8,15}$/.test(d)) { return null; }
    if (d.slice(0, 3) === '966') { var rest = d.slice(3); if (!(/^5\d{8}$/.test(rest) || /^1[1-7]\d{7}$/.test(rest))) { return null; } }
    else if (d.charAt(0) === '0') { return null; }
    return '+' + d;
  }
  var EMAIL = /^[A-Za-z0-9._%+\-]{1,64}@(?:[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;
  function looksSecret(t) { t = digitsToAscii(t); return /(^|\D)(?:\d[ \-]?){13,19}(?!\d)/.test(t) || /(^|[^\d+])[12]\d{9}(?!\d)/.test(t); }
  function maskPhone(p) {
    if (p.indexOf('+966') === 0) { return '+966 ' + p.charAt(4) + '•• ••• •••'; }
    return p.slice(0, 3) + p.slice(3).replace(/\d/g, '•');
  }
  function validate(v) {
    var errs = {}, clean = {};
    clean.name = stripInvisible(v.name).replace(/\s+/g, ' ').trim();
    if (clean.name.length < 2 || clean.name.length > 80 || !/[A-Za-z؀-ۿ]{2}/.test(clean.name)) { errs.name = T.err_name; }
    clean.phone = normalizePhone(v.phone); if (!clean.phone) { errs.phone = T.err_phone; }
    clean.email = String(v.email || '').trim(); if (!(clean.email.length <= 254 && EMAIL.test(clean.email) && clean.email.indexOf('..') < 0)) { errs.email = T.err_email; }
    clean.interest = stripInvisible(v.interest).replace(/\s+/g, ' ').trim(); if (clean.interest.length > 500) { errs.interest = T.err_long; }
    clean.time = stripInvisible(v.time).replace(/\s+/g, ' ').trim(); if (clean.time.length > 120) { errs.preferred_time = T.err_long; }
    if (v.consent !== true) { errs.consent = T.err_consent; }
    [['name', 'name'], ['interest', 'interest'], ['time', 'preferred_time']].forEach(function (p) { if (!errs[p[1]] && looksSecret(clean[p[0]])) { errs[p[1]] = T.err_secret; } });
    return { clean: clean, errs: errs };
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mailPreview(c) {
    var now = new Date(), id = 'L' + String(now.getFullYear()).slice(2) + pad(now.getMonth() + 1) + pad(now.getDate()) + '-DEMO';
    var stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    var subject = ('New call-back request ' + id + ': ' + c.name).replace(/[\r\n]+/g, ' ').slice(0, 200);
    var body = ['New call-back request from the website assistant', '', 'Lead ID: ' + id, 'Received: ' + stamp, '',
      'Name: ' + c.name, 'Mobile: ' + maskPhone(c.phone), 'Email: ' + c.email, 'Interested in: ' + c.interest, 'Best time to call: ' + c.time,
      'Consent to be contacted: yes', '', '(The same request is also in the leads file.)'].join('\n');
    var box = el('div', { class: 'sbk-mail', dir: 'ltr', lang: 'en' }, [
      el('strong', { text: T.mailHead, dir: AR ? 'rtl' : 'ltr' }),
      el('div', { class: 'h', text: 'From: assistant@sanbouk-drive.example' }), el('div', { class: 'h', text: 'To: sales@sanbouk-drive.example' }),
      el('div', { class: 'h', text: 'Subject: ' + subject }), el('pre', { text: body })]);
    log.appendChild(box); scroll();
  }
  function field(id, label, type, extra) {
    var wrap = el('div', { class: 'sbk-f' });
    wrap.appendChild(el('label', { for: 'sbk-' + id, text: label + (extra && extra.req ? ' *' : '') }));
    var inp = type === 'area' ? el('textarea', { id: 'sbk-' + id, name: id, rows: '2', maxlength: '500' }) : el('input', { id: 'sbk-' + id, name: id, type: type, maxlength: '200' });
    if (extra && extra.req) { inp.setAttribute('required', ''); inp.setAttribute('aria-required', 'true'); }
    if (extra && extra.ac) { inp.setAttribute('autocomplete', extra.ac); }
    wrap.appendChild(inp);
    if (extra && extra.hint) { wrap.appendChild(el('div', { class: 'sbk-hint', id: 'sbk-' + id + '-hint', text: extra.hint })); inp.setAttribute('aria-describedby', 'sbk-' + id + '-hint'); }
    var err = el('div', { class: 'sbk-err', id: 'sbk-' + id + '-err', role: 'alert' });
    wrap.appendChild(err);
    return { wrap: wrap, input: inp, err: err };
  }
  function showForm() {
    if (formEl) { formEl.querySelector('input').focus(); return; }
    var f = {
      name: field('name', T.name, 'text', { req: 1, ac: 'name' }), phone: field('phone', T.phone, 'tel', { req: 1, ac: 'tel', hint: T.phoneHint }),
      email: field('email', T.email, 'email', { req: 1, ac: 'email' }), interest: field('interest', T.interest, 'area', {}), time: field('time', T.time, 'text', {})
    };
    var consent = el('input', { type: 'checkbox', id: 'sbk-consent', name: 'consent' });
    var consentErr = el('div', { class: 'sbk-err', id: 'sbk-consent-err', role: 'alert' });
    var consentRow = el('div', {}, [el('div', { class: 'sbk-consent' }, [consent, el('label', { for: 'sbk-consent', text: T.consent })]), consentErr]);
    var status = el('div', { 'aria-live': 'polite', class: 'sbk-err' });
    var submit = el('button', { type: 'submit', class: 'sbk-primary', text: T.submit });
    var back = el('button', { type: 'button', class: 'sbk-secondary', text: T.cancel });
    formEl = el('form', { class: 'sbk-lead', novalidate: '', 'aria-labelledby': 'sbk-form-title' }, [
      el('h3', { id: 'sbk-form-title', text: T.formTitle }), f.name.wrap, f.phone.wrap, f.email.wrap, f.interest.wrap, f.time.wrap, consentRow, status,
      el('div', { class: 'sbk-row' }, [submit, back])]);
    log.style.display = 'none'; foot.style.display = 'none'; panel.appendChild(formEl);
    f.name.input.focus();
    back.addEventListener('click', closeForm);
    formEl.addEventListener('submit', function (ev) {
      ev.preventDefault();
      [f.name, f.phone, f.email, f.interest, f.time].forEach(function (x) { x.err.textContent = ''; x.input.removeAttribute('aria-invalid'); });
      consentErr.textContent = ''; status.textContent = '';
      var r = validate({ name: f.name.input.value, phone: f.phone.input.value, email: f.email.input.value, interest: f.interest.input.value, time: f.time.input.value, consent: consent.checked });
      var errs = r.errs, first = null;
      [['name', f.name], ['phone', f.phone], ['email', f.email], ['interest', f.interest], ['preferred_time', f.time]].forEach(function (pair) {
        if (errs[pair[0]]) { pair[1].err.textContent = errs[pair[0]]; pair[1].input.setAttribute('aria-invalid', 'true'); first = first || pair[1].input; }
      });
      if (errs.consent) { consentErr.textContent = errs.consent; consent.setAttribute('aria-invalid', 'true'); first = first || consent; }
      if (first) { status.textContent = T.fix; first.focus(); return; }
      closeForm();
      var m = addMsg('bot', T.sent); m.setAttribute('data-demo-sent', '');
      mailPreview(r.clean);
      renderChips();
    });
  }
  function closeForm() {
    if (formEl) { formEl.remove(); formEl = null; }
    log.style.display = ''; foot.style.display = '';
  }

  function openPanel(noFocus) {
    root.classList.add('sbk-on'); openBtn.setAttribute('aria-expanded', 'true');
    if (!log.childNodes.length) {
      addMsg('bot', T.hello);
      log.appendChild(el('div', { class: 'sbk-demo', role: 'note' }, [el('p', { text: T.demo }), el('p', { text: T.demo2 })]));
      var cb = el('button', { type: 'button', class: 'sbk-cb', text: T.callback }); cb.addEventListener('click', showForm); log.appendChild(cb);
      renderChips();
      log.scrollTop = 0;
    }
    if (noFocus !== true) { var first = log.querySelector('.sbk-chip'); if (first) { first.focus({ preventScroll: true }); } }
  }
  function closePanel() { root.classList.remove('sbk-on'); openBtn.setAttribute('aria-expanded', 'false'); openBtn.focus(); }

  openBtn.addEventListener('click', function () { openPanel(); });
  closeBtn.addEventListener('click', closePanel);
  panel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.stopPropagation(); closePanel(); return; }
    if (e.key === 'Tab') {                                                      /* keep Tab inside the open chat */
      var items = Array.prototype.filter.call(panel.querySelectorAll('button,a[href],input,textarea,[tabindex="0"]'), function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!items.length) { return; }
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  function mount() {
    document.body.appendChild(root);
    Array.prototype.forEach.call(document.querySelectorAll('[data-open-assistant]'), function (b) { b.addEventListener('click', function () { openPanel(); }); });
    /* the site's old contact form: nothing is sent in the demo */
    Array.prototype.forEach.call(document.querySelectorAll('form.old-form'), function (f) {
      f.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var n = f.querySelector('.demo-sent');
        if (!n) { n = el('p', { class: 'demo-sent', role: 'status' }); f.appendChild(n); }
        n.textContent = T.oldForm;
      });
    });
    /* home page on a wide screen: open the assistant so visitors see it at once */
    if (/(^|\/)(index\.html)?$/.test(location.pathname) && window.innerWidth >= 900) { openPanel(true); }
  }
  if (document.body) { mount(); } else { document.addEventListener('DOMContentLoaded', mount); }
  window.SanboukAssistant = { open: openPanel, close: closePanel, play: function (id) { CHIPS.concat(DATA.items || []).some(function (it) { if (it.id === id) { play(it); return true; } return false; }); } };
})();
