"""
GAME 6 - DRIFTSTORM   (neon asteroids)

ECHO drifts through a storm of neon rocks, spinning and blasting them to dust.
Clipped a rock? Hold R/Shift to REWIND the drift and thread the gap instead.

Controls:  A/D or Left/Right turn   W/Up thrust   SPACE shoot   R/Shift rewind   P pause   ESC menu
"""
import os, sys, math, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk


class Drift(nk.GameBase):
    title = "DRIFTSTORM"

    def __init__(self):
        super().__init__()
        self.reset()

    def reset(self):
        self.px, self.py = self.W / 2, self.H / 2
        self.vx = self.vy = 0.0
        self.ang = -math.pi / 2
        self.hp = 3
        self.score = 0
        self.bullets = []
        self.rocks = []
        self.cool = 0.0
        self.inv = 0.0
        self.state = "play"
        for _ in range(5):
            self._spawn_rock()

    def _spawn_rock(self, x=None, y=None, size=3):
        if x is None:
            edge = random.random()
            x = random.choice([0, self.W]) if edge < 0.5 else random.uniform(0, self.W)
            y = random.uniform(0, self.H) if edge < 0.5 else random.choice([0, self.H])
        a = random.uniform(0, math.tau)
        sp = random.uniform(30, 80) / size
        self.rocks.append([x, y, math.cos(a) * sp, math.sin(a) * sp, size,
                           random.uniform(0, math.tau)])

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return

        turn = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - (keys[pygame.K_a] or keys[pygame.K_LEFT])
        self.ang += turn * 3.4 * dt
        if keys[pygame.K_w] or keys[pygame.K_UP]:
            self.vx += math.cos(self.ang) * 260 * dt
            self.vy += math.sin(self.ang) * 260 * dt
            self.particles.emit(self.px - math.cos(self.ang) * 14,
                                self.py - math.sin(self.ang) * 14,
                                nk.palette["amber"], n=2, angle=self.ang + math.pi,
                                spread=0.4, speed=2, life=0.3)
        self.vx *= 0.99; self.vy *= 0.99
        self.px = (self.px + self.vx * dt) % self.W
        self.py = (self.py + self.vy * dt) % self.H

        self.cool -= dt
        self.inv = max(0, self.inv - dt)
        if keys[pygame.K_SPACE] and self.cool <= 0:
            self.cool = 0.22
            self.bullets.append([self.px, self.py,
                                 math.cos(self.ang) * 520 + self.vx,
                                 math.sin(self.ang) * 520 + self.vy, 1.2])
            self.shake.add(1.5)

        for b in self.bullets:
            b[0] = (b[0] + b[2] * dt) % self.W
            b[1] = (b[1] + b[3] * dt) % self.H
            b[4] -= dt
        self.bullets = [b for b in self.bullets if b[4] > 0]

        for r in self.rocks:
            r[0] = (r[0] + r[2] * dt) % self.W
            r[1] = (r[1] + r[3] * dt) % self.H
            r[5] += dt

        # bullet vs rock
        new = []
        for r in self.rocks:
            rad = r[4] * 12
            hit = False
            for b in self.bullets:
                if (b[0] - r[0]) ** 2 + (b[1] - r[1]) ** 2 < rad * rad:
                    hit = True; b[4] = 0; break
            if hit:
                self.score += 15
                self.particles.emit(r[0], r[1], nk.palette["cyan"], n=12, speed=4)
                self.shake.add(3)
                if r[4] > 1:
                    for _ in range(2):
                        self._spawn_rock(r[0], r[1], r[4] - 1)
            else:
                new.append(r)
        self.rocks = new

        # ship vs rock
        if self.inv <= 0:
            for r in self.rocks:
                rad = r[4] * 12 + 10
                if (self.px - r[0]) ** 2 + (self.py - r[1]) ** 2 < rad * rad:
                    self.hp -= 1
                    self.inv = 1.5
                    self.shake.add(12)
                    self.particles.emit(self.px, self.py, nk.palette["red"], n=20, speed=5)
                    if self.hp <= 0:
                        self.state = "over"
                    break

        if not self.rocks:
            for _ in range(5):
                self._spawn_rock()
            self.score += 50

    def snapshot(self):
        if self.state != "play":
            return None
        return (self.px, self.py, self.vx, self.vy, self.ang, self.hp, self.score,
                self.inv, [b[:] for b in self.bullets], [r[:] for r in self.rocks])

    def restore(self, s):
        (self.px, self.py, self.vx, self.vy, self.ang, self.hp, self.score,
         self.inv, b, r) = s
        self.bullets = [x[:] for x in b]
        self.rocks = [x[:] for x in r]

    def render(self, surf):
        for r in self.rocks:
            rad = r[4] * 12
            pts = []
            for k in range(8):
                aa = r[5] + k / 8 * math.tau
                rr = rad * (0.75 + 0.25 * math.sin(k * 2 + r[5]))
                pts.append((r[0] + math.cos(aa) * rr, r[1] + math.sin(aa) * rr))
            for i in range(len(pts)):
                nk.glow_line(surf, nk.palette["violet"], pts[i], pts[(i + 1) % len(pts)], 2)
        for b in self.bullets:
            nk.glow_circle(surf, nk.palette["cyan"], (int(b[0]), int(b[1])), 3)
        # ship
        if self.inv <= 0 or int(self.t * 20) % 2 == 0:
            nose = (self.px + math.cos(self.ang) * 18, self.py + math.sin(self.ang) * 18)
            l = (self.px + math.cos(self.ang + 2.5) * 14, self.py + math.sin(self.ang + 2.5) * 14)
            rr = (self.px + math.cos(self.ang - 2.5) * 14, self.py + math.sin(self.ang - 2.5) * 14)
            nk.glow_line(surf, nk.palette["cyan"], nose, l, 3)
            nk.glow_line(surf, nk.palette["cyan"], nose, rr, 3)
            nk.glow_line(surf, nk.palette["cyan"], l, rr, 3)
            nk.draw_echo(surf, self.px, self.py, 9, t=self.t)

        nk.text(surf, self.font, f"{self.score}", 20, 16, nk.palette["ink"])
        for i in range(self.hp):
            nk.glow_circle(surf, nk.palette["cyan"], (self.W - 30 - i * 26, 28), 7)
        if self.state == "over":
            nk.banner(surf, self.big, "LOST IN THE STORM",
                      f"score {self.score}   -   ENTER retry   ESC menu")


if __name__ == "__main__":
    Drift().run()
    pygame.quit()
