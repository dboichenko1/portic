/* Ставит тему до первой отрисовки, чтобы не мигало.
   Плюс страховка: ./?reset сбрасывает кэш приложения (не данные), а если app.js не запустился,
   показывает экран с причиной вместо пустой страницы. */
(function(){
  try { var t = JSON.parse(localStorage.getItem('portik.v1.theme') || '"auto"'); if (t && t !== 'auto') document.documentElement.setAttribute('data-theme', t); } catch (e) {}

  if (/[?&]reset\b/.test(location.search)){
    var done = function(){ location.replace(location.pathname + location.hash); };
    var jobs = [];
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.unregister(); })); })); } catch (e) {}
    try { if (window.caches) jobs.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k); })); })); } catch (e) {}
    Promise.all(jobs).then(done, done);
    return;
  }

  var errors = [];
  window.addEventListener('error', function(e){
    var where = e && e.filename ? e.filename.split('/').pop() + ':' + e.lineno : (e && e.target && (e.target.src || e.target.href) ? 'не загрузился ' + (e.target.src || e.target.href).split('/').pop() : '');
    errors.push((e && e.message ? e.message : 'ошибка загрузки') + (where ? ' (' + where + ')' : ''));
  }, true);
  window.addEventListener('unhandledrejection', function(e){ errors.push('promise: ' + (e && e.reason && (e.reason.message || e.reason) || '')); });

  function check(){
    if (window.__portikBooted) return;
    var main = document.getElementById('main');
    if (main && main.children.length) return;
    var files = ['app.js', 'app.css', 'theme.js'];
    Promise.all(files.map(function(f){ return fetch(f, { cache: 'no-store' }).then(function(r){ return f + ': ' + r.status; }, function(){ return f + ': нет сети'; }); })).then(function(st){
      var box = document.createElement('div');
      box.setAttribute('role', 'alert');
      box.style.cssText = 'position:fixed;inset:0;z-index:99;overflow:auto;background:#F5F5F2;color:#2A2A27;font:16px/1.5 Georgia,serif;padding:calc(24px + env(safe-area-inset-top,0px)) 22px 32px';
      var h = document.createElement('h1'); h.textContent = 'Портик не запустился'; h.style.cssText = 'font-weight:400;font-size:30px;margin:0 0 10px';
      var p = document.createElement('p'); p.textContent = 'Данные на месте, это проблема загрузки кода. Чаще всего помогает сброс кэша. Если нет, скопируй текст ниже и пришли.';
      var pre = document.createElement('pre');
      pre.textContent = st.join('\n') + '\n' + (errors.length ? errors.join('\n') : 'ошибок в консоли нет') + '\n' + location.href + '\n' + navigator.userAgent;
      pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font:12px/1.45 ui-monospace,Menlo,monospace;background:#fff;border:1px solid #DAD9D3;border-radius:12px;padding:12px;margin:14px 0';
      var row = document.createElement('div'); row.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
      var a = document.createElement('a'); a.href = './?reset'; a.textContent = 'Сбросить кэш и перезагрузить';
      a.style.cssText = 'background:#000;color:#fff;border-radius:99px;padding:11px 18px;text-decoration:none';
      var b = document.createElement('button'); b.textContent = 'Скопировать';
      b.style.cssText = 'border:1px solid #DAD9D3;background:transparent;border-radius:99px;padding:11px 18px;font:inherit';
      b.onclick = function(){ try { navigator.clipboard.writeText(pre.textContent).then(function(){ b.textContent = 'Скопировано'; }); } catch (e) {} };
      row.appendChild(a); row.appendChild(b);
      box.appendChild(h); box.appendChild(p); box.appendChild(pre); box.appendChild(row);
      document.body.appendChild(box);
    });
  }
  window.addEventListener('load', function(){ setTimeout(check, 2500); });
})();
