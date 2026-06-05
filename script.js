

let allPosts = [];
let favorites = [];
let currentPost = null;


const API_URL = "https://dummyjson.com/posts?limit=30";
const LS_KEY = "bloggram_favorites";



const pages = {
  home: document.getElementById("page-home"),
  favorites: document.getElementById("page-favorites"),
  detail: document.getElementById("page-detail"),
};

const $ = id => document.getElementById(id);

const postsGrid = $("posts-grid");
const favGrid = $("fav-grid");
const favCount = $("fav-count");
const detailContent = $("detail-content");
const homeSkeleton = $("home-skeleton");
const favEmpty = $("fav-empty");
const toast = $("toast");

/*
   NAVIGATION
 */
function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove("active"));
  pages[name].classList.add("active");

  // Force re-trigger animation
  pages[name].style.animation = "none";
  pages[name].offsetHeight;  // reflow
  pages[name].style.animation = "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

$("logo-btn").addEventListener("click", () => showPage("home"));
$("nav-home-btn").addEventListener("click", () => showPage("home"));
$("nav-fav-btn").addEventListener("click", () => { renderFavoritesPage(); showPage("favorites"); });
$("fav-back-btn").addEventListener("click", () => showPage("home"));
$("detail-back-btn").addEventListener("click", () => showPage("home"));

/*
   LOCAL STORAGE 
   */
function loadFavorites() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    favorites = raw ? JSON.parse(raw) : [];
  } catch {
    favorites = [];
  }
}

function saveFavorites() {
  localStorage.setItem(LS_KEY, JSON.stringify(favorites));
}

function isFav(postId) {
  return favorites.includes(postId);
}

function toggleFavorite(postId) {
  if (isFav(postId)) {
    favorites = favorites.filter(id => id !== postId);
    showToast("Removed from saved", "fa-bookmark");
  } else {
    favorites.push(postId);
    showToast("Added to saved", "fa-bookmark");
  }
  saveFavorites();
  updateFavCount();
  syncAllFavButtons(postId);
}

function updateFavCount() {
  const n = favorites.length;
  favCount.textContent = n;

  // Bump animation
  favCount.classList.remove("bump");
  void favCount.offsetWidth;
  favCount.classList.add("bump");
  setTimeout(() => favCount.classList.remove("bump"), 300);
}

/* Sync all bookmark buttons across the page for a given post id */
function syncAllFavButtons(postId) {
  document.querySelectorAll(`.btn-fav[data-id="${postId}"]`).forEach(btn => {
    if (isFav(postId)) {
      btn.classList.add("active");
      btn.innerHTML = `<i class="fa-solid fa-bookmark"></i>`;
      btn.title = "Remove from saved";
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `<i class="fa-regular fa-bookmark"></i>`;
      btn.title = "Save post";
    }
  });
}

/* 
   TOAST
  */
let toastTimer = null;

function showToast(msg, icon = "fa-circle-check") {
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> ${msg}`;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

/*
   FETCH POSTS
  */
async function fetchPosts() {
  try {
    renderSkeletons(6);
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allPosts = data.posts || [];
    homeSkeleton.classList.add("hidden");
    postsGrid.classList.remove("hidden");
    renderPostsGrid(allPosts, postsGrid, false);
    updateFavCount();
  } catch (err) {
    homeSkeleton.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--color-text-secondary);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:32px;margin-bottom:12px;display:block;color:var(--color-heart);"></i>
        <p style="font-weight:700;">Failed to load posts.<br/>Please check your connection and <button onclick="location.reload()" style="color:var(--color-accent-blue);font-weight:800;cursor:pointer;font-family:inherit;">retry</button>.</p>
      </div>`;
  }
}

/* 
   SKELETON PLACEHOLDERS
  */
function renderSkeletons(count) {
  homeSkeleton.innerHTML = Array.from({ length: count }).map(() => `
    <div class="skeleton-card">
      <div class="skel skel-avatar"></div>
      <div class="skel skel-title"></div>
      <div class="skel skel-body"></div>
      <div class="skel skel-body-2"></div>
      <div style="display:flex;gap:6px;">
        <div class="skel skel-tag"></div>
        <div class="skel skel-tag"></div>
      </div>
      <div class="skel skel-btn"></div>
    </div>
  `).join("");
}

/*
   RENDER POSTS GRID
  */
function renderPostsGrid(posts, container, isFavPage) {
  if (!posts.length) {
    container.innerHTML = "";
    if (isFavPage) favEmpty.classList.remove("hidden");
    return;
  }
  if (isFavPage) favEmpty.classList.add("hidden");

  container.innerHTML = posts.map(post => buildPostCard(post, isFavPage)).join("");
  attachCardEvents(container, isFavPage);
}

