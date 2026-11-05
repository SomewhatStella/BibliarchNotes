import {PDFDocument} from "pdf-lib";
import type {Browser} from "playwright-core";
import {launchBrowser} from "../../../src/server-browser";
import {
  assertPublishBook,
  buildPrintHtml,
  MAX_PUBLISH_BYTES,
} from "../../../src/publishing";
export const runtime = "nodejs";
export const maxDuration = 60;
let active = false;
export async function POST(request: Request): Promise<Response> {
  // Browser callers must originate here; this is CSRF protection, not authentication.
  // Compare hosts, not request.url: behind a proxy or with --hostname, Next's
  // internal URL (e.g. localhost) differs from the address the browser used.
  const origin = request.headers.get("origin");
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host).split(",")[0].trim();
  let originHost = "";
  try { originHost = origin ? new URL(origin).host : ""; } catch { originHost = "invalid"; }
  if ((origin && originHost !== host) || request.headers.get("sec-fetch-site") === "cross-site")
    return Response.json({ error: "Cross-origin PDF requests are not allowed." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_PUBLISH_BYTES)
    return Response.json(
      { error: "Book exceeds 12 MiB limit" },
      { status: 413 },
    );
  let book: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing request body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_PUBLISH_BYTES) {
        await reader.cancel();
        return Response.json(
          { error: "Book exceeds 12 MiB limit" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    book = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    assertPublishBook(book);
  } catch (e) {
    return Response.json({ error: "Invalid book data." }, { status: 400 });
  }
  // Section-by-section assembly cannot retain document-wide TOC links.
  // Fail closed rather than silently producing an empty table of contents.
  if (book.format.recto && book.sections.some(section => section.kind === "toc"))
    return Response.json(
      { error: "Recto PDF export cannot currently be combined with a table of contents. Disable recto chapter starts to preserve the full-document contents and links, or remove the table of contents." },
      { status: 400 },
    );
  if (active)
    return Response.json(
      { error: "Another PDF is rendering; please retry." },
      { status: 429 },
    );
  active = true;
  let browser: Browser | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const task = (async () => {
      browser = await launchBrowser();
      const context = await browser.newContext({
        javaScriptEnabled: false,
        serviceWorkers: "block",
      });
      await context.route("**/*", (route) => route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const bleed=book.format.bleedMm||0;
      const printBook=bleed?{...book,format:{...book.format,widthMm:book.format.widthMm+2*bleed,heightMm:book.format.heightMm+2*bleed,marginMm:book.format.marginMm+bleed,insideMm:(book.format.insideMm??book.format.marginMm)+bleed,outsideMm:(book.format.outsideMm??book.format.marginMm)+bleed,bleedMm:0}}:book;
      async function render(html:string){
        await page.setContent(html,{waitUntil:'load',timeout:15000});await page.emulateMedia({media:'print'});
        await page.evaluate(async()=>{await document.fonts.ready;for(const face of document.fonts){await face.load();if(face.status!=='loaded')throw Error('Custom font failed to load');}await Promise.all(Array.from(document.images).map(img=>img.decode()));});
        return page.pdf({preferCSSPageSize:true,printBackground:true});
      }
      let bytes:Uint8Array;
      if(book.format.recto){
        const assembled=await PDFDocument.create();
        for(const section of printBook.sections){
          if(section.kind==='chapter-title'&&assembled.getPageCount()%2===1)assembled.addPage([printBook.format.widthMm*72/25.4,printBook.format.heightMm*72/25.4]);
          const start=assembled.getPageCount()+1;
          // Each Chromium document begins on a right page regardless of its
          // page counter. Reverse binding margins for even physical starts.
          const f = printBook.format;
          const sectionFormat = f.mirror && start % 2 === 0
            ? {...f, insideMm: f.outsideMm ?? f.marginMm, outsideMm: f.insideMm ?? Math.min(f.marginMm + 5, f.widthMm / 3), recto:false}
            : {...f, recto:false};
          const html=buildPrintHtml({...printBook,format:sectionFormat,sections:[section]}).replace('</style>',`@page:first{counter-reset:page ${start};}</style>`);
          const part=await PDFDocument.load(await render(html));
          for(const sheet of await assembled.copyPages(part,part.getPageIndices()))assembled.addPage(sheet);
        }
        bytes=await assembled.save();
      }else bytes=await render(buildPrintHtml(printBook));
      if(!bleed)return bytes;
      const pdf=await PDFDocument.load(bytes),scale=72/25.4;
      for(const sheet of pdf.getPages()){sheet.setTrimBox(bleed*scale,bleed*scale,book.format.widthMm*scale,book.format.heightMm*scale);sheet.setBleedBox(0,0,sheet.getWidth(),sheet.getHeight());}
      return pdf.save();
    })();
    const pdf = await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          void browser?.close().catch(() => {});
          reject(new Error("PDF rendering timed out"));
        }, 45000);
      }),
    ]);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="bibliarch-book.pdf"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    console.error("PDF export:", e);
    return Response.json(
      {
        error:
          "PDF rendering failed. Verify images and local Playwright Chromium installation.",
      },
      { status: 500 },
    );
  } finally {
    if (timer) clearTimeout(timer);
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (browser) await Promise.race([
        browser.close(),
        new Promise<never>((_, reject) => {
          cleanupTimer = setTimeout(() => reject(new Error("PDF browser cleanup timed out")), 2000);
        }),
      ]);
    }
    catch (error) { console.error("PDF browser cleanup failed:", error); }
    finally {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      active = false;
    }
  }
}
