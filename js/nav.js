document.addEventListener("DOMContentLoaded", function () {
  var bouton = document.getElementById("navToggle");
  var menu = document.querySelector(".nav__menu");
  var liens = document.querySelectorAll("[data-nav-link]");

  if (bouton && menu) {
    bouton.addEventListener("click", function () {
      var ouvert = menu.classList.toggle("est-ouvert");
      bouton.setAttribute("aria-expanded", ouvert ? "true" : "false");
    });
    liens.forEach(function (lien) {
      lien.addEventListener("click", function () {
        menu.classList.remove("est-ouvert");
      });
    });
  }

  var sections = [];
  liens.forEach(function (lien) {
    var id = lien.getAttribute("href").slice(1);
    var section = document.getElementById(id);
    if (section) sections.push(section);
  });

  if (!sections.length) return;

  var observateur = new IntersectionObserver(
    function (entrees) {
      entrees.forEach(function (entree) {
        if (!entree.isIntersecting) return;
        liens.forEach(function (l) { l.classList.remove("est-actif"); });
        var lienActif = document.querySelector('[data-nav-link][href="#' + entree.target.id + '"]');
        if (lienActif) lienActif.classList.add("est-actif");
      });
    },
    { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
  );

  sections.forEach(function (s) { observateur.observe(s); });
});