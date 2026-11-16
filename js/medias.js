/* ==========================================================================
   Améliorations du portfolio (suite à la rétroaction)
   1. Images : chaque projet a son propre traitement + visionneuse avec zoom
   2. Processus de création (étapes avec images, sons et vidéos) dans la fenêtre projet
   3. Contact : courriel lisible et copiable + formulaire qui envoie vraiment le message

   Ce fichier ne modifie pas main.js : il observe la page et s'y ajoute.
   Les données sont dans data/medias.json.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- À MODIFIER : ton adresse courriel ---------- */
  var COURRIEL = 'jayferdi127@gmail.com';
  /* Service qui reçoit le formulaire et te le transmet par courriel (gratuit, sans compte).
     Au tout premier envoi, FormSubmit t'écrit pour que tu confirmes ton adresse. */
  var SERVICE_FORMULAIRE = 'https://formsubmit.co/ajax/';

  var medias = { projets: {} };
  var projetsParTitre = {};
  var projetCourant = null;

  function echapper(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function creer(balise, classe, html) {
    var e = document.createElement(balise);
    if (classe) e.className = classe;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ============================================================
     1. VISIONNEUSE D'IMAGE (zoom, déplacement, plein écran)
     ============================================================ */
  var visio = null;

  function construireVisionneuse() {
    if (visio) return visio;
    var racine = creer('div', 'visionneuse');
    racine.setAttribute('role', 'dialog');
    racine.setAttribute('aria-modal', 'true');
    racine.setAttribute('aria-label', 'Image en grand');
    racine.hidden = true;
    racine.innerHTML =
      '<div class="visionneuse__scene" id="visioScene">' +
      '  <img class="visionneuse__image" id="visioImage" alt="" draggable="false" />' +
      '</div>' +
      '<p class="visionneuse__legende" id="visioLegende"></p>' +
      '<div class="visionneuse__barre">' +
      '  <button type="button" data-act="moins" aria-label="Dézoomer">−</button>' +
      '  <span class="visionneuse__niveau" id="visioNiveau">100 %</span>' +
      '  <button type="button" data-act="plus" aria-label="Zoomer">+</button>' +
      '  <button type="button" data-act="reset" aria-label="Taille d\'origine">⟲</button>' +
      '</div>' +
      '<button type="button" class="visionneuse__fermer" data-act="fermer" aria-label="Fermer">✕</button>' +
      '<button type="button" class="visionneuse__nav visionneuse__nav--prev" data-act="prev" aria-label="Image précédente">‹</button>' +
      '<button type="button" class="visionneuse__nav visionneuse__nav--next" data-act="next" aria-label="Image suivante">›</button>';
    document.body.appendChild(racine);

    var scene = racine.querySelector('#visioScene');
    var img = racine.querySelector('#visioImage');
    var legende = racine.querySelector('#visioLegende');
    var niveau = racine.querySelector('#visioNiveau');

    var etat = { liste: [], index: 0, s: 1, x: 0, y: 0 };
    var pointeurs = {};
    var dernierEcart = 0;
    var dernierClic = 0;

    function appliquer() {
      img.style.transform = 'translate(' + etat.x + 'px,' + etat.y + 'px) scale(' + etat.s + ')';
      niveau.textContent = Math.round(etat.s * 100) + ' %';
      scene.classList.toggle('est-zoome', etat.s > 1.001);
    }

    function limiter() {
      /* garde l'image visible : on ne peut pas la faire sortir complètement de l'écran */
      var r = scene.getBoundingClientRect();
      var w = img.offsetWidth * etat.s;
      var h = img.offsetHeight * etat.s;
      var mx = Math.max(0, (w - r.width) / 2 + r.width * 0.25);
      var my = Math.max(0, (h - r.height) / 2 + r.height * 0.25);
      etat.x = Math.max(-mx, Math.min(mx, etat.x));
      etat.y = Math.max(-my, Math.min(my, etat.y));
    }

    function zoomer(facteur, cx, cy) {
      var ancien = etat.s;
      var nouveau = Math.max(1, Math.min(8, ancien * facteur));
      if (nouveau === ancien) return;
      var r = scene.getBoundingClientRect();
      var px = (cx == null ? r.left + r.width / 2 : cx) - (r.left + r.width / 2);
      var py = (cy == null ? r.top + r.height / 2 : cy) - (r.top + r.height / 2);
      var k = nouveau / ancien;
      etat.x = px - (px - etat.x) * k;
      etat.y = py - (py - etat.y) * k;
      etat.s = nouveau;
      if (nouveau === 1) { etat.x = 0; etat.y = 0; }
      limiter();
      appliquer();
    }

    function reinit() { etat.s = 1; etat.x = 0; etat.y = 0; appliquer(); }

    function montrer(i) {
      var n = etat.liste.length;
      if (!n) return;
      etat.index = (i + n) % n;
      var item = etat.liste[etat.index];
      img.classList.toggle('est-pixelise', item.rendu === 'pixelated');
      img.src = item.full || item.src;
      img.alt = item.legende || '';
      legende.textContent = item.legende || '';
      racine.classList.toggle('a-plusieurs', n > 1);
      reinit();
    }

    function ouvrir(liste, index) {
      etat.liste = liste;
      racine.hidden = false;
      document.body.classList.add('visionneuse-ouverte');
      montrer(index || 0);
      racine.querySelector('[data-act="fermer"]').focus();
    }

    function fermer() {
      racine.hidden = true;
      document.body.classList.remove('visionneuse-ouverte');
      img.removeAttribute('src');
    }

    racine.addEventListener('click', function (evt) {
      var b = evt.target.closest('[data-act]');
      if (b) {
        var a = b.getAttribute('data-act');
        if (a === 'fermer') fermer();
        else if (a === 'plus') zoomer(1.5);
        else if (a === 'moins') zoomer(1 / 1.5);
        else if (a === 'reset') reinit();
        else if (a === 'prev') montrer(etat.index - 1);
        else if (a === 'next') montrer(etat.index + 1);
        return;
      }
      /* clic sur le fond noir (pas sur l'image) : on ferme */
      if (evt.target === scene && etat.s <= 1.001) fermer();
    });

    scene.addEventListener('wheel', function (evt) {
      evt.preventDefault();
      zoomer(evt.deltaY < 0 ? 1.2 : 1 / 1.2, evt.clientX, evt.clientY);
    }, { passive: false });

    scene.addEventListener('pointerdown', function (evt) {
      scene.setPointerCapture(evt.pointerId);
      pointeurs[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
      dernierEcart = 0;
      var maintenant = Date.now();
      if (evt.target === img && maintenant - dernierClic < 320 && Object.keys(pointeurs).length === 1) {
        /* double-clic / double-tap : alterne entre vue d'ensemble et zoom ×3 */
        if (etat.s > 1.001) reinit(); else zoomer(3, evt.clientX, evt.clientY);
      }
      dernierClic = maintenant;
    });

    scene.addEventListener('pointermove', function (evt) {
      var p = pointeurs[evt.pointerId];
      if (!p) return;
      var ids = Object.keys(pointeurs);
      if (ids.length === 2) {
        /* pincement à deux doigts */
        pointeurs[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
        var a = pointeurs[ids[0]], b = pointeurs[ids[1]];
        var ecart = Math.hypot(a.x - b.x, a.y - b.y);
        if (dernierEcart) zoomer(ecart / dernierEcart, (a.x + b.x) / 2, (a.y + b.y) / 2);
        dernierEcart = ecart;
        return;
      }
      if (etat.s > 1.001) {
        etat.x += evt.clientX - p.x;
        etat.y += evt.clientY - p.y;
        limiter();
        appliquer();
      }
      pointeurs[evt.pointerId] = { x: evt.clientX, y: evt.clientY };
    });

    function finPointeur(evt) { delete pointeurs[evt.pointerId]; dernierEcart = 0; }
    scene.addEventListener('pointerup', finPointeur);
    scene.addEventListener('pointercancel', finPointeur);

    /* Clavier : la visionneuse passe AVANT la fenêtre projet (phase de capture) */
    window.addEventListener('keydown', function (evt) {
      if (racine.hidden) return;
      var k = evt.key;
      var utilise = true;
      if (k === 'Escape') fermer();
      else if (k === '+' || k === '=') zoomer(1.5);
      else if (k === '-') zoomer(1 / 1.5);
      else if (k === '0') reinit();
      else if (k === 'ArrowLeft' && etat.liste.length > 1) montrer(etat.index - 1);
      else if (k === 'ArrowRight' && etat.liste.length > 1) montrer(etat.index + 1);
      else utilise = false;
      if (utilise) { evt.preventDefault(); evt.stopPropagation(); }
    }, true);

    window.addEventListener('resize', function () { if (!racine.hidden) { limiter(); appliquer(); } });

    visio = { ouvrir: ouvrir, fermer: fermer };
    return visio;
  }

  function ouvrirVisionneuse(liste, index) {
    construireVisionneuse().ouvrir(liste, index);
  }

  /* ============================================================
     2. CARTES : un traitement propre à chaque projet
     ============================================================ */
  function styleCartes() {
    var grille = document.getElementById('projects-grid');
    if (!grille) return;
    grille.querySelectorAll('.project-card').forEach(function (carte) {
      var id = (carte.className.match(/project-card--(\S+)/) || [])[1];
      var m = medias.projets[id];
      if (!m) return;
      carte.style.setProperty('--media-filtre', m.filtre || 'grayscale(1) contrast(1.1)');
      var media = carte.querySelector('.project-card__media');
      if (!media) return;
      var premiere = m.images && m.images[0];
      if (premiere) media.style.backgroundImage = 'url("' + premiere.src + '")';
      media.style.backgroundSize = m.fit || 'cover';
      media.style.backgroundPosition = m.position || 'center';
      if (m.rendu === 'pixelated') media.style.imageRendering = 'pixelated';
    });
  }

  /* ============================================================
     3. FENÊTRE PROJET : image cliquable, galerie, processus
     ============================================================ */
  function elementsModale() {
    return {
      modale: document.getElementById('projetModale'),
      cadre: document.querySelector('.projet-modale__cadre'),
      wrap: document.querySelector('.projet-modale__image-wrap'),
      image: document.getElementById('projetModaleImage'),
      titre: document.getElementById('projetModaleTitre')
    };
  }

  function listeImagesProjet(m) {
    return (m.images || []).map(function (i) {
      return { src: i.src, full: i.full, legende: i.legende, rendu: m.rendu };
    });
  }

  /* Une étape peut avoir une image (« image ») ou plusieurs (« images »: [{src, legende, format}]) */
  function imagesDeLEtape(e) {
    if (Array.isArray(e.images)) return e.images;
    return e.image ? [{ src: e.image, full: e.imageGrande, legende: e.legende, format: e.format }] : [];
  }

  function listeImagesProcessus(m) {
    var liste = [];
    ((m.processus && m.processus.etapes) || []).forEach(function (e) {
      imagesDeLEtape(e).forEach(function (im) {
        liste.push({ src: im.src, full: im.full, legende: e.titre + (im.legende ? ' — ' + im.legende : '') });
      });
    });
    return liste;
  }

  function construireProcessus(m) {
    var p = m.processus;
    if (!p || !p.etapes || !p.etapes.length) return null;
    var section = creer('section', 'processus');
    section.setAttribute('aria-label', p.titre || 'Processus de création');
    section.innerHTML =
      '<h4 class="processus__titre">' + echapper(p.titre || 'Processus de création') + '</h4>' +
      (p.intro ? '<p class="processus__intro">' + echapper(p.intro) + '</p>' : '');
    var liste = creer('ol', 'processus__liste');
    var imagesProcessus = listeImagesProcessus(m);

    p.etapes.forEach(function (e, i) {
      var li = creer('li', 'processus__etape');
      li.innerHTML =
        '<span class="processus__numero" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="processus__corps">' +
        '  <h5 class="processus__etape-titre">' + echapper(e.titre) + '</h5>' +
        '  <p class="processus__texte">' + echapper(e.texte) + '</p>' +
        '</div>';
      var corps = li.querySelector('.processus__corps');

      function retirerSiAbsent(fig) {
        return function () { if (fig.parentNode) fig.parentNode.removeChild(fig); };
      }

      var imgs = imagesDeLEtape(e);
      if (imgs.length) {
        var rangee = creer('div', 'processus__medias');
        imgs.forEach(function (info) {
          var fig = creer('figure', 'processus__media' + (info.format ? ' processus__media--' + info.format : ''));
          var bouton = creer('button', 'processus__zoom');
          bouton.type = 'button';
          bouton.setAttribute('aria-label', 'Agrandir : ' + (info.legende || e.titre));
          var im = creer('img');
          im.loading = 'lazy';
          im.alt = info.legende || e.titre;
          im.src = info.src;
          im.addEventListener('error', retirerSiAbsent(fig));
          bouton.appendChild(im);
          bouton.appendChild(creer('span', 'processus__loupe', '⤢ Agrandir'));
          bouton.addEventListener('click', function () {
            var idx = imagesProcessus.findIndex(function (x) { return x.src === info.src; });
            ouvrirVisionneuse(imagesProcessus, Math.max(0, idx));
          });
          fig.appendChild(bouton);
          if (info.legende) fig.appendChild(creer('figcaption', null, echapper(info.legende)));
          rangee.appendChild(fig);
        });
        corps.appendChild(rangee);
      }

      if (e.video) {
        var figV = creer('figure', 'processus__media');
        var v = creer('video');
        v.controls = true;
        v.preload = 'metadata';
        v.playsInline = true;
        v.src = e.video;
        v.addEventListener('error', retirerSiAbsent(figV));
        figV.appendChild(v);
        if (e.legende && !e.image) figV.appendChild(creer('figcaption', null, echapper(e.legende)));
        corps.appendChild(figV);
      }

      /* une ou plusieurs pistes sonores : « audio » (une seule) ou « audios » (plusieurs, l'une sous l'autre) */
      var pistes = Array.isArray(e.audios) ? e.audios : (e.audio ? [{ src: e.audio, legende: e.legende }] : []);
      pistes.forEach(function (piste) {
        var figA = creer('figure', 'processus__media processus__media--audio');
        var a = creer('audio');
        a.controls = true;
        a.preload = 'none';
        a.src = piste.src;
        a.addEventListener('error', retirerSiAbsent(figA));
        figA.appendChild(creer('span', 'processus__note', '♪ ' + echapper(piste.legende || 'Extrait sonore')));
        figA.appendChild(a);
        corps.appendChild(figA);
      });
      liste.appendChild(li);
    });
    section.appendChild(liste);
    return section;
  }

  function enrichirModale() {
    var el = elementsModale();
    if (!el.cadre || !el.titre) return;
    var titre = el.titre.textContent.trim().toUpperCase();
    var id = projetsParTitre[titre];
    var m = medias.projets[id];

    /* nettoyage de ce qui a été ajouté pour le projet précédent */
    el.modale.querySelectorAll('.processus, .galerie, .projet-modale__legende, .bloc-ajoute').forEach(function (n) { n.remove(); });
    if (!m) { projetCourant = null; return; }
    projetCourant = id;

    el.cadre.style.setProperty('--accent', '#e10720');
    var images = listeImagesProjet(m);
    if (images[0]) {
      el.image.src = images[0].src;
      el.image.alt = images[0].legende || el.titre.textContent;
    }
    el.image.style.imageRendering = m.rendu === 'pixelated' ? 'pixelated' : '';

    /* l'image devient un bouton : clic ou Entrée = agrandir */
    el.wrap.classList.add('est-zoomable');
    el.wrap.setAttribute('role', 'button');
    el.wrap.setAttribute('tabindex', '0');
    el.wrap.setAttribute('aria-label', 'Agrandir l\'image du projet');
    if (!el.wrap.querySelector('.projet-modale__loupe')) {
      el.wrap.appendChild(creer('span', 'projet-modale__loupe', '⤢ Agrandir'));
    }

    /* légende : ce que montre le support visuel (le résultat final) */
    if (images[0] && images[0].legende) {
      el.wrap.appendChild(creer('p', 'projet-modale__legende', echapper(images[0].legende)));
    }

    /* blocs « Rôle » et « Techniques » ajoutés à la description */
    var desc = document.getElementById('projetModaleDescription');
    if (desc) {
      var blocs = [['MON RÔLE', m.role ? echapper(m.role) : ''],
                   ['TECHNIQUES', (m.techniques || []).map(echapper).join(' · ')]];
      blocs.forEach(function (b) {
        if (!b[1]) return;
        var sec = creer('section', 'projet-modale__bloc bloc-ajoute');
        sec.innerHTML = '<h4 class="projet-modale__bloc-titre">' + b[0] + '</h4><p class="projet-modale__bloc-texte">' + b[1] + '</p>';

        if (b[0] === 'TECHNIQUES' && m.techniqueVideo && m.techniqueVideo.src) {
          var figureVideo = creer('figure', 'processus__media');
          var videoTech = creer('video');
          videoTech.controls = true;
          videoTech.preload = 'metadata';
          videoTech.playsInline = true;
          videoTech.src = m.techniqueVideo.src;
          figureVideo.appendChild(videoTech);

          if (m.techniqueVideo.legende) {
            figureVideo.appendChild(creer('figcaption', null, echapper(m.techniqueVideo.legende)));
          }

          sec.appendChild(figureVideo);
        }

        desc.appendChild(sec);
      });
    }

    /* miniatures s'il y a plusieurs images */
    if (images.length > 1) {
      var galerie = creer('div', 'galerie');
      images.forEach(function (im, i) {
        var b = creer('button', 'galerie__mini');
        b.type = 'button';
        b.setAttribute('aria-label', 'Image ' + (i + 1) + ' : ' + (im.legende || ''));
        b.innerHTML = '<img src="' + echapper(im.src) + '" alt="" />';
        b.addEventListener('click', function () { ouvrirVisionneuse(images, i); });
        galerie.appendChild(b);
      });
      el.wrap.appendChild(galerie);
    }

    var proc = construireProcessus(m);
    if (proc) el.cadre.appendChild(proc);
  }

  function brancherModale() {
    var el = elementsModale();
    if (!el.titre || el.titre.dataset.medias) return;
    el.titre.dataset.medias = '1';

    new MutationObserver(enrichirModale).observe(el.titre, { childList: true, characterData: true, subtree: true });

    function ouvrirImage() {
      var m = medias.projets[projetCourant];
      if (m) ouvrirVisionneuse(listeImagesProjet(m), 0);
    }
    el.wrap.addEventListener('click', ouvrirImage);
    el.wrap.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); ouvrirImage(); }
    });

    /* sur téléphone : on remonte en haut de la fenêtre quand on change de projet */
    ['projetModalePrev', 'projetModaleNext'].forEach(function (id) {
      var b = document.getElementById(id);
      if (b) b.addEventListener('click', function () { el.modale.scrollTo({ top: 0 }); });
    });
  }

  /* ============================================================
     4. CONTACT : courriel copiable + formulaire fonctionnel
     ============================================================ */
  function copier(texte) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texte);
    }
    return new Promise(function (ok, ko) {
      var t = document.createElement('textarea');
      t.value = texte;
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy') ? ok() : ko(); } catch (e) { ko(e); }
      document.body.removeChild(t);
    });
  }

  function initContact() {
    var wrap = document.querySelector('.contact__wrap');
    var form = document.querySelector('.contact__form');
    if (!wrap || !form || form.dataset.fonctionnel) return;
    form.dataset.fonctionnel = '1';

    /* --- bloc courriel --- */
    if (!document.querySelector('.contact__courriel')) {
      var bloc = creer('div', 'contact__courriel');
      bloc.innerHTML =
        '<span class="contact__courriel-etiquette">Écris-moi directement</span>' +
        '<a class="contact__courriel-lien" href="mailto:' + echapper(COURRIEL) + '">' + echapper(COURRIEL) + '</a>' +
        '<button type="button" class="contact__copier">Copier</button>' +
        '<span class="contact__courriel-etat" role="status" aria-live="polite"></span>';
      var regle = wrap.querySelector('.contact__rule');
      wrap.insertBefore(bloc, regle ? regle.nextSibling : form);
      var etat = bloc.querySelector('.contact__courriel-etat');
      var bouton = bloc.querySelector('.contact__copier');
      bouton.addEventListener('click', function () {
        copier(COURRIEL).then(function () {
          etat.textContent = 'Adresse copiée !';
          bouton.textContent = 'Copié ✓';
        }, function () {
          etat.textContent = 'Sélectionne l\'adresse et copie-la (Ctrl + C).';
        });
        setTimeout(function () { etat.textContent = ''; bouton.textContent = 'Copier'; }, 2500);
      });
    }

    /* --- formulaire --- */
    form.setAttribute('novalidate', '');
    form.removeAttribute('action');
    [['name', 'name'], ['email', 'email']].forEach(function (c) {
      var champ = form.querySelector('[name="' + c[0] + '"]');
      if (champ) { champ.required = true; champ.setAttribute('autocomplete', c[1]); }
    });
    var msg = form.querySelector('[name="message"]');
    if (msg) msg.required = true;

    var piege = creer('input', 'contact__piege');
    piege.type = 'text';
    piege.name = '_honey';
    piege.tabIndex = -1;
    piege.setAttribute('autocomplete', 'off');
    piege.setAttribute('aria-hidden', 'true');
    form.appendChild(piege);

    var envoyer = form.querySelector('[type="submit"]');
    if (!envoyer) {
      envoyer = creer('button', 'contact__submit', 'Envoyer');
      envoyer.type = 'submit';
      form.appendChild(envoyer);
    }
    var statut = creer('p', 'contact__statut');
    statut.setAttribute('role', 'status');
    statut.setAttribute('aria-live', 'polite');
    form.appendChild(statut);

    function afficher(texte, ok) {
      statut.textContent = texte;
      statut.classList.toggle('est-ok', !!ok);
      statut.classList.toggle('est-erreur', ok === false);
    }

    function secours(donnees) {
      var corps = donnees.message + '\n\n— ' + donnees.name + ' (' + donnees.email + ')';
      window.location.href = 'mailto:' + COURRIEL +
        '?subject=' + encodeURIComponent('Message depuis ton portfolio — ' + donnees.name) +
        '&body=' + encodeURIComponent(corps);
    }

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();
      if (piege.value) return; /* robot : on ignore */
      var donnees = {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim()
      };
      if (!donnees.name || !donnees.message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donnees.email)) {
        afficher('Merci de remplir ton nom, un courriel valide et ton message.', false);
        var premier = !donnees.name ? form.elements.name : (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donnees.email) ? form.elements.email : form.elements.message);
        premier.focus();
        return;
      }
      if (COURRIEL.indexOf('exemple.com') !== -1) {
        console.warn('medias.js : remplace COURRIEL par ta vraie adresse.');
        afficher('Ton logiciel de courriel va s\'ouvrir pour envoyer le message.', true);
        secours(donnees);
        return;
      }
      envoyer.disabled = true;
      afficher('Envoi en cours…', null);
      fetch(SERVICE_FORMULAIRE + encodeURIComponent(COURRIEL), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: donnees.name,
          email: donnees.email,
          message: donnees.message,
          _subject: 'Nouveau message depuis ton portfolio — ' + donnees.name,
          _replyto: donnees.email,
          _captcha: 'false',
          _template: 'table'
        })
      }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (rep) {
        if (rep && (rep.success === 'false' || rep.success === false)) throw new Error(rep.message || 'refusé');
        form.reset();
        afficher('Merci ! Ton message a bien été envoyé.', true);
      }).catch(function () {
        afficher('L\'envoi automatique a échoué : ton logiciel de courriel va s\'ouvrir.', false);
        secours(donnees);
      }).then(function () { envoyer.disabled = false; });
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  function demarrer() {
    initContact();
    construireVisionneuse();

    Promise.all([
      fetch('./data/medias.json').then(function (r) { return r.json(); }),
      fetch('./data/projet.json').then(function (r) { return r.json(); })
    ]).then(function (res) {
      medias = res[0];
      res[1].forEach(function (p) { projetsParTitre[String(p.title).toUpperCase()] = p.id; });

      var grille = document.getElementById('projects-grid');
      if (grille) {
        styleCartes();
        new MutationObserver(styleCartes).observe(grille, { childList: true });
      }
      brancherModale();
      enrichirModale();
    }).catch(function (e) {
      console.error('medias.js : données indisponibles', e);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();