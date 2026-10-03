/* לשים מספרים על החלום · סקריפט משותף */
(function () {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var doc = document;
  var root = doc.documentElement;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  /* ---------- תפריט נגישות ---------- */
  var A11Y_OPTIONS = [
    { key: 'text', label: 'הגדלת טקסט' },
    { key: 'contrast', label: 'ניגודיות גבוהה' },
    { key: 'links', label: 'הדגשת קישורים' },
    { key: 'motion', label: 'עצירת אנימציות' }
  ];

  function mountA11y() {
    var slot = $('[data-a11y]');
    if (!slot) return;
    var state = store('a11y') || {};

    var icon = '<svg viewBox="0 0 24 24" fill="none" stroke="#F6EEDC" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M12 14.5l-3 6M12 14.5l3 6"/></svg>';
    var html = '<button type="button" class="a11y-toggle" aria-expanded="false" aria-controls="a11y-panel" aria-label="תפריט נגישות">' + icon + '</button>' +
      '<div class="a11y-panel" id="a11y-panel" role="group" aria-labelledby="a11y-title" hidden>' +
      '<span class="a11y-title" id="a11y-title">נגישות</span>';
    A11Y_OPTIONS.forEach(function (o) {
      html += '<button type="button" class="a11y-option" data-a11y-key="' + o.key + '" aria-pressed="' + (state[o.key] ? 'true' : 'false') + '">' + o.label + '</button>';
    });
    html += '<button type="button" class="a11y-option a11y-reset" data-a11y-reset>איפוס הגדרות</button>' +
      '<a href="/accessibility/">הצהרת נגישות</a></div>';
    slot.innerHTML = html;

    var toggle = $('.a11y-toggle', slot);
    var panel = $('.a11y-panel', slot);

    function setOpen(open) {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    toggle.addEventListener('click', function () { setOpen(panel.hidden); });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); toggle.focus(); }
    });
    doc.addEventListener('click', function (e) {
      if (!panel.hidden && !slot.contains(e.target)) setOpen(false);
    });

    function apply() {
      A11Y_OPTIONS.forEach(function (o) {
        root.classList.toggle('a11y-' + o.key, !!state[o.key]);
        var b = $('[data-a11y-key="' + o.key + '"]', slot);
        if (b) b.setAttribute('aria-pressed', state[o.key] ? 'true' : 'false');
      });
      store('a11y', state);
    }
    $all('[data-a11y-key]', slot).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-a11y-key');
        state[k] = !state[k];
        apply();
      });
    });
    $('[data-a11y-reset]', slot).addEventListener('click', function () { state = {}; apply(); });
  }


  /* ---------- מדידה (Umami) ---------- */
  var trackQueue = [];
  function track(name, data) {
    try {
      if (window.umami && typeof window.umami.track === 'function') window.umami.track(name, data);
      else trackQueue.push([name, data]);
    } catch (e) { /* המדידה לא עוצרת שום דבר */ }
  }
  function getSource() { return store('trafficSource') || {}; }

  function initAnalytics() {
    // שומרים מאיפה הגיע הביקור (למשל ?utm_source=instagram), כדי לצרף להרשמה
    var q = new URLSearchParams(location.search);
    var src = q.get('utm_source') || q.get('src');
    if (src) {
      store('trafficSource', {
        source: src,
        medium: q.get('utm_medium') || '',
        campaign: q.get('utm_campaign') || '',
        at: new Date().toISOString()
      });
    }
    var id = CFG.umamiWebsiteId;
    if (!id) return;
    var s = doc.createElement('script');
    s.defer = true;
    s.src = 'https://cloud.umami.is/script.js';
    s.setAttribute('data-website-id', id);
    s.setAttribute('data-domains', 'zlilbj.co.il,www.zlilbj.co.il');
    s.onload = function () {
      var flush = function () {
        if (!window.umami) return setTimeout(flush, 200);
        trackQueue.splice(0).forEach(function (t) { window.umami.track(t[0], t[1]); });
      };
      flush();
    };
    doc.head.appendChild(s);
  }

  /* ---------- מחיר: הרשמה מוקדמת או מחיר מלא ---------- */
  function isEarly() {
    var q = new URLSearchParams(location.search).get('price');
    if (q === 'late') return false;
    if (q === 'early') return true;
    var end = Date.parse(CFG.earlyBirdEnds || '');
    return isNaN(end) ? true : Date.now() <= end;
  }
  var EARLY = isEarly();
  var PRICE = EARLY ? (CFG.prices || {}).early : (CFG.prices || {}).regular;

  function applyPrice() {
    if (!PRICE) return;
    $all('[data-price]').forEach(function (el) { el.textContent = PRICE; });
    $all('[data-early-only]').forEach(function (el) { el.hidden = !EARLY; });
    $all('[data-late-only]').forEach(function (el) { el.hidden = EARLY; });
  }

  /* ---------- מועדים שהתמלאו ---------- */
  function applySessions() {
    (CFG.sessions || []).forEach(function (s) {
      var input = $('input[name="session"][value="' + s.id + '"]');
      if (!input || !s.soldOut) return;
      input.disabled = true;
      var label = input.closest('.session');
      if (label) {
        label.classList.add('is-full');
        var tag = doc.createElement('span');
        tag.className = 'session-full';
        tag.textContent = 'ההרשמה מלאה';
        label.appendChild(tag);
      }
    });
  }

  /* ---------- עזרי טפסים ---------- */
  function setError(input, msg) {
    var id = input.getAttribute('data-error-id') || (input.id + '-error');
    var box = doc.getElementById(id);
    if (box) box.textContent = msg || '';
    if (input.type !== 'radio') input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function normPhone(v) { return (v || '').replace(/[\s\-().]/g, ''); }
  function validPhone(v) { return /^(\+?972|0)\d{8,9}$/.test(normPhone(v)); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim()); }

  function postJSON(url, data) {
    if (!url) return Promise.resolve();
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true
    }).catch(function () { /* לא עוצרים את התשלום בגלל זה */ });
  }

  function waLink(text) {
    return 'https://wa.me/' + (CFG.whatsapp || '') + '?text=' + encodeURIComponent(text);
  }

  /* ---------- טופס הרשמה ---------- */
  function initRegister() {
    var form = $('#register-form');
    if (!form) return;
    var status = $('#register-status');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name, phone = form.elements.phone, email = form.elements.email,
          business = form.elements.business, terms = form.elements.terms, marketing = form.elements.marketing;
      var session = form.querySelector('input[name="session"]:checked');
      var firstBad = null;
      function check(ok, input, msg) {
        setError(input, ok ? '' : msg);
        if (!ok && !firstBad) firstBad = input;
      }

      var anyRadio = form.querySelector('input[name="session"]');
      check(!!session, anyRadio, 'צריך לבחור מועד.');
      check(name.value.trim().length >= 2, name, 'נא למלא שם מלא.');
      check(validPhone(phone.value), phone, 'נא למלא מספר טלפון תקין, למשל 050-1234567.');
      check(validEmail(email.value), email, 'נא למלא כתובת אימייל תקינה.');
      check(terms.checked, terms, 'כדי להמשיך צריך לאשר את התקנון ואת מדיניות הפרטיות.');

      if (firstBad) {
        status.className = 'form-status';
        status.textContent = '';
        firstBad.focus();
        return;
      }

      var sessionCfg = (CFG.sessions || []).filter(function (s) { return s.id === session.value; })[0] || {};
      var data = {
        session: session.value,
        sessionLabel: sessionCfg.label || session.value,
        name: name.value.trim(),
        phone: normPhone(phone.value),
        email: email.value.trim(),
        business: business.value.trim(),
        marketingConsent: marketing.checked,
        price: PRICE,
        earlyBird: EARLY,
        submittedAt: new Date().toISOString(),
        page: location.href,
        source: getSource().source || '',
        sourceMedium: getSource().medium || '',
        sourceCampaign: getSource().campaign || ''
      };

      track('שליחת טופס הרשמה', { session: data.session, source: data.source || 'ישיר' });

      // דף התודה משתמש בזה כדי להציע את המועד הנכון ליומן
      store('workshopReg', { session: data.session });

      var link = (CFG.paymentLinks || {})[EARLY ? 'early' : 'regular'];
      if (!link) {
        status.className = 'form-status is-info';
        status.innerHTML = 'ההרשמה בתשלום תיפתח ממש בקרוב. בינתיים אפשר <a href="' +
          waLink('היי צליל, אשמח להירשם לסדנה ״לשים מספרים על החלום״ במועד: ' + data.sessionLabel + '. שמי ' + data.name + '.') +
          '" target="_blank" rel="noopener">לכתוב לי בוואטסאפ</a> ואשמור לך מקום.';
        return;
      }

      var url;
      try { url = new URL(link); } catch (err) { url = null; }
      if (url) {
        var p = CFG.paymentPrefill || {};
        if (p.name) url.searchParams.set(p.name, data.name);
        if (p.phone) url.searchParams.set(p.phone, data.phone);
        if (p.email) url.searchParams.set(p.email, data.email);
        if (p.note) url.searchParams.set(p.note, data.sessionLabel + (data.business ? ' | ' + data.business : ''));
      }

      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      status.className = 'form-status';
      status.textContent = 'מעבירים אותך לתשלום מאובטח…';

      var go = function () { location.href = url ? url.toString() : link; };
      Promise.race([postJSON(CFG.leadEndpoint, data), new Promise(function (r) { setTimeout(r, 2500); })]).then(go);
    });

    // ניקוי הודעת שגיאה כשמתקנים
    form.addEventListener('input', function (e) {
      var t = e.target;
      if (t.getAttribute('aria-invalid') === 'true') setError(t, '');
    });
    form.addEventListener('change', function (e) {
      if (e.target.name === 'session') setError(e.target, '');
      if (e.target.name === 'terms' && e.target.checked) setError(e.target, '');
    });
  }

  /* ---------- טופס "אף מועד לא מתאים?" ---------- */
  function initWaitlist() {
    var form = $('#waitlist-form');
    if (!form) return;
    var status = $('#waitlist-status');

    $all('.chip', form).forEach(function (chip) {
      chip.addEventListener('click', function () {
        chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.wname, contact = form.elements.wcontact, marketing = form.elements.wmarketing;
      var firstBad = null;
      var okName = name.value.trim().length >= 2;
      var c = contact.value.trim();
      var okContact = validPhone(c) || validEmail(c);
      setError(name, okName ? '' : 'נא למלא שם.');
      setError(contact, okContact ? '' : 'נא למלא טלפון או אימייל תקינים.');
      if (!okName) firstBad = name; else if (!okContact) firstBad = contact;
      if (firstBad) { firstBad.focus(); return; }

      var wants = $all('.chip[aria-pressed="true"]', form).map(function (c) { return c.textContent.trim(); });
      track('טופס מועדים נוספים', { source: getSource().source || 'ישיר' });
      var data = {
        source: getSource().source || '',
        name: name.value.trim(),
        contact: c,
        interestedIn: wants,
        marketingConsent: marketing.checked,
        submittedAt: new Date().toISOString()
      };

      if (CFG.waitlistEndpoint) {
        postJSON(CFG.waitlistEndpoint, data).then(function () {
          form.reset();
          $all('.chip', form).forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
          status.textContent = 'תודה! אעדכן כשייפתח מועד נוסף.';
        });
        return;
      }

      var text = 'היי צליל, אשמח לעדכון כשייפתח מועד נוסף לסדנה' +
        (wants.length ? ' (' + wants.join(', ') + ')' : '') + '.\nשם: ' + data.name + '\nליצירת קשר: ' + data.contact +
        (data.marketingConsent ? '\nאישור לקבלת עדכונים ותוכן במייל וב־SMS: כן' : '');
      window.open(waLink(text), '_blank', 'noopener');
      status.textContent = 'נפתחה הודעת וואטסאפ מוכנה. נשאר רק לשלוח אותה.';
    });

    form.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true') setError(e.target, '');
    });
  }

  /* ---------- שאלות: פתיחה של שאלה אחת בכל פעם ---------- */
  function initFaq() {
    var items = $all('.faq-item');
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d && o.open) o.open = false; });
      });
    });
  }

  /* ---------- דף תודה: הוספה ליומן ---------- */
  function initCalendar() {
    var btn = $('#cal-button');
    var menu = $('#cal-menu');
    if (!btn || !menu) return;

    var params = new URLSearchParams(location.search);
    var saved = store('workshopReg') || {};
    var chosen = params.get('session') || saved.session;
    var sessions = (CFG.sessions || []).filter(function (s) { return !chosen || s.id === chosen; });
    if (!sessions.length) sessions = CFG.sessions || [];

    track('תשלום הושלם', { session: chosen || 'לא ידוע', source: getSource().source || 'ישיר' });

    var details = 'סדנה בהנחיית צליל בן ג׳ויה. המיקום המדויק בחוף הכרמל יישלח במייל. מה להביא: מחשב נייד או טלפון, והערכה כללית של ההכנסות וההוצאות החודשיות של העסק.';
    var title = 'סדנה: לשים מספרים על החלום';
    var location_ = 'חוף הכרמל (המיקום המדויק יישלח במייל)';

    var html = '';
    sessions.forEach(function (s) {
      var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent(title) +
        '&dates=' + s.utcStart + '/' + s.utcEnd +
        '&details=' + encodeURIComponent(details) +
        '&location=' + encodeURIComponent(location_) +
        '&ctz=Asia/Jerusalem';
      html += (sessions.length > 1 ? '<span class="cal-date">' + s.label + '</span>' : '') +
        '<div class="cal-row">' +
        '<a class="btn btn-outline" href="' + g + '" target="_blank" rel="noopener">יומן גוגל</a>' +
        '<a class="btn btn-outline" href="' + s.ics + '" download>אפל או אאוטלוק</a>' +
        '</div>';
    });
    menu.innerHTML = '<span class="cal-menu-title">לאיזה יומן להוסיף?</span>' + html;

    btn.addEventListener('click', function () {
      var open = menu.hidden;
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var first = $('a', menu); if (first) first.focus(); }
    });
  }

  function init() {
    initAnalytics();
    mountA11y();
    applyPrice();
    applySessions();
    initRegister();
    initWaitlist();
    initFaq();
    initCalendar();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
