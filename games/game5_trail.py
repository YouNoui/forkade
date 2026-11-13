"""
GAME 5 - ECHO TRAIL   (a neon snake)

ECHO leaves a glowing trail as it eats data orbs and grows. About to crash
into your own tail? Hold R/Shift to REWIND a few moves and steer clear.

Controls:  WASD / Arrows turn   R/Shift rewind   P pause   ESC menu
"""
import os, sys, random, pygame
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "engine"))
import neonkit as nk

CELL = 24


class Trail(nk.GameBase):
    title = "ECHO TRAIL"

    def __init__(self):
        super().__init__()
        self.cols = self.W // CELL
        self.rows = (self.H - 60) // CELL
        self.oy = 60
        self.reset()

    def reset(self):
        cx, cy = self.cols // 2, self.rows // 2
        self.snake = [(cx, cy), (cx - 1, cy), (cx - 2, cy)]
        self.dir = (1, 0)
        self.pending = (1, 0)
        self.food = self._new_food()
        self.score = 0
        self.move_t = 0.0
        self.speed = 0.12
        self.state = "play"

    def _new_food(self):
        while True:
            f = (random.randint(0, self.cols - 1), random.randint(0, self.rows - 1))
            if f not in self.snake:
                return f

    def step(self, dt, keys, events):
        if self.state != "play":
            for e in events:
                if e.type == pygame.KEYDOWN and e.key == pygame.K_RETURN:
                    self.reset()
            return
        for e in events:
            if e.type == pygame.KEYDOWN:
                nd = None
                if e.key in (pygame.K_w, pygame.K_UP): nd = (0, -1)
                elif e.key in (pygame.K_s, pygame.K_DOWN): nd = (0, 1)
                elif e.key in (pygame.K_a, pygame.K_LEFT): nd = (-1, 0)
                elif e.key in (pygame.K_d, pygame.K_RIGHT): nd = (1, 0)
                if nd and (nd[0] != -self.dir[0] or nd[1] != -self.dir[1]):
                    self.pending = nd

        self.move_t += dt
        if self.move_t < self.speed:
            return
        self.move_t = 0
        self.dir = self.pending
        hx, hy = self.snake[0]
        nx, ny = hx + self.dir[0], hy + self.dir[1]
        # walls wrap, tail kills
        nx %= self.cols; ny %= self.rows
        if (nx, ny) in self.snake[:-1]:
            self.state = "over"
            self.shake.add(14)
            return
        self.snake.insert(0, (nx, ny))
        if (nx, ny) == self.food:
            self.score += 10
            self.food = self._new_food()
            self.speed = max(0.05, self.speed - 0.004)
            fx = self.food[0] * CELL + CELL // 2
            self.shake.add(2)
        else:
            self.snake.pop()

    def snapshot(self):
        if self.state != "play":
            return None
        return (list(self.snake), self.dir, self.pending, self.food,
                self.score, self.speed, self.move_t)

    def restore(self, s):
        sn, self.dir, self.pending, self.food, self.score, self.speed, self.move_t = s
        self.snake = list(sn)

    def _px(self, cx, cy):
        return cx * CELL + CELL // 2, cy * CELL + CELL // 2 + self.oy

    def render(self, surf):
        # food
        fx, fy = self._px(*self.food)
        nk.glow_circle(surf, nk.palette["amber"], (fx, fy), 8)
        # body
        for i, (cx, cy) in enumerate(self.snake[1:]):
            x, y = self._px(cx, cy)
            k = 1 - i / max(1, len(self.snake))
            col = nk.palette["violet"] if i % 2 else nk.palette["magenta"]
            nk.glow_rect(surf, col, pygame.Rect(x - 9, y - 9, 18, 18), radius=5)
        # head = ECHO
        hx, hy = self._px(*self.snake[0])
        nk.draw_echo(surf, hx, hy, 12, face=1 if self.dir[0] >= 0 else -1, t=self.t)

        nk.text(surf, self.font, f"{self.score}", 20, 14, nk.palette["ink"])
        nk.text(surf, self.small, f"LEN {len(self.snake)}", self.W - 110, 20, nk.palette["dim"])
        if self.state == "over":
            nk.banner(surf, self.big, "CRASHED",
                      f"score {self.score}   -   ENTER retry   ESC menu")


if __name__ == "__main__":
    Trail().run()
    pygame.quit()
