// /api/tweets.js
export default async function handler(req, res) {
  const { username = "OpenAI" } = req.query;

  try {
    // 1. Fetch public syndication timeline (Zero auth required)
    const syndicationUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?limit=10`;
    
    const response = await fetch(syndicationUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch from X" });
    }

    const html = await response.text();

    // 2. Extract embedded JSON props directly from the rendered HTML payload
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([^<]+)<\/script>/);
    
    if (!match) {
      return res.status(500).json({ error: "Could not parse payload" });
    }

    const data = JSON.parse(match[1]);
    const rawTimeline = data?.props?.pageProps?.timeline?.entries || [];

    // 3. Map into clean NotDigg card format
    const tweets = rawTimeline
      .filter(item => item.type === "tweet")
      .map(entry => {
        const tweet = entry.content.tweet;
        return {
          id: tweet.id_str,
          title: tweet.text.slice(0, 75) + (tweet.text.length > 75 ? "..." : ""),
          snippet: tweet.text,
          author: tweet.user.screen_name,
          name: tweet.user.name,
          avatar: tweet.user.profile_image_url_https,
          likes: tweet.favorite_count || 0,
          retweets: tweet.retweet_count || 0,
          url: `https://x.com/${tweet.user.screen_name}/status/${tweet.id_str}`
        };
      });

    return res.status(200).json({ success: true, count: tweets.length, data: tweets });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
