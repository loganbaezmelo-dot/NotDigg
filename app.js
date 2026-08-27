// 1. Obfuscated Config & Supabase Initialization
const _k1 = "QUl6YVN5RFJVQ2RTalVPMUt6TFFoNWFDM242";
const _k2 = "XzYyT0F4cGxJNFE4";
const getYTKey = () => atob(_k1) + atob(_k2);

const SUPABASE_URL = "https://fjpqmmqnoyfrdsdhiunr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcHFtbXFub3lmcmRzZGhpdW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODUxNTEsImV4cCI6MjEwMzM2MTE1MX0.E3SY-5FxZqHP0t_p8dSr5xeUxKoZCI0d35Me_Rwrs94";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 2. Auth Handlers & Identity Linkers (With YouTube Read Scope)
async function loginWithGoogle() {
  if (!supabaseClient) return;

  const options = {
    redirectTo: window.location.origin + "/settings.html",
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
    queryParams: {
      access_type: 'offline',
      prompt: 'consent'
    }
  };

  const { data: { session } } = await supabaseClient.auth.getSession();
  
  if (session && session.user) {
    // Attempt identity linking if user is already signed in
    const { error } = await supabaseClient.auth.linkIdentity({
      provider: "google",
      options: options
    });
    if (error) {
      // Fallback if manual linking is disabled in project dashboard
      await supabaseClient.auth.signInWithOAuth({
        provider: "google",
        options: options
      });
    }
  } else {
    // Direct sign in
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: options
    });
    if (error) alert("Google Sign-In Error: " + error.message);
  }
}

async function loginWithGitHub() {
  if (!supabaseClient) return;
  const { data: { session } } = await supabaseClient.auth.getSession();

  const options = {
    redirectTo: window.location.origin + "/settings.html"
  };

  if (session && session.user) {
    const { error } = await supabaseClient.auth.linkIdentity({
      provider: "github",
      options: options
    });
    if (error) {
      await supabaseClient.auth.signInWithOAuth({
        provider: "github",
        options: options
      });
    }
  } else {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "github",
      options: options
    });
    if (error) alert("GitHub OAuth Error: " + error.message);
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
    options: { emailRedirectTo: window.location.origin + "/settings.html" }
  });
  if (error) throw error;
  return data;
}

// 3. UI Sync (Pulls Identities & Preserves Both Handles)
async function setupAuthUI() {
  let activeUser = localStorage.getItem("notshovel_auth_user");
  let avatarUrl = null;

  if (supabaseClient) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      const user = session.user;
      const identities = user.identities || [];
      
      const ghIdentity = identities.find(id => id.provider === "github");
      const googleIdentity = identities.find(id => id.provider === "google");

      if (ghIdentity && ghIdentity.identity_data) {
        const ghUsername = ghIdentity.identity_data.user_name || ghIdentity.identity_data.preferred_username;
        if (ghUsername) {
          activeUser = ghUsername;
          localStorage.setItem("notshovel_auth_user", ghUsername);
        }
      }

      if (googleIdentity && googleIdentity.identity_data) {
        if (!localStorage.getItem("notshovel_linked_channel")) {
          const ytName = googleIdentity.identity_data.full_name || googleIdentity.identity_data.name;
          if (ytName) localStorage.setItem("notshovel_linked_channel", ytName);
        }
      }

      const meta = user.user_metadata || {};
      if (!activeUser) {
        activeUser = meta.user_name || meta.preferred_username || user.email.split("@")[0];
        localStorage.setItem("notshovel_auth_user", activeUser);
      }
      avatarUrl = meta.avatar_url || meta.picture;
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
    profileLinks.forEach(link => { link.href = "login.html"; });
  }
}

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

