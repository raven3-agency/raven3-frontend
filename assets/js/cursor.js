(function () {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var cursor = document.getElementById('cursor');
  var dot    = document.getElementById('cursor-dot');
  if (!cursor || !dot) return;

  var cx = -100, cy = -100, lx = -100, ly = -100, shown = false, rafId;

  document.addEventListener('mousemove', function (e) {
    cx = e.clientX;
    cy = e.clientY;
    dot.style.transform = 'translate(' + (cx - 3) + 'px,' + (cy - 3) + 'px)';
    if (!shown) {
      shown = true;
      cursor.style.opacity = '0.85';
      dot.style.opacity = '1';
    }
  }, { passive: true });

  document.addEventListener('mouseleave', function () {
    cursor.style.opacity = '0';
    dot.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    cursor.style.opacity = '0.85';
    dot.style.opacity = '1';
  });

  document.addEventListener('mouseover', function (e) {
    if (e.target.closest('a, button, [role="button"]')) {
      cursor.classList.add('hover');
    } else {
      cursor.classList.remove('hover');
    }
  }, { passive: true });

  function tick() {
    rafId = requestAnimationFrame(tick);
    lx += (cx - lx) * 0.13;
    ly += (cy - ly) * 0.13;
    cursor.style.transform = 'translate(' + (lx - 20) + 'px,' + (ly - 20) + 'px)';
  }
  tick();

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
    } else {
      tick();
    }
  });
})();
