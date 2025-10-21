const posts = [
  {
    title: "¿Cómo ganar nuevos clientes a través del SEO?",
    image_url:
      "../assets/img/blog/como-ganar-nuevos-clientes-a-traves-del-seo.jpg",
    href: "como-ganar-nuevos-clientes-a-traves-del-seo",
    alt: "como ganar nuevos clientes a traves del seo",
  },
  {
    title: "Qué son las palabras clave y cómo usarlas",
    image_url:
      "../assets/img/blog/que-son-las-palabras-clave-y-como-usarlas.jpg",
    href: "que-son-las-palabras-clave-y-como-usarlas",
    alt: "que son las palabras clave y como usarlas",
  },
  {
    title:
      "¿Cómo hacer publicidad en redes sociales? 10 claves para maximizar tus resultados",
    image_url: "../assets/img/blog/como-hacer-publicidad-en-redes-sociales.jpg",
    href: "como-hacer-publicidad-en-redes-sociales",
    alt: "como hacer publicidad en redes sociales 10 claves para maximizar tus resultados",
  },
];

const posts2 = [
  {
    title: "Claves del diseño web profesional",
    image_url: "../assets/img/blog/claves-del-diseno-web-profesional.jpg",
    href: "claves-del-diseno-web-profesional",
    alt: "claves del disenio web profesional",
  },
  {
    title: "Como Promocionar tu empresa en las fiestas",
    image_url:
      "../assets/img/blog/como-promocionar-tu-empresa-en-las-fiestas.jpeg",
    href: "como-promocionar-tu-empresa-en-las-fiestas",
    alt: "como promocionar tu empresa en la fiestas",
  },
  {
    title: "¿E-Commerce: ¿Cómo crear una tienda online?",
    image_url:
      "../assets/img/blog/e-commerce-como-crear-una-tienda-online.jpeg",
    href: "como-crear-una-tienda-online",
    alt: "como crear una tienda online",
  },
];

const blogPostsContainer = document.getElementById("blog-posts");
if (blogPostsContainer) {
  posts.forEach((post) => {
    const postElement = document.createElement("div");
    postElement.className = "col-lg-4 col-md-4 mx-1";
    postElement.id = "PostCard";
    postElement.innerHTML = `
      <div class="single-blog mx-3">
        <div class="single-blog-img p-3">
          <a href="${post.href}"><img src="${post.image_url}" alt="${post.alt}" /></a>
        </div>
        <div class="blog-text">
          <h1 style="font-size: 18px;"><a href="${post.href}">${post.title}</a></h1>
        </div>
        <span>
          <a href="${post.href}" class="ready-btn">Leer más...</a>
        </span>
        <p>&nbsp;</p>
      </div>
      `;
    blogPostsContainer.appendChild(postElement);
  });
}

const blogPostsContainer2 = document.getElementById("blog-posts2");
if (blogPostsContainer2) {
  posts2.forEach((post) => {
    const postElement = document.createElement("div");
    postElement.className = "col-lg-4 col-md-4 mx-1";
    postElement.id = "PostCard";
    postElement.innerHTML = `
      <div class="single-blog mx-3">
        <div class="single-blog-img p-3">
          <a href="${post.href}"><img src="${post.image_url}" alt="${post.alt}" /></a>
        </div>
        <div class="blog-text">
          <h1 style="font-size: 18px;"><a href="${post.href}">${post.title}</a></h1>
        </div>
        <span>
          <a href="${post.href}" class="ready-btn">Leer más...</a>
        </span>
         <p>&nbsp;</p>
      </div>
      `;
    blogPostsContainer2.appendChild(postElement);
  });
}
