/**
 * A4 shop notice sheets (navy + yellow, English + Hindi). Edit the text/prices below, then run:
 *   node scripts/make-notices.mjs
 * Writes print/notice-*.png (A4, ~300 dpi) and print/notice-*.html. Needs Edge or Chrome installed.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const out = "print";
const W = 794, H = 1123; // A4 at 96 dpi; rendered at 3.125x => 2481 x 3509 px (~300 dpi)

const browser = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].find((p) => fs.existsSync(p));
if (!browser) throw new Error("Edge or Chrome not found");

const css = `
*{box-sizing:border-box;margin:0;padding:0}
body{width:${W}px;height:${H}px;background:#12286b;font-family:"Segoe UI","Nirmala UI",sans-serif;color:#fff;position:relative;overflow:hidden}
.glow{position:absolute;left:-120px;top:-260px;width:1034px;height:1034px;border-radius:50%;background:#0e2160}
.wrap{position:relative;height:100%;display:flex;flex-direction:column;align-items:center;padding:34px 40px 0}
.brand{font-weight:900;font-size:58px;letter-spacing:2px;line-height:1}
.brand b{color:#ffd500}
.tag{font-style:italic;font-size:17px;margin-top:6px;opacity:.95}
.pill{background:#ffd500;color:#12286b;font-weight:800;letter-spacing:2px;font-size:15px;padding:6px 22px;border-radius:30px;margin-top:12px}
.main{flex:1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.big{font-weight:900;line-height:1.02;text-transform:uppercase}
.hi{color:#ffd500;font-weight:700}
.foot{position:absolute;left:0;right:0;bottom:0;height:66px;background:#ffd500;color:#12286b;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:21px}
.card{background:#f6f2ea;color:#12286b;border-radius:22px}
.icon{width:300px;height:300px;border-radius:50%;background:#ffd500;color:#12286b;display:flex;align-items:center;justify-content:center;font-weight:900}
`;

const frame = (inner, footer) => `<!doctype html><meta charset="utf-8"><style>${css}</style><body><div class="glow"></div><div class="wrap">
<div class="brand">PENCIL <b>BOX</b></div><div class="tag">Write • Create • Learn • Grow</div><div class="pill">STATIONERY &amp; MORE</div>
<div class="main">${inner}</div></div><div class="foot">${footer}</div></body>`;

const sheets = {
  "fixed-price": frame(
    `<div class="icon" style="font-size:110px;width:200px;height:200px;margin:10px 0 24px">₹</div>
     <div class="big" style="font-size:96px">FIXED<br><span style="color:#ffd500">PRICE</span></div>
     <div class="hi" style="font-size:46px;margin-top:14px">निश्चित मूल्य — मोल-भाव नहीं</div>
     <div class="card" style="margin-top:28px;padding:18px 40px;font-size:28px;font-weight:800">All stationery items: price is fixed, no bargaining.</div>
     <div style="margin-top:14px;margin-bottom:84px;font-size:26px;color:#ffd500;font-weight:700">सभी स्टेशनरी सामान का रेट फिक्स है।</div>`,
    "Fair prices for everyone · सबके लिए एक ही दाम",
  ),
  "no-return": frame(
    `<div class="icon" style="background:#e5383b;color:#fff;font-size:90px;width:190px;height:190px;margin:10px 0 24px">✕</div>
     <div class="big" style="font-size:84px">NO <span style="color:#ffd500">RETURN</span><br>NO EXCHANGE</div>
     <div class="hi" style="font-size:44px;margin-top:12px">वापसी / बदली नहीं होगी</div>
     <div class="card" style="margin-top:26px;padding:18px 44px;font-size:34px;font-weight:900">TOYS &nbsp;•&nbsp; ELECTRONICS</div>
     <div style="margin-top:14px;font-size:30px;color:#ffd500;font-weight:800">खिलौने • इलेक्ट्रॉनिक सामान</div>
     <div style="margin-top:20px;margin-bottom:84px;font-size:22px;font-weight:600;max-width:640px">Please check the item before you leave the counter.<br><span style="color:#ffd500">काउंटर से जाने से पहले सामान जाँच लें।</span></div>`,
    "Thank you for understanding · धन्यवाद",
  ),
  "photocopy-printout-rates": frame(
    `<div class="big" style="font-size:78px">PHOTOCOPY<br><span style="color:#ffd500">&amp; PRINTOUT RATES</span></div>
     <div class="hi" style="font-size:38px;margin-top:10px">फोटोकॉपी और प्रिंटआउट रेट (प्रति पेज)</div>
     <div style="width:100%;margin-top:34px;display:flex;flex-direction:column;gap:18px">
       ${[
         ["Photocopy", "फोटोकॉपी", "₹2"],
         ["Printout · Black &amp; White", "प्रिंटआउट · ब्लैक एंड व्हाइट", "₹5"],
         ["Printout · Colour", "प्रिंटआउट · रंगीन", "₹10"],
       ]
         .map(
           ([en, hi, p]) => `<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:22px 38px;text-align:left">
         <div><div style="font-size:38px;font-weight:900">${en}</div><div style="font-size:24px;font-weight:700;color:#8a6d00">${hi}</div></div>
         <div style="font-size:84px;font-weight:900;line-height:1">${p}</div></div>`,
         )
         .join("")}
     </div>
     <div style="margin-top:22px;font-size:24px;font-weight:700">Rate per page, A4 size &nbsp;•&nbsp; <span style="color:#ffd500">रेट प्रति पेज, A4 साइज़</span></div>`,
    "Photocopy · Printout · फोटोकॉपी · प्रिंटआउट",
  ),
  payment: frame(
    `<div class="big" style="font-size:96px">CASH <span style="color:#ffd500">&amp; UPI</span><br>ONLY</div>
     <div class="hi" style="font-size:52px;margin-top:18px">सिर्फ़ कैश और UPI</div>
     <div style="display:flex;gap:26px;margin-top:40px">
       <div class="card" style="padding:26px 44px;font-size:46px;font-weight:900;display:flex;flex-direction:column;justify-content:center">NO CREDIT<div style="font-size:26px;color:#8a6d00;font-weight:700">उधार बंद है</div></div>
       <div class="card" style="padding:26px 44px;font-size:46px;font-weight:900;display:flex;flex-direction:column;justify-content:center">PAY AT<br>COUNTER<div style="font-size:26px;color:#8a6d00;font-weight:700">काउंटर पर भुगतान</div></div>
     </div>
     <div style="margin-top:32px;font-size:26px;font-weight:600">Please take your bill with every purchase.<br><span style="color:#ffd500">हर खरीदारी पर बिल ज़रूर लें।</span></div>`,
    "Thank you for shopping with us · धन्यवाद",
  ),
};

fs.mkdirSync(out, { recursive: true });
const tmp = fs.mkdtempSync(path.join(process.env.TEMP ?? ".", "pb-notice-"));
for (const [name, html] of Object.entries(sheets)) {
  fs.writeFileSync(path.join(out, `notice-${name}.html`), html);
  const file = path.join(tmp, `${name}.html`);
  fs.writeFileSync(file, html);
  const png = path.resolve(out, `notice-${name}.png`);
  execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=3.125", `--window-size=${W},${H}`, `--screenshot=${png}`, "file:///" + file.split(path.sep).join("/")], { stdio: "ignore", timeout: 60000 });
  console.log("wrote", path.join(out, `notice-${name}.png`));
}
fs.rmSync(tmp, { recursive: true, force: true });
