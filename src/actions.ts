import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect } from "@playwright/test";
import type { Page } from "playwright";
import {
  BASE_URL,
  CATEGORY_BLOCK_TIMEOUT_MS,
  CATEGORY_TEXT_TIMEOUT_MS,
  DETAIL_PAGE_DELAY_MS,
  HEADING_TIMEOUT_MS,
  LINK_VISIBILITY_TIMEOUT_MS,
} from "./constants";
import type { Company } from "./types";
import { escapeForRegex, normalizeCategory, resolveUrl } from "./utils";

const DETAIL_PATTERN =
  /^(?:\/)?(?:ausstellerliste\/)?[^?#/]+-\w[\w-]*\.html(?:[?#].*)?$/i;

const BLOCKED_HOSTS_REGEX = /linkedin|facebook|instagram/i;

export async function loadPage(page: Page, url: string) {
  try {
    const targetUrl = resolveUrl(url);
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
    });
    if (!response) {
      console.warn(`No response while navigating to ${targetUrl}`);
    }
    const expectedPath = escapeForRegex(new URL(targetUrl).pathname);
    await expect(page).toHaveURL(new RegExp(expectedPath));
  } catch (e) {
    console.log("Failed to load page:", e);
  }
}

export async function closeCookieBanner(page: Page) {
  try {
    const banner = page.locator("#cookieBanner");

    if (await banner.isVisible()) {
      const acceptButton = banner.locator("button:has-text('Akzeptieren')");

      await expect(acceptButton).toBeVisible();

      await acceptButton.click();

      console.log("Cookie banner accepted.");
    }
  } catch (error) {
    console.error("Error handling cookie banner:", error);
  }
}

export async function collectCompanyPages(page: Page): Promise<string[]> {
  const detailUrls: string[] = [];
  const seen = new Set<string>();
  const links = page.locator('a.buttonMeer:has-text("Weiterlesen")');

  await expect(links.first()).toBeVisible({
    timeout: LINK_VISIBILITY_TIMEOUT_MS,
  });

  const linkCount = await links.count();

  console.log("links count: ", linkCount);

  for (let index = 0; index < linkCount; index += 1) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    if (!(href && DETAIL_PATTERN.test(href))) {
      continue;
    }

    if (seen.has(href)) {
      continue;
    }
    seen.add(href);

    const detailUrl = href.startsWith("http")
      ? href
      : new URL(href, `${BASE_URL}/ausstellerliste/`).toString();

    detailUrls.push(detailUrl);
  }

  expect(detailUrls.length).toBe(linkCount);

  return detailUrls;
}

export async function extractCompanyFromDetailPage(
  page: Page,
  detailUrl: string
): Promise<Company | null> {
  try {
    await loadPage(page, detailUrl);
    await page.waitForTimeout(DETAIL_PAGE_DELAY_MS);

    const heading = page.locator(".nawgegevens strong, h1, h2").first();
    await expect(heading).toBeVisible({ timeout: HEADING_TIMEOUT_MS });
    const name = (await heading.innerText()).trim();

    const categoryBlockLocator = page
      .locator(".compTypes p:has-text('ART BETRIEB')")
      .first();
    const hasCategoryBlock = (await categoryBlockLocator.count()) > 0; // some company detail pages don't have the category block
    let categoryText = "";
    if (hasCategoryBlock) {
      await expect(categoryBlockLocator).toBeVisible({
        timeout: CATEGORY_BLOCK_TIMEOUT_MS,
      });
      const rawCategory = await categoryBlockLocator
        .innerText({ timeout: CATEGORY_TEXT_TIMEOUT_MS })
        .catch(() => "");
      categoryText =
        rawCategory
          .split("\n")
          .map((line) => line.trim())
          .find(
            (line) => line.length > 0 && line.toLowerCase() !== "art betrieb"
          ) ?? "";
    }
    const category = normalizeCategory(categoryText);

    const websiteLocator = page
      .locator("a.urlExternal[href^='http']")
      .filter({ hasNotText: BLOCKED_HOSTS_REGEX })
      .first();
    const website =
      (await websiteLocator.count()) > 0
        ? await websiteLocator.getAttribute("href")
        : null;

    return {
      name,
      category,
      website: website || undefined,
    };
  } catch (e) {
    console.log("Error extracting...", e);
    return null;
  }
}

export async function saveCompaniesToJSONFile(
  companies: Company[],
  fileName = "companies.json"
) {
  const filePath = path.resolve(process.cwd(), fileName);
  const payload = JSON.stringify(companies, null, 2);

  await writeFile(filePath, payload, "utf-8");
  console.log(`Saved ${companies.length} companies to ${filePath}`);
}
