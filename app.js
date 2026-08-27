// 1. Supabase Initialization
const SUPABASE_URL = "https://fjpqmmqnoyfrdsdhiunr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcHFtbXFub3lmcmRzZGhpdW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODUxNTEsImV4cCI6MjEwMzM2MTE1MX0.E3SY-5FxZqHP0t_p8dSr5xeUxKoZCI0d35Me_Rwrs94";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 2. Auth Handlers
async function loginWithGitHub() {
  if (supabaseClient) {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: window.location.origin + "/profile.html"
      }
    });
    if (error) alert("GitHub OAuth error: " + error.message);
  }
}

async function loginWithEmail(email, password) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function signUpWithEmail(email, password) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

async function sendMagicLink(email) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + "/profile.html" }
  });
  if (error) throw error;
  return data;
}

// 3. Sync UI with Active Auth Session
async function setupAuthUI() {
  let activeUser = localStorage.getItem("notshovel_auth_user");
  let avatarUrl = null;

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const meta = session.user.user_metadata || {};
      activeUser = meta.user_name || meta.preferred_username || session.user.email.split("@")[0];
      avatarUrl = meta.avatar_url;
      localStorage.setItem("notshovel_auth_user", activeUser);
    }
  }

  const profileLinks = document.querySelectorAll(".profile-link");
  const navAvatars = document.querySelectorAll(".nav-avatar");

  if (activeUser) {
    profileLinks.forEach(link => {
      link.href = `profile.html?user=${encodeURIComponent(activeUser)}`;
    });
    navAvatars.forEach(av => {
      if (avatarUrl) {
        av.style.backgroundImage = `url('${avatarUrl}')`;
        av.style.backgroundSize = "cover";
      } else {
        av.textContent = activeUser.slice(0, 2).toUpperCase();
        av.style.display = "flex";
        av.style.alignItems = "center";
        av.style.justifyContent = "center";
        av.style.fontSize = "12px";
        av.style.fontWeight = "bold";
        av.style.color = "#fff";
      }
    });
  } else {
    profileLinks.forEach(link => {
      link.href = "profile.html";
    });
  }
}

// 4. Sidebar Toggle Handler
function setupSidebar() {
  const menuBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("close-drawer");
  const backdrop = document.getElementById("drawer-backdrop");

  function openDrawer() { document.body.classList.add("drawer-open"); }
  function closeDrawer() { document.body.classList.remove("drawer-open"); }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (backdrop) backdrop.addEventListener("click", closeDrawer);
}

// 5. Global 3-Way Search (User Profiles + Repos + Stories)
function setupSearch() {
  const form = document.getElementById("search-form");
  const input = document.getElementById("search-input");
  const resultsSection = document.getElementById("search-results-section");
  const resultsList = document.getElementById("search-feed-list");
  const defaultFeeds = document.getElementById("default-feeds");
  const clearBtn = document.getElementById("clear-search-btn");
  const title = document.getElementById("search-header-title");

  if (!form || !input) return;

  function resetSearch() {
    input.value = "";
    resultsSection.style.display = "none";
    defaultFeeds.style.display = "block";
  }

  if (clearBtn) clearBtn.onclick = resetSearch;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawQuery = input.value.trim();
    if (!rawQuery) return;

    const cleanHandle = rawQuery.replace(/^@/, "").trim();

    defaultFeeds.style.display = "none";
    resultsSection.style.display = "block";
    title.textContent = `Search: "${rawQuery}"`;
    resultsList.innerHTML = `<p style="color: #9ca3af; text-align: center;">Searching profiles, repos, and stories... 🔍</p>`;

    try {
      const [userRes, ghRes, hnRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(cleanHandle)}`),
        fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(rawQuery)}&sort=stars&order=desc&per_page=4`),
        fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(rawQuery)}&tags=story&hitsPerPage=4`)
      ]);

      const ghUser = userRes.ok ? await userRes.json() : null;
      const ghData = await ghRes.json();
      const hnData = await hnRes.json();

      let cardsHtml = "";

      // 1. Direct User Profile Match
      if (ghUser && ghUser.login) {
        cardsHtml += `
          <article class="card" style="border-left: 3px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${ghUser.avatar_url}" alt="${ghUser.login}" style="width: 32px; height: 32px; border-radius: 50%;" />
                <div>
                  <a href="profile.html?user=${ghUser.login}" class="meta-link" style="font-weight: 700; font-size: 15px; color: #fff;">@${ghUser.login}</a>
                  <p style="font-size: 12px; color: var(--text-muted);">${ghUser.name || 'Developer'}</p>
                </div>
              </div>
              <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa;">User Profile</span>
            </div>
            <p class="card-snippet" style="margin-top: 8px;">${ghUser.bio || "Active developer profile on NotShovel."}</p>
            <div class="card-footer">
              <span>${ghUser.public_repos} Repos • ${ghUser.followers} Followers</span>
              <a href="profile.html?user=${ghUser.login}" class="meta-link">View NotShovel Profile →</a>
            </div>
          </article>
        `;
      }

      // 2. GitHub Repositories
      if (ghData.items && ghData.items.length > 0) {
        cardsHtml += ghData.items.map(repo => `
          <article class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${repo.owner.avatar_url}" alt="${repo.owner.login}" style="width: 22px; height: 22px; border-radius: 50%;" />
                <a href="profile.html?user=${repo.owner.login}" class="meta-link" style="font-weight: 600;">@${repo.owner.login}</a>
              </div>
              <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">GitHub Repo</span>
            </div>
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="card-title">
              📦 ${repo.name}
            </a>
            <p class="card-snippet">${repo.description || "No description provided."}</p>
            <div class="card-footer">
              <span>⭐ ${repo.stargazers_count.toLocaleString()} stars • 🍴 ${repo.forks_count.toLocaleString()} forks</span>
              <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="meta-link">View Repo ↗</a>
            </div>
          </article>
        `).join("");
      }

      // 3. Tech Stories & Discussions
      if (hnData.hits && hnData.hits.length > 0) {
        cardsHtml += hnData.hits.map(item => {
          const storyUrl = item.url || `comments.html?id=${item.objectID}`;
          return `
            <article class="card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">Story</span>
              </div>
              <a href="${storyUrl}" target="_blank" rel="noopener noreferrer" class="card-title">
                ${item.title}
              </a>
              <p class="card-snippet">Discussion with ${item.num_comments || 0} comments and ${item.points || 0} points.</p>
              <div class="card-footer">
                <span>Posted by <a href="profile.html?user=${item.author}" class="meta-link">@${item.author}</a></span>
                <a href="comments.html?id=${item.objectID}" class="meta-link">Comments (${item.num_comments || 0}) →</a>
              </div>
            </article>
          `;
        }).join("");
      }

      if (!cardsHtml) {
        resultsList.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No matching profiles, stories, or repositories found 😭</p>`;
      } else {
        resultsList.innerHTML = cardsHtml;
      }

    } catch (err) {
      resultsList.innerHTML = `<p style="color: #ef4444; text-align: center;">Search failed: ${err.message} 😭</p>`;
    }
  });
}

