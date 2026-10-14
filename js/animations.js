/*
  Animations inspirées de Persona 5 (JavaScript vanilla, sans librairie).

  Ce fichier s'occupe de :
  1. la transition de page (bandes rouge / noire / blanche) à l'arrivée et quand on change de section
  2. les apparitions au défilement (IntersectionObserver)
  3. l'animation de changement de projet dans la fenêtre modale

  Les styles correspondants sont dans css/composants/animations.css
  et css/composants/transition-page.css.
*/

(function () {
  'use strict';

  var racine = document.documentElement;

  /* La classe js-actif est posée dans le <head> sauf si l'utilisateur
     préfère moins de mouvement : dans ce cas, on ne fait rien du tout. */
  if (!racine.classList.contains('js-actif')) return;

  /* Signale à la sécurité du <head> que le script a bien démarré */
  racine.dataset.animations = 'ok';

  /* ---------- Réglages ---------- */

  var DUREE_BANDE = 190;      // durée du déplacement d'une bande (ms)
  var DECALAGE_BANDE = 30;    // retard entre deux bandes (ms)
  // Une phase (couvrir ou découvrir) dure donc 190 + 2 × 30 = 250 ms, soit 0,5 s au total.
  var EASING_RIDEAU = 'cubic-bezier(0.65, 0, 0.35, 1)';

  /* Éléments à révéler au défilement.
     type    : coup, monte, fondu, regle (voir animations.css)
     base    : délai de départ en ms
     decalage: délai ajouté à chaque élément de la même liste (effet d'escalier) */
  var REVELATIONS = [
    { selecteur: '.projects-section__title', type: 'coup' },
    { selecteur: '.apropos__title', type: 'coup' },
    { selecteur: '.competences__rule, .contact__rule, .apropos__rule', type: 'regle', base: 200 },
    { selecteur: '.competences__item', type: 'monte', decalage: 140 },
    { selecteur: '.contact__form', type: 'coup', base: 150 },
    { selecteur: '.contact__field', type: 'monte', base: 450, decalage: 120 },
    { selecteur: '.apropos__card', type: 'coup', base: 150 },
    { selecteur: '.apropos__photo-col', type: 'monte', base: 450 },
    { selecteur: '.apropos__text', type: 'fondu', base: 550 },
    { selecteur: '.apropos__decor', type: 'monte', base: 700 }
  ];

  /* Titres dont chaque lettre est un <span> : les lettres tombent une à une */
  var TITRES_LETTRES = ['.competences__title', '.contact__title'];

  var observateur = null;

  /* ============================================================
     1. TRANSITION DE PAGE
     ============================================================ */

  var rideau = document.querySelector('.transition-p5');
  var bandes = rideau ? Array.prototype.slice.call(rideau.querySelectorAll('.transition-p5__bande')) : [];
  var transitionEnCours = false;

  /* L'inclinaison des bandes est définie dans transition-page.css (--inclinaison) */
  var inclinaison = (rideau && getComputedStyle(rideau).getPropertyValue('--inclinaison').trim()) || '-20deg';

  /* Anime les bandes. sens = 'couvrir' (de la gauche vers le centre)
     ou 'decouvrir' (du centre vers la droite). Retourne une promesse. */
  function animerBandes(sens) {
    var animations = bandes.map(function (bande, index) {
      var depart = sens === 'couvrir' ? '-110%' : '0%';
      var arrivee = sens === 'couvrir' ? '0%' : '110%';
      /* En couvrant, la première bande (noire) part en premier ;
         en découvrant, c'est la bande du dessus (rouge) qui part en premier. */
      var rang = sens === 'couvrir' ? index : bandes.length - 1 - index;

      return bande.animate(
        [
          { transform: 'translateX(' + depart + ') skewX(' + inclinaison + ')' },
          { transform: 'translateX(' + arrivee + ') skewX(' + inclinaison + ')' }
        ],
        {
          duration: DUREE_BANDE,
          delay: rang * DECALAGE_BANDE,
          easing: EASING_RIDEAU,
          fill: 'both'
        }
      );
    });

    return Promise.all(animations.map(function (a) { return a.finished; }));
  }

  /* Remet le rideau au repos (caché) une fois la transition terminée */
  function terminerTransition() {
    bandes.forEach(function (bande) {
      bande.getAnimations().forEach(function (a) { a.cancel(); });
    });
    rideau.classList.add('est-cache');
    transitionEnCours = false;
  }

  /* Ouverture du rideau au chargement de la page */
  function ouvrirRideauInitial() {
    if (!rideau || !bandes.length || !rideau.animate) {
      racine.classList.add('page-prete');
      return;
    }

    transitionEnCours = true;

    /* Petite pause pour laisser les images se mettre en place sous le rideau */
    setTimeout(function () {
      racine.classList.add('page-prete');
      animerBandes('decouvrir').then(terminerTransition, terminerTransition);
    }, 250);
  }

  /* Change de section pendant que le rideau couvre l'écran */
  function allerVersSection(cible, hash) {
    transitionEnCours = true;
    rideau.classList.remove('est-cache');

    animerBandes('couvrir')
      .then(function () {
        /* L'écran est couvert : on saute à la section sans défilement visible */
        cible.scrollIntoView({ behavior: 'instant', block: 'start' });
        if (window.history && window.history.pushState && hash !== window.location.hash) {
          window.history.pushState(null, '', hash);
        }
        cible.setAttribute('tabindex', '-1');
        cible.focus({ preventScroll: true });
        return animerBandes('decouvrir');
      })
      .then(terminerTransition, terminerTransition);
  }

  function initTransitionNavigation() {
    if (!rideau || !bandes.length || !rideau.animate) return;

    document.addEventListener('click', function (evt) {
      /* On laisse passer les clics modifiés (nouvel onglet, etc.) */
      if (evt.defaultPrevented || evt.button !== 0 || evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) return;

      var lien = evt.target.closest('a[href^="#"]');
      if (!lien) return;

      var hash = lien.getAttribute('href');
      if (hash.length < 2) return;

      var cible = document.getElementById(hash.slice(1));
      if (!cible) return;

      /* Si une transition est déjà en cours, on laisse le navigateur faire son défilement normal */
      if (transitionEnCours) return;

      evt.preventDefault();
      allerVersSection(cible, hash);
    });
  }

  /* ============================================================
     2. APPARITIONS AU DÉFILEMENT
     ============================================================ */

  function creerObservateur() {
    if (!('IntersectionObserver' in window)) return null;

    return new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (entree) {
          if (!entree.isIntersecting) return;
          entree.target.classList.add('revele');
          observateur.unobserve(entree.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
    );
  }

  function preparerElement(element, type, index, base, decalage) {
    element.classList.add('reveal', 'reveal--' + type);
    element.style.setProperty('--i', index);
    if (base) element.style.setProperty('--base', base + 'ms');
    if (decalage) element.style.setProperty('--decalage', decalage + 'ms');
    observateur.observe(element);
  }

  function initRevelations() {
    observateur = creerObservateur();
    /* Sans IntersectionObserver, tout reste visible */
    if (!observateur) return;

    REVELATIONS.forEach(function (reglage) {
      var elements = document.querySelectorAll(reglage.selecteur);
      Array.prototype.forEach.call(elements, function (element, index) {
        preparerElement(element, reglage.type, index, reglage.base, reglage.decalage);
      });
    });

    TITRES_LETTRES.forEach(function (selecteur) {
      var titre = document.querySelector(selecteur);
      if (!titre) return;
      titre.classList.add('reveal-lettres');
      Array.prototype.forEach.call(titre.children, function (lettre, index) {
        lettre.style.setProperty('--i', index);
      });
      observateur.observe(titre);
    });

    initCartesProjets();
  }

  /* Les cartes de projets sont créées par main.js après le chargement du JSON :
     on les observe au fur et à mesure qu'elles apparaissent dans la grille. */
  function initCartesProjets() {
    var grille = document.getElementById('projects-grid');
    if (!grille) return;

    function preparerCartes() {
      var cartes = grille.querySelectorAll('.project-card:not(.reveal)');
      Array.prototype.forEach.call(cartes, function (carte, index) {
        /* Escalier sur deux colonnes : la carte de droite arrive un peu après celle de gauche */
        preparerElement(carte, 'carte', index % 2);
      });
    }

    preparerCartes();
    new MutationObserver(preparerCartes).observe(grille, { childList: true });
  }

  /* ============================================================
     3. CHANGEMENT DE PROJET DANS LA MODALE
     ============================================================ */

  /* Relance une animation CSS en retirant puis remettant la classe */
  function rejouer(element, classe) {
    if (!element) return;
    element.classList.remove(classe);
    void element.offsetWidth; // force le recalcul pour que l'animation redémarre
    element.classList.add(classe);
  }

  function initChangementProjet() {
    var modale = document.getElementById('projetModale');
    if (!modale) return;

    var imageWrap = modale.querySelector('.projet-modale__image-wrap');
    var info = modale.querySelector('.projet-modale__info');

    function animerChangement() {
      rejouer(imageWrap, 'projet-change');
      rejouer(info, 'projet-change');
    }

    var precedent = document.getElementById('projetModalePrev');
    var suivant = document.getElementById('projetModaleNext');
    if (precedent) precedent.addEventListener('click', animerChangement);
    if (suivant) suivant.addEventListener('click', animerChangement);

    document.addEventListener('keydown', function (evt) {
      if (!modale.classList.contains('est-ouverte')) return;
      if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') animerChangement();
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */

  function init() {
    initTransitionNavigation();
    initRevelations();
    initChangementProjet();
    ouvrirRideauInitial();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
