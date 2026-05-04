const siteUrl = 'https://dreamborn.ai';
const siteName = 'Dreamborn';
const siteTitle = `${siteName} — AI-Native Company in Production`;
const cloudflareImageBase = 'https://imagedelivery.net/C0nJXN4TRwsrV5P_U5q4RQ';

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

function absoluteUrl(value) {
  if (!value) return siteUrl;
  if (/^https?:\/\//.test(value)) return value;
  return `${siteUrl}${value}`;
}

module.exports = {
  name: siteName,
  title: siteTitle,
  description: 'Dreamborn builds AI-native operating systems, agent workflows, and verified work surfaces for companies moving beyond software as usual.',
  url: siteUrl,
  locale: 'en_US',
  themeColor: '#18100f',
  defaultImage: `${cloudflareImageBase}/dreamborn-social-default/public`,
  defaultImageAlt: 'Dreamborn wordmark over an AI-native operating surface.',
  twitterHandle: '',
  sameAs: [],
  author: {
    name: 'Dreamborn',
    url: siteUrl,
    image: `${cloudflareImageBase}/dreamborn-social-default/public`,
    twitter: '',
  },
  socialImages: {
    home: `${cloudflareImageBase}/dreamborn-social-default/public`,
    explainer: `${cloudflareImageBase}/dreamborn-social-explainer/public`,
    work: `${cloudflareImageBase}/dreamborn-social-work/public`,
    system: `${cloudflareImageBase}/dreamborn-social-system/public`,
    live: `${cloudflareImageBase}/dreamborn-social-live/public`,
    thinking: `${cloudflareImageBase}/dreamborn-social-thinking/public`,
    article: `${cloudflareImageBase}/dreamborn-social-article/public`,
    connect: `${cloudflareImageBase}/dreamborn-social-connect/public`,
  },
  formatTitle,
  jsonLd,
  absoluteUrl,
};
