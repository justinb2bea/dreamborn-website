/**
 * thinking.js — /thinking page JS
 * Handles topic filter pills and Load More pagination.
 * Date-desc order only (OQ-4: no sort dropdown).
 */
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────
  let currentTopic = null;  // null = all topics
  let currentPage  = 1;
  let hasMore      = false;
  let isLoading    = false;

  // Read build-time data
  const dataEl = document.getElementById('thinkingData');
  const buildData = dataEl ? JSON.parse(dataEl.textContent) : { initialCount: 0, topics: [] };

  // Topics index for label resolution (id → label)
  const topicsById = {};
  (buildData.topics || []).forEach(function (t) { topicsById[t.id] = t.label; });

  // Track total count for Load More button text
  let totalCount = buildData.initialCount;

  // ─── Initial state ───────────────────────────────────────────
  // If initial count < 12, there's no more to load
  hasMore = buildData.initialCount >= 12;
  updateLoadMoreVisibility();

  // ─── Topic filter handler ─────────────────────────────────────
  window.handleTopicFilter = function (btn, topicId) {
    // Update pill states
    document.querySelectorAll('.filter-pill').forEach(function (pill) {
      pill.setAttribute('aria-pressed', 'false');
    });
    btn.setAttribute('aria-pressed', 'true');

    currentTopic = topicId || null;
    currentPage  = 1;

    if (currentTopic === null) {
      // Reset to build-time posts (re-fetch page 1 without filter)
      fetchPosts(1, null, true);
    } else {
      fetchPosts(1, currentTopic, true);
    }
  };

  // ─── Load More handler ────────────────────────────────────────
  window.loadMorePosts = function () {
    if (isLoading || !hasMore) return;
    currentPage++;
    fetchPosts(currentPage, currentTopic, false);
  };

  // ─── Fetch posts from /api/posts ──────────────────────────────
  async function fetchPosts(page, topicId, replace) {
    if (isLoading) return;
    isLoading = true;

    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
      loadMoreBtn.textContent = 'Loading…';
      loadMoreBtn.disabled = true;
    }

    let url = `/api/posts?page=${page}&limit=12`;
    if (topicId) url += `&topic=${encodeURIComponent(topicId)}`;

    try {
      const res = await fetch(url);
      if (!res.ok) {
        showLoadMoreError(loadMoreBtn);
        return;
      }

      const data = await res.json();
      totalCount = data.total;
      hasMore    = data.has_more;

      renderPosts(data.posts, replace);
      updateLoadMoreVisibility();

      if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        const remaining = totalCount - (page * 12);
        loadMoreBtn.textContent = (hasMore && remaining > 0)
          ? `Load ${remaining} more`
          : 'Load more';
      }
    } catch {
      showLoadMoreError(loadMoreBtn);
    } finally {
      isLoading = false;
    }
  }

  // ─── Render post cards ────────────────────────────────────────
  function renderPosts(posts, replace) {
    const grid = document.getElementById('postGrid');
    if (!grid) return;

    if (replace) {
      grid.innerHTML = '';
    }

    if (!posts || posts.length === 0) {
      if (replace) {
        grid.innerHTML = '<p class="text-muted" style="grid-column:1/-1;padding:var(--space-8) 0;">No posts found.</p>';
      }
      return;
    }

    posts.forEach(function (post) {
      const topicLabel = post.topic_ids && post.topic_ids[0]
        ? (topicsById[post.topic_ids[0]] || 'Article')
        : 'Article';

      const date = post.published_at
        ? new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        : '';

      const card = document.createElement('article');
      card.className = 'post-card';
      card.setAttribute('aria-label', `Post: ${escapeHtml(post.title)}`);
      card.innerHTML = `
        <div class="post-card__meta">
          <span class="topic-tag">${escapeHtml(topicLabel)}</span>
          <time class="post-card__date" datetime="${escapeHtml(post.published_at || '')}">${escapeHtml(date)}</time>
        </div>
        <a href="/thinking/${escapeHtml(post.slug)}/" class="post-card__title">${escapeHtml(post.title)}</a>
        ${post.excerpt ? `<p class="post-card__excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
        <p class="post-card__author">By ${escapeHtml(post.author || '')}</p>
      `;
      grid.appendChild(card);
    });
  }

  // ─── Load More visibility ─────────────────────────────────────
  function updateLoadMoreVisibility() {
    const wrap = document.getElementById('loadMoreWrap');
    if (!wrap) return;
    wrap.style.display = hasMore ? 'flex' : 'none';
  }

  // ─── Error state ──────────────────────────────────────────────
  function showLoadMoreError(btn) {
    if (btn) {
      btn.textContent = 'Something went wrong. Try again.';
      btn.disabled = false;
    }
    isLoading = false;
  }

  // ─── Utility ─────────────────────────────────────────────────
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