function buildPostCard(post, isFavPage) {
  const initial = (post.title || "P")[0].toUpperCase();
  const tagsHtml = (post.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join("");
  const saved = isFav(post.id);

  const btnLabel = isFavPage
    ? `<i class="fa-solid fa-bookmark-slash"></i> Remove`
    : `<i class="${saved ? "fa-solid" : "fa-regular"} fa-bookmark"></i> ${saved ? "Saved" : "Save"}`;

  return `
    <article class="post-card" data-id="${post.id}">
      <div class="card-avatar">
        <div class="card-avatar-inner">${initial}</div>
      </div>
      <h2 class="card-title">${post.title}</h2>
      <p class="card-body">${post.body}</p>
      <div class="tags-wrap">${tagsHtml}</div>
      <div class="card-footer">
        <div class="card-reactions">
          <span class="reaction-item">
            <i class="fa-solid fa-heart"></i>
            ${post.reactions?.likes ?? 0}
          </span>
          <span class="reaction-item">
            <i class="fa-solid fa-thumbs-down"></i>
            ${post.reactions?.dislikes ?? 0}
          </span>
        </div>
    ${isFavPage
      ? `<button class='btn-fav active btn-remove-fav' data-id='${post.id}' title='Remove from saved'>
       <i class='fa-solid fa-bookmark-slash'></i>
     </button>`
      : `<button class='btn-fav ${saved ? "active" : ""}' data-id='${post.id}' title='${saved ? "Remove from saved" : "Save post"}'>
       <i class='${saved ? "fa-solid" : "fa-regular"} fa-bookmark'></i>
     </button>`
    }
      </div>
    </article>
  `;
}

function attachCardEvents(container, isFavPage) {
  // Click on card → detail (not on buttons)
  container.querySelectorAll(".post-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".btn-fav")) return; // handled separately
      const id = parseInt(card.dataset.id, 10);
      const post = allPosts.find(p => p.id === id);
      if (post) openDetail(post);
    });
  });

  // Favorite toggle
  container.querySelectorAll(".btn-fav").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      toggleFavorite(id);

      if (isFavPage) {
        // Re-render favorites page after removal
        renderFavoritesPage();
      }
    });
  });
}

/*
   FAVORITES PAGE
   */
function renderFavoritesPage() {
  const favPosts = allPosts.filter(p => favorites.includes(p.id));
  favGrid.innerHTML = "";
  if (favPosts.length === 0) {
    favEmpty.classList.remove("hidden");
  } else {
    favEmpty.classList.add("hidden");
    renderPostsGrid(favPosts, favGrid, true);
  }
}

/* 
   POST DETAIL PAGE
   */
async function openDetail(post) {
  currentPost = post;
  renderDetailPage(post);
  showPage("detail");

  // Optionally fetch fresh full data (dummyjson supports /posts/:id)
  try {
    const res = await fetch(`https://dummyjson.com/posts/${post.id}`);
    if (!res.ok) return;
    const fresh = await res.json();
    currentPost = fresh;
    renderDetailPage(fresh);
  } catch { /* keep cached */ }
}

function renderDetailPage(post) {
  const initial = (post.title || "P")[0].toUpperCase();
  const tagsHtml = (post.tags || []).map(t => `<span class="tag-pill">#${t}</span>`).join("");
  const saved = isFav(post.id);

  detailContent.innerHTML = `
    <div class="detail-card">
      <div class="detail-banner"></div>
      <div class="detail-body">

        <div class="detail-user">
          <div class="detail-avatar">
            <div class="detail-avatar-inner">${initial}</div>
          </div>
          <div>
            <div style="font-weight:800;font-size:14px;">Post #${post.id}</div>
            <div class="detail-meta">
              <i class="fa-regular fa-clock" style="margin-right:4px;"></i>BlogGram Author
            </div>
          </div>
        </div>

        <h1 class="detail-title">${post.title}</h1>
        <p class="detail-text">${post.body}</p>

        <hr class="detail-divider" />

        <div class="detail-reactions">
          <div class="detail-reaction">
            <i class="fa-solid fa-heart"></i>
            <span>${post.reactions?.likes ?? 0} Likes</span>
          </div>
          <div class="detail-reaction">
            <i class="fa-solid fa-thumbs-down"></i>
            <span>${post.reactions?.dislikes ?? 0} Dislikes</span>
          </div>
          <div class="detail-reaction">
            <i class="fa-solid fa-eye"></i>
            <span>${post.views ?? "—"} Views</span>
          </div>
        </div>

        <div class="detail-tags">${tagsHtml}</div>

        <hr class="detail-divider" />

        <button class="btn-primary detail-fav-btn ${saved ? "saved" : ""}" data-id="${post.id}">
          <i class="${saved ? "fa-solid" : "fa-regular"} fa-bookmark"></i>
          ${saved ? "Saved to favorites" : "Save to favorites"}
        </button>

      </div>
    </div>
  `;

  // Attach button event
  detailContent.querySelector(".detail-fav-btn").addEventListener("click", function () {
    const id = parseInt(this.dataset.id, 10);
    toggleFavorite(id);
    const nowSaved = isFav(id);
    console.log("Now saved?", nowSaved);
    this.className = `btn-primary detail-fav-btn ${nowSaved ? "saved" : ""}`;
    this.innerHTML = `
      <i class="${nowSaved ? "fa-solid" : "fa-regular"} fa-bookmark"></i>
      ${nowSaved ? "Saved to favorites" : "Save to favorites"}
    `;
  });
}

/* 
   INIT
*/
(function init() {
  loadFavorites();
  updateFavCount();
  fetchPosts();
})();
