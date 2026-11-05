import {PDFDocument} from "pdf-lib";
import type {Browser} from "playwright-core";
import {launchBrowser} from "../../../src/server-browser";
import {assertCoverRender, coverHtml, BLEED_MM} from "../../../src/cover";
export const runtime = "nodejs";
export const maxDuration = 60;
const MAX_BYTES = 4_000_000;
let active = false;

/** The wraparound cover as one print-ready PDF page, with trim and bleed boxes set. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host).split(",")[0].trim();
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch { originHost = "invalid"; }
  if ((origin && originHost !== host) || request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json({error: "Cross-origin requests are not allowed."}, {status: 403});
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return Response.json({error: "Cover is too large."}, {status: 413});
  let spec: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BYTES) return Response.json({error: "Cover is too large."}, {status: 413});
    spec = JSON.parse(raw);
    assertCoverRender(spec);
  } catch {
    return Response.json({error: "Invalid cover data."}, {status: 400});
  }
  if (active) return Response.json({error: "Another PDF is rendering; please retry."}, {status: 429});
  active = true;
  let browser: Browser | undefined;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({javaScriptEnabled: false, serviceWorkers: "block"});
    await context.route("**/*", route => route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    // Chromium rounds page sizes to whole pixels; render on a slightly bigger page and
    // crop to the exact size below, because printers check the cover size to the 1/100 inch.
    await page.setContent(coverHtml(spec, {padMm: 3}), {waitUntil: "load", timeout: 15000});
    await page.emulateMedia({media: "print"});
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all(Array.from(document.images).map(img => img.decode())); });
    const pdf = await PDFDocument.load(await page.pdf({preferCSSPageSize: true, printBackground: true}));
    const k = 72 / 25.4, sheet = pdf.getPage(0);
    const W = (2 * BLEED_MM + 2 * spec.trimW + spec.spine) * k, H = (2 * BLEED_MM + spec.trimH) * k, top = sheet.getHeight() - H;
    sheet.setMediaBox(0, top, W, H); sheet.setCropBox(0, top, W, H);
    // Printers read these boxes: trim = the finished cover, bleed = the whole sheet.
    sheet.setTrimBox(BLEED_MM * k, top + BLEED_MM * k, W - 2 * BLEED_MM * k, H - 2 * BLEED_MM * k);
    sheet.setBleedBox(0, top, W, H);
    while (pdf.getPageCount() > 1) pdf.removePage(1);
    return new Response(new Uint8Array(await pdf.save()), {headers: {"Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="cover.pdf"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"}});
  } catch (e) {
    console.error("Cover export:", e);
    return Response.json({error: "Cover PDF rendering failed."}, {status: 500});
  } finally {
    await browser?.close().catch(() => {});
    active = false;
  }
}
