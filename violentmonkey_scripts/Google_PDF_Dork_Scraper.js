// ==UserScript==
// @name        Google PDF Dork Scraper
// @namespace   Security.Audit
// @match       https://www.google.com/search*
// @grant       GM_setClipboard
// @version     1.0
// ==/UserScript==

(function() {
  const STORAGE_KEY = 'pdf_scrape_session';
  const PDF_INDICATORS = ['pdf', 'PDF', '.pdf'];
  const USER_AGENT = navigator.userAgent;

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

  function extractGoogleRedirectUrl(url) {
    try {
      if (url.includes('/url?') || url.includes('google.com/url?')) {
        const urlObj = new URL(url);
        const realUrl = urlObj.searchParams.get('url');
        if (realUrl) {
          return decodeURIComponent(realUrl);
        }
      }
    } catch (e) {
      console.log('Error parsing redirect URL:', e);
    }
    return url;
  }

  function isPdfResult(element) {
    // Method 1: Check for "PDF" text in result badges/indicators
    const textContent = element.textContent || '';
    
    // Look for standalone "PDF" text (not part of larger words)
    const hasPdfText = /\bPDF\b/i.test(textContent);
    
    // Method 2: Check for elements that visually look like badges
    const badges = element.querySelectorAll('div, span');
    for (const badge of badges) {
      const badgeText = badge.textContent || '';
      if (badgeText.trim() === 'PDF' || badgeText.trim() === 'pdf') {
        return true;
      }
      
      // Check for visual indicators (small badge-like elements)
      const style = window.getComputedStyle(badge);
      const fontSize = parseInt(style.fontSize);
      const hasBackground = style.backgroundColor && 
                           style.backgroundColor !== 'rgba(0, 0, 0, 0)' && 
                           style.backgroundColor !== 'transparent';
      const hasBorderRadius = style.borderRadius !== '0px';
      
      if (badgeText.toUpperCase() === 'PDF' && 
          fontSize <= 14 && 
          (hasBackground || hasBorderRadius)) {
        return true;
      }
    }
    
    return hasPdfText;
  }

  function extractLinks() {
    const links = [];
    
    // Strategy 1: Look at all search result containers
    // Common Google result container selectors
    const resultSelectors = [
      'div[data-hveid]',
      'div.g',
      'div[class*="MjjYud"]',
      'div[class*="tF2Cxc"]',
      'div[class*="rc"]',
      '.MjjYud',
      '.g'
    ];
    
    let resultContainers = [];
    for (const selector of resultSelectors) {
      const found = document.querySelectorAll(selector);
      if (found.length > 0) {
        resultContainers = Array.from(found);
        break;
      }
    }
    
    // If no containers found with specific selectors, look for divs that look like results
    if (resultContainers.length === 0) {
      const allDivs = document.querySelectorAll('div');
      resultContainers = Array.from(allDivs).filter(div => {
        // Heuristic: Result containers usually have links and some text
        const hasLink = div.querySelector('a[href]');
        const hasEnoughText = (div.textContent || '').length > 50;
        const hasMultipleElements = div.children.length >= 3;
        return hasLink && (hasEnoughText || hasMultipleElements);
      });
    }
    
    console.log(`Found ${resultContainers.length} result containers`);
    
    for (const container of resultContainers) {
      if (isPdfResult(container)) {
        // Find the main link in this container
        const mainLink = findMainLink(container);
        
        if (mainLink && mainLink.href) {
          let url = mainLink.href;
          
          // Extract real URL from Google redirect
          url = extractGoogleRedirectUrl(url);
          
          // Also check data-sb attribute
          if (mainLink.hasAttribute('data-sb')) {
            const dataSb = mainLink.getAttribute('data-sb');
            try {
              const urlMatch = dataSb.match(/url=([^&]+)/);
              if (urlMatch) {
                url = decodeURIComponent(urlMatch[1]);
              }
            } catch (e) {
              console.log('Error parsing data-sb:', e);
            }
          }
          
          // Ensure URL is valid
          if (url && url.startsWith('http')) {
            // Check if this URL leads to a PDF (either ends with .pdf or has PDF in params)
            if (url.toLowerCase().includes('.pdf') || 
                url.toLowerCase().includes('pdf') ||
                hasPdfExtension(url)) {
              links.push(url);
            } else {
              // Even if not ending with .pdf, if Google marked it as PDF, include it
              links.push(url);
            }
          }
        }
      }
    }
    
    // Strategy 2: Look for all links that might be PDFs
    const allLinks = document.querySelectorAll('a[href*="/url?"], a[href]');
    for (const link of allLinks) {
      const container = link.closest('div');
      if (container && isPdfResult(container)) {
        let url = link.href;
        url = extractGoogleRedirectUrl(url);
        
        if (url && url.startsWith('http') && !links.includes(url)) {
          links.push(url);
        }
      }
    }
    
    return [...new Set(links)];
  }

  function findMainLink(container) {
    // Strategy 1: Look for link with largest text (likely the title)
    const allLinks = container.querySelectorAll('a[href]');
    if (allLinks.length === 0) return null;
    
    let mainLink = null;
    let maxTextLength = 0;
    
    for (const link of allLinks) {
      const textLength = (link.textContent || '').length;
      const href = link.href || '';
      
      // Skip citation links and small links
      if (href.includes('google.com') && !href.includes('/url?')) continue;
      if (textLength < 5) continue;
      
      // Check if this link looks like a main result link
      const parent = link.parentElement;
      const hasLargeFont = parseInt(window.getComputedStyle(link).fontSize) >= 16;
      const hasTitleClass = link.className.includes('LC20lb') || 
                           link.className.includes('MBeuO') ||
                           link.querySelector('h3, h2, h1');
      
      if ((hasLargeFont || hasTitleClass || textLength > maxTextLength) && 
          !isCitationLink(link)) {
        mainLink = link;
        maxTextLength = textLength;
      }
    }
    
    // Strategy 2: If no link found, look for links with specific patterns
    if (!mainLink) {
      for (const link of allLinks) {
        if (link.href && link.href.includes('/url?')) {
          return link;
        }
      }
    }
    
    return mainLink || allLinks[0];
  }

  function isCitationLink(link) {
    // Citation links are usually in cite elements or have small font
    const parentTag = link.parentElement ? link.parentElement.tagName : '';
    const fontSize = parseInt(window.getComputedStyle(link).fontSize);
    const isInCite = parentTag === 'CITE' || 
                    link.closest('cite') || 
                    link.className.includes('tjvcx');
    
    return isInCite || fontSize < 12;
  }

  function hasPdfExtension(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return pathname.endsWith('.pdf') || 
             pathname.includes('.pdf?') || 
             pathname.includes('.pdf#');
    } catch (e) {
      return url.toLowerCase().includes('.pdf');
    }
  }

  function showUI(links) {
    const uniqueLinks = [...new Set(links)];
    
    // Remove existing UI if present
    const existingUI = document.getElementById('pdf-scraper-ui');
    if (existingUI) existingUI.remove();
    
    const container = document.createElement('div');
    container.id = 'pdf-scraper-ui';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 450px;
      background: #1a1a1a;
      color: #fff;
      z-index: 10000;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.7);
      font-family: 'Segoe UI', Arial, sans-serif;
      border: 1px solid #444;
      max-height: 85vh;
      overflow-y: auto;
    `;
    
    const title = document.createElement('h3');
    title.textContent = `📄 Found ${uniqueLinks.length} PDF Results`;
    title.style.cssText = `
      margin-top: 0;
      margin-bottom: 15px;
      color: #4CAF50;
      font-size: 16px;
      border-bottom: 1px solid #444;
      padding-bottom: 8px;
    `;
    container.appendChild(title);
    
    const linkList = document.createElement('div');
    linkList.style.cssText = `
      margin-bottom: 15px;
      max-height: 200px;
      overflow-y: auto;
      background: #111;
      padding: 10px;
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.4;
    `;
    
    if (uniqueLinks.length > 0) {
      uniqueLinks.forEach((link, index) => {
        const linkItem = document.createElement('div');
        linkItem.style.cssText = `
          padding: 5px;
          margin-bottom: 5px;
          background: ${index % 2 === 0 ? '#222' : '#1a1a1a'};
          border-radius: 3px;
          word-break: break-all;
        `;
        
        const linkNum = document.createElement('span');
        linkNum.textContent = `${index + 1}. `;
        linkNum.style.color = '#888';
        
        const linkText = document.createElement('span');
        linkText.textContent = link;
        linkText.style.color = '#4CAF50';
        
        linkItem.appendChild(linkNum);
        linkItem.appendChild(linkText);
        linkList.appendChild(linkItem);
      });
    } else {
      linkList.textContent = 'No PDF links found. Try the manual extraction button below.';
      linkList.style.color = '#ff9800';
    }
    
    container.appendChild(linkList);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    `;
    
    const createButton = (text, color, onClick) => {
      const button = document.createElement('button');
      button.textContent = text;
      button.style.cssText = `
        padding: 10px;
        background: ${color};
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        transition: background 0.2s;
      `;
      button.onmouseover = () => button.style.background = adjustColor(color, 20);
      button.onmouseout = () => button.style.background = color;
      button.onclick = onClick;
      return button;
    };
    
    const adjustColor = (color, amount) => {
      // Simple color adjustment
      if (color.startsWith('#')) {
        const num = parseInt(color.slice(1), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0xFF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0xFF) + amount));
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
      }
      return color;
    };
    
    // Copy URLs button
    const copyUrlsBtn = createButton('📋 Copy URLs', '#2196F3', () => {
      const text = uniqueLinks.join('\n');
      GM_setClipboard(text);
      copyUrlsBtn.textContent = '✅ Copied!';
      setTimeout(() => copyUrlsBtn.textContent = '📋 Copy URLs', 2000);
    });
    buttonContainer.appendChild(copyUrlsBtn);
    
    // CURL command button
    const curlBtn = createButton('⚡ CURL Command', '#FF9800', () => {
      const commands = uniqueLinks.map(link => 
        `curl -A "${USER_AGENT}" -L -o "pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf" "${link}"`
      );
      const text = `mkdir -p pdf_downloads && cd pdf_downloads\n` + commands.join('\n');
      GM_setClipboard(text);
      curlBtn.textContent = '✅ Copied!';
      setTimeout(() => curlBtn.textContent = '⚡ CURL Command', 2000);
    });
    buttonContainer.appendChild(curlBtn);
    
    // WGET command button
    const wgetBtn = createButton('⬇️ WGET Command', '#4CAF50', () => {
      const commands = uniqueLinks.map(link => 
        `wget --user-agent="${USER_AGENT}" "${link}"`
      );
      const text = `mkdir -p pdf_downloads && cd pdf_downloads\n` + commands.join('\n');
      GM_setClipboard(text);
      wgetBtn.textContent = '✅ Copied!';
      setTimeout(() => wgetBtn.textContent = '⬇️ WGET Command', 2000);
    });
    buttonContainer.appendChild(wgetBtn);
    
    // Manual extraction button
    const manualBtn = createButton('🔍 Manual Extract', '#9C27B0', () => {
      manualExtractLinks();
    });
    buttonContainer.appendChild(manualBtn);
    
    container.appendChild(buttonContainer);
    
    // Close button (full width)
    const closeBtn = createButton('❌ Close & Clear', '#F44336', () => {
      document.body.removeChild(container);
      clearStorage();
    });
    closeBtn.style.gridColumn = '1 / -1';
    container.appendChild(closeBtn);
    
    document.body.appendChild(container);
  }

  function manualExtractLinks() {
    // Alternative manual extraction by parsing page text
    const pageText = document.body.innerText;
    const lines = pageText.split('\n');
    const foundLinks = [];
    
    // Look for URL patterns
    const urlPattern = /https?:\/\/[^\s"']+/g;
    const matches = pageText.match(urlPattern);
    
    if (matches) {
      matches.forEach(match => {
        // Clean up the URL (remove trailing punctuation)
        let url = match.replace(/[.,;:!?)]+$/, '');
        
        // Extract from Google redirects
        if (url.includes('/url?')) {
          try {
            const urlObj = new URL(url);
            const realUrl = urlObj.searchParams.get('url');
            if (realUrl) {
              url = decodeURIComponent(realUrl);
            }
          } catch (e) {
            // If URL parsing fails, try regex extraction
            const urlMatch = url.match(/url=([^&]+)/);
            if (urlMatch) {
              url = decodeURIComponent(urlMatch[1]);
            }
          }
        }
        
        // Check if it looks like a PDF
        if (url.toLowerCase().includes('.pdf') || 
            url.toLowerCase().includes('pdf') ||
            (url.includes('download') && url.includes('file'))) {
          foundLinks.push(url);
        }
      });
    }
    
    if (foundLinks.length > 0) {
      showUI(foundLinks);
    } else {
      alert('Could not automatically extract links. Try:\n1. Right-click on PDF links\n2. Copy link address\n3. The real URL is in the "url=" parameter');
    }
  }

  async function runScraper() {
    let state = getStorage();
    
    if (!state) {
      if (isTargetQuery()) {
        const input = prompt('🔍 PDF Dork detected!\n\nHow many pages to scrape?', '5');
        if (input && parseInt(input) > 0) {
          state = {
            active: true,
            maxPages: parseInt(input),
            currentPage: 1,
            links: []
          };
          setStorage(state);
          
          // Start scraping immediately
          setTimeout(scrapePage, 1000);
        }
        return;
      }
      return;
    }
    
    if (state && state.active) {
      scrapePage();
    }
  }

  async function scrapePage() {
    const state = getStorage();
    if (!state) return;
    
    console.log(`Scraping page ${state.currentPage} of ${state.maxPages}`);
    
    // Wait for page to stabilize
    await sleep(1500 + Math.random() * 1000);
    
    const newLinks = extractLinks();
    console.log(`Found ${newLinks.length} new links on page ${state.currentPage}`);
    
    state.links = [...new Set([...state.links, ...newLinks])];
    
    // Look for next page button
    const nextButtonSelectors = [
      '#pnnext',
      'a[aria-label*="Next"]',
      'a[aria-label*="next"]',
      'a.fl:last-child',
      'a[href*="start="]:contains("Next")'
    ];
    
    let nextButton = null;
    for (const selector of nextButtonSelectors) {
      const found = document.querySelector(selector);
      if (found && found.offsetParent !== null) {
        nextButton = found;
        break;
      }
    }
    
    // Also try to find by text content
    if (!nextButton) {
      const allLinks = document.querySelectorAll('a');
      for (const link of allLinks) {
        const text = (link.textContent || '').toLowerCase();
        if ((text.includes('next') || text.includes('siguiente')) && 
            link.href && link.href.includes('start=')) {
          nextButton = link;
          break;
        }
      }
    }
    
    if (state.currentPage < state.maxPages && nextButton) {
      state.currentPage++;
      setStorage(state);
      
      // Random delay before clicking next
      const delay = 2000 + Math.random() * 2000;
      console.log(`Waiting ${Math.round(delay)}ms before next page...`);
      
      await sleep(delay);
      
      try {
        nextButton.click();
      } catch (e) {
        console.error('Error clicking next button:', e);
        showUI(state.links);
        clearStorage();
      }
    } else {
      console.log('Scraping complete! Total unique links:', state.links.length);
      showUI(state.links);
      clearStorage();
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runScraper);
  } else {
    runScraper();
  }
  
  // Add keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'X') {
      e.preventDefault();
      const links = extractLinks();
      if (links.length > 0) {
        showUI(links);
      } else {
        alert('No PDF links found on this page. Try the manual extraction.');
      }
    }
  });
})();
