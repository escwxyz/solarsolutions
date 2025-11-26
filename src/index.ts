import { chromium } from "playwright";
import {
  closeCookieBanner,
  collectCompanyPages,
  extractCompanyFromDetailPage,
  loadPage,
  saveCompaniesToJSONFile,
} from "./actions";
import { BASE_URL, BETWEEN_DETAIL_REQUEST_MS } from "./constants";
import type { Company } from "./types";

async function main() {
  try {
    const browser = await chromium.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    });

    console.log("Browser launched...");

    const context = await browser.newContext();
    const page = await context.newPage();
    console.log("Loading page...");
    await loadPage(page, `${BASE_URL}/ausstellerliste/`);
    console.log("Closing cookie banner...");
    await closeCookieBanner(page);

    console.log("Collecting company pages...");
    const detailUrls = await collectCompanyPages(page);
    console.log("Extracting details...");
    const companies: Company[] = [];
    for (const detailUrl of detailUrls) {
      try {
        const company = await extractCompanyFromDetailPage(page, detailUrl);
        await page.waitForTimeout(BETWEEN_DETAIL_REQUEST_MS);
        if (company) {
          companies.push(company);
          console.log(`Scraped ${company.name}`);
        }
      } catch (error) {
        console.warn(`Failed to scrape ${detailUrl}:`, error);
      }
    }

    console.log("Creating file...");
    await saveCompaniesToJSONFile(companies);

    await browser.close();
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

main();
