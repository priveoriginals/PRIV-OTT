/*=========================================
VIDEO VIEW
v10.2
UPDATED FOR PRIVÉ OTT
==========================================*/

document.addEventListener("DOMContentLoaded", function () {
  "use strict";

  const View = {
    page: document.getElementById("video-view"),
    meta: document.querySelector(".video-meta"),
    origin: location.origin,
    currentUrl: "",
    video: {},
    feedCache: new Map(),
    parsedCache: new WeakMap(),
    channelCache: new Map()
  };

  if (!View.page || !View.meta) {
    return;
  }

  const CONFIG = {
    LATEST_LABEL: "latestvideo",
    LATEST_LIMIT: 14,
    RELATED_LIMIT: 5,
    NAVIGATION_LIMIT: 500,
    RELATED_FEED_LIMIT: 500,
    MUSIC_LABEL: "musicvideo",
    IGNORE_LABELS: [
      "latest",
      "latestvideo",
      "featured",
      "videos",
      "video",
      "series",
      "movie",
      "movies",
      "music"
    ],
    FETCH_TIMEOUT_MS: 10000
  };

  const Helper = {
    text(selector, root = View.meta) {
      const element = root.querySelector(selector);
      return element ? element.textContent.trim() : "";
    },

    image(selector, root = View.meta) {
      const element = root.querySelector(selector);
      return element ? element.getAttribute("src") || "" : "";
    },

    normalize(url) {
      return String(url || "")
        .replace(View.origin, "")
        .replace("?m=1", "")
        .replace(/\/$/, "")
        .trim();
    },

    escapeHtml(value) {
      return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    },

    safeAttr(value) {
      return Helper.escapeHtml(value).replace(/`/g, "&#96;");
    },

    show(element) {
      if (element) {
        element.style.display = "";
      }
    },

    hide(element) {
      if (element) {
        element.style.display = "none";
      }
    },

    splitList(value) {
      return String(value || "")
        .split(/[,|]/g)
        .map(function (item) {
          return item.trim();
        })
        .filter(Boolean);
    },

    splitGenres(value) {
      return Helper.splitList(value).map(function (item) {
        return item.toLowerCase();
      });
    },

    getPostUrl(post) {
      return (
        post?.link?.find(function (item) {
          return item.rel === "alternate";
        })?.href || ""
      );
    },

    fallbackImage() {
      return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    },

    firstNonEmpty() {
      for (let i = 0; i < arguments.length; i += 1) {
        const value = arguments[i];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
          return String(value).trim();
        }
      }
      return "";
    },

    pickPrimaryLabel(labels) {
      const ignore = CONFIG.IGNORE_LABELS.map(function (item) {
        return item.toLowerCase();
      });

      return Helper.splitList(labels).find(function (label) {
        return !ignore.includes(label.toLowerCase());
      }) || "";
    },

    episodeKey(item) {
      const season = parseInt(item?.season || "1", 10);
      const episode = parseInt(item?.id || "0", 10);
      return {
        season: Number.isFinite(season) ? season : 1,
        episode: Number.isFinite(episode) ? episode : 0
      };
    }
  };

  View.currentUrl = Helper.normalize(location.pathname);

  View.video = {
    contentId: Helper.text(".content-id"),
    contentType: Helper.text(".content-type"),
    contentTypeUrl: Helper.text(".content-type-url"),
    contentTitle: Helper.text(".content-title"),
    contentUrl: Helper.text(".content-url"),
    type: Helper.text(".video-type").toLowerCase(),
    title: Helper.text(".video-title"),
    cardTitle: Helper.text(".video-card-title"),
    season: Helper.text(".video-season"),
    id: Helper.text(".video-id"),
    description: Helper.text(".video-description"),
    releaseDate: Helper.text(".video-release-date"),
    duration: Helper.text(".video-duration"),
    language: Helper.text(".video-language"),
    rating: Helper.text(".video-rating"),
    youtubeId: Helper.text(".video-youtube-id"),
    labels: Helper.text(".video-labels"),
    navigationLabel: Helper.text(".video-navigation-label"),
    genre: Helper.text(".video-genre"),
    channelUrl: Helper.text(".video-channel-url"),
    channelName: Helper.text(".video-channel-name"),
    channelLogo: Helper.image(".video-channel-logo"),
    createdBy: Helper.text(".video-created-by"),
    lyricist: Helper.text(".video-lyricist"),
    cast: Helper.text(".video-cast"),
    albumId: Helper.text(".video-album-id"),
    featured: Helper.text(".video-featured"),
    highlight: Helper.text(".video-highlight"),
    badge: Helper.text(".video-badge"),
    thumbnail: Helper.image(".video-thumbnail")
  };

  const Module = {
    Player: {},
    Breadcrumb: {},
    Meta: {},
    Share: {},
    Feed: {},
    Card: {},
    Navigation: {},
    Related: {},
    Channel: {},
    Latest: {},
    Init: {}
  };

  Module.Player.init = function () {
    const section = document.querySelector(".vp-player-section");
    const player = document.getElementById("vp-youtube-player");

    if (!player) {
      return;
    }

    if (!View.video.youtubeId) {
      Helper.hide(section);
      return;
    }

    const videoId = encodeURIComponent(View.video.youtubeId);
    const title = Helper.safeAttr(View.video.title || "Video");

    player.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1"
        title="${title}"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen>
      </iframe>
    `;
  };

  Module.Breadcrumb.init = function () {
    const type = document.querySelector(".vp-content-type-link");
    const content = document.querySelector(".vp-content-link");
    const current = document.querySelector(".vp-video-title");

    if (type) {
      type.textContent = View.video.contentType || "Content";
      type.href = View.video.contentTypeUrl || "#";
    }

    if (content) {
      content.textContent = View.video.contentTitle || "Content";
      content.href = View.video.contentUrl || "#";
    }

    if (current) {
      current.textContent = View.video.title || "Video";
    }
  };

  Module.Meta.description = function () {
    const section = document.querySelector(".vp-description-section");
    const text = document.querySelector(".vp-description");

    if (!section || !text) {
      return;
    }

    if (!View.video.description) {
      Helper.hide(section);
      return;
    }

    text.textContent = View.video.description;
    Helper.show(section);
  };

  Module.Meta.field = function (selector, value) {
    const element = document.querySelector(selector);

    if (!element) {
      return;
    }

    if (!value) {
      Helper.hide(element);
      return;
    }

    element.textContent = value;
    Helper.show(element);
  };

  Module.Meta.info = function () {
    Module.Meta.field(".vp-release-date", View.video.releaseDate);
    Module.Meta.field(".vp-duration", View.video.duration);
    Module.Meta.field(".vp-language", View.video.language);
    Module.Meta.field(".vp-rating", View.video.rating);
  };

  Module.Meta.channel = async function () {
    const section = document.querySelector(".vp-channel-section");
    const link = document.querySelector(".vp-channel-link");
    const logo = document.querySelector(".vp-channel-logo");
    const name = document.querySelector(".vp-channel-name");

    if (!section || !link || !name) {
      return;
    }

    if (!View.video.channelUrl && !View.video.channelName && !View.video.channelLogo) {
      Helper.hide(section);
      return;
    }

    let channelData = {
      name: View.video.channelName,
      logo: View.video.channelLogo,
      url: View.video.channelUrl
    };

    if (View.video.channelUrl) {
      const fetched = await Module.Channel.fetch(View.video.channelUrl);
      if (fetched) {
        channelData = {
          name: Helper.firstNonEmpty(fetched.name, channelData.name),
          logo: Helper.firstNonEmpty(fetched.logo, channelData.logo),
          url: Helper.firstNonEmpty(fetched.url, channelData.url)
        };
      }
    }

    if (!channelData.name) {
      Helper.hide(section);
      return;
    }

    link.href = channelData.url || "#";
    link.title = channelData.name;
    name.textContent = channelData.name;

    if (logo) {
      if (channelData.logo) {
        logo.src = channelData.logo;
        logo.alt = channelData.name;
        Helper.show(logo);
      } else {
        logo.removeAttribute("src");
        Helper.hide(logo);
      }
    }

    Helper.show(section);
  };

  Module.Meta.music = function () {
    const section = document.querySelector(".vp-music-section");
    const createdByRow = document.querySelector(".vp-created-by");
    const lyricistRow = document.querySelector(".vp-lyricist");
    const castRow = document.querySelector(".vp-cast");

    if (!section) {
      return;
    }

    if (View.video.type !== "music") {
      Helper.hide(section);
      return;
    }

    const hasAny = !!View.video.createdBy || !!View.video.lyricist || !!View.video.cast;

    if (!hasAny) {
      Helper.hide(section);
      return;
    }

    if (createdByRow) {
      createdByRow.textContent = View.video.createdBy || "";
    }

    if (lyricistRow) {
      lyricistRow.textContent = View.video.lyricist || "";
    }

    if (castRow) {
      castRow.textContent = View.video.cast.replace(/\s*,\s*/g, ", ");
    }

    Helper.show(section);
  };

  Module.Share.init = function () {
    const button = document.querySelector(".vp-share-button");

    if (!button) {
      return;
    }

    button.addEventListener("click", Module.Share.share);
  };

  Module.Share.share = async function () {
    const data = {
      title: `${View.video.contentTitle || ""} - ${View.video.title || "Video"}`,
      text: View.video.description || "",
      url: location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {}
    }

    Module.Share.copy();
  };

  Module.Share.copy = async function () {
    try {
      await navigator.clipboard.writeText(location.href);
      Module.Share.toast("Link copied successfully.");
    } catch (error) {
      const input = document.createElement("input");
      input.value = location.href;
      input.setAttribute("readonly", "");
      input.style.position = "fixed";
      input.style.left = "-9999px";

      document.body.appendChild(input);
      input.select();

      try {
        document.execCommand("copy");
        Module.Share.toast("Link copied successfully.");
      } catch (copyError) {
        window.prompt("Copy Link", location.href);
      } finally {
        document.body.removeChild(input);
      }
    }
  };

  Module.Share.toast = function (message) {
    let toast = document.getElementById("vp-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "vp-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2500);
  };

  Module.Feed.load = async function (label, limit = 500) {
    if (!label) {
      return [];
    }

    if (View.feedCache.has(label)) {
      return View.feedCache.get(label);
    }

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, CONFIG.FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${View.origin}/feeds/posts/default/-/${encodeURIComponent(label)}?alt=json&max-results=${limit}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`Feed request failed: ${response.status}`);
      }

      const data = await response.json();
      const posts = Array.isArray(data?.feed?.entry) ? data.feed.entry : [];

      View.feedCache.set(label, posts);
      return posts;
    } catch (error) {
      console.error("Feed Error:", label, error);
      return [];
    } finally {
      clearTimeout(timer);
    }
  };

  Module.Feed.parse = function (post) {
    if (View.parsedCache.has(post)) {
      return View.parsedCache.get(post);
    }

    const html = post?.content?.$t || "";
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const value = function (selector) {
      return doc.querySelector(selector)?.textContent.trim() || "";
    };

    const image = function (selector) {
      return doc.querySelector(selector)?.getAttribute("src") || "";
    };

    const item = {
      contentId: value(".content-id"),
      contentType: value(".content-type"),
      contentTypeUrl: value(".content-type-url"),
      contentTitle: value(".content-title"),
      contentUrl: value(".content-url"),
      type: value(".video-type").toLowerCase(),
      title: value(".video-title"),
      cardTitle: value(".video-card-title"),
      season: value(".video-season"),
      id: value(".video-id"),
      description: value(".video-description"),
      releaseDate: value(".video-release-date"),
      duration: value(".video-duration"),
      language: value(".video-language"),
      rating: value(".video-rating"),
      youtubeId: value(".video-youtube-id"),
      labels: value(".video-labels"),
      navigationLabel: value(".video-navigation-label"),
      genre: value(".video-genre"),
      channelUrl: value(".video-channel-url"),
      channelName: value(".video-channel-name"),
      channelLogo: image(".video-channel-logo"),
      createdBy: value(".video-created-by"),
      lyricist: value(".video-lyricist"),
      cast: value(".video-cast"),
      albumId: value(".video-album-id"),
      featured: value(".video-featured"),
      highlight: value(".video-highlight"),
      badge: value(".video-badge"),
      thumbnail: image(".video-thumbnail"),
      url:
        post?.link?.find(function (item) {
          return item.rel === "alternate";
        })?.href || "#"
    };

    View.parsedCache.set(post, item);
    return item;
  };

  Module.Feed.items = function (posts) {
    return posts.map(function (post) {
      return Module.Feed.parse(post);
    });
  };

  Module.Feed.current = function (posts) {
    return (
      posts.find(function (post) {
        const url = Helper.normalize(Helper.getPostUrl(post));
        return url === View.currentUrl;
      }) || null
    );
  };

  Module.Feed.filter = function (posts, type) {
    return posts.filter(function (post) {
      return Module.Feed.parse(post).type === type;
    });
  };

  Module.Feed.index = function (posts, url) {
    return posts.findIndex(function (post) {
      const link = Helper.normalize(Module.Feed.parse(post).url);
      return link === url;
    });
  };

  Module.Card.title = function (item) {
    if (item.cardTitle) {
      return item.cardTitle;
    }

    if (item.type === "episode") {
      const season = item.season || "1";
      const episode = String(item.id || "1").padStart(2, "0");
      return `S${season} EP ${episode}`;
    }

    if (item.type === "movie") {
      return item.title || "Movie";
    }

    if (item.type === "music") {
      return item.title || "Music Video";
    }

    return item.title || "";
  };

  Module.Card.image = function (item) {
    return item.thumbnail || Helper.fallbackImage();
  };

  Module.Card.build = function (item, style, heading = "") {
    const url = Helper.safeAttr(item.url || "#");
    const thumb = Helper.safeAttr(Module.Card.image(item));
    const alt = Helper.safeAttr(Module.Card.title(item));
    const duration = Helper.escapeHtml(item.duration || "");
    const contentTitle = Helper.escapeHtml(item.contentTitle || "");
    const cardTitle = Helper.escapeHtml(Module.Card.title(item));
    const safeHeading = Helper.escapeHtml(heading || "");

    if (style === "navigation") {
      return `
        <a href="${url}" class="vp-nav-card">
          <div class="vp-nav-thumb">
            <img src="${thumb}" alt="${alt}" loading="lazy">
            <span class="vp-nav-duration">${duration}</span>
          </div>
          <div class="vp-nav-content">
            <span class="vp-nav-heading">${safeHeading}</span>
            <h3 class="vp-nav-series">${contentTitle}</h3>
            <p class="vp-nav-title">${cardTitle}</p>
          </div>
        </a>
      `;
    }

    if (style === "related") {
      const description = Helper.escapeHtml(item.description || "No description available.");

      return `
        <a href="${url}" class="vp-related-card">
          <div class="vp-related-thumb">
            <img src="${thumb}" alt="${alt}" loading="lazy">
            <span>${duration}</span>
          </div>
          <div class="vp-related-info">
            <h3>${contentTitle}</h3>
            <h4>${cardTitle}</h4>
            <p>${description}</p>
          </div>
        </a>
      `;
    }

    return `
      <a href="${url}" class="vp-latest-card">
        <div class="vp-latest-thumb">
          <img src="${thumb}" alt="${alt}" loading="lazy">
          <div class="vp-play-icon">
            <i class="fa-solid fa-play"></i>
          </div>
          <span>${duration}</span>
        </div>
        <div class="vp-latest-info">
          <h3>${contentTitle}</h3>
          <p>${cardTitle}</p>
        </div>
      </a>
    `;
  };

  Module.Card.render = function (container, items, style, heading = "") {
    if (!container || !items || !items.length) {
      return;
    }

    container.innerHTML = items
      .map(function (item) {
        return Module.Card.build(item, style, heading);
      })
      .join("");
  };

  Module.Channel.fetch = async function (url) {
    if (!url) {
      return null;
    }

    const absoluteUrl = new URL(url, View.origin).href;

    if (View.channelCache.has(absoluteUrl)) {
      return View.channelCache.get(absoluteUrl);
    }

    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, CONFIG.FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(absoluteUrl, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`Channel page request failed: ${response.status}`);
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");

      const meta =
        doc.querySelector("#channel-page-meta, .channel-meta, .channel-page-meta, .channel-view-meta") ||
        doc.querySelector("[data-channel-name]") ||
        doc.querySelector("[data-logo-thumb]") ||
        doc.querySelector("[data-logo]");

      const readText = function (selector) {
        return meta?.querySelector(selector)?.textContent.trim() || "";
      };

      const readImage = function (selector) {
        const node = meta?.querySelector(selector);
        return node ? node.getAttribute("src") || node.getAttribute("data-src") || "" : "";
      };

      const readAttr = function (attrName) {
        return meta?.getAttribute(attrName) || "";
      };

      const logo =
        readAttr("data-logo-thumb") ||
        readAttr("data-logo") ||
        readAttr("data-channel-logo") ||
        readText(".logo-thumb") ||
        readText(".channel-logo-thumb") ||
        readImage("img.channel-logo-thumb") ||
        readImage("img.logo-thumb") ||
        readImage("img.channel-logo") ||
        readImage(".channel-logo-thumb img") ||
        readImage(".logo-thumb img") ||
        "";

      const data = {
        name:
          readAttr("data-channel-name") ||
          readText(".channel-title") ||
          readText(".channel-name") ||
          readText(".title") ||
          "",
        logo: logo,
        url: readAttr("data-channel-url") || absoluteUrl
      };

      View.channelCache.set(absoluteUrl, data);
      return data;
    } catch (error) {
      console.error("Channel Fetch Error:", error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  Module.Related.titleForType = function (type) {
    const map = {
      episode: "Related Episodes",
      trailer: "Related Trailers",
      music: "Related Music",
      movie: "Related Movies",
      teaser: "Related Teasers",
      promo: "Related Promos",
      interview: "Related Interviews",
      short: "Related Shorts",
      video: "Related Videos"
    };

    return map[type] || "Related Videos";
  };

  Module.Related.primaryLabel = function () {
    return Helper.pickPrimaryLabel(View.video.labels);
  };

  Module.Related.collect = function (posts, currentType, currentUrl) {
    const items = [];

    posts.forEach(function (post) {
      const item = Module.Feed.parse(post);

      if (
        item.type === currentType &&
        Helper.normalize(item.url) !== currentUrl
      ) {
        items.push(item);
      }
    });

    return items;
  };

  Module.Related.rankByGenre = function (items, genres) {
    const preferred = Helper.splitGenres(genres);

    if (!preferred.length) {
      return items;
    }

    const buckets = preferred.map(function () {
      return [];
    });

    const leftovers = [];

    items.forEach(function (item) {
      const itemGenres = Helper.splitGenres(item.genre);
      let matchedIndex = -1;

      for (let i = 0; i < preferred.length; i += 1) {
        if (itemGenres.includes(preferred[i])) {
          matchedIndex = i;
          break;
        }
      }

      if (matchedIndex === -1) {
        leftovers.push(item);
      } else {
        buckets[matchedIndex].push(item);
      }
    });

    const output = [];
    let picked = true;

    while (picked && output.length < CONFIG.RELATED_LIMIT) {
      picked = false;

      for (let i = 0; i < buckets.length; i += 1) {
        if (buckets[i].length) {
          output.push(buckets[i].shift());
          picked = true;

          if (output.length >= CONFIG.RELATED_LIMIT) {
            break;
          }
        }
      }
    }

    return output.concat(leftovers);
  };

  Module.Related.collectByLabel = async function (label, type) {
    if (!label) {
      return [];
    }

    const posts = await Module.Feed.load(label, CONFIG.RELATED_FEED_LIMIT);
    return Module.Related.collect(posts, type, View.currentUrl);
  };

  Module.Related.music = async function () {
    const result = [];
    const seen = new Set([View.currentUrl]);

    const addUnique = function (item) {
      const url = Helper.normalize(item.url);
      if (!seen.has(url)) {
        seen.add(url);
        result.push(item);
      }
    };

    const primaryLabel = Module.Related.primaryLabel();

    if (primaryLabel && primaryLabel !== CONFIG.MUSIC_LABEL) {
      const sameLabelItems = await Module.Related.collectByLabel(primaryLabel, "music");
      sameLabelItems.forEach(addUnique);
    }

    if (result.length < CONFIG.RELATED_LIMIT) {
      const musicPosts = await Module.Feed.load(CONFIG.MUSIC_LABEL, CONFIG.RELATED_FEED_LIMIT);
      const musicItems = Module.Related.collect(musicPosts, "music", View.currentUrl);
      const ranked = Module.Related.rankByGenre(musicItems, View.video.genre);

      ranked.forEach(addUnique);
    }

    return result.slice(0, CONFIG.RELATED_LIMIT);
  };

  Module.Related.init = async function () {
    const section = document.querySelector(".vp-related");
    const list = document.getElementById("vp-related-list");
    const title = document.querySelector(".vp-related-title");
    const viewAll = document.querySelector(".vp-related-viewall");

    if (!section || !list || !title || !viewAll) {
      return;
    }

    title.textContent = Module.Related.titleForType(View.video.type);
    viewAll.href = View.video.contentUrl || "#";

    let items = [];

    if (View.video.type === "music") {
      items = await Module.Related.music();
    } else {
      const primaryLabel = Module.Related.primaryLabel();
      items = await Module.Related.collectByLabel(primaryLabel, View.video.type);
    }

    items = items.slice(0, CONFIG.RELATED_LIMIT);

    if (!items.length) {
      Helper.hide(section);
      return;
    }

    Module.Card.render(list, items, "related");
    Helper.show(section);
  };

  Module.Navigation.init = async function () {
    const section = document.querySelector(".vp-navigation");
    const previous = document.getElementById("vp-previous");
    const next = document.getElementById("vp-next");

    if (!section || !previous || !next) {
      return;
    }

    if (!["episode", "trailer"].includes(View.video.type)) {
      Helper.hide(section);
      return;
    }

    if (!View.video.navigationLabel) {
      Helper.hide(section);
      return;
    }

    let posts = await Module.Feed.load(View.video.navigationLabel, CONFIG.NAVIGATION_LIMIT);
    posts = Module.Feed.filter(posts, View.video.type);

    // Sort in ascending order by season, then episode.
    posts.sort(function (a, b) {
      const itemA = Module.Feed.parse(a);
      const itemB = Module.Feed.parse(b);

      const keyA = Helper.episodeKey(itemA);
      const keyB = Helper.episodeKey(itemB);

      if (keyA.season !== keyB.season) {
        return keyA.season - keyB.season;
      }

      return keyA.episode - keyB.episode;
    });

    const index = Module.Feed.index(posts, View.currentUrl);

    if (index === -1) {
      Helper.hide(section);
      return;
    }

    previous.innerHTML = "";
    next.innerHTML = "";

    // Previous Episode = older/earlier episode
    if (index > 0) {
      previous.innerHTML = Module.Card.build(
        Module.Feed.parse(posts[index - 1]),
        "navigation",
        "Previous"
      );
    }

    // Next Episode = newer/later episode
    if (index < posts.length - 1) {
      next.innerHTML = Module.Card.build(
        Module.Feed.parse(posts[index + 1]),
        "navigation",
        "Next"
      );
    }

    if (!previous.innerHTML && !next.innerHTML) {
      Helper.hide(section);
      return;
    }

    Helper.show(section);
  };

  Module.Latest = {
    async init() {
      const section = document.querySelector(".vp-latest");
      const list = document.getElementById("vp-latest-list");
      const viewAll = document.querySelector(".vp-latest-viewall");

      if (!section || !list || !viewAll) {
        return;
      }

      viewAll.href = "/p/videos.html";

      const posts = await Module.Feed.load(CONFIG.LATEST_LABEL, CONFIG.LATEST_LIMIT);
      const items = [];

      posts.forEach(function (post) {
        const item = Module.Feed.parse(post);

        if (Helper.normalize(item.url) !== View.currentUrl) {
          items.push(item);
        }
      });

      const visible = items.slice(0, CONFIG.LATEST_LIMIT);

      if (!visible.length) {
        Helper.hide(section);
        return;
      }

      Module.Card.render(list, visible, "latest");
      Helper.show(section);
    }
  };

  Module.Init.boot = async function () {
    Module.Player.init();
    Module.Breadcrumb.init();
    Module.Meta.description();
    Module.Meta.info();
    Module.Meta.music();
    Module.Share.init();

    await Module.Meta.channel();

    await Promise.all([
      Module.Navigation.init(),
      Module.Related.init(),
      Module.Latest.init()
    ]);
  };

  Module.Init.boot();
});
