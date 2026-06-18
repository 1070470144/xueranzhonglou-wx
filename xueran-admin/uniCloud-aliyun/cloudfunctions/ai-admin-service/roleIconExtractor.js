'use strict';

const WIKI_HOME = 'https://clocktower-wiki.gstonegames.com/';

function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function absoluteWikiUrl(value) {
  const raw = decodeHtml(value).trim();
  if (!raw || raw.startsWith('data:')) return '';
  try {
    return new URL(raw, WIKI_HOME).toString();
  } catch (error) {
    return '';
  }
}

function firstSrcsetUrl(value) {
  const candidates = decodeHtml(value)
    .split(',')
    .map(item => item.trim().split(/\s+/)[0])
    .filter(Boolean);
  return candidates.length ? candidates[candidates.length - 1] : '';
}

function extractImageAttrs(tag) {
  const attrs = {};
  const re = /([a-zA-Z_:.-]+)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(String(tag || '')))) {
    attrs[match[1].toLowerCase()] = match[2];
  }
  return attrs;
}

function imageScore(attrs, index) {
  const text = [
    attrs.alt,
    attrs.title,
    attrs.class,
    attrs.src,
    attrs['data-src'],
    attrs.srcset,
    attrs.resolvedUrl
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  let score = Math.max(0, 1000 - index);
  if (/\/images\/thumb\//.test(text)) score += 6000;
  if (/\/images\//.test(text)) score += 4000;
  if (/\.(png|jpg|jpeg|webp)(\/|$|\?)/.test(text)) score += 500;
  if (/role|icon|card|token/.test(text)) score += 5000;
  if (
    /skins\/|resources\/assets|logo|banner|background|sprite|edit|search|external|lace|flower|wechat|qq|roast/.test(text)
  ) {
    score -= 7000;
  }
  return score;
}

function extractWikiIconUrl(html) {
  const images = [];
  const re = /<img\b[^>]*>/gi;
  let match;
  while ((match = re.exec(String(html || '')))) {
    const attrs = extractImageAttrs(match[0]);
    const candidate =
      firstSrcsetUrl(attrs.srcset) ||
      attrs.src ||
      attrs['data-src'] ||
      attrs['data-lazy-src'];
    const url = absoluteWikiUrl(candidate);
    if (!url) continue;
    const scoreAttrs = { ...attrs, resolvedUrl: url };
    images.push({ url, score: imageScore(scoreAttrs, images.length) });
  }
  images.sort((a, b) => b.score - a.score);
  return images[0] ? images[0].url : '';
}

module.exports = {
  extractWikiIconUrl
};
