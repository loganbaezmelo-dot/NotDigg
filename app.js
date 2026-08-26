// Sample feed data with functional profile and post links
const stories = [
  {
    id: 1,
    title: "Yutori Releases Navigator N2 Computer-Use Model",
    snippet: "Model scores 65.2 percent on OSWorld 2.0 at low cost and leads multiple agent benchmarks.",
    author: "yutorilabs",
    postsCount: 11,
    timeAgo: "6h ago",
    url: "https://x.com/yutorilabs"
  },
  {
    id: 2,
    title: "Weaviate Podcast Features MIT Work on Recursive Language Models",
    snippet: "Episode covers language model harnesses as compositional generalizers along with related MIT research.",
    author: "weaviate_io",
    postsCount: 3,
    timeAgo: "9h ago",
    url: "https://x.com/weaviate_io"
  },
  {
    id: 3,
    title: "Claude Models Optimize for Agent Communication Over Humans",
    snippet: "Research deep dives into emergent protocols between multi-agent reasoning systems.",
    author: "AnthropicAI",
    postsCount: 7,
    timeAgo: "13h ago",
    url: "https://x.com/AnthropicAI"
  }
];

function renderFeed() {
  const container = document.getElementById("feed-list");
  if (!container) return;

  container.innerHTML = stories.map((item, index) => `
    <article class="card">
      <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-title">
        ${index + 1}. ${item.title}
      </a>
      <p class="card-snippet">${item.snippet}</p>
      <div class="card-footer">
        <span>
          <a href="profile.html?user=${item.author}" class="meta-link">@${item.author}</a> 
          • ${item.postsCount} posts
        </span>
        <span>${item.timeAgo}</span>
      </div>
    </article>
  `).join("");
}

document.addEventListener("DOMContentLoaded", renderFeed);
