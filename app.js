// 1. Sidebar Drawer Toggle Handler
function setupSidebar() {
  const menuBtn = document.getElementById("menu-toggle");
  const closeBtn = document.getElementById("close-drawer");
  const backdrop = document.getElementById("drawer-backdrop");

  function openDrawer() {
    document.body.classList.add("drawer-open");
  }

  function closeDrawer() {
    document.body.classList.remove("drawer-open");
  }

  if (menuBtn) menuBtn.addEventListener("click", openDrawer);
  if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
  if (backdrop) backdrop.addEventListener("click", closeDrawer);
}

// 2. Feed Loader with HN Live Stories
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

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  loadFeed();
});