// 4. Global 4-Way Search
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
    const apiKey = getYTKey();

    defaultFeeds.style.display = "none";
    resultsSection.style.display = "block";
    title.textContent = `Search: "${rawQuery}"`;
    resultsList.innerHTML = `<p style="color: #9ca3af; text-align: center;">Searching NotShovel network & YouTube... 🔍</p>`;

    try {
      const [userRes, ghRes, hnRes, ytRes] = await Promise.all([
        fetch(`https://api.github.com/users/${encodeURIComponent(cleanHandle)}`),
        fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(rawQuery)}&sort=stars&order=desc&per_page=3`),
        fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(rawQuery)}&tags=story&hitsPerPage=3`),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=4&q=${encodeURIComponent(rawQuery)}&type=video,channel&key=${apiKey}`)
      ]);

      const ghUser = userRes.ok ? await userRes.json() : null;
      const ghData = await ghRes.json();
      const hnData = await hnRes.json();
      const ytData = await ytRes.json();

      let cardsHtml = "";

      if (ghUser && ghUser.login) {
        cardsHtml += `
          <article class="card" style="border-left: 3px solid #3b82f6;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${ghUser.avatar_url}" alt="${ghUser.login}" style="width: 32px; height: 32px; border-radius: 50%;" />
                <div>
                  <a href="profile.html?user=${ghUser.login}" class="meta-link" style="font-weight: 700; font-size: 15px; color: #fff;">@${ghUser.login}</a>
                  <p style="font-size: 12px; color: var(--text-muted); margin: 0;">${ghUser.name || 'Developer'}</p>
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

      if (ytData.items && ytData.items.length > 0) {
        cardsHtml += ytData.items.map(item => {
          const isChannel = item.id.kind === "youtube#channel";
          const targetUrl = isChannel ? `channel.html?id=${item.id.channelId}` : `video.html?v=${item.id.videoId}`;
          const badgeText = isChannel ? "YouTube Channel" : "YouTube Video";
          const icon = isChannel ? "📺" : "▶️";

          return `
            <article class="card" style="border-left: 3px solid #ef4444;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${badgeText}</span>
              </div>
              <a href="${targetUrl}" class="card-title">
                ${icon} ${item.snippet.title}
              </a>
              <p class="card-snippet">${item.snippet.description || "No description provided."}</p>
              <div class="card-footer">
                <span>By <a href="channel.html?id=${item.snippet.channelId}" class="meta-link" style="color: #ef4444;">${item.snippet.channelTitle}</a></span>
                <a href="${targetUrl}" class="meta-link">Open in NotShovel →</a>
              </div>
            </article>
          `;
        }).join("");
      }

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
            <a href="repo.html?owner=${repo.owner.login}&repo=${repo.name}" class="card-title">
              📦 ${repo.name}
            </a>
            <p class="card-snippet">${repo.description || "No description provided."}</p>
            <div class="card-footer">
              <span>⭐ ${repo.stargazers_count.toLocaleString()} stars • 🍴 ${repo.forks_count.toLocaleString()} forks</span>
              <a href="repo.html?owner=${repo.owner.login}&repo=${repo.name}" class="meta-link">Read Project →</a>
            </div>
          </article>
        `).join("");
      }

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

      resultsList.innerHTML = cardsHtml || `<p style="color: var(--text-muted); text-align: center;">No results found across NotShovel & YouTube 😭</p>`;

    } catch (err) {
      resultsList.innerHTML = `<p style="color: #ef4444; text-align: center;">Search failed: ${err.message} 😭</p>`;
    }
  });
}

// 5. Tech Stories Loader
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

// 6. Dynamic GitHub Repos Loader
async function loadGitHubRecommendations() {
  const container = document.getElementById("github-feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching trending GitHub recommendations... 📦</p>`;

  try {
    let feedRepos = [];
    const activeUser = localStorage.getItem("notshovel_auth_user");

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

          <a href="repo.html?owner=${repo.owner.login}&repo=${repo.name}" class="card-title">
            📦 ${repo.name}
          </a>
          <p class="card-snippet">${repo.description || "Open source project on GitHub."}</p>
          
          <div class="card-footer">
            <span>⭐ ${repo.stargazers_count.toLocaleString()} stars • 🍴 ${repo.forks_count.toLocaleString()} forks</span>
            <a href="repo.html?owner=${repo.owner.login}&repo=${repo.name}" class="meta-link">Read Project →</a>
          </div>
        </article>
      `;
    }).join("");

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to load GitHub recommendations: ${err.message} 😭</p>`;
  }
}

// 7. Trending YouTube Loader
async function loadTrendingYouTubeVideos() {
  const container = document.getElementById("youtube-feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching top YouTube tech videos... 📺</p>`;

  try {
    const apiKey = getYTKey();
    const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&chart=mostPopular&q=software+engineering+web+development+tech&maxResults=5&type=video&key=${apiKey}`);
    const data = await res.json();

    if (data.items && data.items.length > 0) {
      container.innerHTML = data.items.map(v => `
        <article class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <a href="channel.html?id=${v.snippet.channelId}" class="meta-link" style="font-weight: 600; color: #ef4444;">
              📺 ${v.snippet.channelTitle}
            </a>
            <span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">Video</span>
          </div>

          <a href="video.html?v=${v.id.videoId}" class="card-title">
            ▶️ ${v.snippet.title}
          </a>
          <p class="card-snippet">${v.snippet.description || "No description provided."}</p>

          <div class="card-footer">
            <span>Published ${new Date(v.snippet.publishedAt).toLocaleDateString()}</span>
            <a href="video.html?v=${v.id.videoId}" class="meta-link" style="color: #ef4444;">Watch Video 🎬 →</a>
          </div>
        </article>
      `).join("");
    } else {
      container.innerHTML = `<p style="color: var(--text-muted); text-align: center;">No videos available.</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to load YouTube feed: ${err.message} 😭</p>`;
  }
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupAuthUI();
  setupSearch();
  loadFeed();
  loadGitHubRecommendations();
  loadTrendingYouTubeVideos();
});
