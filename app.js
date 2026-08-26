async function loadFeed() {
  const container = document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Fetching live tech top stories... 🚀</p>`;

  try {
    // 1. Get Top 15 live Tech Stories from Hacker News Firebase API
    const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    const storyIds = await res.json();
    const topIds = storyIds.slice(0, 15);

    // 2. Fetch all story details concurrently
    const storyPromises = topIds.map(id =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json())
    );
    const stories = await Promise.all(storyPromises);

    // 3. Render clean cards with WORKING user profile routes
    container.innerHTML = stories
      .filter(item => item && item.title)
      .map((item, index) => {
        const timeAgo = Math.floor((Date.now() / 1000 - item.time) / 3600);
        const storyUrl = item.url || `https://news.ycombinator.com/item?id=${item.id}`;

        return `
          <article class="card">
            <a href="${storyUrl}" target="_blank" rel="noopener noreferrer" class="card-title">
              ${index + 1}. ${item.title}
            </a>
            <p class="card-snippet">Discussion with ${item.descendants || 0} comments and ${item.score} upvotes.</p>
            <div class="card-footer">
              <span>
                Posted by <a href="profile.html?user=${item.by}" class="meta-link">@${item.by}</a> 
                • ${timeAgo}h ago
              </span>
              <a href="https://news.ycombinator.com/item?id=${item.id}" target="_blank" class="meta-link">Comments (${item.descendants || 0}) →</a>
            </div>
          </article>
        `;
      }).join("");

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to load live feed: ${err.message} 😭</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFeed);
