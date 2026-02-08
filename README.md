# Bug Hunting Toolkit

This repository contains a collection of personal scripts, tools, and configurations aimed at streamlining the Bug Bounty hunting process. It includes automation for reconnaissance, data extraction, and workflow optimization.

## Repository Structure

```text
.
├── violentmonkey_scripts/
│   └── google_pdf_dork_scraper.js
├── pdfTextExtractor.sh
└── README.md
```

## 🚀 Violentmonkey Scripts

One of the core components of this toolkit is the collection of User Scripts designed to run directly in the browser. These scripts help automate client-side tasks during manual reconnaissance.

### 1. Installation

To use these scripts, you need a User Script manager. **Violentmonkey** is recommended due to its open-source nature and compatibility.

**Browser Support:**

* **Firefox / Tor Browser:** [Download from Mozilla Add-ons](https://addons.mozilla.org/en-US/firefox/addon/violentmonkey/)
* **Chrome / Brave / Cromite:** [Download from Chrome Web Store](https://www.google.com/search?q=https://chromewebstore.google.com/detail/violentmonkey/jinjaccaljkbdnnccoaeallbneacijkh)

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

### Google PDF Dork Scraper (User Script)

Automates the extraction of PDF links from Google Search results when performing dorking (e.g., `site:target.com ext:pdf`).

**Features:**

* **Auto-Detection:** Triggers automatically when `ext:pdf` or `filetype:pdf` is present in the search query.
* **Pagination:** Scrapes multiple pages of results automatically.
* **Bulk Download:** Generates a `curl` command to download all found files preserving the User-Agent to avoid 403 errors.

---

### PDF Text & OCR Extractor (Bash Script)

`pdfTextExtractor.sh` is a powerful CLI tool to process a directory full of PDFs. It extracts raw text and uses OCR (Optical Character Recognition) to find hidden text inside images embedded in the PDFs.

**Usage:**

1. Place the `pdfTextExtractor.sh` script in the folder containing your `.pdf` files.
2. Give it execution permissions: `chmod +x pdfTextExtractor.sh`.
3. Run it: `./pdfTextExtractor.sh`.

**Features:**

* **Deep Scan:** Extracts text with layout preservation.
* **OCR Integration:** Automatically extracts images from PDFs and runs Tesseract (English/Spanish) on them to find text that `pdftotext` might miss.
* **Progress Tracking:** Real-time percentage, file count, and ETA.
* **Report Generation:** Consolidates everything into a single `report.txt` for easy grepping.

> Once you have your report.txt, you can [load it here for analisis](https://stringmanolo.github.io/bughunting/pdfbughunter.html)

---

### Useful One-Liners

#### Quick Metadata Audit

To extract all metadata from PDFs in the current directory and save it for analysis:

```bash
exiftool -a -u -g1 -extension pdf ./ > resume_pdfs.txt
```

---

## ⚠️ Disclaimer

This repository is for educational purposes and authorized security research (Bug Bounty programs) only. The author is not responsible for any misuse of these tools. Always ensure you have permission to scan or scrape the target infrastructure.
