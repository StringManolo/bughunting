# Bug Hunting Toolkit

This repository contains a collection of personal scripts, tools, and configurations aimed at streamlining the Bug Bounty hunting process. It includes automation for reconnaissance, data extraction, and workflow optimization.

## Repository Structure

```text
.
├── violentmonkey_scripts/
│   └── google_pdf_dork_scraper.js
└── README.md
```

## 🚀 Violentmonkey Scripts

One of the core components of this toolkit is the collection of User Scripts designed to run directly in the browser. These scripts help automate client-side tasks during manual reconnaissance.

### 1. Installation

To use these scripts, you need a User Script manager. **Violentmonkey** is recommended due to its open-source nature and compatibility.

**Browser Support:**

* **Firefox / Tor Browser:** [Download from Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
* **Chrome / Brave / Cromite:** [Download from Chrome Web Store](https://chromewebstore.google.com/detail/violentmonkey/jinjaccalgkegednnccohejagnlnfdag?pli=1)

### 2. How to Install Scripts

There are two ways to install the scripts from this repository:

**Option A: Direct Install (Recommended)**

1. Navigate to the `violentmonkey_scripts` folder in this repository.
2. Click on the `.js` file you want to install (e.g., `google_pdf_dork_scraper.js`).
3. Click the **Raw** button on the top right of the file viewer.
4. Violentmonkey will automatically detect the script and open an installation tab.
5. Click **Confirm installation**.

**Option B: Manual Copy-Paste**

1. Open the script file in GitHub and copy the raw code.
2. Click the Violentmonkey icon in your browser toolbar.
3. Select **Create a new script**.
4. Delete the default template content.
5. Paste the code from this repository.
6. Save and close (`Ctrl + S`).

---

## 🛠️ Featured Scripts

### Google PDF Dork Scraper

Automates the extraction of PDF links from Google Search results when performing dorking (e.g., `site:target.com ext:pdf`).

**Features:**

* **Auto-Detection:** triggers automatically when `ext:pdf` or `filetype:pdf` is present in the search query.
* **Pagination:** scrapes multiple pages of results automatically.
* **Bulk Download:** generates a `curl` command to download all found files preserving the User-Agent to avoid 403 errors.

**Usage:**

1. Install the script.
2. Go to Google and search: `site:example.com ext:pdf`
3. Accept the prompt to start scraping.
4. Use the panel to copy links or generate the download command.

---

## ⚠️ Disclaimer

This repository is for educational purposes and authorized security research (Bug Bounty programs) only. The author is not responsible for any misuse of these tools. Always ensure you have permission to scan or scrape the target infrastructure.
