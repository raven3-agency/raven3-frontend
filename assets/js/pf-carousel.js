/* Portfolio Carousel — infinite cascading project slider (clientes.html) */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var track = document.getElementById('pfTrack');
    if (!track) return;

    var total = track.querySelectorAll('.pf-slide').length;
    var counterEl = document.querySelector('.pf-counter');

    function slides() {
      return Array.prototype.slice.call(track.querySelectorAll('.pf-slide'));
    }

    function pad(n) {
      return n < 10 ? '0' + n : '' + n;
    }

    function syncState() {
      var current = slides();
      current.forEach(function (s, i) {
        var trigger = s.querySelector('.pf-slide__peek');
        if (trigger) trigger.setAttribute('aria-expanded', i === 0 ? 'true' : 'false');
      });
      if (counterEl && current[0]) {
        counterEl.textContent = pad(Number(current[0].getAttribute('data-index'))) + ' / ' + pad(total);
      }
    }

    function next() {
      var current = slides();
      track.appendChild(current[0]);
      syncState();
    }

    function prev() {
      var current = slides();
      track.insertBefore(current[current.length - 1], track.firstChild);
      syncState();
    }

    function goTo(slide) {
      var current = slides();
      var idx = current.indexOf(slide);
      if (idx <= 0) return;
      for (var n = 0; n < idx; n++) { track.appendChild(current[n]); }
      syncState();
    }

    slides().forEach(function (slide) {
      var trigger = slide.querySelector('.pf-slide__peek');
      if (!trigger) return;
      trigger.addEventListener('click', function () { goTo(slide); });
      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
      });
    });

    var nextBtn = document.querySelector('.pf-nav__btn--next');
    var prevBtn = document.querySelector('.pf-nav__btn--prev');
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    syncState();
  });
})();
