"""
GAME 2 - NEON SWARM   (top-down survival shooter, the "shoot the zombies" one)

ECHO is swarmed by neon husks. Move, aim with the mouse, blast them, survive
waves. Overrun? Hold R/Shift to REWIND the swarm back and reposition.

Controls:  WASD/Arrows move   MOUSE aim   CLICK/SPACE shoot   R/Shift rewind   P pause   ESC menu
"""
import os, sys, math, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk


class Swarm(nk.GameBase):
    title = "NEON SWARM"

    def __init__(self):
        super().__init__()
        self.reset()

    def reset(self):
        self.px, self.py = self.W / 2, self.H / 2
        self.hp = 100
        self.score = 0
        self.wave = 1
        self.enemies = []
        self.bullets = []
        self.cool = 0.0
        self.spawn_t = 0.0
        self.state = "play"
        self._spawn_wave()

    def _spawn_wave(self):
        for _ in range(4 + self.wave * 2):
            self._spawn_enemy()

    def _spawn_enemy(self):
        side = random.randint(0, 3)
        if side == 0: x, y = random.uniform(0, self.W), -20
        elif side == 1: x, y = random.uniform(0, self.W), self.H + 20
        elif side == 2: x, y = -20, random.uniform(0, self.H)
        else: x, y = self.W + 20, random.uniform(0, self.H)
        self.enemies.append([x, y, 30 + self.wave * 6, 55 + self.wave * 3])  # x,y,hp,speed

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return

        dx = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - (keys[pygame.K_a] or keys[pygame.K_LEFT])
        dy = (keys[pygame.K_s] or keys[pygame.K_DOWN]) - (keys[pygame.K_w] or keys[pygame.K_UP])
        self.px = max(16, min(self.W - 16, self.px + dx * 240 * dt))
        self.py = max(16, min(self.H - 16, self.py + dy * 240 * dt))

        mx, my = pygame.mouse.get_pos()
        aim = math.atan2(my - self.py, mx - self.px)
        self.cool -= dt
        shoot = pygame.mouse.get_pressed()[0] or keys[pygame.K_SPACE]
        if shoot and self.cool <= 0:
            self.cool = 0.12
            self.bullets.append([self.px, self.py, math.cos(aim) * 620, math.sin(aim) * 620, 1.2])
            self.particles.emit(self.px + math.cos(aim) * 18, self.py + math.sin(aim) * 18,
                                nk.palette["cyan"], n=4, angle=aim, spread=0.4, speed=4)
            self.shake.add(1.5)

        for b in self.bullets:
            b[0] += b[2] * dt; b[1] += b[3] * dt; b[4] -= dt
        self.bullets = [b for b in self.bullets if b[4] > 0]

        # enemies chase ECHO
        for en in self.enemies:
            a = math.atan2(self.py - en[1], self.px - en[0])
            en[0] += math.cos(a) * en[3] * dt
            en[1] += math.sin(a) * en[3] * dt
            if abs(en[0] - self.px) < 20 and abs(en[1] - self.py) < 20:
                self.hp -= 32 * dt
                self.shake.add(2)

        # bullet hits
        for b in self.bullets:
            for en in self.enemies:
                if abs(b[0] - en[0]) < 16 and abs(b[1] - en[1]) < 16:
                    en[2] -= 20; b[4] = 0
                    self.particles.emit(en[0], en[1], nk.palette["magenta"], n=6, speed=3)
        dead = [en for en in self.enemies if en[2] <= 0]
        for en in dead:
            self.score += 10
            self.particles.emit(en[0], en[1], nk.palette["lime"], n=14, speed=4)
            self.shake.add(3)
        self.enemies = [en for en in self.enemies if en[2] > 0]

        # next wave
        if not self.enemies:
            self.wave += 1
            self._spawn_wave()
        # trickle spawns
        self.spawn_t -= dt
        if self.spawn_t <= 0:
            self.spawn_t = max(0.6, 2.2 - self.wave * 0.1)
            self._spawn_enemy()

        if self.hp <= 0:
            self.state = "over"; self.shake.add(18)

    def snapshot(self):
        if self.state != "play":
            return None
        return (self.px, self.py, self.hp, self.score, self.wave,
                [e[:] for e in self.enemies], [b[:] for b in self.bullets])

    def restore(self, s):
        self.px, self.py, self.hp, self.score, self.wave, en, bu = s
        self.enemies = [e[:] for e in en]
        self.bullets = [b[:] for b in bu]

    def render(self, surf):
        for en in self.enemies:
            nk.glow_circle(surf, nk.palette["magenta"], (int(en[0]), int(en[1])), 13)
            pygame.draw.circle(surf, nk.palette["bg"], (int(en[0]), int(en[1])), 5)
        for b in self.bullets:
            nk.glow_circle(surf, nk.palette["cyan"], (int(b[0]), int(b[1])), 4)
        mx, my = pygame.mouse.get_pos()
        face = 1 if mx >= self.px else -1
        nk.draw_echo(surf, self.px, self.py, 16, face=face, t=self.t)
        nk.glow_circle(surf, nk.palette["dim"], (mx, my), 10, width=2)

        nk.bar(surf, 16, 16, 200, 16, self.hp / 100, nk.palette["red"], label="HULL")
        nk.text(surf, self.font, f"{self.score}", self.W - 120, 16, nk.palette["ink"])
        nk.text(surf, self.small, f"WAVE {self.wave}", self.W - 120, 60, nk.palette["dim"])
        if self.state == "over":
            nk.banner(surf, self.big, "OVERRUN",
                      f"score {self.score}   -   ENTER retry   ESC menu")


if __name__ == "__main__":
    Swarm().run()
    pygame.quit()
