/*==================================================
NEWS VIEW JS v4.0
FULL CLEAN VERSION
IMAGE ONLY FROM HIDDEN METADATA
==================================================*/

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const NewsView = {
    feed: [],
    posts: [],
    current: {},
    article: {},
    loaded: false,
    feedURL: "/feeds/posts/default/-/news?alt=json&max-results=500"
  };

  window.NewsView = NewsView;

  initNewsView();

  async function initNewsView() {
    await Promise.all([loadCurrentMetadata(), loadFeed()]);
    cacheFeedPosts();

    renderMainHero();
    initShareControls();
    renderRelatedNews();
    renderLatestNews();
    renderTrendingNews();
    initStaticLinks();
    buildArticleData();
  }

  /*==================================
  FEED
  ==================================*/

  async function loadFeed() {
    try {
      const res = await fetch(NewsView.feedURL, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`Feed request failed: ${res.status}`);
      }

      const json = await res.json();
      NewsView.feed = Array.isArray(json?.feed?.entry) ? json.feed.entry : [];
    } catch (err) {
      console.error("News Feed Error:", err);
      NewsView.feed = [];
    } finally {
      NewsView.loaded = true;
    }
  }

  /*==================================
  CURRENT METADATA
  ==================================*/

  async function loadCurrentMetadata() {
    const metaRoot = document.getElementById("news-metadata");

    if (!metaRoot) {
      NewsView.current = getEmptyCurrentMeta();
      return;
    }

    const meta = (name) => {
      const el = metaRoot.querySelector("." + name);
      return el ? cleanText(el.textContent) : "";
    };

    NewsView.current = {
      title: derivePageTitle(document.title || ""),
      url: normalizeUrl(location.href),

      image: meta("news-image"),
      imageAlt: meta("news-image-alt"),
      shortDesc: meta("news-short-desc"),

      content: meta("news-content"),
      celebrity: meta("news-celebrity"),

      category: meta("news-category"),
      categoryLink: meta("news-category-link"),

      badge: meta("news-badge"),
      trending: meta("news-trending"),
      featured: meta("news-featured"),

      published: meta("news-date") || meta("news-published"),
      updated: meta("news-updated"),
      author: meta("news-author")
    };
  }

  function getEmptyCurrentMeta() {
    return {
      title: derivePageTitle(document.title || ""),
      url: normalizeUrl(location.href),
      image: "",
      imageAlt: "",
      shortDesc: "",
      content: "",
      celebrity: "",
      category: "",
      categoryLink: "",
      badge: "",
      trending: "",
      featured: "",
      published: "",
      updated: "",
      author: ""
    };
  }

  function derivePageTitle(raw) {
    const text = cleanText(raw);
    if (!text) return "";
    const parts = text.split(/\s*[|:»–-]\s*/).filter(Boolean);
    return cleanText(parts[0] || text);
  }

  /*==================================
  CACHE POSTS
  ==================================*/

  function cacheFeedPosts() {
    NewsView.posts = NewsView.feed.map(parsePost).filter(Boolean);
  }

  function parsePost(post) {
    const html = post?.content?.$t || "";

    return {
      title: cleanText(post?.title?.$t || ""),
      url: normalizeUrl(getLink(post)),

      image: getHiddenImageFromHtml(html),
      imageAlt: getHiddenImageAltFromHtml(html, post?.title?.$t || ""),

      shortDesc: getMeta(html, "news-short-desc"),
      content: getMeta(html, "news-content"),
      celebrity: getMeta(html, "news-celebrity"),

      category: getMeta(html, "news-category"),
      categoryLink: getMeta(html, "news-category-link"),

      badge: getMeta(html, "news-badge"),
      trending: getMeta(html, "news-trending"),
      featured: getMeta(html, "news-featured"),

      html,
      published: extractPublished(post),
      updated: extractUpdated(post),
      author: extractAuthor(post),
      labels: extractLabels(post)
    };
  }

  function getMeta(html, className) {
    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const el = doc.querySelector("." + className);
    return el ? cleanText(el.textContent) : "";
  }

  function getHiddenImageFromHtml(html) {
    return getMeta(html, "news-image");
  }

  function getHiddenImageAltFromHtml(html, fallbackTitle = "") {
    const alt = getMeta(html, "news-image-alt");
    return alt || cleanText(fallbackTitle);
  }

  function getLink(post) {
    const link = Array.isArray(post?.link)
      ? post.link.find((x) => x.rel === "alternate")
      : null;

    return link ? link.href : "#";
  }

  function extractPublished(post) {
    return post?.published?.$t || post?.published || "";
  }

  function extractUpdated(post) {
    return post?.updated?.$t || post?.updated || "";
  }

  function extractAuthor(post) {
    if (!Array.isArray(post?.author) || !post.author.length) return "";
    return cleanText(post.author[0]?.name?.$t || "");
  }

  function extractLabels(post) {
    return Array.isArray(post?.category)
      ? post.category.map((x) => cleanText(x.term || "")).filter(Boolean)
      : [];
  }

  /*==================================
  UTILITIES
  ==================================*/

  function cleanText(text) {
    return text ? String(text).replace(/\s+/g, " ").trim() : "";
  }

  function normalizeUrl(url) {
    if (!url) return "";
    try {
      return new URL(url, location.origin).href.split("?")[0];
    } catch {
      return String(url).split("?")[0];
    }
  }

  function splitTags(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function limit(arr, count) {
    return arr.slice(0, count);
  }

  function sortByScore(arr) {
    return arr.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  function isTruthyTag(value) {
    const v = String(value || "").trim().toLowerCase();
    return ["yes", "true", "1", "on"].includes(v);
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return cleanText(dateString);

    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }

  function escapeHTML(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function createBadgeElement(text) {
    const value = cleanText(text);
    if (!value) return null;

    const span = document.createElement("span");
    span.className = "nv-badge";
    span.textContent = value;
    return span;
  }

  function createImage(src, alt) {
    if (!src) return null;

    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = src;
    img.alt = alt || "";

    img.onerror = function () {
      this.remove();
    };

    return img;
  }

  function clear(el) {
    if (el) el.innerHTML = "";
  }

  function getReadTime() {
    const article = document.querySelector(".nv-article");
    if (!article) return "1 min read";

    const text = cleanText(article.innerText || article.textContent || "");
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const mins = Math.max(1, Math.ceil(words / 200));

    return `${mins} min read`;
  }

  function getCurrentPost() {
    return NewsView.posts.find((item) => isCurrentPost(item)) || null;
  }

  function isCurrentPost(post) {
    return normalizeUrl(post?.url) === normalizeUrl(NewsView.current.url);
  }

  function getMatchScore(post) {
    let score = 0;

    const currentContentTags = splitTags(NewsView.current.content);
    const currentCelebrityTags = splitTags(NewsView.current.celebrity);
    const currentCategory = cleanText(NewsView.current.category).toLowerCase();

    const postContentTags = splitTags(post.content);
    const postCelebrityTags = splitTags(post.celebrity);
    const postCategory = cleanText(post.category).toLowerCase();

    currentContentTags.forEach((tag) => {
      if (postContentTags.includes(tag)) score += 5;
    });

    currentCelebrityTags.forEach((tag) => {
      if (postCelebrityTags.includes(tag)) score += 3;
    });

    if (currentCategory && currentCategory === postCategory) {
      score += 2;
    }

    return score;
  }

  function buildArticleData() {
    NewsView.article = {
      headline: NewsView.current.title || "",
      image: NewsView.current.image || "",
      description: NewsView.current.shortDesc || "",
      category: NewsView.current.category || "",
      published: getCurrentPost()?.published || NewsView.current.published || "",
      updated: getCurrentPost()?.updated || NewsView.current.updated || "",
      author: getCurrentPost()?.author || NewsView.current.author || "",
      url: NewsView.current.url || location.href
    };
  }

  /*==================================
  HERO
  ==================================*/

  function renderMainHero() {
    const data = NewsView.current || {};
    const post = getCurrentPost();

    const imageSrc = data.image || post?.image || "";
    const imageAlt = data.imageAlt || data.title || post?.title || "";

    const image = document.getElementById("news-image");
    if (image) {
      if (imageSrc) {
        image.src = imageSrc;
        image.alt = imageAlt;
        image.style.display = "";
      } else {
        image.removeAttribute("src");
        image.alt = "";
        image.style.display = "none";
      }
    }

    const badge = document.querySelector(".nv-badge");
    if (badge) {
      if (data.badge) {
        badge.textContent = data.badge;
        badge.style.display = "inline-flex";
      } else {
        badge.style.display = "none";
      }
    }

    const title = document.querySelector(".nv-title");
    if (title) {
      title.textContent = data.title || post?.title || document.title || "";
    }

    const breadcrumb = document.querySelector(".nv-breadcrumb");
    if (breadcrumb) {
      const category = data.category || post?.category || "News";
      const categoryLink = data.categoryLink || post?.categoryLink || "/news.html";

      breadcrumb.innerHTML = `
        <a href="/">Home</a>
        <span class="nv-divider">/</span>
        <a href="/news.html">News &amp; Gossips</a>
        <span class="nv-divider">/</span>
        <a href="${escapeHTML(categoryLink)}" class="nv-breadcrumb-category">${escapeHTML(category)}</a>
      `;
    }

    const meta = document.querySelector(".nv-meta");
    if (meta) {
      const published = formatDate(post?.published || data.published || "");
      const author = cleanText(post?.author || data.author || "");
      const readTime = getReadTime();

      const parts = [];

      if (published) {
        parts.push(`<span>📅 ${escapeHTML(published)}</span>`);
      }

      if (author) {
        parts.push(`<span class="nv-dot">•</span><span>✍ ${escapeHTML(author)}</span>`);
      }

      if (readTime) {
        parts.push(`<span class="nv-dot">•</span><span>⏱ ${escapeHTML(readTime)}</span>`);
      }

      meta.innerHTML = parts.join("");
    }

    NewsView.article.headline = data.title || post?.title || "";
    NewsView.article.image = imageSrc;
    NewsView.article.description = data.shortDesc || post?.shortDesc || "";
    NewsView.article.category = data.category || post?.category || "";
    NewsView.article.published = post?.published || data.published || "";
    NewsView.article.updated = post?.updated || data.updated || "";
    NewsView.article.author = post?.author || data.author || "";
    NewsView.article.url = data.url || location.href;

    document.title = NewsView.article.headline || document.title;
  }

  /*==================================
  SHARE
  ==================================*/

  function initShareControls() {
    const wrap = document.querySelector(".nv-share");
    if (!wrap) return;

    wrap.innerHTML = `
      <span class="nv-share-title">Share</span>
      <button type="button" class="nv-share-btn" data-share="native" aria-label="Share">↗</button>
      <button type="button" class="nv-share-btn" data-share="whatsapp" aria-label="WhatsApp">WA</button>
      <button type="button" class="nv-share-btn" data-share="facebook" aria-label="Facebook">FB</button>
      <button type="button" class="nv-share-btn" data-share="twitter" aria-label="X">X</button>
      <button type="button" class="nv-share-btn" data-share="telegram" aria-label="Telegram">TG</button>
      <button type="button" class="nv-share-btn" data-share="copy" aria-label="Copy link">⧉</button>
    `;

    if (document.__nvShareBound) return;
    document.__nvShareBound = true;

    document.addEventListener("click", async function (e) {
      const btn = e.target.closest("[data-share]");
      if (!btn) return;

      const type = btn.dataset.share;
      const url = NewsView.article.url || location.href;
      const title = NewsView.article.headline || document.title || "";
      const text = NewsView.article.description || "";

      await handleShare(type, url, title, text, btn);
    });
  }

  async function handleShare(type, url, title, text, button) {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    if (type === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (type === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (type === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (type === "telegram") {
      window.open(
        `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        "_blank",
        "noopener,noreferrer"
      );
      return;
    }

    if (type === "copy") {
      try {
        await copyToClipboard(url);
        const old = button.innerHTML;
        button.innerHTML = "✔";
        setTimeout(() => {
          button.innerHTML = old || "⧉";
        }, 1500);
      } catch (err) {
        console.error("Copy failed:", err);
      }
      return;
    }

    if (type === "native") {
      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text,
            url
          });
        } catch (err) {
          // ignore cancel
        }
        return;
      }

      try {
        await copyToClipboard(url);
        alert("Link Copied");
      } catch (err) {
        console.error("Native share fallback failed:", err);
      }
    }
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }

  /*==================================
  RELATED
  ==================================*/

  function renderRelatedNews() {
    const wrap = document.getElementById("related-news");
    const section = document.querySelector(".nv-related");
    if (!wrap) return;

    clear(wrap);

    let posts = [];

    NewsView.posts.forEach((post) => {
      if (isCurrentPost(post)) return;
      const item = { ...post, score: getMatchScore(post) };
      posts.push(item);
    });

    posts = sortByScore(posts).filter((post) => (post.score || 0) > 0);

    if (!posts.length) {
      posts = NewsView.posts.filter((post) => !isCurrentPost(post));
    }

    posts = limit(posts, 5);

    if (!posts.length && section) {
      section.style.display = "none";
      return;
    }

    if (section) section.style.display = "";

    posts.forEach((post) => {
      wrap.appendChild(createCard(post, "nv-related"));
    });

    const viewAll = document.querySelector(".nv-related-viewall");
    if (viewAll) {
      viewAll.href = NewsView.current.categoryLink || "/news.html";
    }
  }

  function renderLatestNews() {
    const wrap = document.getElementById("latest-news");
    const section = document.querySelector(".nv-latest");
    if (!wrap) return;

    clear(wrap);

    const posts = limit(
      NewsView.posts.filter((post) => !isCurrentPost(post)),
      6
    );

    if (!posts.length && section) {
      section.style.display = "none";
      return;
    }

    if (section) section.style.display = "";

    posts.forEach((post) => {
      wrap.appendChild(createCard(post, "nv-latest"));
    });

    const viewAll = document.querySelector(".nv-latest-viewall");
    if (viewAll) {
      viewAll.href = "/news.html";
    }
  }

  function renderTrendingNews() {
    const wrap = document.getElementById("trending-news");
    const section = document.querySelector(".nv-trending");
    if (!wrap) return;

    clear(wrap);

    const posts = limit(
      NewsView.posts.filter((post) => {
        if (isCurrentPost(post)) return false;
        return isTruthyTag(post.trending);
      }),
      5
    );

    if (!posts.length && section) {
      section.style.display = "none";
      return;
    }

    if (section) section.style.display = "";

    posts.forEach((post) => {
      wrap.appendChild(createCard(post, "nv-trending"));
    });
  }

  function createCard(post, prefix) {
    const card = document.createElement("a");
    card.className = `${prefix}-card`;
    card.href = post.url || "#";

    const thumb = document.createElement("div");
    thumb.className = `${prefix}-thumb`;

    const img = createImage(
      post.image,
      post.imageAlt || post.title
    );

    if (img) thumb.appendChild(img);

    const badge = createBadgeElement(post.badge);
    if (badge) thumb.appendChild(badge);

    const info = document.createElement("div");
    info.className = `${prefix}-info`;

    const category = document.createElement("h3");
    category.textContent = post.category || "";

    const title = document.createElement("h4");
    title.textContent = post.title || "";

    const desc = document.createElement("p");
    desc.textContent = post.shortDesc || "";

    info.appendChild(category);
    info.appendChild(title);
    info.appendChild(desc);

    card.appendChild(thumb);
    card.appendChild(info);

    return card;
  }

  /*==================================
  LINKS
  ==================================*/

  function initStaticLinks() {
    const latestViewAll = document.querySelector(".nv-latest-viewall");
    if (latestViewAll) latestViewAll.href = "/news.html";
  }
});
