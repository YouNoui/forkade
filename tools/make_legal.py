#!/usr/bin/env python3
"""Writes web/terms.html, privacy.html, guidelines.html and delete.html from the copy below.
Same standard as Breekit: plain language, operator + UEN, DPO, PDPA baseline, version line.
Edit the copy here, bump VERSION/UPDATED, run:  python tools/make_legal.py"""
import html, pathlib
VERSION, UPDATED = "2026-11-14-v1", "14 Nov 2026"
EMAIL = "hello@iamynoui.com"
OP = "Forkade (playforkade.com) is operated by IAMYNOUI, a sole proprietorship registered in Singapore (UEN 53535234D)."
DOCS = {
 "terms": ("TERMS", "Forkade Terms of Use",
  f"These terms cover your use of Forkade, the free open-source neon arcade. {OP} By playing you agree to them.", [
  ("What Forkade is", "Forkade is a free collection of browser games. There are no accounts, no purchases and no ads. Cores, badges, ECHO skins, ranks and streaks are game rewards only: they have no money value, cannot be bought, sold or exchanged, and are stored on your own device, so clearing your browser data removes them."),
  ("Open source", "Forkade's code is released under the MIT License. When you submit a game (for example through the Playground and GitHub), you confirm you made it or have the right to share it, and you agree it is published under the MIT License. We may accept, change or decline any submission."),
  ("Rankings", "Posting to the global rankings is optional. You choose a nickname and post a score; nothing is posted automatically. Weekly boards reset every week and there are no prizes. We may remove any score or nickname that looks cheated, automated or breaks the Community rules."),
  ("Fair use", "Don't cheat or post edited scores, don't automate or flood the rankings or stats endpoints, don't try to break, overload or reverse-engineer the service in a way that harms it or other players, and don't use Forkade for anything illegal."),
  ("Availability and liability", "Forkade is provided free and as is. Games, rewards and rankings can change, reset or go offline. To the extent permitted by law, IAMYNOUI is not liable for indirect or consequential losses, or for lost game progress."),
  ("Copyright complaints", f"If you believe something on Forkade copies your work, email {EMAIL} with the work you own, a link to the game or page, your contact details, and a statement that your complaint is accurate and that you own the rights or may act for the owner. We review complaints promptly and may remove or change the content."),
  ("Changes and law", "We may update these terms; the version and date at the top show the latest. Singapore law governs these terms."),
 ]),
 "privacy": ("PRIVACY", "Forkade Privacy Policy",
  f"{OP} Contact: {EMAIL}. Short version: no accounts, no ads, no tracking cookies, and your progress stays on your device.", [
  ("Data Protection Officer", f"Younes Noui, Data Protection Officer, IAMYNOUI &mdash; {EMAIL}. We respond to requests for access, correction or deletion within 30 days."),
  ("What stays on your device", "High scores, cores, badges, skins, your streak, the nickname box, Playground drafts and a random player ID are saved in your browser's local storage. We can't see any of it. Clearing your browser's site data, or the button on the Delete my data page, removes it."),
  ("Anonymous counts", "To see which games people enjoy, we count visits and plays per game per day. To avoid counting the same visitor twice in a day, a hash of your network address and browser type, salted with a value that changes daily, is added to an approximate counter that cannot be turned back into an address. Raw network addresses are not stored, no cookies are set, and nothing is linked to you. If your browser sends Do Not Track or Global Privacy Control, nothing is counted."),
  ("Rankings (only if you tap Post)", "When you post a score we store your nickname, the game, your best score and your random player ID. Your network address is used briefly, as a hash, to stop spam and is deleted after 60 seconds. Rankings are public, so please don't use your real full name as a nickname."),
  ("Who handles it", "Vercel hosts the site and runs the rankings and counting functions. Upstash stores the rankings and daily counts. GitHub hosts the open-source code and any game you choose to submit there. Each gets only what it needs. Data may be processed outside Singapore with contractual and technical safeguards."),
  ("Cookies and ads", "Forkade sets no cookies and shows no ads. We never sell data and never share it for advertising."),
  ("Retention", "Daily counts are kept for about 13 months. Weekly boards expire after 3 weeks. All-time scores stay until you remove them or we remove them for breaking the rules. Spam-check hashes are deleted after 60 seconds."),
  ("Your rights", f"Singapore's PDPA is our baseline. Where EU or UK law applies you may also request access, correction, deletion, restriction, portability or object, and may complain to your local regulator. Remove your rankings data instantly with <b>Remove my scores</b> in Rankings, or email {EMAIL} with your player ID from the Delete my data page."),
  ("Children", "Forkade is made to be played by everyone. Players under 13 should ask a parent before posting a nickname to the rankings."),
  ("AI training", "We do not use anything you post or submit to train AI models, and we do not give it to anyone else to train AI models."),
 ]),
 "guidelines": ("COMMUNITY RULES", "Play fair, keep it friendly",
  "These rules keep the rankings and submitted games fun and safe for everyone, including younger players.", [
  ("Nicknames", "2&ndash;14 letters or numbers. No real full names, no rude, hateful or sexual words, no pretending to be someone else, and no ads or links."),
  ("Fair play", "Rewind is part of the game, so use it as much as you like. Don't post edited or scripted scores, don't use bots, and don't flood the rankings."),
  ("Submitted games", "Make it your own. Genres are free to use, but don't copy another game's name, characters, art, piece set or exact layout, and don't use brand names. No tracking, network calls or ads, and keep it suitable for all ages."),
  ("Moderation", f"We review reports sent to {EMAIL} and may remove scores, nicknames or games that break these rules. There are no automatic bans; decisions consider context and evidence."),
 ]),
 "delete": ("YOUR DATA", "Delete my data",
  "Forkade has no accounts, so you are in control of your data. Here is how to remove each part.", [
  ("Rankings: instant", "Open Rankings on the home screen and tap <b>Remove my scores and nickname</b>. It deletes your nickname and every score you posted, on every board, straight away."),
  ("Rankings: by email", f"Can't use this device any more? Email {EMAIL} with your player ID (shown below on the device you played on) and we will remove it within 30 days."),
  ("Progress on this device", "Your scores, cores, badges, skins and Playground draft live only in this browser. The button below clears them. This cannot be undone."),
  ("What we keep", "Anonymous daily counts of visits and plays are not linked to you or your device, so there is nothing in them to delete."),
 ]),
}
TPL = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} - FORKADE</title><meta name="theme-color" content="#06051a"><link rel="icon" href="icons/icon-192.png">
<style>
  body{{margin:0; font-family:"Consolas","SF Mono",ui-monospace,monospace; color:#f1f3ff; line-height:1.7;
    background:radial-gradient(1200px 600px at 50% -10%,#2a1650 0%,#06051a 60%); min-height:100vh;}}
  main{{max-width:760px; margin:0 auto; padding:40px 22px 60px;}}
  a{{color:#22e4ff;}} .back{{display:inline-block; margin-bottom:26px; text-decoration:none; border:1px solid #22e4ff; border-radius:10px; padding:6px 12px; font-size:13px; font-weight:700;}}
  .eyebrow{{color:#ff3ea5; letter-spacing:3px; font-size:12px; font-weight:800;}}
  h1{{margin:6px 0 8px; color:#22e4ff; font-size:clamp(24px,5vw,34px); text-shadow:0 0 14px rgba(34,228,255,.6);}}
  .meta{{color:#8d92bd; font-size:12px;}} .draft{{color:#ffb23f; font-size:12px;}}
  .intro{{font-size:15px;}} h2{{font-size:16px; color:#9dff57; margin:26px 0 4px;}} p{{margin:0 0 10px; font-size:14px;}}
  nav.docs{{margin-top:34px; padding-top:16px; border-top:1px solid rgba(141,146,189,.3); font-size:13px; color:#8d92bd;}}
  .box{{margin:16px 0; padding:14px 16px; border:1px solid rgba(160,123,255,.5); border-radius:12px; background:rgba(14,10,40,.7);}}
  .box code{{color:#ffb23f; word-break:break-all;}} button{{font-family:inherit; font-weight:800; cursor:pointer; border-radius:10px;
    padding:9px 14px; background:transparent; color:#ff4f6e; border:1px solid #ff4f6e;}}
</style></head><body><main>
<a class="back" href="index.html">&larr; Back to the arcade</a>
<div class="eyebrow">{eyebrow}</div>
<h1>{title}</h1>
<div class="meta">Version {version} &middot; Last updated {updated} &middot; English is the official version.</div>
<div class="draft">Plain-language product draft. It has not been reviewed by a lawyer.</div>
<p class="intro">{intro}</p>
{sections}
{extra}
<p style="margin-top:26px">Questions? <a href="mailto:{email}">{email}</a></p>
<nav class="docs"><a href="terms.html">Terms</a> &middot; <a href="privacy.html">Privacy</a> &middot; <a href="guidelines.html">Community rules</a> &middot; <a href="delete.html">Delete my data</a> &middot; &copy; 2026 IAMYNOUI (UEN 53535234D)</nav>
</main>{script}</body></html>
"""
DELETE_EXTRA = """<div class="box">
  <p>Your player ID on this device: <code id="pid">none yet (you haven't posted a score here)</code></p>
  <p><button id="wipe">Clear my Forkade progress on this device</button> <span id="wmsg"></span></p>
</div>"""
DELETE_JS = """<script>
  try { const id = JSON.parse(localStorage.getItem("forkade-pid") || "null"); if (id) document.getElementById("pid").textContent = id; } catch (_) {}
  const b = document.getElementById("wipe"), m = document.getElementById("wmsg");
  b.addEventListener("click", () => {
    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; m.textContent = "Tap again to confirm."; return; }
    try { Object.keys(localStorage).filter(k => /^(forkade-|neon-)/.test(k)).forEach(k => localStorage.removeItem(k)); m.textContent = "Done. This device's Forkade progress is cleared."; }
    catch (_) { m.textContent = "Your browser blocked this. Clear this site's data in your browser settings instead."; }
    b.dataset.sure = "";
  });
</script>"""
root = pathlib.Path(__file__).resolve().parent.parent / "web"
for name, (eyebrow, title, intro, secs) in DOCS.items():
    body = "\n".join(f"<h2>{html.escape(t)}</h2>\n<p>{x}</p>" for t, x in secs)
    (root / f"{name}.html").write_text(TPL.format(title=title, eyebrow=eyebrow, version=VERSION, updated=UPDATED,
        intro=intro, sections=body, email=EMAIL,
        extra=DELETE_EXTRA if name == "delete" else "", script=DELETE_JS if name == "delete" else ""), encoding="utf-8")
    print("wrote", name + ".html")
