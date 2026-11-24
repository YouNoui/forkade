#!/usr/bin/env python3
"""Writes web/terms.html, privacy.html, guidelines.html and delete.html from the copy below.
Same standard as Breekit: plain language, operator + UEN, DPO, PDPA baseline, version line.
Edit the copy here, bump VERSION/UPDATED, run:  python tools/make_legal.py"""
import html, pathlib
VERSION, UPDATED = "2026-11-24-v13", "24 Nov 2026"
EMAIL = "hello@iamynoui.com"
OP = "Forkade (playforkade.com) is operated by IAMYNOUI, a sole proprietorship registered in Singapore (UEN 53535234D)."
DOCS = {
 "terms": ("Terms", "Forkade Terms of Use",
  f"These terms cover your use of Forkade, the free open-source neon arcade. {OP} By playing you agree to them.", [
  ("What Forkade is", "Forkade is a free collection of browser games. There are no accounts, no purchases and no ads. Cores, badges, Echo skins, ranks and streaks are game rewards only: they have no money value, cannot be bought, sold or exchanged, and are stored on your own device, so clearing your browser data removes them."),
  ("Open source", "Forkade's code is released under the MIT License. When you submit a game (for example through the Playground and GitHub), you confirm you made it or have the right to share it, and you agree it is published under the MIT License. We may accept, change or decline any submission."),
  ("Rankings", "Posting to the global rankings is optional. You choose a nickname and post a score; nothing is posted automatically. Daily challenges use the same seed and layout for everyone, resetting at Singapore midnight. Daily boards expire three days after that date starts. Weekly boards reset every week and there are no cash prizes. Ranked runs require a single-use token bound to a server-issued seed; impossibly fast scores are rejected and scores over ten times a previous best are held for owner review. Pending scores expire after three days. Local daily cores are awarded once, with a top-10 bonus claimable after the day ends. We may remove any score or nickname that looks cheated, automated or breaks the Community rules."),
  ("Rumble and Forge", "Rumble daily runs use the Singapore date and can be posted with a preset nickname. Sharing a replay is optional. Forge runs use custom presets and do not award ranked scores, badges or cores. You can publish five Forge configurations a day; published codes expire after 90 days and can be hidden after reports. All 48 original Rumble avatar choices remain free. Echo Road XP, hero mastery, difficulty unlocks and earned cosmetics stay on your device. The fixed unlock requirements are listed on Fair play. Normal Assist is unranked; Hard and Insane have separate boards. Weekly Nightmare uses the same Singapore-week seed for everyone. No purchases."),
  ("Fair use", "Don't cheat or post edited scores, don't automate or flood the rankings or stats endpoints, don't try to break, overload or reverse-engineer the service in a way that harms it or other players, and don't use Forkade for anything illegal."),
  ("Availability and liability", "Forkade is provided free and as is. Games, rewards and rankings can change, reset or go offline. To the extent permitted by law, IAMYNOUI is not liable for indirect or consequential losses, or for lost game progress."),
  ("Copyright complaints", f"If you believe something on Forkade copies your work, email {EMAIL} with the work you own, a link to the game or page, your contact details, and a statement that your complaint is accurate and that you own the rights or may act for the owner. We review complaints promptly and may remove or change the content."),
  ("Changes and law", "We may update these terms; the version and date at the top show the latest. Singapore law governs these terms."),
 ]),
 "privacy": ("Privacy", "Forkade Privacy Policy",
  f"{OP} Contact: {EMAIL}. Short version: no accounts, no ads, no tracking cookies, and your progress stays on your device.", [
  ("Data Protection Officer", f"Younes Noui, Data Protection Officer, IAMYNOUI &mdash; {EMAIL}. We respond to requests for access, correction or deletion within 30 days."),
  ("What stays on your device", "Settings, daily rewards, high scores, cores, badges, skins, your streak, the nickname box, Playground drafts and a random player ID are saved in your browser's local storage. We can't see any of it. Clearing your browser's site data, or the button on the Delete my data page, removes it."),
  ("Echo Rumble beta", "Your avatar and best score are saved only in this browser. Echo squad input replays exist only in memory during a run and are discarded when you leave the game. Only explicit Post shares a validated input replay, preset nickname and avatar look for three days. Forge sharing uses closed presets. No purchases or free-text names."),
  ("Anonymous counts", "An anonymous A/B group letter is sent with visit/play counts to test small layout choices. The letter and first-counted date stay on your device; first-day/next-day return flags let us estimate day-one returns without sending a device ID. Rules, rewards, odds and levels are identical in both groups. Anonymous visit and play counts are on by default. You can switch them off in Settings. To see which games people enjoy, we count visits and plays per game per day. To avoid counting the same visitor twice in a day, a hash of your network address and browser type, salted with a value that changes daily, is added to an approximate counter that cannot be turned back into an address. Raw network addresses are not stored, no cookies are set, and nothing is linked to you. If your browser sends Do Not Track or Global Privacy Control, nothing is counted."),
  ("Rankings (only if you tap Post)", "When a round starts online, we store a random token with only the game and start time (no player ID, name or contact details) for at most two hours, so a posted score can be checked against the time played. Only when you tap Post do we store your nickname, the game, your best score and your random player ID. Your network address is used briefly, as a hash, to stop spam and is deleted after 60 seconds. Rankings are public, so please don't use your real full name as a nickname. If you report a nickname, your random player ID is kept with that report for up to 60 days, only so the same person can't report someone twice."),
  ("Rumble replays and Forge", "Only if you tap Post, Rumble stores your anonymous input replay, preset nickname and avatar look with your score for up to three days; other players can race that posted ghost. Rumble 2 additionally stores the selected hero, difficulty, abilities and upgrade choices needed to validate the replay. Before Post, its anonymous two-hour run token binds the selected hero, difficulty, weekly mode and equipped gadget; it contains no player ID. All ranked games bind a server-issued seed to their single-use run token. Local XP, mastery and the cosmetics collection are not sent. Friend links expose only the same explicitly posted ghost and expire with it after three days. Live co-op is optional: Play with a friend or Join friend sends your game controls and fixed emote IDs to our Cloudflare room service. It assigns a preset nickname and a six-character room code; friends see the shared game state and preset names, never your device player ID. No voice, typed chat, contacts or device details are sent. Share room links only with friends; anyone with a link can join until four places are filled. Rooms and their temporary state are deleted after 30 minutes without valid input. Salted network hashes limit joins for one minute and are removed after their window. Aggregate daily room/message budget counters contain no player records. Co-op has no ranked scores, Road XP or core rewards; solo works without it. We replay the inputs to check the score, but cannot guarantee every player is honest. Only Publish shares a Forge preset configuration, a preset name and your random device key for up to 90 days. No typed names, contacts or executable game code are accepted. Weekly Forge play counts increase after a run has started for at least ten seconds, when anonymous counting is enabled; they are play counts, not unique people, and expire after two weeks. Reports retain a random reporter device key for up to 60 days to prevent duplicate reports."),
  ("Promo codes (only if you redeem)", "A redemption stores the code and a salted hash of your random device ID, to prevent repeat use, until the owner deletes that code. It stores no name or raw IP address. A separately salted network-address hash limits attempts to 10 per minute and expires after 60 seconds. A separate per-code, per-day network hash limits successful claims to five and expires within 24 hours. Clearing storage does not reset this network limit. Cores and cosmetic rewards stay on your device; they never change scores, rankings or badges. Clearing local storage removes your rewards and device key."),
  ("Who handles it", "Vercel hosts the site and runs the rankings and counting functions. Upstash stores the rankings and daily counts. GitHub hosts the open-source code and any game you choose to submit there. Each gets only what it needs. Data may be processed outside Singapore with contractual and technical safeguards."),
  ("Cookies and ads", "Forkade sets no cookies and shows no ads. We never sell data and never share it for advertising."),
  ("Retention", "Daily counts are kept for about 13 months. Run tokens expire in two hours and are consumed on submission. Daily boards and pending scores expire after three days. Weekly boards expire after 3 weeks. All-time scores stay until you remove them or we remove them for breaking the rules. Most spam-check hashes expire after 60 seconds. Wrong owner-key attempts use a salted network hash for ten minutes; after five failures, further wrong attempts are blocked until that window ends. Promo daily network limits expire within 24 hours. Moderation reasons and decision sources are kept in a capped history (100 decisions, up to 90 days); the affected player can see a notice for 60 days."),
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
  body{{margin:0; font-family:"Consolas","SF Mono",ui-monospace,monospace; color:var(--text); line-height:1.45;
    background:radial-gradient(1200px 600px at 50% -10%,#10303a 0%,#0b0a10 60%); min-height:100dvh;}}
  main{{max-width:760px; margin:0 auto; padding:var(--s6) var(--s5) calc(var(--s1) * 15);}}
  a{{color:#22e1ff;}} .back{{display:inline-block; margin-bottom:var(--s5); text-decoration:none; border:1px solid #22e1ff; border-radius:var(--r-sm); padding:var(--s1) var(--s3); font-size:var(--t-xs); font-weight:700;}}
  .eyebrow{{color:#9a9fc4; letter-spacing:3px; font-size:var(--t-xs); font-weight:900;}}
  h1{{margin:var(--s1) 0 var(--s2); color:#22e1ff; font-size:var(--t-xl); text-shadow:0 0 14px rgba(34,225,255,.45);}}
  .meta{{color:#9a9fc4; font-size:var(--t-xs);}} .draft{{color:#ffd84d; font-size:var(--t-xs);}}
  .intro{{font-size:var(--t-sm);}} h2{{font-size:var(--t-md); color:#22e1ff; margin:var(--s5) 0 var(--s1);}} p{{margin:0 0 var(--s2); font-size:var(--t-sm);}}
  nav.docs{{margin-top:var(--s6); padding-top:var(--s4); border-top:1px solid rgba(141,146,189,.3); font-size:var(--t-xs); color:#9a9fc4;}}
  .box{{margin:var(--s4) 0; padding:var(--s3) var(--s4); border:1px solid rgba(150,156,190,.32); border-radius:var(--r-md); background:#15131d;}}
  .box code{{color:#22e1ff; overflow-wrap:anywhere;}}
  .btn{{display:inline-flex; align-items:center; justify-content:center; gap:var(--s2); min-height:44px; padding:var(--s2) var(--s4); border-radius:var(--r-md); font-family:inherit; font-weight:900; font-size:var(--t-sm);
    cursor:pointer; background:#1d1a28; color:var(--text); border:1px solid rgba(150,156,190,.32); transition:transform .16s ease, border-color .16s ease, background-color .16s ease;}}
  .btn:active:not(:disabled){{transform:translateY(1px);}} .btn:disabled{{opacity:.6; cursor:not-allowed;}}
  .btn-danger{{background:transparent; color:#ff5a6e; border-color:rgba(255,90,110,.6);}} .btn.done{{color:#4ade80; border-color:rgba(74,222,128,.5); opacity:1;}}
  nav.docs a, p a{{display:inline-block; padding:var(--s3) var(--s1); margin:calc(var(--s3) * -1) 0;}}
  a.back{{display:inline-flex; align-items:center; min-height:44px; box-sizing:border-box; padding:var(--s1) var(--s3); margin:0 0 var(--s5);}}
  .cf{{position:fixed; inset:0; z-index:50; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; padding:var(--s4);}} .cf[hidden]{{display:none;}}
  .cf .sh{{width:min(440px,100%); background:#15131d; border:1px solid rgba(150,156,190,.32); border-radius:var(--r-lg); padding:var(--s5);}}
  .cf h2{{margin:0 0 var(--s2); color:var(--text);}} .cf .row{{display:flex; gap:var(--s2); justify-content:flex-end;}}
  @media (max-width:600px){{ .cf{{align-items:flex-end; padding:0;}} .cf .sh{{border-radius:var(--r-lg) var(--r-lg) 0 0; padding-bottom:calc(var(--s5) + env(safe-area-inset-bottom));}} .cf .row .btn{{flex:1;}} }}
  @media (prefers-reduced-motion:reduce){{ .btn{{transition:none;}} }}
</style><link rel="stylesheet" href="/ui.css">
</head><body><main>
<a class="back" href="index.html">&larr; Back to the arcade</a>
<div class="eyebrow">{eyebrow}</div>
<h1>{title}</h1>
<div class="meta">Version {version} &middot; Last updated {updated} &middot; English is the official version.</div>
<div class="draft">Plain-language product draft. It has not been reviewed by a lawyer.</div>
<p class="intro">{intro}</p>
{sections}
{extra}
<p style="margin-top:var(--s5)">Questions? <a href="mailto:{email}">{email}</a></p>
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