// 6. Live Tech Stories Loader (Hacker News)
async function loadFeed() {
  const container = document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching live tech top stories... 🚀</p>`;

  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const storyIds = await res.json();
    const topIds = storyIds.slice(0, 10);

    const storyPromises = topIds.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
    );
    const stories = await Promise.all(storyPromises);

    container.innerHTML = stories
      .filter(item => item && item.title)
      .map((item, index) => {
        const timeAgo = Math.floor((Date.now() / 1000 - item.time) / 3600);
        const storyUrl = item.url || `comments.html?id=${item.id}`;

        return `
          <article class="card">
            <a href="${storyUrl}" target="_blank" rel="noopener noreferrer" class="card-title">
              ${index + 1}. ${item.title}
            </a>
            <p class="card-snippet">Discussion with ${item.descendants || 0} comments and ${item.score || 0} upvotes.</p>
            <div class="card-footer">
              <span>
                Posted by <a href="profile.html?user=${item.by}" class="meta-link">@${item.by}</a> 
                • ${timeAgo}h ago
              </span>
              <a href="comments.html?id=${item.id}" class="meta-link">Comments (${item.descendants || 0}) →</a>
            </div>
          </article>
        `;
      }).join("");

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to load live feed: ${err.message} 😭</p>`;
  }
}

// 7. Dynamic GitHub Recommendations Loader
async function loadGitHubRecommendations() {
  const container = document.getElementById("github-feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching trending GitHub recommendations... 📦</p>`;

  try {
    let feedRepos = [];
    const activeUser = localStorage.getItem("notshovel_auth_user");

    // Spotlight logged-in user repo
    if (activeUser) {
      try {
        const userRepoRes = await fetch(`https://api.github.com/users/${activeUser}/repos?sort=pushed&per_page=1`);
        if (userRepoRes.ok) {
          const userRepos = await userRepoRes.json();
          if (Array.isArray(userRepos) && userRepos.length > 0) {
            feedRepos.push(userRepos[0]);
          }
        }
      } catch (err) {
        console.warn("Could not fetch active user repo", err);
      }
    }

    // Trending repos across GitHub
    const searchRes = await fetch(
      "https://api.github.com/search/repositories?q=stars:>100+pushed:>2026-01-01&sort=stars&order=desc&per_page=6"
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const trending = (searchData.items || []).filter(
        repo => !feedRepos.some(existing => existing.id === repo.id)
      );
      feedRepos = [...feedRepos, ...trending].slice(0, 6);
    }

    if (feedRepos.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No recommendations available right now.</p>`;
      return;
    }

    container.innerHTML = feedRepos.map(repo => {
      const isUserRepo = activeUser && repo.owner.login.toLowerCase() === activeUser.toLowerCase();
      
      return `
        <article class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${repo.owner.avatar_url}" alt="${repo.owner.login}" style="width: 22px; height: 22px; border-radius: 50%;" />
              <a href="profile.html?user=${repo.owner.login}" class="meta-link" style="font-weight: 600;">@${repo.owner.login}</a>
            </div>
            ${isUserRepo ? '<span class="badge" style="background: rgba(37, 99, 235, 0.2); color: #60a5fa;">Your Repo</span>' : '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">Trending</span>'}
          </div>

          <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="card-title">
            📦 ${repo.name}
          </a>
          <p class="card-snippet">${repo.description || "Open source project on GitHub."}</p>
          
          <div class="card-footer">
            <span>⭐ ${repo.stargazers_count.toLocaleString()} stars • 🍴 ${repo.forks_count.toLocaleString()} forks</span>
            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="meta-link">View Repo ↗</a>
          </div>
        </article>
      `;
    }).join("");

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to load GitHub recommendations: ${err.message} 😭</p>`;
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupAuthUI();
  setupSearch();
  loadFeed();
  loadGitHubRecommendations();
});
