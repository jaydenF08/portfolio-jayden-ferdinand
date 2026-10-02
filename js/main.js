/*
  Ce fichier sert à construire la section des projets du portfolio.
  Il sélectionne la zone d'affichage, récupère les données JSON et
  génère une carte par projet avant de l'insérer dans la page.
*/

// Sélectionne le conteneur HTML où les cartes de projets seront affichées.
const projectsGrid = document.querySelector('#projects-grid');

// Crée une carte HTML pour un projet donné à partir de ses données.
function createProjectCard(project) {
  const article = document.createElement('article');
  article.className = `project-card project-card--${project.variant}`;

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
    ></div>
  `;

  return article;
}

// Charge les projets depuis le fichier JSON, puis les affiche dans la grille.
async function loadProjects() {
  if (!projectsGrid) {
    return;
  }

  try {
    const response = await fetch('./data/projet.json');
    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const projects = await response.json();
    projectsGrid.innerHTML = '';

    projects.forEach((project) => {
      projectsGrid.appendChild(createProjectCard(project));
    });
  } catch (error) {
    console.error('Impossible de charger les projets:', error);
    projectsGrid.innerHTML = '<p>Les projets sont indisponibles pour le moment.</p>';
  }
}

// Déclenche le chargement des projets quand la page est entièrement chargée.
document.addEventListener('DOMContentLoaded', loadProjects);
