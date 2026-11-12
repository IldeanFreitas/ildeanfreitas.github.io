(function () {
  'use strict';

  var raiz = document.documentElement;
  /* Quando cada bloco .reveal ficou visível: a animação dos diagramas espera o
     fade do cartão que os contém. */
  var reveladoEm = typeof WeakMap === 'function' ? new WeakMap() : new Map();

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
    var corDaBarra = document.querySelector('meta[name="theme-color"]');
    if (!botao || !icone) return;

    var SOL =
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
    var LUA = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';

    function aplicar(modo, salvar) {
      raiz.setAttribute('data-theme', modo);
      botao.setAttribute('aria-pressed', String(modo === 'dark'));
      icone.innerHTML = modo === 'dark' ? LUA : SOL;
      /* A cor da barra do navegador acompanha o tema escolhido, não o do
         sistema — o site não segue prefers-color-scheme. */
      if (corDaBarra) corDaBarra.setAttribute('content', modo === 'dark' ? '#000000' : '#f4f6f3');
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

    /* Os rótulos vêm do HTML (data-abrir/data-fechar): o mesmo script serve a
       página em português e a em inglês. */
    var ABRIR = botao.getAttribute('data-abrir') || 'Abrir menu';
    var FECHAR = botao.getAttribute('data-fechar') || 'Fechar menu';

    function fechar() {
      nav.setAttribute('data-open', 'false');
      botao.setAttribute('aria-expanded', 'false');
      rotulo.textContent = ABRIR;
    }

    botao.addEventListener('click', function () {
      var aberto = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', String(!aberto));
      botao.setAttribute('aria-expanded', String(!aberto));
      rotulo.textContent = aberto ? ABRIR : FECHAR;
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
        var alvo = a.getAttribute('href');
        /* Nas páginas internas os links apontam para a home (/#secao). */
        return alvo.charAt(0) === '#' ? document.querySelector(alvo) : null;
      })
      .filter(Boolean);
    if (!secoes.length) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          var href = '#' + entrada.target.id;
          if (!entrada.isIntersecting) {
            /* A seção saiu da faixa central: deixa de ser a atual. Sem isto,
               voltar ao topo de uma vez (Home, link da marca) mantinha
               "Contato" marcado, porque nenhuma outra seção entrava na faixa
               para substituí-lo — no topo está o hero, que não tem link. */
            links.forEach(function (a) {
              if (a.getAttribute('href') === href) a.removeAttribute('aria-current');
            });
            return;
          }
          links.forEach(function (a) {
            /* "location" é o valor previsto para posição dentro da mesma página;
             "true" fazia o leitor de tela anunciar "atual" sem qualificar. */
            if (a.getAttribute('href') === href) a.setAttribute('aria-current', 'location');
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
            reveladoEm.set(entrada.target, Date.now());
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

  iniciar('animação dos diagramas', function () {
    /* A figura do diagrama fica fora do .reveal: dentro dele, a sequência
       começava com a figura ainda meio transparente e o início do fluxo se
       perdia. Ela dispara quando o topo da figura passa de 3/4 da tela e, se
       o cartão acabou de aparecer, espera o fade dele (0,55s) terminar.
       Sem JS, com a trava js-anima caída ou com movimento reduzido, o CSS
       não anima nada e o diagrama já está inteiro. */
    var figuras = document.querySelectorAll('.diagram-anima');
    var reduzido =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var FADE_DO_CARTAO = 600;

    function acionar(figura) {
      figura.classList.add('is-visible');
    }

    if (reduzido || !('IntersectionObserver' in window)) {
      figuras.forEach(acionar);
      return;
    }

    var observador = new IntersectionObserver(
      function (entradas, obs) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          var figura = entrada.target;
          obs.unobserve(figura);
          var cartao = figura.closest('.reveal');
          var espera = 0;
          if (cartao) {
            var desde = reveladoEm.get(cartao);
            espera =
              desde === undefined
                ? cartao.classList.contains('is-visible')
                  ? 0
                  : FADE_DO_CARTAO
                : Math.max(0, FADE_DO_CARTAO - (Date.now() - desde));
          }
          if (espera) window.setTimeout(acionar, espera, figura);
          else acionar(figura);
        });
      },
      { rootMargin: '0px 0px -25% 0px' }
    );
    figuras.forEach(function (f) {
      observador.observe(f);
    });
  });

  iniciar('busca e filtros dos cases', function () {
    /* As abas com demonstrações têm busca e filtros próprios: a Power
       Platform (busca; Tecnologia, Tipo, Segmento dos apps) e a Power BI
       (busca; Segmento). O build gera um <template> em cada uma: sem JS não
       aparecem e tudo fica listado. Rótulos e opções vêm do HTML; nada de
       texto ou lista fixa aqui. Cada conjunto só enxerga os itens do seu
       painel. */
    Array.prototype.forEach.call(
      document.querySelectorAll('template.cases-filtros-modelo'),
      montar
    );

    function montar(modelo) {
      if (!modelo.content || !modelo.content.firstElementChild) return;
      var painel = modelo.parentNode;
      var itens = Array.prototype.slice.call(painel.querySelectorAll('[data-filtro-item]'));
      if (!itens.length) return;

      var filtros = modelo.content.firstElementChild.cloneNode(true);
      var busca = filtros.querySelector('input[type="search"]');
      var contagem = filtros.querySelector('.cases-filtros__contagem');
      var vazio = filtros.querySelector('.cases-filtros__vazio');
      var textoDaContagem = contagem ? contagem.getAttribute('data-modelo') || '' : '';
      var blocos = Array.prototype.slice.call(painel.querySelectorAll('[data-bloco]'));
      var estado = {};

      /* Sem acento e sem caixa: "saude" acha "Saúde". */
      function normalizar(texto) {
        return String(texto)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim();
      }
      /* A busca olha nome, segmento (com a empresa) e tecnologias de cada item. */
      var CAMPOS = '.mock-card__titulo, .mock-card__seg, .case-card__titulo, .tag';
      var textos = itens.map(function (item) {
        return normalizar(
          Array.prototype.map
            .call(item.querySelectorAll(CAMPOS), function (el) {
              return el.textContent;
            })
            .join(' ')
        );
      });

      /* data-tecs é uma lista separada por espaço; tipo e segmento, valor único.
       Item sem o atributo (projeto não tem segmento) sai quando o filtro está
       ativo. */
      function casa(item, chave, valor) {
        if (!valor) return true;
        var atual = item.getAttribute('data-' + chave);
        if (atual === null) return false;
        return chave === 'tecs'
          ? (' ' + atual + ' ').indexOf(' ' + valor + ' ') >= 0
          : atual === valor;
      }

      function aplicar() {
        var termo = busca ? normalizar(busca.value) : '';
        var visiveis = 0;
        itens.forEach(function (item, i) {
          var ok = textos[i].indexOf(termo) >= 0;
          Object.keys(estado).forEach(function (chave) {
            ok = ok && casa(item, chave, estado[chave]);
          });
          item.hidden = !ok;
          if (ok) visiveis++;
        });
        /* Bloco sem item visível some com o título e o aviso. */
        blocos.forEach(function (bloco) {
          bloco.hidden = !bloco.querySelector('[data-filtro-item]:not([hidden])');
        });
        if (contagem)
          contagem.textContent = textoDaContagem
            .replace('{n}', visiveis)
            .replace('{total}', itens.length);
        if (vazio) vazio.hidden = visiveis > 0;
      }

      Array.prototype.forEach.call(filtros.querySelectorAll('[data-filtro]'), function (grupo) {
        var chave = grupo.getAttribute('data-filtro');
        var botoes = Array.prototype.slice.call(grupo.querySelectorAll('button[data-valor]'));
        estado[chave] = '';
        botoes.forEach(function (botao) {
          botao.addEventListener('click', function () {
            botoes.forEach(function (outro) {
              outro.setAttribute('aria-pressed', String(outro === botao));
            });
            estado[chave] = botao.getAttribute('data-valor');
            aplicar();
          });
        });
      });
      if (busca) busca.addEventListener('input', aplicar);

      /* No celular cada grupo é uma faixa rolável: o botão focado pelo teclado
       vem inteiro para dentro dela, com margem para o contorno de foco. */
      filtros.addEventListener('focusin', function (e) {
        var botao = e.target;
        var faixa = botao.parentNode;
        if (!faixa || !faixa.hasAttribute || !faixa.hasAttribute('data-filtro')) return;
        window.requestAnimationFrame(function () {
          if (faixa.scrollWidth <= faixa.clientWidth) return;
          var f = faixa.getBoundingClientRect();
          var b = botao.getBoundingClientRect();
          var margem = 12;
          if (b.left < f.left + margem) faixa.scrollLeft -= f.left + margem - b.left;
          else if (b.right > f.right - margem) faixa.scrollLeft += b.right - (f.right - margem);
        });
      });

      /* Aplica antes de inserir: a região aria-live entra já com o texto e não
       anuncia nada na carga. */
      aplicar();
      painel.replaceChild(filtros, modelo);
    }
  });

  iniciar('abas dos cases', function () {
    /* Padrão ARIA de abas (tablist/tab/tabpanel, setas, Home/End, tabindex
       rolante). A lista vem de um <template> gerado no build; sem JS não há
       aba nem painel escondido, e as sessões ficam empilhadas. Um link para
       uma sessão (#cases-<área>) ou para algo dentro dela abre a aba certa:
       no clique (antes da navegação padrão), no hashchange e na carga. */
    var modelo = document.querySelector('template.cases-abas-modelo');
    if (!modelo || !modelo.content || !modelo.content.firstElementChild) return;
    var grupo = modelo.parentNode;
    var lista = modelo.content.firstElementChild.cloneNode(true);
    var abas = Array.prototype.slice.call(lista.querySelectorAll('[role="tab"]'));
    var paineis = abas.map(function (aba) {
      return document.getElementById(aba.getAttribute('aria-controls'));
    });
    if (!abas.length || paineis.indexOf(null) >= 0) return;

    function ativar(i, focar) {
      abas.forEach(function (aba, j) {
        var sel = i === j;
        aba.setAttribute('aria-selected', String(sel));
        aba.tabIndex = sel ? 0 : -1;
        paineis[j].hidden = !sel;
      });
      if (focar) abas[i].focus();
    }

    /* Painel sem nada focável (IA aplicada) entra na ordem do Tab,
       como pede o padrão. Os outros não: o Tab vai da aba ao primeiro
       controle (a busca, um link), e o painel focável seria focado pelo
       próprio navegador ao abrir a página com #cases-<área>, com o contorno
       de foco em volta da aba inteira. */
    var FOCAVEL = 'a[href], button, input, select, textarea, [tabindex]';
    paineis.forEach(function (painel, i) {
      painel.setAttribute('role', 'tabpanel');
      painel.setAttribute('aria-labelledby', abas[i].id);
      if (!painel.querySelector(FOCAVEL)) painel.tabIndex = 0;
    });
    abas.forEach(function (aba, i) {
      aba.addEventListener('click', function () {
        ativar(i);
      });
      aba.addEventListener('keydown', function (e) {
        var n = abas.length;
        var j =
          e.key === 'ArrowRight'
            ? (i + 1) % n
            : e.key === 'ArrowLeft'
              ? (i - 1 + n) % n
              : e.key === 'Home'
                ? 0
                : e.key === 'End'
                  ? n - 1
                  : -1;
        if (j < 0) return;
        e.preventDefault();
        ativar(j, true);
      });
    });

    function alvoDe(hash) {
      if (!hash || hash.length < 2) return null;
      try {
        return document.getElementById(decodeURIComponent(hash.slice(1)));
      } catch (erro) {
        return null;
      }
    }
    function painelDe(alvo) {
      for (var i = 0; i < paineis.length; i++) if (alvo && paineis[i].contains(alvo)) return i;
      return -1;
    }
    /* Abre a aba que contém o alvo; devolve true se precisou trocar. */
    function abrirPara(alvo) {
      var i = painelDe(alvo);
      if (i < 0 || !paineis[i].hidden) return false;
      ativar(i);
      return true;
    }

    grupo.replaceChild(lista, modelo);
    grupo.classList.add('cases-areas--abas');

    /* Altura da lista de abas: o painel a usa em scroll-margin-top, para a
       rolagem até ele deixar as abas à vista. */
    function medir() {
      grupo.style.setProperty('--cases-abas-altura', lista.offsetHeight + 'px');
    }

    var inicial = alvoDe(window.location.hash);
    var i0 = painelDe(inicial);
    ativar(i0 >= 0 ? i0 : 0);
    medir();
    if (window.ResizeObserver) new window.ResizeObserver(medir).observe(lista);
    if (i0 >= 0) {
      try {
        inicial.scrollIntoView({ block: 'start', behavior: 'instant' });
      } catch (erro) {
        inicial.scrollIntoView(true);
      }
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (link) abrirPara(alvoDe(link.getAttribute('href')));
    });
    window.addEventListener('hashchange', function () {
      var alvo = alvoDe(window.location.hash);
      if (abrirPara(alvo)) alvo.scrollIntoView({ block: 'start' });
    });
  });

  iniciar('foco na âncora', function () {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var alvo = document.querySelector(link.getAttribute('href'));
      if (!alvo) return;
      /* Só torna focável o que não é: o painel de aba já tem tabindex 0. */
      if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1');

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
})();
