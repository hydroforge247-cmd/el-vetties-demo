// Runs in <head> before first paint: ?theme= link > visitor's saved choice > SA clock (night 18:00-06:00).
(function () {
  var d = document.documentElement, t = null;
  try { t = new URLSearchParams(location.search).get('theme'); } catch (e) {}
  if (t !== 'night' && t !== 'day') { try { t = localStorage.getItem('ev-theme'); } catch (e) {} }
  if (t !== 'night' && t !== 'day') {
    var h = +new Intl.DateTimeFormat('en-ZA', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Africa/Johannesburg' }).format(new Date());
    t = (h >= 18 || h < 6) ? 'night' : 'day';
  }
  d.dataset.theme = t;
  d.classList.replace('no-js', 'js');
  d.classList.add('ld-on');
})();
