#!/usr/bin/env python3
"""Writes web/terms.html, privacy.html, guidelines.html and delete.html from the copy below.
Same standard as Breekit: plain language, operator + UEN, DPO, PDPA baseline, version line.
Edit the copy here, bump VERSION/UPDATED, run:  python tools/make_legal.py"""
import html, pathlib
VERSION, UPDATED = "2026-11-22-v7", "22 Nov 2026"
EMAIL = "hello@iamynoui.com"
OP = "Forkade (playforkade.com) is operated by IAMYNOUI, a sole proprietorship registered in Singapore (UEN 53535234D)."
DOCS = {
 "terms": ("TERMS", "Forkade Terms of Use",
  f"These terms cover your use of Forkade, the free open-source neon arcade. {OP} By playing you agree to them.", [
  ("What Forkade is", "Forkade is a free collection of browser games. There are no accounts, no purchases and no ads. Cores, badges, ECHO skins, ranks and streaks are game rewards only: they have no money value, cannot be bought, sold or exchanged, and are stored on your own device, so clearing your browser data removes them."),
  ("Open source", "Forkade's code is released under the MIT License. When you submit a game (for example through the Playground and GitHub), you confirm you made it or have the right to share it, and you agree it is published under the MIT License. We may accept, change or decline any submission."),
  ("Rankings", "Posting to the global rankings is optional. You choose a nickname and post a score; nothing is posted automatically. Daily challenges use the same seed and layout for everyone, resetting at Singapore midnight. Daily boards expire three days after that date starts. Weekly boards reset every week and there are no cash prizes. Ranked runs require a single-use token; impossibly fast scores are rejected and scores over ten times a previous best are held for owner review. Pending scores expire after three days. Local daily cores are awarded once, with a top-10 bonus claimable after the day ends. We may remove any score or nickname that looks cheated, automated or breaks the Community rules."),
  ("Fair use", "Don't cheat or post edited scores, don't automate or flood the rankings or stats endpoints, don't try to break, overload or reverse-engineer the service in a way that harms it or other players, and don't use Forkade for anything illegal."),
  ("Availability and liability", "Forkade is provided free and as is. Games, rewards and rankings can change, reset or go offline. To the extent permitted by law, IAMYNOUI is not liable for indirect or consequential losses, or for lost game progress."),
  ("Copyright complaints", f"If you believe something on Forkade copies your work, email {EMAIL} with the work you own, a link to the game or page, your contact details, and a statement that your complaint is accurate and that you own the rights or may act for the owner. We review complaints promptly and may remove or change the content."),
  ("Changes and law", "We may update these terms; the version and date at the top show the latest. Singapore law governs these terms."),
 ]),
 "privacy": ("PRIVACY", "Forkade Privacy Policy",
  f"{OP} Contact: {EMAIL}. Short version: no accounts, no ads, no tracking cookies, and your progress stays on your device.", [
  ("Data Protection Officer", f"Younes Noui, Data Protection Officer, IAMYNOUI &mdash; {EMAIL}. We respond to requests for access, correction or deletion within 30 days."),
  ("What stays on your device", "Settings, daily rewards, high scores, cores, badges, skins, your streak, the nickname box, Playground drafts and a random player ID are saved in your browser's local storage. We can't see any of it. Clearing your browser's site data, or the button on the Delete my data page, removes it."),
  ("ECHO RUMBLE beta", "Your avatar and best score are saved only in this browser. Echo squad input replays exist only in memory during a run and are discarded when you leave the game. This beta has no replay uploads, public ghosts, rankings, purchases or free-text names."),
  ("Anonymous counts", "An anonymous A/B group letter is sent with visit/play counts to test small layout choices. The letter and first-counted date stay on your device; first-day/next-day return flags let us estimate day-one returns without sending a device ID. Rules, rewards, odds and levels are identical in both groups. Anonymous visit and play counts are on by default. You can switch them off in Settings. To see which games people enjoy, we count visits and plays per game per day. To avoid counting the same visitor twice in a day, a hash of your network address and browser type, salted with a value that changes daily, is added to an approximate counter that cannot be turned back into an address. Raw network addresses are not stored, no cookies are set, and nothing is linked to you. If your browser sends Do Not Track or Global Privacy Control, nothing is counted."),
  ("Rankings (only if you tap Post)", "When a round starts online, we store a random token with only the game and start time (no player ID, name or contact details) for at most two hours, so a posted score can be checked against the time played. Only when you tap Post do we store your nickname, the game, your best score and your random player ID. Your network address is used briefly, as a hash, to stop spam and is deleted after 60 seconds. Rankings are public, so please don't use your real full name as a nickname. If you report a nickname, your random player ID is kept with that report for up to 60 days, only so the same person can't report someone twice."),
  ("Who handles it", "Vercel hosts the site and runs the rankings and counting functions. Upstash stores the rankings and daily counts. GitHub hosts the open-source code and any game you choose to submit there. Each gets only what it needs. Data may be processed outside Singapore with contractual and technical safeguards."),
  ("Cookies and ads", "Forkade sets no cookies and shows no ads. We never sell data and never share it for advertising."),
  ("Retention", "Daily counts are kept for about 13 months. Run tokens expire in two hours and are consumed on submission. Daily boards and pending scores expire after three days. Weekly boards expire after 3 weeks. All-time scores stay until you remove them or we remove them for breaking the rules. Spam-check hashes are deleted after 60 seconds. Moderation reasons and decision sources are kept in a capped history (100 decisions, up to 90 days); the affected player can see a notice for 60 days."),
  ("Your rights", f"Singapore's PDPA is our baseline. Where EU or UK law applies you may also request access, correction, deletion, restriction, portability or object, and may complain to your local regulator. Remove your rankings data instantly with <b>Remove my scores</b> in Rankings, or email {EMAIL} with your player ID from the Delete my data page."),
  ("Children", "Forkade is made to be played by everyone. Players under 13 should ask a parent before posting a nickname to the rankings."),
  ("AI training", "We do not use anything you post or submit to train AI models, and we do not give it to anyone else to train AI models."),
 ]),
 "guidelines": ("COMMUNITY RULES", "Play fair, keep it friendly",
  "These rules keep the rankings and submitted games fun and safe for everyone, including younger players.", [
  ("Nicknames", "2&ndash;14 letters or numbers. No real full names, no rude, hateful or sexual words, no pretending to be someone else, and no ads or links."),
  ("Fair play", "Rewind is part of the game, so use it as much as you like. Don't post edited or scripted scores, don't use bots, and don't flood the rankings."),
  ("Submitted games", "Make it your own. Genres are free to use, but don't copy another game's name, characters, art, piece set or exact layout, and don't use brand names. No tracking, network calls or ads, and keep it suitable for all ages."),
  ("Reporting", "See a rude or fake nickname? Tap the flag next to it in Rankings. When three different players report the same nickname, it is hidden (shown as \"Player\") until we review it. Scores stay; only the name is hidden."),
  ("Moderation", f"We review reports from the flag button and from {EMAIL}, and may hide nicknames or remove scores and games that break these rules. Decisions consider context and evidence; a hidden nickname can be restored if it was fine."),
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
<title>{title} - FORKADE</title><meta name="theme-color" content="#0b0a10"><link rel="icon" href="icons/icon-192.png">
<style>
  body{{margin:0; font-family:"Consolas","SF Mono",ui-monospace,monospace; color:#f1f3ff; line-height:1.7;
    background:radial-gradient(1200px 600px at 50% -10%,#10303a 0%,#0b0a10 60%); min-height:100dvh;}}
  main{{max-width:760px; margin:0 auto; padding:40px 22px 60px;}}
  a{{color:#22e1ff;}} .back{{display:inline-block; margin-bottom:26px; text-decoration:none; border:1px solid #22e1ff; border-radius:10px; padding:6px 12px; font-size:13px; font-weight:700;}}
  .eyebrow{{color:#9a9fc4; letter-spacing:3px; font-size:12px; font-weight:800;}}
  h1{{margin:6px 0 8px; color:#22e1ff; font-size:clamp(24px,5vw,34px); text-shadow:0 0 14px rgba(34,225,255,.45);}}
  .meta{{color:#9a9fc4; font-size:12px;}} .draft{{color:#ffd84d; font-size:12px;}}
  .intro{{font-size:15px;}} h2{{font-size:16px; color:#22e1ff; margin:26px 0 4px;}} p{{margin:0 0 10px; font-size:14px;}}
  nav.docs{{margin-top:34px; padding-top:16px; border-top:1px solid rgba(141,146,189,.3); font-size:13px; color:#9a9fc4;}}
  .box{{margin:16px 0; padding:14px 16px; border:1px solid rgba(150,156,190,.32); border-radius:12px; background:#15131d;}}
  .box code{{color:#22e1ff; overflow-wrap:anywhere;}}
  .btn{{display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:8px 16px; border-radius:12px; font-family:inherit; font-weight:800; font-size:14px;
    cursor:pointer; background:#1d1a28; color:#f1f3ff; border:1px solid rgba(150,156,190,.32); transition:transform .16s ease, border-color .16s ease, background-color .16s ease;}}
  .btn:active:not(:disabled){{transform:translateY(1px);}} .btn:disabled{{opacity:.6; cursor:not-allowed;}}
  .btn-danger{{background:transparent; color:#ff5a6e; border-color:rgba(255,90,110,.6);}} .btn.done{{color:#4ade80; border-color:rgba(74,222,128,.5); opacity:1;}}
  nav.docs a, p a{{display:inline-block; padding:14px 2px; margin:-14px 0;}}
  a.back{{display:inline-flex; align-items:center; min-height:44px; box-sizing:border-box; padding:6px 14px; margin:0 0 22px;}}
  .cf{{position:fixed; inset:0; z-index:50; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; padding:16px;}} .cf[hidden]{{display:none;}}
  .cf .sh{{width:min(440px,100%); background:#15131d; border:1px solid rgba(150,156,190,.32); border-radius:18px; padding:22px;}}
  .cf h2{{margin:0 0 8px; color:#f1f3ff;}} .cf .row{{display:flex; gap:10px; justify-content:flex-end;}}
  @media (max-width:600px){{ .cf{{align-items:flex-end; padding:0;}} .cf .sh{{border-radius:20px 20px 0 0; padding-bottom:calc(22px + env(safe-area-inset-bottom));}} .cf .row .btn{{flex:1;}} }}
  @media (prefers-reduced-motion:reduce){{ .btn{{transition:none;}} }}
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
<nav class="docs"><a href="fair.html">Fair play</a> &middot; <a href="terms.html">Terms</a> &middot; <a href="privacy.html">Privacy</a> &middot; <a href="guidelines.html">Community rules</a> &middot; <a href="delete.html">Delete my data</a> &middot; &copy; 2026 IAMYNOUI (UEN 53535234D)</nav>
</main>{script}</body></html>
"""
DELETE_EXTRA = """<div class="box">
  <p>Your player ID on this device: <code id="pid">none yet (you haven't posted a score here)</code></p>
  <p><button class="btn btn-danger" id="wipe">Clear this device</button> <span id="wmsg"></span></p>
</div>
<div class="cf" id="cf" hidden role="dialog" aria-modal="true" aria-labelledby="cf-t"><div class="sh">
  <h2 id="cf-t">Clear this device?</h2>
  <p>This deletes your scores, cores, badges, skins, settings and Playground draft in this browser. Posted rankings stay until you remove them in Rankings. This cannot be undone.</p>
  <div class="row"><button class="btn" id="cf-no">Cancel</button><button class="btn btn-danger" id="cf-yes">Clear</button></div>
</div></div>"""
DELETE_JS = """<script>
  try { const id = JSON.parse(localStorage.getItem("forkade-pid") || "null"); if (id) document.getElementById("pid").textContent = id; } catch (_) {}
  const b = document.getElementById("wipe"), m = document.getElementById("wmsg");
  const cf = document.getElementById("cf"), close = () => { cf.hidden = true; b.focus(); };
  b.addEventListener("click", () => { cf.hidden = false; document.getElementById("cf-no").focus(); });
  document.getElementById("cf-no").onclick = close;
  cf.addEventListener("click", e => { if (e.target === cf) close(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !cf.hidden) close(); });
  document.getElementById("cf-yes").onclick = () => {
    cf.hidden = true;
    try { Object.keys(localStorage).filter(k => /^(forkade-|neon-)/.test(k)).forEach(k => localStorage.removeItem(k));
      b.classList.add("done"); b.disabled = true; b.textContent = "\u2713 Cleared"; m.textContent = "This device's Forkade progress is cleared."; }
    catch (_) { m.textContent = "Your browser blocked this. Clear this site's data in your browser settings instead."; }
  };
</script>"""
root = pathlib.Path(__file__).resolve().parent.parent / "web"
for name, (eyebrow, title, intro, secs) in DOCS.items():
    body = "\n".join(f"<h2>{html.escape(t)}</h2>\n<p>{x}</p>" for t, x in secs)
    (root / f"{name}.html").write_text(TPL.format(title=title, eyebrow=eyebrow, version=VERSION, updated=UPDATED,
        intro=intro, sections=body, email=EMAIL,
        extra=DELETE_EXTRA if name == "delete" else "", script=DELETE_JS if name == "delete" else ""), encoding="utf-8")
    print("wrote", name + ".html")
