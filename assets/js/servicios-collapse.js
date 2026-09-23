(function () {
  var uid = 0;

  function makeCollapsible(item, exclusiveGroup) {
    var title = item.querySelector("h3");
    var body = item.querySelector("p");
    if (!title || !body || item.classList.contains("rvl-item")) return;

    var textWrap = document.createElement("span");
    textWrap.className = "rvl-title-text";
    while (title.firstChild) {
      textWrap.appendChild(title.firstChild);
    }
    title.appendChild(textWrap);

    var icon = document.createElement("span");
    icon.className = "rvl-icon";
    icon.setAttribute("aria-hidden", "true");
    title.appendChild(icon);

    uid++;
    var bodyId = "rvl-panel-" + uid;
    body.id = bodyId;
    body.classList.add("rvl-body");
    body.style.maxHeight = "0px";

    item.classList.add("rvl-item");
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");
    item.setAttribute("aria-expanded", "false");
    item.setAttribute("aria-controls", bodyId);

    function close(el) {
      var b = el.querySelector(".rvl-body");
      el.classList.remove("is-open");
      el.setAttribute("aria-expanded", "false");
      if (b) b.style.maxHeight = "0px";
    }

    function open(el) {
      var b = el.querySelector(".rvl-body");
      el.classList.add("is-open");
      el.setAttribute("aria-expanded", "true");
      if (b) b.style.maxHeight = b.scrollHeight + "px";
    }

    function toggle() {
      var isOpen = item.classList.contains("is-open");
      if (exclusiveGroup) {
        exclusiveGroup.forEach(function (sibling) {
          if (sibling !== item) close(sibling);
        });
      }
      isOpen ? close(item) : open(item);
    }

    item.addEventListener("click", toggle);
    item.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  }

  var groups = [
    { container: ".benefits-grid", item: ".benefit", exclusive: false },
    { container: ".process-grid", item: ".process-step", exclusive: false },
    { container: ".why-grid", item: ".why-card", exclusive: false },
    { container: ".types-grid", item: ".type-card", exclusive: false },
    { container: ".features-grid", item: ".feature-item", exclusive: false },
    { container: ".audit-grid", item: ".audit-item", exclusive: false },
    { container: ".faq-grid", item: ".faq-item", exclusive: true },
  ];

  groups.forEach(function (g) {
    Array.prototype.forEach.call(
      document.querySelectorAll(g.container),
      function (container) {
        var items = Array.prototype.slice.call(
          container.querySelectorAll(g.item),
        );
        items.forEach(function (item) {
          makeCollapsible(item, g.exclusive ? items : null);
        });
      },
    );
  });

  window.addEventListener("resize", function () {
    Array.prototype.forEach.call(
      document.querySelectorAll(".rvl-item.is-open .rvl-body"),
      function (b) {
        b.style.maxHeight = b.scrollHeight + "px";
      },
    );
  });
})();
