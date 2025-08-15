(function(){
  const container = document.getElementById('toastContainer');
  function toast(message, type = 'info', withProgress = true) {
    if (!container) return;
    const iconMap = {
      success: '<i class="bi bi-check-circle-fill" style="color:#198754;"></i>',
      info: '<i class="bi bi-info-circle-fill" style="color:#0dcaf0;"></i>',
      warning: '<i class="bi bi-exclamation-triangle-fill" style="color:#ffc107;"></i>',
      error: '<i class="bi bi-x-circle-fill" style="color:#dc3545;"></i>'
    };
    const el = document.createElement('div');
    el.className = `toast ${type} show`;

    // content with icon
    const content = document.createElement('div');
    content.className = 'toast-content';
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.innerHTML = iconMap[type] || iconMap.info;
    const text = document.createElement('div');
    text.textContent = message;

    content.appendChild(icon);
    content.appendChild(text);
    el.appendChild(content);

    // progress underline
    if (withProgress) {
      el.classList.add('has-progress');
      const progress = document.createElement('div');
      progress.className = 'toast-progress';
      el.appendChild(progress);
    }

    container.appendChild(el);
    const duration = withProgress ? 3000 : 4000;
    setTimeout(() => el.remove(), duration);
  }

  // Parse URL flags and show specific toasts for actions
  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    let changed = false;

    if (params.get('login') === '1') {
      toast('Login successful! Welcome back', 'success', true);
      params.delete('login'); changed = true;
    }
    if (params.get('signup') === '1') {
      toast('Account created successfully! Welcome', 'success', true);
      params.delete('signup'); changed = true;
    }
    if (params.get('created') === '1') {
      toast('Job created successfully', 'success', true);
      params.delete('created'); changed = true;
    }
    if (params.get('updated') === '1') {
      toast('Job updated', 'success', true);
      params.delete('updated'); changed = true;
    }
    if (params.get('applied') === '1') {
      toast('Application sent', 'success', true);
      params.delete('applied'); changed = true;
    }
    if (params.get('completed') === '1') {
      toast('Job marked as completed', 'success', true);
      params.delete('completed'); changed = true;
    }
    if (params.get('deleted') === '1') {
      toast('Job deleted', 'success', true);
      params.delete('deleted'); changed = true;
    }
    if (params.get('read') === '1') {
      toast('All notifications marked as read', 'info', true);
      params.delete('read'); changed = true;
    }

    if (changed) {
      const path = url.pathname + (params.toString() ? ('?' + params.toString()) : '');
      window.history.replaceState({}, '', path);
    }
  } catch (_) {}

  try {
    const socket = io();
    socket.on('connected', () => {
      try {
        if (sessionStorage.getItem('rtConnectedToastShown') === '1') return;
        sessionStorage.setItem('rtConnectedToastShown', '1');
        // toast('Connected for real-time updates', 'info', true); // optional
      } catch (_) {}
    });
    socket.on('job:new', (p) => toast(`New job posted: ${p.title}`, 'info', true));
    socket.on('job:applied', () => toast('A worker applied to your job', 'success', true));
    socket.on('job:completed', () => toast('A job has been completed', 'success', true));
  } catch (e) {
    // socket.io not loaded or disabled
  }

  // Themed confirmation modal
  function showConfirm(message = 'Are you sure?') {
    return new Promise((resolve) => {
      const el = document.getElementById('confirmModal');
      const msgEl = document.getElementById('confirmModalMessage');
      const btn = document.getElementById('confirmModalConfirmBtn');
      if (!el || !btn || !msgEl) return resolve(confirm(message)); // fallback if modal missing

      msgEl.textContent = message;
      const modal = new bootstrap.Modal(el, { backdrop: 'static' });
      const cleanup = () => {
        btn.removeEventListener('click', onYes);
        el.removeEventListener('hidden.bs.modal', onHide);
      };
      const onYes = () => { cleanup(); modal.hide(); resolve(true); };
      const onHide = () => { cleanup(); resolve(false); };
      btn.addEventListener('click', onYes);
      el.addEventListener('hidden.bs.modal', onHide, { once: true });
      modal.show();
    });
  }

  // Intercept any form with data-confirm and open themed modal
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    form.addEventListener('submit', async (e) => {
      if (form.dataset.confirmHandled) return; // prevent loops
      e.preventDefault();
      const ok = await showConfirm(form.getAttribute('data-confirm') || 'Are you sure?');
      if (ok) {
        form.dataset.confirmHandled = '1';
        form.submit();
      }
    });
  });

  // Add a body class to control sidebar animation depending on auth state if server injected data-auth
  try {
    const body = document.body;
    const isAuth = body.getAttribute('data-auth');
    if (isAuth === 'true') body.classList.add('auth');
    else body.classList.remove('auth');
  } catch (_) {}

  // Scramble text animation for elements with [data-scramble]
  const scrambleEls = document.querySelectorAll('[data-scramble]');
  if (scrambleEls.length) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890";
    scrambleEls.forEach((el) => {
      const original = el.textContent;
      let frame = 0;
      const total = 24; // duration frames
      const animate = () => {
        const progress = frame/total;
        const output = original.split('').map((ch, i) => {
          if (ch === ' ') return ' ';
          if (i < Math.floor(original.length * progress)) return ch;
          return letters[Math.floor(Math.random()*letters.length)];
        }).join('');
        el.textContent = output;
        frame++;
        if (frame <= total) requestAnimationFrame(animate);
        else el.textContent = original;
      };
      // Trigger slightly after load
      setTimeout(animate, 300);
    });
  }

  // Smooth tile-style scramble animation for elements with [data-scramble-tiles]
  const tileTargets = document.querySelectorAll('[data-scramble-tiles]');
  if (tileTargets.length) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const makeTile = (ch) => {
      if (ch === ' ') {
        const s = document.createElement('span');
        s.className = 'scramble-space';
        return s;
      }
      const t = document.createElement('span');
      t.className = 'scramble-tile';
      t.textContent = '•';
      t.setAttribute('aria-hidden', 'true');
      return t;
    };

    tileTargets.forEach((el) => {
      const text = (el.getAttribute('data-text') || el.textContent || '').trim();
      if (!text) return;
      el.textContent = '';
      el.classList.add('scramble-grid');

      const tiles = [];
      Array.from(text).forEach((ch) => {
        const tile = makeTile(ch);
        el.appendChild(tile);
        tiles.push({ el: tile, final: ch, isSpace: ch === ' ', locked: false });
      });

      const baseDelay = 35; // ms per tile offset
      const scrambleDuration = 520; // duration per tile
      const startAt = performance.now() + 150;

      const step = (now) => {
        let active = false;
        tiles.forEach((t, i) => {
          if (t.isSpace) return; // skip spaces
          const localStart = startAt + i * baseDelay;
          const elapsed = now - localStart;
          if (elapsed < 0) { active = true; return; }
          if (elapsed < scrambleDuration) {
            // ease-out: speed slows as it approaches final char
            const progress = Math.min(1, Math.max(0, elapsed / scrambleDuration));
            if (progress < 0.9 || (Math.random() < 0.5)) {
              t.el.textContent = letters[(Math.random() * letters.length) | 0];
            }
            active = true;
          } else if (!t.locked) {
            t.el.textContent = t.final;
            t.el.classList.add('locked');
            t.locked = true;
          }
        });
        if (active) requestAnimationFrame(step);
      };

      requestAnimationFrame(step);
    });
  }
})();
