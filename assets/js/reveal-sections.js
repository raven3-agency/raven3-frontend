(function () {
  function setupToggleGroup(itemSelector, toggleSelector, panelSelector, exclusive) {
    var items = Array.prototype.slice.call(document.querySelectorAll(itemSelector));
    if (!items.length) return;

    function getToggle(item) {
      return toggleSelector ? item.querySelector(toggleSelector) : item;
    }

    function close(item) {
      var toggle = getToggle(item);
      var panel = item.querySelector(panelSelector);
      item.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      panel.style.maxHeight = '0px';
    }

    function open(item) {
      var toggle = getToggle(item);
      var panel = item.querySelector(panelSelector);
      item.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }

    items.forEach(function (item) {
      var toggle = getToggle(item);
      var panel = item.querySelector(panelSelector);
      if (!toggle || !panel) return;

      function handleToggle() {
        var isOpen = item.classList.contains('open');
        if (exclusive) {
          items.forEach(function (other) {
            if (other !== item && other.classList.contains('open')) close(other);
          });
        }
        isOpen ? close(item) : open(item);
      }

      toggle.addEventListener('click', handleToggle);

      if (toggle === item) {
        toggle.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        });
      }
    });

    window.addEventListener('resize', function () {
      items.forEach(function (item) {
        if (!item.classList.contains('open')) return;
        var panel = item.querySelector(panelSelector);
        panel.style.maxHeight = panel.scrollHeight + 'px';
      });
    });
  }

  setupToggleGroup('.faq-item', '.faq-q', '.faq-a', true);
  setupToggleGroup('.dif-item', null, '.dif-item__answer', false);
  setupToggleGroup('.proceso-step .paso-content', null, '.paso-desc', false);
})();
