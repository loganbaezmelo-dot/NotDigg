// Target tech accounts to aggregate
const ACCOUNTS = ["OpenAI", "AnthropicAI", "MistralAI"];

async function loadFeed() {
  const container = document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = `<p style="color: #9ca3af; text-align: center;">Aggregating live tweets without giving Elon $200... 💀</p>`;

  try {
    // Fetch accounts in parallel
    const requests = ACCOUNTS.map(user => 
      fetch(`/api/tweets?username=${user}`).then(res => res.json())
    );
    
    const results = await Promise.all(requests);
    const allPosts = results
      .flatMap(r => r.data || [])
      .sort((a, b) => b.likes - a.likes); // Rank by likes

    if (allPosts.length === 0) {
      container.innerHTML = `<p style="color: #ef4444;">Rate limited or no posts found 😭</p>`;
      return;
    }

    container.innerHTML = allPosts.map((item, index) => `
      <article class="card">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-title">
          ${index + 1}. ${item.title}
        </a>
        <p class="card-snippet">${item.snippet}</p>
        <div class="card-footer">
          <span>
            <a href="profile.html?user=${item.author}" class="meta-link">@${item.author}</a>
            • ❤️ ${item.likes} • 🔁 ${item.retweets}
          </span>
          <a href="${item.url}" target="_blank" class="meta-link">View on X →</a>
        </div>
      </article>
    `).join("");

  } catch (err) {
    container.innerHTML = `<p style="color: #ef4444;">Failed to load live feed: ${err.message} 😭</p>`;
  }
}

document.addEventListener("DOMContentLoaded", loadFeed);
