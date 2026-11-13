"""
neonkit  --  the shared toolkit behind all six FORKADE games.

One small engine, one hero (ECHO), one neon look, one twist (REWIND).
Everything the games share lives here so the games stay tiny and so
anyone can extend them by reusing these pieces.

Public pieces:
    palette          - the shared neon colour set
    glow_rect / glow_circle / glow_line  - neon drawing with a soft halo
    draw_echo        - draws the ECHO hero anywhere, any size
    Particles        - a lightweight particle system (sparks, dust, trails)
    Shake            - screen-shake you add to and read an offset from
    Rewind           - THE twist: records snapshots, hands them back on rewind
    Stars            - a cheap procedural scrolling neon starfield background
    HUD helpers      - text, bar, banner
    GameBase         - optional base class that wires the common loop together
"""

import math
import random
import pygame

# ---------------------------------------------------------------- palette ---
# One shared palette keeps all six games looking like one collection.
palette = {
    "bg":      (8, 10, 20),
    "bg2":     (14, 16, 34),
    "ink":     (224, 232, 255),
    "dim":     (120, 130, 170),
    "cyan":    (64, 240, 255),
    "magenta": (255, 70, 200),
    "lime":    (140, 255, 90),
    "amber":   (255, 190, 60),
    "red":     (255, 80, 90),
    "violet":  (170, 120, 255),
    "white":   (255, 255, 255),
}

# ECHO (the hero) always wears cyan so players recognise themselves instantly.
ECHO_COLOR = palette["cyan"]


# --------------------------------------------------------------- drawing ---
def _halo(surface, color, draw_fn, passes=3, base_alpha=70):
    """Generic soft-glow: draw the shape a few times, fatter and fainter."""
    for i in range(passes, 0, -1):
        layer = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        a = int(base_alpha * (i / passes) * 0.6)
        draw_fn(layer, (*color, a), grow=i * 3)
        surface.blit(layer, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)


