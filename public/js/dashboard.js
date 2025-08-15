(function(){
  const html = document.documentElement;
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Sidebar toggle
  const hamburger = $('.hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      hamburger.classList.toggle('open');
    });
  }

  // Theme toggle
  const themeToggle = $('#themeToggle');
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) html.setAttribute('data-theme', savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const now = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', now);
      localStorage.setItem('theme', now);
    });
  }

  // Notification bell counter demo
  const bell = $('#notifyBell');
  const badge = bell ? bell.querySelector('.badge') : null;
  let count = 3;
  function updateBadge(){ if (badge) badge.textContent = String(count); }
  updateBadge();
  if (bell) {
    bell.addEventListener('click', () => {
      count = (count + 1) % 20; // demo increment
      updateBadge();
      showToast('New notification received');
    });
  }

  // Ripple effect for gradient buttons
  $$('.btn-grad').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const r = document.createElement('span');
      r.className = 'ripple';
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      r.style.width = r.style.height = size + 'px';
      r.style.left = (e.clientX - rect.left - size/2) + 'px';
      r.style.top  = (e.clientY - rect.top  - size/2) + 'px';
      btn.appendChild(r);
      setTimeout(()=> r.remove(), 600);
    });
  });

  // Toasts with progress
  const toastContainer = $('#toasts');
  function showToast(message, timeout=3000){
    if (!toastContainer) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `
      <div>
        <div style="font-weight:600;margin-bottom:4px;">Notification</div>
        <div style="color:var(--muted)">${message}</div>
      </div>
    `;
    const progress = document.createElement('div');
    progress.className = 'progress';
    el.appendChild(progress);
    toastContainer.appendChild(el);
    requestAnimationFrame(()=>{
      el.classList.add('show');
      progress.animate([
        { transform: 'scaleX(1)' },
        { transform: 'scaleX(0)' }
      ], { duration: timeout, easing: 'linear' });
    });
    setTimeout(()=>{
      el.classList.remove('show');
      setTimeout(()=> el.remove(), 250);
    }, timeout + 50);
  }
  window.DashboardToast = showToast;

  // Charts (Chart.js required)
  function makeCharts(){
    if (!window.Chart) return;

    // Bar chart
    const bar = $('#barChart');
    if (bar) new Chart(bar, {
      type: 'bar',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'Jobs',
          data: [5,7,3,6,8,4,9],
          backgroundColor: 'rgba(99,102,241,.6)',
          borderColor: 'rgba(99,102,241,1)',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: { responsive:true, plugins:{ legend:{ labels:{ color:getComputedStyle(document.documentElement).getPropertyValue('--muted') } } }, scales:{ x:{ ticks:{ color:'var(--muted)' }, grid:{ color:'rgba(148,163,184,.15)'} }, y:{ beginAtZero:true, ticks:{ color:'var(--muted)' }, grid:{ color:'rgba(148,163,184,.15)'} } } }
    });

    // Line chart
    const line = $('#lineChart');
    if (line) new Chart(line, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'],
        datasets: [{
          label: 'Earnings (₹k)',
          data: [12,9,14,18,22,19,25,28,26],
          fill: true,
          borderColor: 'rgba(34,211,238,1)',
          backgroundColor: 'rgba(34,211,238,.2)',
          tension: .35
        }]
      },
      options: { responsive:true, plugins:{ legend:{ labels:{ color:'var(--muted)' } } }, scales:{ x:{ ticks:{ color:'var(--muted)' }, grid:{ color:'rgba(148,163,184,.12)'} }, y:{ ticks:{ color:'var(--muted)' }, grid:{ color:'rgba(148,163,184,.12)'} } } }
    });

    // Doughnut chart
    const dough = $('#doughChart');
    if (dough) new Chart(dough, {
      type: 'doughnut',
      data: {
        labels: ['Open','Active','Completed'],
        datasets: [{
          data: [18,9,23],
          backgroundColor: ['#22c55e','#3b82f6','#f59e0b'],
          borderWidth: 0
        }]
      },
      options: { responsive:true, plugins:{ legend:{ position:'bottom', labels:{ color:'var(--muted)' } } }, cutout:'68%'}
    });
  }
  makeCharts();

  // profile dropdown (basic demo)
  const profile = $('#profile');
  const dropdown = $('#profileMenu');
  if (profile && dropdown) {
    document.addEventListener('click', (e)=>{
      if (profile.contains(e.target)) dropdown.classList.toggle('show');
      else dropdown.classList.remove('show');
    });
  }
})();
