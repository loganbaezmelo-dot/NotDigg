// 1. Supabase Initialization
const SUPABASE_URL = "https://fjpqmmqnoyfrdsdhiunr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqcHFtbXFub3lmcmRzZGhpdW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3ODUxNTEsImV4cCI6MjEwMzM2MTE1MX0.E3SY-5FxZqHP0t_p8dSr5xeUxKoZCI0d35Me_Rwrs94";

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// 2. Auth Handlers (GitHub & Email)
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
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

async function signUpWithEmail(email, password) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

async function sendMagicLink(email) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + "/profile.html"
    }
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

// 5. Feed Loader
async function loadFeed() {
  const container = document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching live tech top stories... 🚀</p>`;

  try {
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const storyIds = await res.json();
    const topIds = storyIds.slice(0, 15);

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

// Init
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupAuthUI();
  loadFeed();
});
