// ==UserScript==
// @name        Google PDF Dork Scraper
// @namespace   Security.Audit
// @match       https://www.google.com/search*
// @grant       GM_setClipboard
// @grant       GM_setValue
// @grant       GM_getValue
// @version     1.0
// ==/UserScript==

(function() {
  const STORAGE_KEY = 'pdf_scrape_session';

  function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name) || '';
  }

  function isTargetQuery() {
    const q = getQueryParam('q').toLowerCase();
    return q.includes('site:') && (q.includes('ext:pdf') || q.includes('filetype:pdf'));
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function getStorage() {
    const data = sessionStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  }

  function setStorage(data) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clearStorage() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function extractLinks() {
    const rawLinks = Array.from(document.querySelectorAll('a[href]'));
    return rawLinks
      .map(a => a.href)
      .filter(href => href.toLowerCase().endsWith('.pdf'))
      .filter(href => !href.includes('google.com/url?'));
  }

  function showUI(links) {
    const uniqueLinks = [...new Set(links)];
    const container = document.createElement('div');
    container.style = 'position:fixed;top:10px;right:10px;width:350px;background:#222;color:#fff;z-index:99999;padding:15px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.5);font-family:monospace;border:1px solid #444;';

    const title = document.createElement('h3');
    title.innerText = `Found ${uniqueLinks.length} PDFs`;
    title.style = 'margin-top:0;color:#0f0;font-size:16px;';
    container.appendChild(title);

    const textarea = document.createElement('textarea');
    textarea.value = uniqueLinks.join('\n');
    textarea.style = 'width:100%;height:150px;background:#111;color:#0f0;border:1px solid #444;font-size:11px;margin-bottom:10px;white-space:pre;overflow:auto;';
    container.appendChild(textarea);

    const btnStyle = 'width:100%;padding:8px;margin-bottom:5px;cursor:pointer;background:#444;color:#fff;border:none;border-radius:4px;font-weight:bold;';

    const copyBtn = document.createElement('button');
    copyBtn.innerText = 'Copy URL List';
    copyBtn.style = btnStyle;
    copyBtn.onclick = () => {
      GM_setClipboard(uniqueLinks.join('\n'));
      copyBtn.innerText = 'Copied!';
      setTimeout(() => copyBtn.innerText = 'Copy URL List', 1000);
    };
    container.appendChild(copyBtn);

    const curlBtn = document.createElement('button');
    curlBtn.innerText = 'Copy CURL Command (Bulk)';
    curlBtn.style = btnStyle;
    curlBtn.style.background = '#0055aa';
    curlBtn.onclick = () => {
      const ua = navigator.userAgent;
      const cmd = `mkdir -p pdf_downloads && cd pdf_downloads && curl -A "${ua}" -L -O ` + uniqueLinks.map(l => `'${l}'`).join(' -O ');
      GM_setClipboard(cmd);
      curlBtn.innerText = 'Command Copied!';
      setTimeout(() => curlBtn.innerText = 'Copy CURL Command (Bulk)', 1000);
    };
    container.appendChild(curlBtn);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    closeBtn.style = btnStyle;
    closeBtn.style.background = '#aa0000';
    closeBtn.onclick = () => {
      document.body.removeChild(container);
      clearStorage();
    };
    container.appendChild(closeBtn);

    document.body.appendChild(container);
  }

  async function runScraper() {
    let state = getStorage();

    if (!state) {
      if (isTargetQuery()) {
        const input = prompt('Target Dork detected. How many pages to scrape?', '3');
        if (input && parseInt(input) > 0) {
          state = {
            active: true,
            maxPages: parseInt(input),
            currentPage: 1,
            links: []
          };
          setStorage(state);
        } else {
          return;
        }
      } else {
        return;
      }
    }

    if (state && state.active) {
      const newLinks = extractLinks();
      state.links = state.links.concat(newLinks);

      const nextButton = document.querySelector('#pnnext');

      if (state.currentPage < state.maxPages && nextButton) {
        state.currentPage++;
        setStorage(state);

        const randomDelay = Math.floor(Math.random() * 2000) + 1000;
        await sleep(randomDelay);

        nextButton.click();
      } else {
        showUI(state.links);
        clearStorage();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScraper);
  } else {
    runScraper();
  }
})();
