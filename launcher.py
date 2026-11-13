"""
FORKADE  --  launcher / arcade menu

Six small neon games. One hero (ECHO). One twist: REWIND time whenever you
mess up. No sign-ups, no accounts, no internet - just run and play.

    python launcher.py

Pick a game with the arrow keys (or mouse) and press ENTER. Each game opens
in its own window; close it or press ESC to come back to this menu.
"""
import os, sys, subprocess, math, pygame

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "engine"))
import neonkit as nk

GAMES = [
    ("SKY HOP",       "game1_skyhop.py",  "Bouncy platformer climb",      "cyan"),
    ("NEON SWARM",    "game2_swarm.py",   "Top-down survival shooter",    "magenta"),
    ("SKY STRIKER",   "game3_striker.py", "Vertical airplane shmup",      "lime"),
    ("PULSE BREAKER", "game4_breaker.py", "Neon brick-breaker",           "amber"),
    ("ECHO TRAIL",    "game5_trail.py",   "Glowing neon snake",           "violet"),
    ("DRIFTSTORM",    "game6_drift.py",   "Spin-and-blast asteroids",     "red"),
]


def run_game(fname):
    path = os.path.join(HERE, "games", fname)
    subprocess.run([sys.executable, path])


def main():
    pygame.init()
    W, H = 900, 620
    screen = pygame.display.set_mode((W, H))
    pygame.display.set_caption("FORKADE - arcade")
    clock = pygame.time.Clock()
    stars = nk.Stars(W, H, 120)
    title_f = nk.get_font(60)
    sub_f = nk.get_font(20)
    name_f = nk.get_font(30)
    small_f = nk.get_font(16)
    sel = 0
    t = 0.0
    running = True

    card_h = 60
    top = 150

    while running:
        dt = clock.tick(60) / 1000.0
        t += dt
        mouse = pygame.mouse.get_pos()
        for e in pygame.event.get():
            if e.type == pygame.QUIT:
                running = False
            if e.type == pygame.KEYDOWN:
                if e.key == pygame.K_ESCAPE:
                    running = False
                elif e.key in (pygame.K_DOWN, pygame.K_s):
                    sel = (sel + 1) % len(GAMES)
                elif e.key in (pygame.K_UP, pygame.K_w):
                    sel = (sel - 1) % len(GAMES)
                elif e.key in (pygame.K_RETURN, pygame.K_SPACE):
                    pygame.display.iconify()
                    run_game(GAMES[sel][1])
                    pygame.display.set_mode((W, H))
            if e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
                for i in range(len(GAMES)):
                    y = top + i * (card_h + 10)
                    if pygame.Rect(120, y, W - 240, card_h).collidepoint(mouse):
                        run_game(GAMES[i][1])
                        pygame.display.set_mode((W, H))
            if e.type == pygame.MOUSEMOTION:
                for i in range(len(GAMES)):
                    y = top + i * (card_h + 10)
                    if pygame.Rect(120, y, W - 240, card_h).collidepoint(mouse):
                        sel = i

        nk.fill_bg(screen)
        stars.update(dt, vy=10)
        stars.draw(screen)

        # title with ECHO mascot
        nk.text(screen, title_f, "FORKADE", W // 2, 70, nk.palette["cyan"], center=True)
        nk.draw_echo(screen, W // 2 - 190, 70, 26, t=t)
        nk.draw_echo(screen, W // 2 + 190, 70, 26, face=-1, t=t + 1)
        nk.text(screen, sub_f, "6 games  -  one hero  -  rewind time when you mess up",
                W // 2, 115, nk.palette["dim"], center=True)

        for i, (nm, fn, desc, col) in enumerate(GAMES):
            y = top + i * (card_h + 10)
            rect = pygame.Rect(120, y, W - 240, card_h)
            c = nk.palette[col]
            if i == sel:
                nk.glow_rect(screen, c, rect, radius=10, width=3)
                pulse = 0.5 + 0.5 * math.sin(t * 5)
                nk.draw_echo(screen, rect.left + 32, rect.centery, 16, t=t)
                nk.text(screen, name_f, nm, rect.left + 70, rect.centery - 16, c)
                nk.text(screen, small_f, desc, rect.left + 70, rect.centery + 10,
                        nk.palette["ink"])
                nk.text(screen, small_f, "ENTER >", rect.right - 80, rect.centery - 8,
                        nk.palette["white"])
            else:
                pygame.draw.rect(screen, nk.palette["bg2"], rect, border_radius=10)
                pygame.draw.rect(screen, nk.palette["dim"], rect, 1, border_radius=10)
                nk.text(screen, name_f, nm, rect.left + 30, rect.centery - 16,
                        nk.palette["dim"], glow=False)
                nk.text(screen, small_f, desc, rect.right - 220, rect.centery + 10,
                        nk.palette["dim"], glow=False)

        nk.text(screen, small_f,
                "UP/DOWN choose   ENTER play   ESC quit   -   in game: R or SHIFT rewinds time",
                W // 2, H - 24, nk.palette["dim"], center=True)
        pygame.display.flip()

    pygame.quit()


if __name__ == "__main__":
    main()
