"""
GAME 3 - SKY STRIKER   (vertical airplane shmup, the "airplane that shoots" one)

ECHO pilots a neon fighter. Dodge, shoot, and clear the sky. Take a hit you
didn't deserve? Hold R/Shift to REWIND and fly it clean.

Controls:  WASD/Arrows move   SPACE/CLICK shoot   R/Shift rewind   P pause   ESC menu
"""
import os, sys, math, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk


class Striker(nk.GameBase):
    title = "SKY STRIKER"

    def __init__(self):
        super().__init__()
        self.reset()

    def reset(self):
        self.px, self.py = self.W / 2, self.H - 90
        self.hp = 3
        self.score = 0
        self.bullets = []
        self.ebullets = []
        self.foes = []
        self.cool = 0.0
        self.spawn = 0.0
        self.state = "play"

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return

        dx = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - (keys[pygame.K_a] or keys[pygame.K_LEFT])
        dy = (keys[pygame.K_s] or keys[pygame.K_DOWN]) - (keys[pygame.K_w] or keys[pygame.K_UP])
        self.px = max(16, min(self.W - 16, self.px + dx * 360 * dt))
        self.py = max(60, min(self.H - 20, self.py + dy * 360 * dt))

        self.cool -= dt
        if (keys[pygame.K_SPACE] or pygame.mouse.get_pressed()[0]) and self.cool <= 0:
            self.cool = 0.14
            self.bullets.append([self.px, self.py - 18])
            self.particles.emit(self.px, self.py - 18, nk.palette["cyan"], n=3,
                                angle=-math.pi / 2, spread=0.3, speed=3)

        for b in self.bullets:
            b[1] -= 680 * dt
        self.bullets = [b for b in self.bullets if b[1] > -20]
        for b in self.ebullets:
            b[0] += b[2] * dt; b[1] += b[3] * dt
        self.ebullets = [b for b in self.ebullets if -20 < b[1] < self.H + 20]

        # spawn foes
        self.spawn -= dt
        if self.spawn <= 0:
            self.spawn = max(0.4, 1.3 - self.score / 2000)
            x = random.uniform(40, self.W - 40)
            self.foes.append([x, -20, 40, random.uniform(70, 130),
                              random.uniform(1.0, 2.2), 0.0])  # x,y,hp,speed,sway,firet

        for f in self.foes:
            f[1] += f[3] * dt
            f[0] += math.sin(self.t * f[4]) * 60 * dt
            f[5] -= dt
            if f[5] <= 0 and f[1] < self.H - 100:
                f[5] = random.uniform(1.2, 2.5)
                a = math.atan2(self.py - f[1], self.px - f[0])
                self.ebullets.append([f[0], f[1], math.cos(a) * 240, math.sin(a) * 240])

        # bullet vs foe
        for b in self.bullets:
            for f in self.foes:
                if abs(b[0] - f[0]) < 20 and abs(b[1] - f[1]) < 20:
                    f[2] -= 20; b[1] = -99
                    self.particles.emit(f[0], f[1], nk.palette["amber"], n=5, speed=3)
        for f in list(self.foes):
            if f[2] <= 0:
                self.score += 20
                self.particles.emit(f[0], f[1], nk.palette["magenta"], n=16, speed=4)
                self.shake.add(3)
        self.foes = [f for f in self.foes if f[2] > 0 and f[1] < self.H + 30]

        # getting hit
        hit = False
        for b in self.ebullets:
            if abs(b[0] - self.px) < 14 and abs(b[1] - self.py) < 14:
                hit = True; self.ebullets.remove(b); break
        for f in self.foes:
            if abs(f[0] - self.px) < 22 and abs(f[1] - self.py) < 22:
                hit = True; f[2] = 0; break
        if hit:
            self.hp -= 1
            self.shake.add(10)
            self.particles.emit(self.px, self.py, nk.palette["red"], n=20, speed=5)
            if self.hp <= 0:
                self.state = "over"

    def snapshot(self):
        if self.state != "play":
            return None
        return (self.px, self.py, self.hp, self.score,
                [b[:] for b in self.bullets], [b[:] for b in self.ebullets],
                [f[:] for f in self.foes])

    def restore(self, s):
        self.px, self.py, self.hp, self.score, b, eb, fo = s
        self.bullets = [x[:] for x in b]
        self.ebullets = [x[:] for x in eb]
        self.foes = [x[:] for x in fo]

    def render(self, surf):
        for f in self.foes:
            x, y = int(f[0]), int(f[1])
            nk.glow_rect(surf, nk.palette["magenta"],
                         pygame.Rect(x - 14, y - 10, 28, 20), radius=5)
            pygame.draw.polygon(surf, nk.palette["bg"],
                                [(x, y + 8), (x - 8, y - 6), (x + 8, y - 6)])
        for b in self.bullets:
            nk.glow_circle(surf, nk.palette["cyan"], (int(b[0]), int(b[1])), 4)
        for b in self.ebullets:
            nk.glow_circle(surf, nk.palette["red"], (int(b[0]), int(b[1])), 4)
        # ECHO ship = hero in a little fighter
        self._ship(surf, self.px, self.py)

        nk.text(surf, self.font, f"{self.score}", 20, 16, nk.palette["ink"])
        for i in range(self.hp):
            nk.glow_circle(surf, nk.palette["red"], (self.W - 30 - i * 26, 28), 8)
        if self.state == "over":
            nk.banner(surf, self.big, "SHOT DOWN",
                      f"score {self.score}   -   ENTER retry   ESC menu")

    def _ship(self, surf, x, y):
        pts = [(x, y - 20), (x - 16, y + 14), (x, y + 6), (x + 16, y + 14)]
        nk.glow_line(surf, nk.palette["cyan"], pts[0], pts[1], 3)
        nk.glow_line(surf, nk.palette["cyan"], pts[0], pts[3], 3)
        nk.glow_line(surf, nk.palette["cyan"], pts[1], pts[2], 3)
        nk.glow_line(surf, nk.palette["cyan"], pts[3], pts[2], 3)
        nk.draw_echo(surf, x, y, 11, t=self.t)
        self.particles.emit(x, y + 14, nk.palette["amber"], n=2,
                            angle=math.pi / 2, spread=0.5, speed=2, life=0.3)


if __name__ == "__main__":
    Striker().run()
    pygame.quit()
