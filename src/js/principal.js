(function () {
  'use strict';

  var raiz = document.documentElement;

  /* Cada funcionalidade roda isolada. Antes, tudo vivia num escopo só e a
     primeira instrução acessava #ano sem guarda: renomear o elemento do
     rodapé lançava TypeError e matava tema, menu, navegação, revelação e
     modal de uma vez. Agora a falha de uma não alcança as outras, e o console
     diz qual quebrou em vez de silenciar a página inteira. */
  function iniciar(nome, fn) {
    try {
      fn();
    } catch (erro) {
      console.error('[site] falha em "' + nome + '":', erro);
    }
  }

  iniciar('ano do rodapé', function () {
    var ano = document.getElementById('ano');
    if (!ano) return;
    ano.textContent = new Date().getFullYear();
  });

  iniciar('tema', function () {
    var botao = document.getElementById('themeToggle');
    var icone = document.getElementById('themeIcon');
    if (!botao || !icone) return;

    var SOL =
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    var LUA = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

    function aplicar(modo, salvar) {
      raiz.setAttribute('data-theme', modo);
      botao.setAttribute('aria-pressed', String(modo === 'dark'));
      icone.innerHTML = modo === 'dark' ? LUA : SOL;
      if (!salvar) return;
      try {
        localStorage.setItem('tema', modo);
      } catch (e) {
        /* Modo privado. A troca vale para esta sessão e não persiste. */
      }
    }

    /* O tema já foi decidido pelo script do <head>, antes da primeira pintura.
       Aqui apenas sincronizamos o botão e o ícone com o que está valendo. */
    aplicar(raiz.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);

    botao.addEventListener('click', function () {
      aplicar(raiz.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  });

  iniciar('menu compacto', function () {
    var nav = document.getElementById('nav');
    var botao = document.getElementById('navToggle');
    var rotulo = document.getElementById('navToggleLabel');
    if (!nav || !botao || !rotulo) return;

    function fechar() {
      nav.setAttribute('data-open', 'false');
      botao.setAttribute('aria-expanded', 'false');
      rotulo.textContent = 'Abrir menu';
    }

    botao.addEventListener('click', function () {
      var aberto = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!aberto));
      botao.setAttribute('aria-expanded', String(!aberto));
      rotulo.textContent = aberto ? 'Abrir menu' : 'Fechar menu';
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) fechar();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
        fechar();
        botao.focus();
      }
    });
  });

  iniciar('seção ativa', function () {
    if (!('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav__link'));
    var secoes = links
      .map(function (a) {
        return document.querySelector(a.getAttribute('href'));
      })
      .filter(Boolean);
    if (!secoes.length) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          links.forEach(function (a) {
            /* "location" é o valor previsto para posição dentro da mesma página;
             "true" fazia o leitor de tela anunciar "atual" sem qualificar. */
            if (a.getAttribute('href') === '#' + entrada.target.id)
              a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );

    secoes.forEach(function (s) {
      observador.observe(s);
    });
  });

  iniciar('revelação', function () {
    var itens = document.querySelectorAll('.reveal');
    var reduzido =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduzido || !('IntersectionObserver' in window)) {
      itens.forEach(function (el) {
        el.classList.add('is-visible');
      });
    } else {
      var observador = new IntersectionObserver(
        function (entradas, obs) {
          entradas.forEach(function (entrada) {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add('is-visible');
            obs.unobserve(entrada.target);
          });
        },
        { threshold: 0.12 }
      );
      itens.forEach(function (el) {
        observador.observe(el);
      });
    }

    /* Desarma a trava do <head>: a revelação está de pé e vai conseguir
       mostrar o conteúdo. Sem esta linha, a classe cai em 1,2s e tudo
       aparece sem animação — que é a falha correta. */
    raiz.setAttribute('data-revelacao-pronta', '');
  });

  iniciar('foco na âncora', function () {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var alvo = document.querySelector(link.getAttribute('href'));
      if (!alvo) return;
      alvo.setAttribute('tabindex', '-1');

      function focar() {
        alvo.focus({ preventScroll: true });
      }

      /* scrollend dispara quando a rolagem suave termina de fato. O timeout
         é o plano B para navegadores sem o evento — antes ele era a única
         estratégia, com 320ms chutados contra uma duração que o CSS não
         expõe. */
      if ('onscrollend' in window) {
        document.addEventListener('scrollend', focar, { once: true });
        window.setTimeout(function () {
          document.removeEventListener('scrollend', focar);
        }, 1000);
      } else {
        window.setTimeout(focar, 320);
      }
    });
  });

  iniciar('modal do diagrama', function () {
    var abrir = document.querySelector('[data-image-dialog]');
    var modal = document.getElementById('awsArchitectureDialog');
    var fechar = document.querySelector('[data-close-image-dialog]');
    if (!abrir || !modal || !fechar || typeof modal.showModal !== 'function') return;

    abrir.addEventListener('click', function () {
      modal.showModal();
    });
    fechar.addEventListener('click', function () {
      modal.close();
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.close();
    });
  });
})();
