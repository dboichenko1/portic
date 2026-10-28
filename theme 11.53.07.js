/* ставит тему до первой отрисовки, чтобы не мигало */
(function(){ try { var t = JSON.parse(localStorage.getItem('portik.v1.theme') || '"auto"'); if (t && t !== 'auto') document.documentElement.setAttribute('data-theme', t); } catch (e) {} })();
