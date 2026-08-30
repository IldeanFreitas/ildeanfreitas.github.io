/* Roda antes da primeira pintura. Faz duas coisas que precisam acontecer
   cedo demais para esperar o script do fim do documento. */
(function () {
  var raiz = document.documentElement;

  /* 1. Tema. Restaura a escolha salva; sem ela, segue a preferência do
        sistema. Aqui, e não depois da carga, para não haver piscada de tema
        errado em quem escolheu o claro. */
  try {
    var salvo = localStorage.getItem('tema');
    if (salvo === 'dark' || salvo === 'light') {
      raiz.setAttribute('data-theme', salvo);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      raiz.setAttribute('data-theme', 'light');
    }
  } catch (e) {
    /* Modo privado bloqueia localStorage. O tema padrão do HTML continua
       valendo — perder a preferência é aceitável, quebrar a página não. */
  }

  /* 2. Animação de entrada. Habilitada aqui para o conteúdo não piscar de
        visível para oculto; e armada com uma trava: se o script principal não
        confirmar a inicialização em 1,2s — porque falhou, foi bloqueado ou
        nunca chegou — a classe sai e todo o conteúdo reaparece. A animação é
        enfeite; o texto não pode depender dela. */
  raiz.classList.add('js-anima');
  window.setTimeout(function () {
    if (!raiz.hasAttribute('data-revelacao-pronta')) raiz.classList.remove('js-anima');
  }, 1200);
})();
