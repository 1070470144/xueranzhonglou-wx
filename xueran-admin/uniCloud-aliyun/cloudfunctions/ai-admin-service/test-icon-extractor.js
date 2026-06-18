'use strict';

const assert = require('assert');
const { extractWikiIconUrl } = require('./roleIconExtractor');

const relativeHtml = `
  <div id="mw-content-text">
    <table class="infobox">
      <img alt="洗衣妇" src="/images/thumb/washerwoman.png/200px-washerwoman.png" />
    </table>
  </div>
`;

assert.strictEqual(
  extractWikiIconUrl(relativeHtml),
  'https://clocktower-wiki.gstonegames.com/images/thumb/washerwoman.png/200px-washerwoman.png',
);

const srcsetHtml = `
  <figure>
    <img alt="chef" src="/images/thumb/chef.png/120px-chef.png" srcset="/images/thumb/chef.png/240px-chef.png 2x" />
  </figure>
`;

assert.strictEqual(
  extractWikiIconUrl(srcsetHtml),
  'https://clocktower-wiki.gstonegames.com/images/thumb/chef.png/240px-chef.png',
);

const decorativeHtml = `
  <img src="skins/pivot/assets/image/top_lace.png">
  <img alt="钟楼百科" src="resources/assets/wiki_logo.png">
  <img src="skins/pivot/assets/image/search.png">
  <img alt="Washerwoman.png" src="/images/thumb/4/45/Washerwoman.png/200px-Washerwoman.png" srcset="/images/thumb/4/45/Washerwoman.png/300px-Washerwoman.png 1.5x, /images/thumb/4/45/Washerwoman.png/400px-Washerwoman.png 2x" />
`;

assert.strictEqual(
  extractWikiIconUrl(decorativeHtml),
  'https://clocktower-wiki.gstonegames.com/images/thumb/4/45/Washerwoman.png/400px-Washerwoman.png',
);

const noImageHtml = '<main><p>no role image here</p></main>';
assert.strictEqual(extractWikiIconUrl(noImageHtml), '');

console.log('icon extractor tests passed');