def glow_rect(surface, color, rect, radius=6, width=0):
    rect = pygame.Rect(rect)

    def draw(layer, col, grow=0):
        r = rect.inflate(grow, grow)
        pygame.draw.rect(layer, col, r, width, border_radius=radius + grow // 2)

    _halo(surface, color, draw)
    pygame.draw.rect(surface, color, rect, width, border_radius=radius)


def glow_circle(surface, color, center, r, width=0):
    def draw(layer, col, grow=0):
        pygame.draw.circle(layer, col, center, r + grow, width)

    _halo(surface, color, draw)
    pygame.draw.circle(surface, color, center, r, width)


def glow_line(surface, color, a, b, w=2):
    def draw(layer, col, grow=0):
        pygame.draw.line(layer, col, a, b, w + grow)

    _halo(surface, color, draw, passes=2, base_alpha=60)
    pygame.draw.line(surface, color, a, b, w)


def draw_echo(surface, cx, cy, size=18, color=ECHO_COLOR, face=1, t=0.0):
    """
    Draw ECHO, the shared hero: a friendly floating neon droid.
    `face` = 1 faces right, -1 faces left. `t` animates the bob/eye.
    Used by every game so the collection stars one character.
    """
    bob = math.sin(t * 4) * size * 0.08
    cy = cy + bob
    body = pygame.Rect(0, 0, size * 1.4, size * 1.4)
    body.center = (cx, cy)
    glow_rect(surface, color, body, radius=int(size * 0.5))
    # visor
    visor = pygame.Rect(0, 0, size * 0.9, size * 0.5)
    visor.center = (cx + face * size * 0.15, cy - size * 0.1)
    pygame.draw.rect(surface, palette["bg"], visor, border_radius=int(size * 0.25))
    # eye
    eye_x = cx + face * size * 0.3
    pygame.draw.circle(surface, palette["white"], (int(eye_x), int(cy - size * 0.1)),
                       max(2, int(size * 0.14)))
    # antenna
    glow_line(surface, color, (cx, cy - size * 0.7), (cx, cy - size * 1.05), 2)
    glow_circle(surface, palette["magenta"], (int(cx), int(cy - size * 1.1)),
                max(2, int(size * 0.12)))


# ------------------------------------------------------------- particles ---
class Particles:
    """Sparks, dust and trails. Call emit() then update() then draw()."""

    def __init__(self):
        self.p = []

    def emit(self, x, y, color, n=10, speed=3.0, life=0.6, size=3, spread=math.tau,
             angle=None, gravity=0.0):
        for _ in range(n):
            a = random.uniform(0, math.tau) if angle is None else \
                angle + random.uniform(-spread / 2, spread / 2)
            s = speed * random.uniform(0.3, 1.0)
            self.p.append([x, y, math.cos(a) * s, math.sin(a) * s,
                           life * random.uniform(0.6, 1.0), life, color, size, gravity])

    def update(self, dt):
        for q in self.p:
            q[0] += q[2]
            q[1] += q[3]
            q[3] += q[8]
            q[4] -= dt
        self.p = [q for q in self.p if q[4] > 0]

    def draw(self, surface):
        for x, y, _, _, life, maxlife, color, size, _ in self.p:
            k = max(0.0, life / maxlife)
            r = max(1, int(size * k))
            glow_circle(surface, color, (int(x), int(y)), r)


# ----------------------------------------------------------------- shake ---
class Shake:
    def __init__(self):
        self.amount = 0.0

    def add(self, amount):
        self.amount = min(24, self.amount + amount)

    def offset(self, dt):
        self.amount = max(0.0, self.amount - dt * 40)
        if self.amount <= 0:
            return (0, 0)
        return (random.uniform(-self.amount, self.amount),
                random.uniform(-self.amount, self.amount))


# ---------------------------------------------------------------- rewind ---
class Rewind:
    """
    THE shared twist. Each game records a snapshot of its state every frame
    (whatever dict you give it). Hold REWIND and it feeds snapshots back in
    reverse, letting the player undo a death, a bad jump, a swarm, anything.

    Games stay in control of *what* a snapshot is - Rewind just stores and
    replays them, and draws the signature rewind screen tint + meter.
    """

    def __init__(self, seconds=3.0, fps=60):
        self.max_frames = int(seconds * fps)
        self.frames = []
        self.energy = 1.0          # 0..1, drains while rewinding, refills slowly
        self.active = False

    def record(self, snapshot):
        if self.active:
            return
        self.frames.append(snapshot)
        if len(self.frames) > self.max_frames:
            self.frames.pop(0)

    def step(self, want_rewind, dt):
        """Returns a snapshot to restore, or None. Handles energy."""
        if want_rewind and self.energy > 0 and len(self.frames) > 1:
            self.active = True
            self.energy = max(0.0, self.energy - dt / 2.5)
            return self.frames.pop()
        self.active = False
        self.energy = min(1.0, self.energy + dt / 6.0)
        return None

    def draw_overlay(self, surface, font):
        w, h = surface.get_size()
        # energy meter bottom-left
        bar(surface, 16, h - 26, 150, 12, self.energy, palette["violet"], label="REWIND")
        if self.active:
            tint = pygame.Surface((w, h), pygame.SRCALPHA)
            tint.fill((170, 120, 255, 40))
            surface.blit(tint, (0, 0))
            for _ in range(6):   # scanlines streaking
                y = random.randint(0, h)
                pygame.draw.line(tint, (255, 255, 255, 30), (0, y), (w, y))
            surface.blit(tint, (0, 0))
            text(surface, font, "- REWINDING -", w // 2, 40, palette["violet"],
                 center=True)


# -------------------------------------------------------------- starfield ---
class Stars:
    """Procedural scrolling neon starfield - the shared background."""

    def __init__(self, w, h, n=90):
        self.w, self.h = w, h
        self.s = [[random.uniform(0, w), random.uniform(0, h),
                   random.uniform(0.3, 2.2),
                   random.choice([palette["cyan"], palette["magenta"],
                                  palette["violet"], palette["dim"]])]
                  for _ in range(n)]

    def update(self, dt, vx=0, vy=20):
        for st in self.s:
            st[0] -= vx * st[2] * dt
            st[1] += vy * st[2] * dt * 0.15
            if st[1] > self.h:
                st[1] = 0; st[0] = random.uniform(0, self.w)
            if st[0] < 0:
                st[0] = self.w
            if st[0] > self.w:
                st[0] = 0

    def draw(self, surface):
        for x, y, z, c in self.s:
            r = int(z)
            surface.fill(c, (int(x), int(y), r, r))


def fill_bg(surface):
    """Shared vertical gradient background."""
    w, h = surface.get_size()
    top, bot = palette["bg2"], palette["bg"]
    for y in range(0, h, 4):
        k = y / h
        c = [int(top[i] + (bot[i] - top[i]) * k) for i in range(3)]
        surface.fill(c, (0, y, w, 4))


# ---------------------------------------------------------------- hud -----
_FONTS = {}


def get_font(size=22, bold=True):
    key = (size, bold)
    if key not in _FONTS:
        _FONTS[key] = pygame.font.SysFont("consolas,menlo,monospace", size, bold=bold)
    return _FONTS[key]


def text(surface, font, s, x, y, color=palette["ink"], center=False, glow=True):
    img = font.render(s, True, color)
    rect = img.get_rect()
    if center:
        rect.center = (x, y)
    else:
        rect.topleft = (x, y)
    if glow:
        halo = font.render(s, True, color)
        halo.set_alpha(60)
        for dx, dy in ((-2, 0), (2, 0), (0, -2), (0, 2)):
            surface.blit(halo, (rect.x + dx, rect.y + dy),
                         special_flags=pygame.BLEND_RGBA_ADD)
    surface.blit(img, rect)
    return rect


def bar(surface, x, y, w, h, frac, color, label=None):
    frac = max(0.0, min(1.0, frac))
    pygame.draw.rect(surface, palette["bg2"], (x, y, w, h), border_radius=4)
    if frac > 0:
        glow_rect(surface, color, (x, y, int(w * frac), h), radius=4)
    pygame.draw.rect(surface, palette["dim"], (x, y, w, h), 1, border_radius=4)
    if label:
        text(surface, get_font(14), label, x, y - 16, palette["dim"])


def banner(surface, font, title, subtitle=None):
    w, h = surface.get_size()
    veil = pygame.Surface((w, h), pygame.SRCALPHA)
    veil.fill((4, 6, 14, 180))
    surface.blit(veil, (0, 0))
    text(surface, font, title, w // 2, h // 2 - 20, palette["cyan"], center=True)
    if subtitle:
        text(surface, get_font(18), subtitle, w // 2, h // 2 + 24,
             palette["ink"], center=True)


# ------------------------------------------------------------- game base ---
class GameBase:
    """
    Optional helper: wires the shared loop so each game only writes its own
    update() and draw(). Handles window, clock, fill, stars, shake, rewind
    overlay, pause, and the quit/back keys. Subclass and override step()/render().
    """
    title = "FORKADE"
    rewind_seconds = 3.0

    def __init__(self, w=900, h=560):
        pygame.init()
        self.W, self.H = w, h
        self.screen = pygame.display.set_mode((w, h))
        pygame.display.set_caption("FORKADE - " + self.title)
        self.clock = pygame.time.Clock()
        self.font = get_font(40)
        self.big = get_font(56)
        self.small = get_font(18)
        self.stars = Stars(w, h)
        self.particles = Particles()
        self.shake = Shake()
        self.rewind = Rewind(self.rewind_seconds)
        self.t = 0.0
        self.running = True
        self.exit_code = "menu"     # what the launcher should do next
        self.state = "play"         # play | over | win | pause

    # --- override these ---
    def step(self, dt, keys, events):
        ...

    def render(self, surf):
        ...

    def snapshot(self):
        return None

    def restore(self, snap):
        ...

    # --- shared loop ---
    def run(self):
        while self.running:
            dt = min(0.05, self.clock.tick(60) / 1000.0)
            self.t += dt
            events = pygame.event.get()
            keys = pygame.key.get_pressed()
            for e in events:
                if e.type == pygame.QUIT:
                    self.running = False; self.exit_code = "quit"
                if e.type == pygame.KEYDOWN:
                    if e.key == pygame.K_ESCAPE:
                        self.running = False
                    if e.key == pygame.K_p and self.state in ("play", "pause"):
                        self.state = "pause" if self.state == "play" else "play"

            want_rewind = keys[pygame.K_r] or keys[pygame.K_LSHIFT]
            if self.state == "play":
                snap = self.rewind.step(want_rewind, dt)
                if snap is not None:
                    self.restore(snap)
                else:
                    self.step(dt, keys, events)
                    s = self.snapshot()
                    if s is not None:
                        self.rewind.record(s)
                self.particles.update(dt)

            # draw
            fill_bg(self.screen)
            self.stars.update(dt)
            self.stars.draw(self.screen)
            ox, oy = self.shake.offset(dt)
            layer = self.screen.copy()
            self.render(layer)
            self.particles.draw(layer)
            self.screen.blit(layer, (ox, oy))
            self.rewind.draw_overlay(self.screen, self.small)
            if self.state == "pause":
                banner(self.screen, self.big, "PAUSED", "P resume   ESC menu")
            pygame.display.flip()
        return self.exit_code
