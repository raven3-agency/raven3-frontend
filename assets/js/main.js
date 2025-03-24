(function () {
  "use strict";
  var currentYear = new Date().getFullYear();
  document.getElementById("copyright").innerHTML =
    currentYear +
    " © Copyright <strong><span>Agencia raven3</span></strong>. Todos los derechos reservados. Argentina, Buenos Aires.";
  /**
   * Easy selector helper function
   */
  const select = (el, all = false) => {
    el = el.trim();
    return all
      ? [...document.querySelectorAll(el)]
      : document.querySelector(el);
  };
  /**
   * Easy event listener function
   */
  const on = (type, el, listener, all = false) => {
    let selectEl = select(el, all);
    if (selectEl) {
      all
        ? selectEl.forEach((e) => e.addEventListener(type, listener))
        : selectEl.addEventListener(type, listener);
    }
  };
  /**
   * Easy on scroll event listener
   */
  const onscroll = (el, listener) => {
    el.addEventListener("scroll", listener);
  };
  /**
   * Navbar links active state on scroll
   */
  let navbarlinks = select("#navbar .scrollto", true);
  const navbarlinksActive = () => {
    let position = window.scrollY + 200;
    navbarlinks.forEach((navbarlink) => {
      if (!navbarlink.hash) return;
      let section = select(navbarlink.hash);
      if (!section) return;
      if (
        position >= section.offsetTop &&
        position <= section.offsetTop + section.offsetHeight
      ) {
        navbarlink.classList.add("active");
      } else {
        navbarlink.classList.remove("active");
      }
    });
  };
  window.addEventListener("load", navbarlinksActive);
  onscroll(document, navbarlinksActive);
  const scrollto = (el) => {
    let header = select("#header");
    let offset = header.offsetHeight;

    let elementPos = select(el).offsetTop;
    window.scrollTo({
      top: elementPos - offset,
      behavior: "smooth",
    });
  };
  /**
   * Toggle .header-scrolled class to #header when page is scrolled
   */
  let selectHeader = select("#header");
  if (selectHeader) {
    const headerScrolled = () => {
      if (window.scrollY > 100) {
        selectHeader.classList.add("header-scrolled");
      } else {
        selectHeader.classList.remove("header-scrolled");
      }
    };
    window.addEventListener("load", headerScrolled);
    onscroll(document, headerScrolled);
  }
  /**
   * Back to top button
   */
  let backtotop = select(".back-to-top");
  if (backtotop) {
    const toggleBacktotop = () => {
      if (window.scrollY > 100) {
        backtotop.classList.add("active");
      } else {
        backtotop.classList.remove("active");
      }
    };
    window.addEventListener("load", toggleBacktotop);
    onscroll(document, toggleBacktotop);
  }
  /**
   * Mobile nav toggle
   */
  on("click", ".mobile-nav-toggle", function (e) {
    select("#navbar").classList.toggle("navbar-mobile");
    this.classList.toggle("bi-list");
    this.classList.toggle("bi-x");
    let burger = select("#burger");
    if (burger.classList.contains("bi-list")) {
      document.body.style.overflowY = "visible";
    } else {
      document.body.style.overflowY = "hidden";
    }
  });
  /**
   * Mobile nav dropdowns activate
   */
  on(
    "click",
    ".navbar .dropdown > a",
    function (e) {
      if (select("#navbar").classList.contains("navbar-mobile")) {
        e.preventDefault();
        this.nextElementSibling.classList.toggle("dropdown-active");
      }
    },
    true
  );
  /**
   * Scrool with ofset on links with a class name .scrollto
   */
  on(
    "click",
    ".scrollto",
    function (e) {
      if (select(this.hash)) {
        e.preventDefault();

        let navbar = select("#navbar");
        if (navbar.classList.contains("navbar-mobile")) {
          navbar.classList.remove("navbar-mobile");
          let navbarToggle = select(".mobile-nav-toggle");
          navbarToggle.classList.toggle("bi-list");
          navbarToggle.classList.toggle("bi-x");
        }
        scrollto(this.hash);
      }
    },
    true
  );
  /**
   * Scroll with ofset on page load with hash links in the url
   */
  window.addEventListener("load", () => {
    if (window.location.hash) {
      if (select(window.location.hash)) {
        scrollto(window.location.hash);
      }
    }
  });
  /**
   * Preloader
   */
  let preloader = select("#preloader");
  if (preloader) {
    window.addEventListener("load", () => {
      preloader.remove();
    });
  }
  /**
   * Initiate Pure Counter
   */
  new PureCounter();
  /**
   * Animation on scroll
   */
  window.addEventListener("load", () => {
    AOS.init({
      duration: 1000,
      easing: "ease-in-out",
      once: true,
      mirror: false,
    });
  });
  /**
   * Validación de reCAPTCHA
   */
  const validateCaptcha = () => grecaptcha.getResponse().length > 0;
  /**
   * Configuración del formulario y manejo del submit
   */
  var form = document.getElementById("my-form");
  const errorMessage = document.getElementById("error-message");

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Validar reCAPTCHA
      if (!validateCaptcha()) {
        errorMessage.innerText = "¡Falta completar el captcha!";
        errorMessage.style.display = "block";
        return;
      } else {
        errorMessage.style.display = "none";
      }

      form.querySelector(".loading").classList.add("d-block");
      form.querySelector(".error-message").classList.remove("d-block");
      form.querySelector(".sent-message").classList.remove("d-block");

      try {
        const data = new FormData(event.target);
        const response = await fetch(event.target.action, {
          method: form.method,
          body: data,
          headers: { Accept: "application/json" },
        });

        form.querySelector(".loading").classList.remove("d-block");

        if (response.ok) {
          form.querySelector(".sent-message").classList.add("d-block");
          form.reset();
          grecaptcha.reset();
        } else {
          throw new Error("Oops! Hubo un problema al enviar el formulario.");
        }
      } catch (error) {
        form.querySelector(".error-message").innerText = error.message;
        form.querySelector(".error-message").classList.add("d-block");
      }
    });
  }

  // function displayError(thisForm, error) {
  //   thisForm.querySelector(".loading").classList.remove("d-block");
  //   thisForm.querySelector(".error-message").innerHTML = error;
  //   thisForm.querySelector(".error-message").classList.add("d-block");
  // }
})();
