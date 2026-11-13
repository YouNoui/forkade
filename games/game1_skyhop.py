"""
GAME 1 - SKY HOP   (a bouncy platformer, in the spirit of Roblox obbies)

Guide ECHO up an endless tower of neon platforms. Collect orbs, don't fall.
Miss a jump? Hold R (or Shift) to REWIND time and try the leap again.

Controls:  A/D or Left/Right move   SPACE jump   R/Shift rewind   P pause   ESC menu
"""
import os, sys, math, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk


class SkyHop(nk.GameBase):
    title = "SKY HOP"

    def __init__(self):
        super().__init__()
        self.reset()

    def reset(self):
        self.px, self.py = self.W / 2, self.H - 80
        self.vx = self.vy = 0.0
        self.on_ground = False
        self.cam = 0.0            # how far we've climbed
        self.best = 0.0
        self.score = 0
        self.plats = []
        self.orbs = []
        self.state = "play"
        # starting floor + a ladder of platforms going up
        self.plats.append(pygame.Rect(0, self.H - 40, self.W, 40))
        y = self.H - 140
        for _ in range(40):
            self._add_platform(y)
            y -= random.randint(80, 120)

    def _add_platform(self, y):
        w = random.randint(90, 160)
        x = random.randint(20, self.W - w - 20)
        self.plats.append(pygame.Rect(x, y, w, 18))
        if random.random() < 0.5:
            self.orbs.append([x + w / 2, y - 26, True])

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return

        ax = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - \
             (keys[pygame.K_a] or keys[pygame.K_LEFT])
        self.vx = ax * 320
        for e in events:
            if e.type == pygame.KEYDOWN and e.key in (pygame.K_SPACE, pygame.K_UP, pygame.K_w):
                if self.on_ground:
                    self.vy = -560
                    self.on_ground = False
                    self.particles.emit(self.px, self.py + 16, nk.palette["cyan"],
                                        n=10, angle=math.pi / 2, spread=1.2, speed=3)

        self.vy += 1500 * dt
        self.px += self.vx * dt
        self.px = max(16, min(self.W - 16, self.px))
        self.py += self.vy * dt

        # platform collision (only when falling)
        self.on_ground = False
        feet = pygame.Rect(self.px - 12, self.py + 10, 24, 10)
        if self.vy >= 0:
            for p in self.plats:
                sp = p.move(0, self.cam)
                if feet.colliderect(sp) and feet.bottom - self.vy * dt <= sp.top + 12:
                    self.py = sp.top - 16 - self.cam
                    self.vy = 0
                    self.on_ground = True

        # scroll camera up as ECHO climbs past the middle
        screen_y = self.py + self.cam
        if screen_y < self.H * 0.42:
            d = self.H * 0.42 - screen_y
            self.cam += d
            self.best += d
            self.score = int(self.best / 10)

        # recycle platforms that fell below, spawn new above
        top = min(p.y for p in self.plats)
        if top + self.cam > -40:
            self._add_platform(top - random.randint(80, 120))
        self.plats = [p for p in self.plats if p.y + self.cam < self.H + 60]

        # orbs
        for o in self.orbs:
            if o[2] and abs(o[0] - self.px) < 22 and abs((o[1] + self.cam) - self.py) < 22:
                o[2] = False
                self.score += 25
                self.shake.add(3)
                self.particles.emit(o[0], o[1] + self.cam, nk.palette["amber"],
                                    n=16, speed=4)
        self.orbs = [o for o in self.orbs if o[1] + self.cam < self.H + 40]

        # fell off bottom -> game over (but rewind can save you!)
        if self.py > self.H + 40:
            self.state = "over"
            self.shake.add(16)

    def snapshot(self):
        if self.state != "play":
            return None
        return (self.px, self.py, self.vx, self.vy, self.cam, self.best,
                self.score, self.on_ground)

    def restore(self, s):
        (self.px, self.py, self.vx, self.vy, self.cam, self.best,
         self.score, self.on_ground) = s

    def render(self, surf):
        for p in self.plats:
            sp = p.move(0, self.cam)
            if -30 < sp.y < self.H + 30:
                col = nk.palette["magenta"] if p.height > 30 else nk.palette["cyan"]
                nk.glow_rect(surf, col, sp, radius=6)
        for o in self.orbs:
            if o[2] and -20 < o[1] + self.cam < self.H + 20:
                r = 7 + math.sin(self.t * 6 + o[0]) * 2
                nk.glow_circle(surf, nk.palette["amber"], (int(o[0]), int(o[1] + self.cam)), int(r))
        face = 1 if self.vx >= 0 else -1
        nk.draw_echo(surf, self.px, self.py, 16, face=face, t=self.t)
        nk.text(surf, self.font, f"{self.score}", 20, 16, nk.palette["ink"])
        nk.text(surf, self.small, "HEIGHT", 20, 60, nk.palette["dim"])
        if self.state == "over":
            nk.banner(surf, self.big, "YOU FELL",
                      f"score {self.score}   -   ENTER retry   ESC menu")


if __name__ == "__main__":
    SkyHop().run()
    pygame.quit()
