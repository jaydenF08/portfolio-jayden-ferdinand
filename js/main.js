const projectsGrid = document.querySelector('#projects-grid');

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

document.addEventListener('DOMContentLoaded', loadProjects);
