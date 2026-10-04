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
  `;

  return article;
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
    image.alt = projet.title;
    titre.textContent = projet.title;
    description.textContent = projet.description || '';
    lien.href = projet.lien || '#';
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
