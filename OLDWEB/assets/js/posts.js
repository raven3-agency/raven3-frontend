const posts=[{title:"¿Cómo ganar nuevos clientes a través del SEO?",image_url:"../assets/img/blog/como-ganar-nuevos-clientes-a-traves-del-seo.jpg",href:"como-ganar-nuevos-clientes-a-traves-del-seo",alt:"como ganar nuevos clientes a traves del seo",},{title:"Qué son las palabras clave y cómo usarlas",image_url:"../assets/img/blog/que-son-las-palabras-clave-y-como-usarlas.jpg",href:"que-son-las-palabras-clave-y-como-usarlas",alt:"que son las palabras clave y como usarlas",},{title:"¿Cómo hacer publicidad en redes sociales? 10 claves para maximizar tus resultados",image_url:"../assets/img/blog/como-hacer-publicidad-en-redes-sociales.jpg",href:"como-hacer-publicidad-en-redes-sociales",alt:"como hacer publicidad en redes sociales 10 claves para maximizar tus resultados",},];const posts2=[{title:"Claves del diseño web profesional",image_url:"../assets/img/blog/claves-del-diseno-web-profesional.jpg",href:"claves-del-diseno-web-profesional",alt:"claves del disenio web profesional",},{title:"Cómo promocionar tu empresa en las fiestas",image_url:"../assets/img/blog/como-promocionar-tu-empresa-en-las-fiestas.jpeg",href:"como-promocionar-tu-empresa-en-las-fiestas",alt:"como promocionar tu empresa en las fiestas",},{title:"E-Commerce: ¿Cómo crear una tienda online?",image_url:"../assets/img/blog/e-commerce-como-crear-una-tienda-online.jpeg",href:"como-crear-una-tienda-online",alt:"como crear una tienda online",},];function renderPosts(containerId,items){const container=document.getElementById(containerId);if(!container)return;items.forEach((post,i)=>{const el=document.createElement("div");el.className="col-lg-4 col-md-4 mx-1";el.innerHTML=`
      <article class="single-blog mx-3" aria-label="${post.title}">
        <div class="single-blog-img p-3">
          <a href="${post.href}">
            <img src="${post.image_url}" alt="${post.alt}" loading="lazy" decoding="async" />
          </a>
        </div>
        <div class="blog-text">
          <h2 class="h6 m-0" style="font-size:18px;">
            <a href="${post.href}">${post.title}</a>
          </h2>
        </div>
        <span>
          <a href="${post.href}" class="ready-btn">Leer más…</a>
        </span>
        <p aria-hidden="true">&nbsp;</p>
      </article>
    `;container.appendChild(el)})}
if(typeof document!=="undefined"){if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",()=>{renderPosts("blog-posts",posts);renderPosts("blog-posts2",posts2)})}else{renderPosts("blog-posts",posts);renderPosts("blog-posts2",posts2)}}