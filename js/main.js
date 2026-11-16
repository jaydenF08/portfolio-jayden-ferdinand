const projectsGrid = document.querySelector('#projects-grid');
let listeProjets = [];
let indexActuel = 0;

function createProjectCard(project, index) {
  const article = document.createElement('article');
  article.className = `project-card project-card--${project.variant}`;
  article.dataset.index = index;

  article.innerHTML = `
    <div class="project-card__header">
      <span class="project-card__star">✦</span>
      <h3>${project.title}</h3>
      <span class="project-card__star">✦</span>
    </div>
    <!-- Le conteneur .project-card__image limite le balayage rouge au survol à la zone de l'image
         (voir animations.css). Il n'a aucun style propre, donc la mise en page ne change pas. -->
    <div class="project-card__image">
      <div
        class="project-card__media"
        aria-label="Projet ${project.title}"
        style="background-image: url('${project.image}');"
        tabindex="0"
      >
        <div class="project-card__fondu">
          <h4 class="project-card__fondu-titre">${project.title}</h4>
          <p class="project-card__fondu-texte">${project.description ? project.description : ''}</p>
        </div>
      </div>
      <!-- Pied de carte : tags du projet + invitation à cliquer (décoratif, ne bloque pas le clic) -->
      <div class="project-card__pied" aria-hidden="true">
        <span class="project-card__tags">${(project.tags || []).slice(0, 3).map((tag) => `<span class="project-card__tag">${tag}</span>`).join('')}</span>
        <span class="project-card__cta">Voir le projet ▸</span>
      </div>
    </div>
  `;

  return article;
}

function buildProjectDetails(project) {
  const sections = [
    ['SOMMAIRE', project.summary || project.description || ''],
    ["DÉTAILS", project.work || ''],
    ['LOGICIELS', Array.isArray(project.tools) ? project.tools.join(', ') : '']
  ];

  const blocs = sections
    .filter(([, content]) => content)
    .map(([title, content]) => `
      <section class="projet-modale__bloc">
        <h4 class="projet-modale__bloc-titre">${title}</h4>
        <p class="projet-modale__bloc-texte">${content}</p>
      </section>
    `)
    .join('');

  return blocs + buildProjectApercu(project);
}

/* Aperçu des images (miniatures sous LOGICIELS) : un clic sur une miniature
   remplace l'image principale de la fenêtre. Liste = "galerie" dans projet.json. */
function buildProjectApercu(project) {
  if (!Array.isArray(project.galerie) || project.galerie.length < 2) {
    return '';
  }

  const miniatures = project.galerie
    .map((src, i) => `
      <button type="button" class="apercu__mini${i === 0 ? ' est-actif' : ''}" data-src="${src}" aria-label="Voir l'image ${i + 1}">
        <img src="${src}" alt="" loading="lazy" onerror="this.parentNode.remove()" />
      </button>
    `)
    .join('');

  return `
    <section class="projet-modale__bloc projet-modale__apercu">
      <h4 class="projet-modale__bloc-titre">IMAGES</h4>
      <div class="apercu">${miniatures}</div>
    </section>
  `;
}

function buildProjectTags(project) {
  if (!Array.isArray(project.tags) || !project.tags.length) {
    return '';
  }

  return project.tags
    .map((tag) => `<span class="projet-modale__tag">${tag}</span>`)
    .join('');
}

async function loadProjects() {
  if (!projectsGrid) {
    return;
  }

  try {
    const response = await fetch('./data/projet.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    listeProjets = await response.json();
    projectsGrid.innerHTML = '';

    listeProjets.forEach((project, index) => {
      projectsGrid.appendChild(createProjectCard(project, index));
    });

    initModalProjet();
  } catch (error) {
    console.error('Impossible de charger les projets:', error);
    projectsGrid.innerHTML = '<p>Les projets sont indisponibles pour le moment.</p>';
  }
}

function initModalProjet() {
  const modale = document.getElementById('projetModale');
  const image = document.getElementById('projetModaleImage');
  const titre = document.getElementById('projetModaleTitre');
  const sousTitre = document.getElementById('projetModaleSousTitre');
  const tags = document.getElementById('projetModaleTags');
  const description = document.getElementById('projetModaleDescription');
  const lien = document.getElementById('projetModaleLien');
  const boutonFermer = document.getElementById('projetModaleFermer');
  const boutonPrev = document.getElementById('projetModalePrev');
  const boutonNext = document.getElementById('projetModaleNext');

  if (!modale) return;

  function afficherProjet(index) {
    if (!listeProjets.length) return;
    indexActuel = (index + listeProjets.length) % listeProjets.length;
    const projet = listeProjets[indexActuel];
    image.src = projet.image;
    const legendeImage = document.querySelector('.projet-modale__legende');
    if (legendeImage) legendeImage.hidden = false;
    image.alt = projet.title;
    titre.textContent = projet.title;
    sousTitre.textContent = projet.subtitle || '';
    tags.innerHTML = buildProjectTags(projet);
    description.innerHTML = buildProjectDetails(projet);
    if ((projet.id === 'tenacity' || projet.id === 'spirits') && projet.lien && projet.lien !== '#') {
      lien.hidden = false;
      lien.href = projet.lien;
    } else {
      lien.hidden = true;
      lien.removeAttribute('href');
    }
  }

  function ouvrirModale(index) {
    afficherProjet(index);
    modale.classList.add('est-ouverte');
    modale.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modale-ouverte');
  }

  function fermerModale() {
    modale.classList.remove('est-ouverte');
    modale.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modale-ouverte');
  }

  projectsGrid.addEventListener('click', (evt) => {
    const carte = evt.target.closest('.project-card');
    if (!carte) return;
    ouvrirModale(Number(carte.dataset.index));
  });

  // Clic sur une miniature de l'aperçu : on change l'image principale de la fenêtre
  description.addEventListener('click', (evt) => {
    const mini = evt.target.closest('.apercu__mini');
    if (!mini) return;
    image.src = mini.dataset.src;
    // la légende « Rendu final » ne concerne que la 1re image : on la cache pour les autres vues
    const legende = document.querySelector('.projet-modale__legende');
    if (legende) legende.hidden = mini !== description.querySelector('.apercu__mini');
    description.querySelectorAll('.apercu__mini').forEach((b) => b.classList.toggle('est-actif', b === mini));
  });

  boutonFermer.addEventListener('click', fermerModale);
  boutonPrev.addEventListener('click', () => afficherProjet(indexActuel - 1));
  boutonNext.addEventListener('click', () => afficherProjet(indexActuel + 1));

  modale.addEventListener('click', (evt) => {
    if (evt.target === modale) fermerModale();
  });

  document.addEventListener('keydown', (evt) => {
    if (!modale.classList.contains('est-ouverte')) return;
    if (evt.key === 'Escape') fermerModale();
    if (evt.key === 'ArrowLeft') afficherProjet(indexActuel - 1);
    if (evt.key === 'ArrowRight') afficherProjet(indexActuel + 1);
  });
}

document.addEventListener('DOMContentLoaded', loadProjects);