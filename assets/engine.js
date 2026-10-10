/* ===========================================================
   English Worksheets — interaktif aktivite motoru
   -----------------------------------------------------------
   Aktivite tipleri:
     rule    : kural/açıklama kutusu (kontrol edilmez)
     drag    : boşluğa blok sürükleme (banka blokları BİTMEZ)
     cloze   : paragraf içine blok sürükleme (banka bitmez)
     type    : klavyeyle yazma
     choice  : seçeneklerden birine tıklama (True/False dahil)
     order   : kelime kutularını taşıyarak cümle sıralama
     free    : serbest yazma (kontrol edilmez, kaydedilir)
   =========================================================== */

window.UZ = (function () {
  'use strict';

  /* ---------------------------------------------------------
     yardımcılar
     --------------------------------------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  const PUNCT = /^[.?!,]$/;

  /** cevap karşılaştırma için metni sadeleştir */
  function norm(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’ʼ′`´]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /** noktalama öncesi boşluğu sil: "I am late ." -> "I am late." */
  function joinTokens(tokens) {
    return tokens.reduce((acc, t) => (PUNCT.test(t) || !acc ? acc + t : acc + ' ' + t), '');
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /** cevaptan farklı olacak şekilde karıştır */
  function scramble(tokens) {
    if (tokens.length < 2) return tokens.slice();
    let out = shuffle(tokens);
    let guard = 0;
    while (joinTokens(out) === joinTokens(tokens) && guard++ < 20) out = shuffle(tokens);
    return out;
  }

  let toastTimer = null;
  function toast(msg) {
    let t = $('.toast');
    if (!t) {
      t = el('div', 'toast');
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ---------------------------------------------------------
     tema
     --------------------------------------------------------- */
  const THEME_KEY = 'uz:theme';

  function applyTheme(mode) {
    if (mode === 'light' || mode === 'dark') document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
  }

  function initTheme() {
    try { applyTheme(localStorage.getItem(THEME_KEY)); } catch (e) { /* yok sayı */ }
    document.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.theme-btn');
      if (!btn) return;
      const cur = document.documentElement.dataset.theme;
      const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      const next = dark ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* yok sayı */ }
      btn.textContent = next === 'dark' ? '☀' : '☾';
    });
    const btn = $('.theme-btn');
    if (btn) {
      const cur = document.documentElement.dataset.theme;
      const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      btn.textContent = dark ? '☀' : '☾';
    }
  }

  /* ---------------------------------------------------------
     kayıt (localStorage)
     --------------------------------------------------------- */
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* yok sayı */ }
  }

  const stateKey = (u) => 'uz:state:' + u;
  const scoreKey = (u) => 'uz:score:' + u;

  function progressOf(unit) {
    const s = load(scoreKey(unit), {});
    let score = 0, total = 0, done = 0, acts = 0;
    Object.keys(s).forEach((k) => {
      score += s[k].score || 0;
      total += s[k].total || 0;
      acts++;
      if (s[k].total && s[k].score === s[k].total) done++;
    });
    return { score, total, done, acts };
  }

  /* ---------------------------------------------------------
     SÜRÜKLE–BIRAK (pointer tabanlı, dokunmatik uyumlu)
     --------------------------------------------------------- */
  let drag = null;      // aktif sürükleme
  let picked = null;    // tıklayarak seçilmiş blok (.chip)
  let pickedBox = null; // tıklayarak seçilmiş kelime kutusu (.wbox)

  function makeChip(value, extraCls) {
    const c = el('button', 'chip' + (extraCls ? ' ' + extraCls : ''), '');
    c.type = 'button';
    c.textContent = value;
    c.dataset.val = value;
    return c;
  }

  function clearPick() {
    if (picked) picked.classList.remove('picked');
    picked = null;
  }
  function clearPickedBox() {
    if (pickedBox) pickedBox.classList.remove('picked');
    pickedBox = null;
  }

  function slotPut(slot, value) {
    slot.textContent = '';
    slot.appendChild(makeChip(value));
    slot.classList.add('filled');
    slot.classList.remove('ok', 'bad');
    slot.dispatchEvent(new CustomEvent('uz:change', { bubbles: true }));
  }

  function slotClear(slot) {
    slot.textContent = '';
    slot.classList.remove('filled', 'ok', 'bad');
    slot.dispatchEvent(new CustomEvent('uz:change', { bubbles: true }));
  }

  const slotValue = (slot) => {
    const c = slot.querySelector('.chip');
    return c ? c.dataset.val : '';
  };

  function startDrag(ev, src, kind) {
    const rect = src.getBoundingClientRect();
    const ghost = src.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.classList.remove('picked', 'dragging');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    document.body.appendChild(ghost);

    drag = {
      kind, src, ghost,
      x0: ev.clientX, y0: ev.clientY,
      moved: false,
      fromSlot: kind === 'chip' ? src.closest('.slot') : null,
      row: kind === 'box' ? src.closest('.order-row') : null
    };
    moveGhost(ev.clientX, ev.clientY);
  }

  function moveGhost(x, y) {
    if (!drag) return;
    drag.ghost.style.left = x + 'px';
    drag.ghost.style.top = y + 'px';
  }

  function hitTest(x, y, sel) {
    const node = document.elementFromPoint(x, y);
    return node ? node.closest(sel) : null;
  }

  function clearOver() {
    document.querySelectorAll('.slot.over, .order-row.over').forEach((n) => n.classList.remove('over'));
  }

  document.addEventListener('pointerdown', (ev) => {
    if (ev.button !== undefined && ev.button !== 0) return;
    const chip = ev.target.closest('.chip');
    if (chip && !chip.disabled) {
      startDrag(ev, chip, 'chip');
      return;
    }
    const box = ev.target.closest('.wbox');
    if (box && !box.disabled) {
      startDrag(ev, box, 'box');
    }
  });

  document.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    if (!drag.moved) {
      if (Math.abs(ev.clientX - drag.x0) < 6 && Math.abs(ev.clientY - drag.y0) < 6) return;
      drag.moved = true;
      drag.ghost.style.display = '';
      if (drag.kind === 'box') drag.src.classList.add('dragging');
      clearPick();
      clearPickedBox();
    }
    ev.preventDefault();
    moveGhost(ev.clientX, ev.clientY);
    clearOver();

    if (drag.kind === 'chip') {
      const slot = hitTest(ev.clientX, ev.clientY, '.slot');
      if (slot) slot.classList.add('over');
    } else {
      // kelime kutusunu canlı olarak yeniden sırala (satır kaydırmalı da olsa)
      const row = drag.row;
      if (!row) return;
      row.classList.add('over');
      let ref = null;
      for (const c of row.children) {
        if (c === drag.src) continue;
        const r = c.getBoundingClientRect();
        const beforeLine = ev.clientY < r.top;
        const onLine = ev.clientY <= r.bottom && ev.clientX < r.left + r.width / 2;
        if (beforeLine || onLine) { ref = c; break; }
      }
      if (ref !== drag.src.nextElementSibling) row.insertBefore(drag.src, ref);
    }
  }, { passive: false });

  function endDrag(ev) {
    if (!drag) return;
    const d = drag;
    drag = null;
    d.ghost.remove();
    clearOver();

    if (d.kind === 'box') {
      d.src.classList.remove('dragging');
      if (d.moved) {
        d.row.dispatchEvent(new CustomEvent('uz:change', { bubbles: true }));
        d.row.classList.remove('ok', 'bad');
        d.row.closest('li')?.classList.remove('row-ok', 'row-bad');
      } else {
        // tıklama: seç → ikinci tıklamada yer değiştir
        if (pickedBox && pickedBox !== d.src && pickedBox.parentElement === d.src.parentElement) {
          const row = d.src.parentElement;
          const a = pickedBox, b = d.src;
          const marker = document.createElement('span');
          row.insertBefore(marker, a);
          row.insertBefore(a, b);
          row.insertBefore(b, marker);
          marker.remove();
          clearPickedBox();
          row.dispatchEvent(new CustomEvent('uz:change', { bubbles: true }));
          row.classList.remove('ok', 'bad');
          row.closest('li')?.classList.remove('row-ok', 'row-bad');
        } else {
          const again = pickedBox === d.src;
          clearPickedBox();
          if (!again) { pickedBox = d.src; d.src.classList.add('picked'); }
        }
      }
      return;
    }

    /* chip */
    if (!d.moved) {
      if (d.fromSlot) {
        slotClear(d.fromSlot);            // yerleştirilmiş bloğa tıkla → kaldır
        clearPick();
      } else {
        const again = picked === d.src;
        clearPick();
        if (!again) { picked = d.src; d.src.classList.add('picked'); }
      }
      return;
    }

    const slot = hitTest(ev.clientX, ev.clientY, '.slot');
    if (slot) {
      if (d.fromSlot && d.fromSlot !== slot) slotClear(d.fromSlot);
      slotPut(slot, d.src.dataset.val);   // bankadaki blok yerinde kalır (bitmez)
    } else if (d.fromSlot) {
      slotClear(d.fromSlot);              // dışarı bırakıldı → boşluğu temizle
    }
    clearPick();
  }

  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  /* boşluğa tıklama: seçili blok varsa yerleştir, yoksa temizle */
  document.addEventListener('click', (ev) => {
    const slot = ev.target.closest('.slot');
    if (!slot || ev.target.closest('.chip')) return;
    if (picked) { slotPut(slot, picked.dataset.val); clearPick(); }
    else if (slot.classList.contains('filled')) slotClear(slot);
  });

  /* klavye: blok seç → boşlukta Enter */
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const slot = ev.target.closest('.slot');
    if (slot && picked) { ev.preventDefault(); slotPut(slot, picked.dataset.val); clearPick(); }
  });

  /* ---------------------------------------------------------
     parça üreticileri
     --------------------------------------------------------- */
  /** "I ___ ten." metnini parçalayıp boşlukları döndürür */
  function fillText(target, text, opts) {
    const o = opts || {};
    const parts = String(text).split('___');
    const slots = [];
    parts.forEach((part, i) => {
      if (part) target.appendChild(document.createTextNode(part));
      if (i < parts.length - 1) {
        if (o.number) {
          const n = el('span', 'n');
          n.textContent = o.start + slots.length;
          target.appendChild(n);
        }
        const s = o.make ? o.make() : newSlot(o.hint, o.wide);
        target.appendChild(s);
        slots.push(s);
      }
    });
    return slots;
  }

  function newSlot(hint, wide) {
    const s = el('span', 'slot' + (wide ? ' wide' : ''));
    s.dataset.hint = hint || '?';
    s.tabIndex = 0;
    s.setAttribute('role', 'button');
    s.setAttribute('aria-label', 'boşluk');
    return s;
  }

  function bankNode(values, sticky) {
    const b = el('div', 'bank' + (sticky ? ' sticky' : ''));
    b.appendChild(el('span', 'bank-label', 'blokları sürükle · bitmez'));
    values.forEach((v) => b.appendChild(makeChip(v, 'infinite')));
    return b;
  }

  function cardShell(a) {
    const card = el('section', 'card' + (a.challenge ? ' challenge' : ''));
    if (a.tag) card.id = 'ex-' + a.tag;
    const h = el('header', 'card-h');
    if (a.tag) h.appendChild(el('span', 'tag', a.tag));
    const hd = el('div', 'hd');
    hd.appendChild(el('h2', null, a.title || ''));
    if (a.tr) hd.appendChild(el('p', 'tr', a.tr));
    h.appendChild(hd);
    const score = el('span', 'score', '');
    score.hidden = true;
    h.appendChild(score);
    card.appendChild(h);
    return { card, score };
  }

  function actionBar(card, api, a) {
    const bar = el('div', 'actions');
    const check = el('button', 'btn sm', 'Kontrol et');
    check.type = 'button';
    check.onclick = () => { api.check(); api.persist(); };
    const reset = el('button', 'btn ghost sm', 'Temizle');
    reset.type = 'button';
    reset.onclick = () => { api.reset(); api.persist(); };
    const show = el('button', 'btn warn sm', 'Cevapları göster');
    show.type = 'button';
    show.onclick = () => api.reveal();
    bar.appendChild(check);
    bar.appendChild(reset);
    bar.appendChild(el('span', 'spacer'));
    if (a.reveal !== false) bar.appendChild(show);
    card.appendChild(bar);
  }

  function setScore(node, got, total) {
    node.hidden = false;
    node.textContent = got + ' / ' + total;
    node.classList.toggle('good', got === total);
    node.classList.toggle('mid', got !== total);
  }

  function itemsList(cols) {
    return el('ol', 'items' + (cols ? ' cols-' + cols : ''));
  }

  /* ---------------------------------------------------------
     TİP: drag — boşluğa blok sürükleme
     --------------------------------------------------------- */
  function renderDrag(a) {
    const { card, score } = cardShell(a);
    card.appendChild(bankNode(a.bank, a.sticky !== false));
    const list = itemsList(a.cols);
    const rows = [];

    a.items.forEach((it) => {
      const li = el('li');
      const answers = Array.isArray(it.a) ? it.a : [it.a];
      const slots = fillText(li, it.q, { hint: a.hint || '?', wide: a.wide });
      list.appendChild(li);
      rows.push({ li, slots, answers });
    });

    card.appendChild(list);

    const api = {
      total: rows.reduce((n, r) => n + r.slots.length, 0),
      check() {
        let got = 0;
        rows.forEach((r) => {
          let all = true;
          r.slots.forEach((s, i) => {
            const ok = norm(slotValue(s)) === norm(r.answers[i]);
            s.classList.toggle('ok', ok);
            s.classList.toggle('bad', !ok);
            if (ok) got++; else all = false;
          });
          r.li.classList.toggle('row-ok', all);
          r.li.classList.toggle('row-bad', !all);
        });
        setScore(score, got, api.total);
        api.got = got;
        return got;
      },
      reveal() {
        rows.forEach((r) => {
          r.slots.forEach((s, i) => { slotPut(s, r.answers[i]); s.classList.add('ok'); });
          r.li.classList.add('row-ok');
          r.li.classList.remove('row-bad');
        });
        setScore(score, api.total, api.total);
        api.got = api.total;
      },
      reset() {
        rows.forEach((r) => {
          r.slots.forEach(slotClear);
          r.li.classList.remove('row-ok', 'row-bad');
        });
        score.hidden = true;
        api.got = 0;
      },
      getState: () => rows.map((r) => r.slots.map(slotValue)),
      setState(st) {
        if (!Array.isArray(st)) return;
        rows.forEach((r, i) => (st[i] || []).forEach((v, j) => { if (v && r.slots[j]) slotPut(r.slots[j], v); }));
      }
    };
    actionBar(card, api, a);
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: cloze — paragrafa blok sürükleme
     --------------------------------------------------------- */
  function renderCloze(a) {
    const { card, score } = cardShell(a);
    card.appendChild(bankNode(a.bank, a.sticky !== false));
    const p = el('p', 'reading');
    const slots = fillText(p, a.text, { hint: '?', number: true, start: 1 });
    card.appendChild(p);

    const api = {
      total: slots.length,
      check() {
        let got = 0;
        slots.forEach((s, i) => {
          const ok = norm(slotValue(s)) === norm(a.answers[i]);
          s.classList.toggle('ok', ok);
          s.classList.toggle('bad', !ok);
          if (ok) got++;
        });
        setScore(score, got, api.total);
        api.got = got;
        return got;
      },
      reveal() {
        slots.forEach((s, i) => { slotPut(s, a.answers[i]); s.classList.add('ok'); });
        setScore(score, api.total, api.total);
        api.got = api.total;
      },
      reset() { slots.forEach(slotClear); score.hidden = true; api.got = 0; },
      getState: () => slots.map(slotValue),
      setState(st) {
        if (!Array.isArray(st)) return;
        st.forEach((v, i) => { if (v && slots[i]) slotPut(slots[i], v); });
      }
    };
    actionBar(card, api, a);
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: type — klavyeyle yazma
     --------------------------------------------------------- */
  function renderType(a) {
    const { card, score } = cardShell(a);
    const list = itemsList(a.cols);
    const rows = [];

    a.items.forEach((it) => {
      const li = el('li');
      const answers = (Array.isArray(it.a) ? it.a : [it.a]).map(String);
      if (it.q) {
        li.appendChild(document.createTextNode(it.q + ' '));
        li.appendChild(el('span', 'arrow', '→'));
        li.appendChild(document.createTextNode(' '));
      }
      const input = el('input', 'ti ' + (a.size || 'lg'));
      input.type = 'text';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.placeholder = a.placeholder || '…';
      input.setAttribute('aria-label', it.q || 'cevap');
      input.oninput = () => { input.classList.remove('ok', 'bad'); li.classList.remove('row-ok', 'row-bad'); };
      li.appendChild(input);
      const sol = el('span', 'solution', answers[0]);
      sol.hidden = true;
      li.appendChild(sol);
      list.appendChild(li);
      rows.push({ li, input, answers, sol });
    });

    card.appendChild(list);

    const api = {
      total: rows.length,
      check() {
        let got = 0;
        rows.forEach((r) => {
          const v = norm(r.input.value);
          const ok = !!v && r.answers.some((ans) => norm(ans) === v);
          r.input.classList.toggle('ok', ok);
          r.input.classList.toggle('bad', !ok);
          r.li.classList.toggle('row-ok', ok);
          r.li.classList.toggle('row-bad', !ok);
          r.sol.hidden = ok;
          if (ok) got++;
        });
        setScore(score, got, api.total);
        api.got = got;
        return got;
      },
      reveal() {
        rows.forEach((r) => {
          r.input.value = r.answers[0];
          r.input.classList.add('ok');
          r.input.classList.remove('bad');
          r.li.classList.add('row-ok');
          r.li.classList.remove('row-bad');
          r.sol.hidden = true;
        });
        setScore(score, api.total, api.total);
        api.got = api.total;
      },
      reset() {
        rows.forEach((r) => {
          r.input.value = '';
          r.input.classList.remove('ok', 'bad');
          r.li.classList.remove('row-ok', 'row-bad');
          r.sol.hidden = true;
        });
        score.hidden = true;
        api.got = 0;
      },
      getState: () => rows.map((r) => r.input.value),
      setState(st) { if (Array.isArray(st)) rows.forEach((r, i) => { if (st[i]) r.input.value = st[i]; }); }
    };
    actionBar(card, api, a);
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: choice — seçeneğe tıklama (True/False dahil)
     --------------------------------------------------------- */
  function renderChoice(a) {
    const { card, score } = cardShell(a);
    const list = itemsList(a.cols);
    const rows = [];

    a.items.forEach((it) => {
      const li = el('li');
      const opts = it.opts || a.opts;
      const group = el('span', 'opts');
      const buttons = opts.map((o) => {
        const b = el('button', 'opt', '');
        b.type = 'button';
        b.textContent = o;
        b.dataset.val = o;
        b.setAttribute('aria-pressed', 'false');
        b.onclick = () => {
          buttons.forEach((x) => {
            x.setAttribute('aria-pressed', String(x === b));
            x.classList.remove('ok', 'bad', 'show-ans');
          });
          li.classList.remove('row-ok', 'row-bad');
        };
        group.appendChild(b);
        return b;
      });

      if (String(it.q).includes('___')) {
        fillText(li, it.q, { make: () => group });
      } else {
        li.appendChild(document.createTextNode(it.q + ' '));
        li.appendChild(group);
      }
      if (it.tail) li.appendChild(document.createTextNode(' ' + it.tail));
      list.appendChild(li);
      rows.push({ li, buttons, answer: String(it.a) });
    });

    card.appendChild(list);

    const pickedBtn = (r) => r.buttons.find((b) => b.getAttribute('aria-pressed') === 'true');

    const api = {
      total: rows.length,
      check() {
        let got = 0;
        rows.forEach((r) => {
          const sel = pickedBtn(r);
          const ok = !!sel && norm(sel.dataset.val) === norm(r.answer);
          r.buttons.forEach((b) => b.classList.remove('ok', 'bad', 'show-ans'));
          if (sel) sel.classList.add(ok ? 'ok' : 'bad');
          r.li.classList.toggle('row-ok', ok);
          r.li.classList.toggle('row-bad', !ok);
          if (ok) got++;
        });
        setScore(score, got, api.total);
        api.got = got;
        return got;
      },
      reveal() {
        rows.forEach((r) => {
          r.buttons.forEach((b) => {
            const ok = norm(b.dataset.val) === norm(r.answer);
            b.setAttribute('aria-pressed', String(ok));
            b.classList.remove('bad', 'show-ans');
            b.classList.toggle('ok', ok);
          });
          r.li.classList.add('row-ok');
          r.li.classList.remove('row-bad');
        });
        setScore(score, api.total, api.total);
        api.got = api.total;
      },
      reset() {
        rows.forEach((r) => {
          r.buttons.forEach((b) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('ok', 'bad', 'show-ans'); });
          r.li.classList.remove('row-ok', 'row-bad');
        });
        score.hidden = true;
        api.got = 0;
      },
      getState: () => rows.map((r) => { const b = pickedBtn(r); return b ? b.dataset.val : ''; }),
      setState(st) {
        if (!Array.isArray(st)) return;
        rows.forEach((r, i) => {
          const v = st[i];
          if (!v) return;
          r.buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === v)));
        });
      }
    };
    actionBar(card, api, a);
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: order — kelime kutularını taşıyarak sıralama
     --------------------------------------------------------- */
  function renderOrder(a) {
    const { card, score } = cardShell(a);
    const list = itemsList(a.cols);
    const rows = [];

    a.items.forEach((it) => {
      const answer = it.a.map(String);
      const words = it.words ? it.words.map(String) : scramble(answer);

      const li = el('li');
      const row = el('div', 'order-row');
      row.setAttribute('role', 'list');
      scramble(words).forEach((w) => {
        const b = el('button', 'wbox' + (PUNCT.test(w) ? ' punct' : ''), '');
        b.type = 'button';
        b.textContent = w;
        b.dataset.val = w;
        row.appendChild(b);
      });
      li.appendChild(row);
      const sol = el('span', 'solution', joinTokens(answer));
      sol.hidden = true;
      li.appendChild(sol);
      list.appendChild(li);
      rows.push({ li, row, answer, sol });
    });

    card.appendChild(list);

    const rowTokens = (row) => Array.from(row.children).map((c) => c.dataset.val);

    const api = {
      total: rows.length,
      check() {
        let got = 0;
        rows.forEach((r) => {
          const ok = norm(joinTokens(rowTokens(r.row))) === norm(joinTokens(r.answer));
          r.row.classList.toggle('ok', ok);
          r.row.classList.toggle('bad', !ok);
          r.li.classList.toggle('row-ok', ok);
          r.li.classList.toggle('row-bad', !ok);
          r.sol.hidden = ok;
          if (ok) got++;
        });
        setScore(score, got, api.total);
        api.got = got;
        return got;
      },
      reveal() {
        rows.forEach((r) => {
          const boxes = {};
          Array.from(r.row.children).forEach((c) => {
            (boxes[norm(c.dataset.val)] = boxes[norm(c.dataset.val)] || []).push(c);
          });
          r.answer.forEach((w) => {
            const bucket = boxes[norm(w)];
            if (bucket && bucket.length) r.row.appendChild(bucket.shift());
          });
          r.row.classList.add('ok');
          r.row.classList.remove('bad');
          r.li.classList.add('row-ok');
          r.li.classList.remove('row-bad');
          r.sol.hidden = true;
        });
        setScore(score, api.total, api.total);
        api.got = api.total;
      },
      reset() {
        rows.forEach((r) => {
          scramble(rowTokens(r.row)).forEach((w) => {
            const b = Array.from(r.row.children).find((c) => c.dataset.val === w && !c.dataset.moved);
            if (b) { b.dataset.moved = '1'; r.row.appendChild(b); }
          });
          Array.from(r.row.children).forEach((c) => delete c.dataset.moved);
          r.row.classList.remove('ok', 'bad');
          r.li.classList.remove('row-ok', 'row-bad');
          r.sol.hidden = true;
        });
        score.hidden = true;
        api.got = 0;
      },
      getState: () => rows.map((r) => rowTokens(r.row)),
      setState(st) {
        if (!Array.isArray(st)) return;
        rows.forEach((r, i) => {
          const want = st[i];
          if (!Array.isArray(want)) return;
          const pool = Array.from(r.row.children);
          if (pool.length !== want.length) return;
          want.forEach((w) => {
            const idx = pool.findIndex((c) => c.dataset.val === w);
            if (idx > -1) r.row.appendChild(pool.splice(idx, 1)[0]);
          });
        });
      }
    };
    actionBar(card, api, a);
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: free — serbest yazma
     --------------------------------------------------------- */
  function renderFree(a) {
    const { card } = cardShell(a);
    const ta = el('textarea', 'free');
    ta.placeholder = a.placeholder || 'Buraya yaz…';
    ta.rows = a.rows || 6;
    card.appendChild(ta);
    if (a.note) card.appendChild(el('p', 'tip', a.note));

    const api = {
      total: 0,
      check() { api.got = 0; return 0; },
      reveal() {},
      reset() { ta.value = ''; },
      getState: () => ta.value,
      setState(st) { if (typeof st === 'string') ta.value = st; }
    };
    return { node: card, api };
  }

  /* ---------------------------------------------------------
     TİP: rule — kural kutusu
     --------------------------------------------------------- */
  function renderRule(a) {
    const box = el('div', 'rulebox');
    if (a.title) box.appendChild(el('h2', null, a.title));
    box.insertAdjacentHTML('beforeend', a.html || '');
    return { node: box, api: null };
  }

  const RENDERERS = {
    rule: renderRule,
    drag: renderDrag,
    cloze: renderCloze,
    type: renderType,
    choice: renderChoice,
    order: renderOrder,
    free: renderFree
  };

  /* ---------------------------------------------------------
     mount
     --------------------------------------------------------- */
  function mount(cfg) {
    const host = typeof cfg.container === 'string' ? $(cfg.container) : cfg.container;
    if (!host) throw new Error('UZ.mount: container bulunamadı');

    const unit = cfg.unit;
    const saved = load(stateKey(unit), {});
    const scores = load(scoreKey(unit), {});
    const parts = [];

    cfg.activities.forEach((a, idx) => {
      const make = RENDERERS[a.type];
      if (!make) { console.warn('UZ: bilinmeyen tip', a.type); return; }
      if (a.type === 'order') verifyOrder(a);
      const built = make(a);
      host.appendChild(built.node);
      if (!built.api) return;

      const key = a.tag || 't' + idx;
      const api = built.api;
      api.got = 0;
      api.key = key;
      api.persist = () => {
        const st = load(stateKey(unit), {});
        st[key] = api.getState();
        save(stateKey(unit), st);
        if (api.total) {
          const sc = load(scoreKey(unit), {});
          sc[key] = { score: api.got || 0, total: api.total };
          save(scoreKey(unit), sc);
        }
        updateProgress();
      };
      if (saved[key] != null) api.setState(saved[key]);
      if (scores[key]) api.got = scores[key].score;

      built.node.addEventListener('uz:change', () => {
        clearTimeout(api._t);
        api._t = setTimeout(() => {
          const st = load(stateKey(unit), {});
          st[key] = api.getState();
          save(stateKey(unit), st);
        }, 250);
      });
      built.node.addEventListener('input', () => {
        clearTimeout(api._t);
        api._t = setTimeout(() => {
          const st = load(stateKey(unit), {});
          st[key] = api.getState();
          save(stateKey(unit), st);
        }, 400);
      });

      parts.push(api);
    });

    /* ----- üst bar: ilerleme + hepsini kontrol ----- */
    const fill = $('.progress-bar .track i');
    const count = $('.progress-bar .count');

    function updateProgress() {
      const total = parts.reduce((n, p) => n + p.total, 0);
      const got = parts.reduce((n, p) => n + (p.got || 0), 0);
      if (fill) fill.style.width = (total ? (got / total) * 100 : 0) + '%';
      if (count) count.innerHTML = 'Doğru: <b>' + got + '</b> / ' + total;
    }

    const allBtn = $('[data-act="check-all"]');
    if (allBtn) allBtn.onclick = () => {
      let got = 0, total = 0;
      parts.forEach((p) => { if (p.total) { got += p.check(); total += p.total; p.persist(); } });
      toast(total && got === total ? 'Harika! Hepsi doğru 🎉' : 'Doğru: ' + got + ' / ' + total);
      const firstBad = $('.row-bad');
      if (firstBad && got !== total) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const resetBtn = $('[data-act="reset-all"]');
    if (resetBtn) resetBtn.onclick = () => {
      if (!confirm('Bu ünitedeki tüm cevaplar silinecek. Emin misin?')) return;
      parts.forEach((p) => { p.reset(); p.got = 0; });
      save(stateKey(unit), {});
      save(scoreKey(unit), {});
      updateProgress();
      toast('Temizlendi.');
    };

    updateProgress();
    return parts;
  }

  /** order aktivitelerinde kutular ile cevap eşleşiyor mu? (geliştirme kontrolü) */
  function verifyOrder(a) {
    a.items.forEach((it, i) => {
      if (!it.words) return;
      const k = (arr) => arr.map(norm).sort().join('|');
      if (k(it.words) !== k(it.a)) {
        console.warn('UZ order uyuşmazlığı [' + a.tag + '#' + (i + 1) + ']:', it.words, '≠', it.a);
      }
    });
  }

  /* ---------------------------------------------------------
     hub: ünite kartlarına ilerleme bas
     --------------------------------------------------------- */
  function paintProgress() {
    document.querySelectorAll('[data-unit]').forEach((node) => {
      const p = progressOf(node.dataset.unit);
      const slot = node.querySelector('[data-progress]');
      if (!slot) return;
      if (!p.total) { slot.textContent = 'henüz başlanmadı'; return; }
      const pct = Math.round((p.score / p.total) * 100);
      slot.innerHTML = '<span class="pill ' + (pct === 100 ? 'done' : 'live') + '">' +
        (pct === 100 ? '✓ tamam' : pct + '% doğru') + '</span>';
    });
  }

  document.addEventListener('DOMContentLoaded', () => { initTheme(); paintProgress(); });

  return { mount, progressOf, toast, applyTheme, norm, joinTokens };
})();
