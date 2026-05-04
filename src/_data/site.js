const siteUrl = 'https://dreamborn.ai';
const siteName = 'Dreamborn';
const siteTitle = `${siteName} — AI-Native Company in Production`;

function formatTitle(value) {
  if (!value || value === siteTitle || value.endsWith(` — ${siteName}`)) {
    return value || siteTitle;
  }

  return `${value} — ${siteName}`;
}

function jsonLd(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

module.exports = {
  name: siteName,
  title: siteTitle,
  description: 'Dreamborn builds AI-native operating systems, agent workflows, and verified work surfaces for companies moving beyond software as usual.',
  url: siteUrl,
  locale: 'en_US',
  themeColor: '#18100f',
  defaultImage: '/img/social/dreamborn-default.svg',
  defaultImageAlt: 'Dreamborn wordmark over an AI-native operating surface.',
  twitterHandle: '@justinking',
  sameAs: [
    'https://twitter.com/justinking',
  ],
  author: {
    name: 'Justin King',
    url: `${siteUrl}/justin/`,
    image: `${siteUrl}/img/authors/JustinKingProfile.jpeg`,
    twitter: '@justinking',
  },
  socialImages: {
    home: '/img/social/dreamborn-default.svg',
    explainer: '/img/social/dreamborn-explainer.svg',
    work: '/img/social/dreamborn-work.svg',
    system: '/img/social/dreamborn-system.svg',
    live: '/img/social/dreamborn-live.svg',
    thinking: '/img/social/dreamborn-thinking.svg',
    article: '/img/social/dreamborn-article.svg',
    justin: '/img/social/dreamborn-justin.svg',
    connect: '/img/social/dreamborn-connect.svg',
  },
  formatTitle,
  jsonLd,
};
