// Small shared page behaviors. Loaded with `defer`.
(function () {
  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Cursor-following glow on .flow-card
  document.querySelectorAll('.flow-card').forEach(function (card) {
    if (!card.querySelector('.flow-spot')) {
      var glow = document.createElement('span');
      glow.className = 'flow-spot';
      card.appendChild(glow);
    }
    card.addEventListener('mousemove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', e.clientX - r.left + 'px');
      card.style.setProperty('--my', e.clientY - r.top + 'px');
    });
    card.addEventListener('mouseenter', function () {
      card.classList.add('is-flowing');
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('is-flowing');
    });
  });
})();
