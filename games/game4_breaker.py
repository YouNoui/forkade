"""
GAME 4 - PULSE BREAKER   (a neon brick-breaker)

ECHO rides the paddle, bouncing a pulse to shatter the neon wall. Lose the
ball on a bad bounce? Hold R/Shift to REWIND and send it back up.

Controls:  A/D or Left/Right / MOUSE move   SPACE launch   R/Shift rewind   P pause   ESC menu
"""
import os, sys, math, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk


class Breaker(nk.GameBase):
    title = "PULSE BREAKER"

    def __init__(self):
        super().__init__()
        self.reset()

    def reset(self):
        self.paddle = self.W / 2
        self.pw = 110
        self.lives = 3
        self.score = 0
        self.bricks = []
        cols = ["cyan", "lime", "amber", "magenta", "violet"]
        for row in range(5):
            for col in range(10):
                self.bricks.append([60 + col * 78, 90 + row * 34,
                                    nk.palette[cols[row]]])
        self.stuck = True
        self.bx, self.by = self.paddle, self.H - 70
        self.bvx, self.bvy = 0, 0
        self.state = "play"

    def _launch(self):
        self.stuck = False
        a = random.uniform(-0.6, 0.6) - math.pi / 2
        self.bvx, self.bvy = math.cos(a) * 420, math.sin(a) * 420

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return

        mx = pygame.mouse.get_pos()[0]
        kb = (keys[pygame.K_d] or keys[pygame.K_RIGHT]) - (keys[pygame.K_a] or keys[pygame.K_LEFT])
        if kb:
            self.paddle += kb * 520 * dt
        else:
            self.paddle += (mx - self.paddle) * min(1, dt * 14)
        self.paddle = max(self.pw / 2, min(self.W - self.pw / 2, self.paddle))

        for e in events:
            if e.type == pygame.KEYDOWN and e.key == pygame.K_SPACE and self.stuck:
                self._launch()

        if self.stuck:
            self.bx, self.by = self.paddle, self.H - 70
        else:
            self.bx += self.bvx * dt
            self.by += self.bvy * dt
            if self.bx < 8 or self.bx > self.W - 8:
                self.bvx *= -1; self.bx = max(8, min(self.W - 8, self.bx))
            if self.by < 8:
                self.bvy *= -1; self.by = 8
            # paddle bounce
            if (self.H - 78 < self.by < self.H - 58 and
                    abs(self.bx - self.paddle) < self.pw / 2 and self.bvy > 0):
                off = (self.bx - self.paddle) / (self.pw / 2)
                a = -math.pi / 2 + off * 1.0
                sp = math.hypot(self.bvx, self.bvy) + 4
                self.bvx, self.bvy = math.cos(a) * sp, math.sin(a) * sp
                self.shake.add(2)
                self.particles.emit(self.bx, self.by, nk.palette["cyan"], n=6, speed=3)
            # brick hits
            for br in self.bricks:
                if abs(self.bx - (br[0] + 34)) < 38 and abs(self.by - (br[1] + 12)) < 18:
                    self.bvy *= -1
                    br[2] = None
                    self.score += 15
                    self.shake.add(2)
                    self.particles.emit(self.bx, self.by, br[2] or nk.palette["amber"],
                                        n=8, speed=3)
                    break
            self.bricks = [b for b in self.bricks if b[2] is not None]
            # lost
            if self.by > self.H + 10:
                self.lives -= 1
                self.shake.add(10)
                if self.lives <= 0:
                    self.state = "over"
                else:
                    self.stuck = True
        if not self.bricks:
            self.state = "win"

    def snapshot(self):
        if self.state != "play":
            return None
        return (self.paddle, self.lives, self.score, self.stuck,
                self.bx, self.by, self.bvx, self.bvy,
                [b[:] for b in self.bricks])

    def restore(self, s):
        (self.paddle, self.lives, self.score, self.stuck,
         self.bx, self.by, self.bvx, self.bvy, br) = s
        self.bricks = [b[:] for b in br]

    def render(self, surf):
        for br in self.bricks:
            nk.glow_rect(surf, br[2], pygame.Rect(br[0], br[1], 68, 24), radius=5)
        # paddle with ECHO on it
        nk.glow_rect(surf, nk.palette["cyan"],
                     pygame.Rect(self.paddle - self.pw / 2, self.H - 68, self.pw, 14), radius=7)
        nk.draw_echo(surf, self.paddle, self.H - 86, 12, t=self.t)
        nk.glow_circle(surf, nk.palette["white"], (int(self.bx), int(self.by)), 7)

        nk.text(surf, self.font, f"{self.score}", 20, 16, nk.palette["ink"])
        for i in range(self.lives):
            nk.glow_circle(surf, nk.palette["cyan"], (self.W - 30 - i * 26, 28), 7)
        if self.stuck and self.state == "play":
            nk.text(surf, self.small, "SPACE to launch", self.W // 2, self.H - 110,
                    nk.palette["dim"], center=True)
        if self.state == "over":
            nk.banner(surf, self.big, "GAME OVER",
                      f"score {self.score}   -   ENTER retry   ESC menu")
        elif self.state == "win":
            nk.banner(surf, self.big, "WALL CLEARED!",
                      f"score {self.score}   -   ENTER again   ESC menu")


if __name__ == "__main__":
    Breaker().run()
    pygame.quit()
