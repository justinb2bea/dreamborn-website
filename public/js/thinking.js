/**
 * thinking.js — /thinking listing page interactivity
 *
 * Handles:
 * 1. Topic filter pills — fetch API and replace/filter post grid by topic
 * 2. "All" pill — restore initial build-time posts
 * 3. Load More button — append paginated posts from /api/posts
 *
 * Dependencies:
 *   #thinkingTopicsData  — inline <script type="application/json"> with topic array
 *   #filterBar           — filter pill toolbar
 *   #postCardGrid        — post card grid container
 *   #loadMoreWrapper     — load more wrapper div
 *   #loadMoreBtn         — load more button
 */

(function () {
  'use strict';

  /* ─── State ─────────────────────────────────────────────────────── */
  var topics          = [];   // topic taxonomy loaded from inline JSON
  var activeTopic     = '';   // active topic UUID, or '' for all
  var nextPage        = 2;    // next page to fetch via Load More
  var initialHTML     = '';   // snapshot of server-rendered card HTML for "All" reset
  var isFetching      = false;

  /* ─── DOM refs ──────────────────────────────────────────────────── */
  var filterBar       = null;
  var postGrid        = null;
  var loadMoreWrapper = null;
  var loadMoreBtn     = null;

  /* ─── Init ──────────────────────────────────────────────────────── */
  function init() {
    filterBar       = document.getElementById('filterBar');
    postGrid        = document.getElementById('postCardGrid');
    loadMoreWrapper = document.getElementById('loadMoreWrapper');
    loadMoreBtn     = document.getElementById('loadMoreBtn');

    // Load topic taxonomy from inline JSON blob
    var topicsEl = document.getElementById('thinkingTopicsData');
    if (topicsEl) {
      try { topics = JSON.parse(topicsEl.textContent) || []; } catch (_) {}
    }

    // Snapshot initial server-rendered HTML for "All" reset
    if (postGrid) {
      initialHTML = postGrid.innerHTML;
    }

    // Wire up filter pills
    if (filterBar) {
      filterBar.addEventListener('click', onPillClick);
    }

    // Wire up Load More
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', onLoadMore);
    }

    // Sticky shadow indicator for the filter bar
    if (filterBar && typeof IntersectionObserver !== 'undefined') {
      var sentinel = document.createElement('div');
      sentinel.style.cssText = 'position:absolute;top:0;height:1px;pointer-events:none;visibility:hidden';
      filterBar.parentNode.insertBefore(sentinel, filterBar);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          filterBar.classList.toggle('is-stuck', !entry.isIntersecting);
        });
      }).observe(sentinel);
    }
  }

  /* ─── Pill click handler ────────────────────────────────────────── */
  function onPillClick(e) {
    var pill = e.target.closest('.topic-pill');
    if (!pill || isFetching) return;

    var topicId = pill.dataset.topicId || '';

    // Update aria-pressed and active class on all pills
    filterBar.querySelectorAll('.topic-pill').forEach(function (p) {
      var active = (p.dataset.topicId === topicId);
      p.setAttribute('aria-pressed', active ? 'true' : 'false');
      p.classList.toggle('topic-pill--active', active);
    });

    activeTopic = topicId;
    nextPage    = 2;

    if (topicId === '') {
      // Restore initial build-time posts
      if (postGrid) postGrid.innerHTML = initialHTML;
      var cardCount = postGrid ? postGrid.querySelectorAll('.post-card').length : 0;
      setLoadMoreVisible(cardCount >= 12);
      if (loadMoreBtn) {
        loadMoreBtn.dataset.page  = '2';
        loadMoreBtn.dataset.topic = '';
        loadMoreBtn.textContent   = 'Load more';
      }
    } else {
      // Fetch first page for the selected topic
      fetchPosts(topicId, 1, /* replace */ true);
    }
  }

  /* ─── Load More click handler ───────────────────────────────────── */
  function onLoadMore() {
    fetchPosts(activeTopic, nextPage, /* replace */ false);
  }

  /* ─── Fetch posts ────────────────────────────────────────────────── */
  function fetchPosts(topicId, page, replace) {
    if (isFetching) return;
    isFetching = true;
    if (loadMoreBtn) loadMoreBtn.setAttribute('aria-busy', 'true');

    var url = '/api/posts?page=' + encodeURIComponent(page) + '&limit=12';
    if (topicId) url += '&topic=' + encodeURIComponent(topicId);

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var posts  = data.posts  || [];
        var hasMore = data.has_more === true;

        var html = posts.map(renderCard).join('');

        if (replace) {
          if (postGrid) {
            postGrid.innerHTML = html || '<p class="thinking-empty">No posts found for this topic.</p>';
          }
        } else {
          if (postGrid && html) {
            postGrid.insertAdjacentHTML('beforeend', html);
          }
        }

        // Update Load More button
        setLoadMoreVisible(hasMore);
        if (hasMore) {
          nextPage = (data.page || page) + 1;
          // Update button label if we know the remaining count
          if (loadMoreBtn && typeof data.total === 'number') {
            var loaded    = postGrid ? postGrid.querySelectorAll('.post-card').length : 0;
            var remaining = data.total - loaded;
            if (remaining > 0) {
              loadMoreBtn.textContent = 'Load ' + Math.min(remaining, 12) + ' more';
            } else {
              loadMoreBtn.textContent = 'Load more';
            }
          }
        } else {
          if (loadMoreBtn) loadMoreBtn.textContent = 'Load more';
        }
      })
      .catch(function () {
        if (replace && postGrid) {
          postGrid.innerHTML = '<p class="thinking-empty">Something went wrong. Please refresh and try again.</p>';
        } else if (loadMoreBtn) {
          loadMoreBtn.textContent = 'Something went wrong. Try again.';
        }
      })
      .then(function () {
        // always runs (like finally)
        isFetching = false;
        if (loadMoreBtn) loadMoreBtn.removeAttribute('aria-busy');
      });
  }

  /* ─── Render a post card from API data ──────────────────────────── */
  function renderCard(post) {
    // Resolve first topic label from taxonomy
    var topicTagHTML = '';
    if (post.topic_ids && post.topic_ids.length) {
      var topic = findTopic(post.topic_ids[0]);
      if (topic) {
        topicTagHTML = '<span class="post-card__topic-tag">' + esc(topic.label) + '</span>';
      }
    }

    // Format date
    var dateHTML = '';
    if (post.published_at) {
      var d = new Date(post.published_at);
      var fmt = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      dateHTML = '<time class="post-card__date" datetime="' + esc(post.published_at) + '">'
        + esc(fmt) + '</time>';
    }

    var metaTop = (topicTagHTML || dateHTML)
      ? '<div class="post-card__meta-top">' + topicTagHTML + dateHTML + '</div>'
      : '';

    var excerptHTML = post.excerpt
      ? '<p class="post-card__excerpt">' + esc(post.excerpt) + '</p>'
      : '';

    var authorHTML = post.author
      ? '<span class="post-card__author">' + esc(post.author) + '</span>'
      : '';

    return '<article class="post-card" role="listitem" data-post-id="' + esc(post.id || '') + '">'
      + '<a class="post-card__link" href="/thinking/' + esc(post.slug) + '/">'
      + metaTop
      + '<h2 class="post-card__title">' + esc(post.title || '') + '</h2>'
      + excerptHTML
      + authorHTML
      + '</a></article>';
  }

  /* ─── Helpers ────────────────────────────────────────────────────── */
  function findTopic(id) {
    for (var i = 0; i < topics.length; i++) {
      if (topics[i].id === id) return topics[i];
    }
    return null;
  }

  function setLoadMoreVisible(visible) {
    if (!loadMoreWrapper) return;
    if (visible) {
      loadMoreWrapper.removeAttribute('hidden');
    } else {
      loadMoreWrapper.setAttribute('hidden', '');
    }
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  /* ─── Boot ──────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
