/**
 * Behaviour for the full-body sprite: a queue of small tasks (walk somewhere, play an emote,
 * wait) that refills itself from a fixed patrol routine, and is interrupted by page events
 * (pokes, moods, speech, fast scrolling). Pure state, no DOM: call step(dt) every frame.
 *
 * Task kinds:
 *   { kind: 'goto', x, gait: 'walk' | 'run' }
 *   { kind: 'play', action, len? }   len in seconds; one-shot actions default to one play-through
 *   { kind: 'wait', len }            stand idle (faces the cursor when it is near)
 *   { kind: 'face', x }              turn toward x
 */
const rnd = (a, b) => a + Math.random() * (b - a);

/** What he does at each stop of his patrol, in order: [action, seconds] (one-shots play once). */
const STOPS = [
  ['jump', undefined],
  ['wave', undefined],
  ['think', 3],
  ['code', 7],
  ['dance', 2.6],
  ['sit', 5],
];

export class SpriteBrain {
  constructor(sheet) {
    this.sheet = sheet;
    this.queue = [];
    this.task = null;
    this.x = 0;
    this.y = 0; // jump height in px
    this.dir = -1; // 1 faces right, -1 faces left
    this.anim = 'idle';
    this.t = 0; // seconds into the current animation
    this.clock = 0;
    this.lo = 0;
    this.hi = 1000;
    this.charH = 150;
    this.pointerX = null;
    this.sleepy = false;
    this.lastJump = -10;
    this.lastNudge = -10;
    this.leg = 0; // position in the patrol routine
    this.stopIdx = 0; // position in the STOPS rotation
  }

  /** True when a walk or run strip exists; otherwise he gets around by hopping (jump strip). */
  get canStride() {
    return this.sheet.has('walk') || this.sheet.has('run');
  }

  get canMove() {
    return this.canStride || this.sheet.has('jump');
  }

  /** Viewport changed. `margin` keeps the whole body on screen. */
  resize(width, charH, margin) {
    this.charH = charH;
    this.lo = margin;
    this.hi = Math.max(margin, width - margin);
    if (!this.placed) {
      this.placed = true;
      this.x = this.lo + (this.hi - this.lo) * 0.86;
    }
    this.x = Math.min(this.hi, Math.max(this.lo, this.x));
  }

  interrupt(tasks) {
    this.queue = tasks;
    this.task = null;
  }

  step(dt) {
    this.clock += dt;
    this.t += dt;
    if (!this.task) {
      if (!this.queue.length) this.queue = this.wander();
      this.task = this.queue.shift();
      this.task.start = this.clock;
    }
    if (this.run(this.task, dt)) this.task = null;

    // the jump arc is done in code, so the jump frames only need the body motion
    // Lift only while airborne (the crouch and landing frames stay on the floor); travel hops
    // are a little lower than a full jump.
    if (this.anim === 'jump') {
      const p = this.t / this.jumpLen();
      const air = Math.min(1, Math.max(0, (p - 0.17) / 0.66));
      this.y = Math.sin(Math.PI * air) * this.charH * (this.task?.hop ? 0.22 : 0.3);
    } else this.y = 0;
  }

  /** Returns true when the task is finished. */
  run(task, dt) {
    const elapsed = this.clock - task.start;
    switch (task.kind) {
      case 'goto': {
        if (!this.canMove) return true;
        const target = Math.min(this.hi, Math.max(this.lo, task.x));
        if (!this.canStride) return this.hop(task, target);
        this.play(task.gait);
        const d = target - this.x;
        if (Math.abs(d) < 2) return true;
        this.dir = Math.sign(d);
        const speed = (this.sheet.get(task.gait).speed ?? 0.6) * this.charH;
        this.x += this.dir * Math.min(Math.abs(d), speed * dt);
        return false;
      }
      case 'play': {
        if (elapsed === 0) {
          this.anim = ''; // restart even if the same action just played (two jumps in a row)
          if (task.action === 'jump') this.lastJump = this.clock;
        }
        this.play(task.action);
        const len = task.len ?? (task.action === 'jump' ? this.jumpLen() : this.sheet.get(task.action).loop ? 3 : this.sheet.duration(task.action));
        return elapsed >= len;
      }
      case 'wait': {
        this.play('idle');
        if (this.pointerX != null && Math.abs(this.pointerX - this.x) < 420) {
          const want = Math.sign(this.pointerX - this.x) || this.dir;
          if (Math.abs(this.pointerX - this.x) > 24) this.dir = want;
        }
        return elapsed >= task.len;
      }
      case 'face':
        this.dir = Math.sign(task.x - this.x) || this.dir;
        return true;
      default:
        return true;
    }
  }

  /**
   * Travel by a chain of jumps. Each hop moves him only while he's airborne (the middle of
   * the jump), so the crouch and landing poses stay planted. Returns true on arrival.
   */
  hop(task, target) {
    if (!task.hop) {
      const d = target - this.x;
      if (Math.abs(d) < 4) return true;
      this.dir = Math.sign(d);
      const reach = this.charH * (task.gait === 'run' ? 1.05 : 0.7);
      task.hop = { from: this.x, to: this.x + this.dir * Math.min(Math.abs(d), reach), t0: this.clock };
      this.anim = ''; // restart the jump strip for every hop
      this.play('jump');
      this.lastJump = this.clock;
    }
    const p = (this.clock - task.hop.t0) / this.jumpLen();
    const air = Math.min(1, Math.max(0, (p - 0.17) / 0.66));
    const ease = air * air * (3 - 2 * air);
    this.x = task.hop.from + (task.hop.to - task.hop.from) * ease;
    if (p < 1) return false;
    this.x = task.hop.to;
    task.hop = null;
    return Math.abs(target - this.x) < 4;
  }

  play(name) {
    if (name === this.anim) return;
    this.anim = name;
    this.t = 0;
  }

  jumpLen() {
    return this.sheet.has('jump') ? this.sheet.duration('jump') : 0.55;
  }

  /** Strip + frame index to draw right now. */
  frame() {
    const a = this.sheet.get(this.anim);
    let f = Math.floor(this.t * a.fps);
    if (this.anim === 'jump' && a.name !== 'jump') f = 0; // borrowed strip: hold a pose while the arc plays
    return { strip: a, frame: a.loop ? f % a.frames : Math.min(f, a.frames - 1) };
  }

  /**
   * The routine he repeats when nothing else is going on: a fixed patrol
   *   run → right edge · walk → centre · run → left edge · walk → centre · …
   * and at every stop the next action from STOPS, in order. Interruptions (pokes, speech,
   * fast scrolling) don't reset it; he carries on from the next leg.
   */
  wander() {
    if (this.sleepy) return [{ kind: 'play', action: 'sleep', len: Infinity }];
    if (!this.canMove) return [...this.stop(), { kind: 'wait', len: 2 }];
    const mid = (this.lo + this.hi) / 2;
    const legs = [
      { kind: 'goto', x: this.hi, gait: 'run' },
      { kind: 'goto', x: mid, gait: 'walk' },
      { kind: 'goto', x: this.lo, gait: 'run' },
      { kind: 'goto', x: mid, gait: 'walk' },
    ];
    const leg = legs[this.leg++ % legs.length];
    return [leg, { kind: 'wait', len: 0.5 }, ...this.stop(), { kind: 'wait', len: 1 }];
  }

  /** The next action in the stop rotation (skipping ones that weren't generated). */
  stop() {
    for (let i = 0; i < STOPS.length; i++) {
      const [action, len] = STOPS[this.stopIdx++ % STOPS.length];
      if (this.sheet.has(action)) return [{ kind: 'play', action, len }];
    }
    return [{ kind: 'wait', len: 1.5 }];
  }

  /** The screen edge farther from where he stands. */
  farEdge() {
    return this.x - this.lo > this.hi - this.x ? this.lo : this.hi;
  }

  /**
   * Page events, batched per frame.
   * hop: poke / hop() · mood: the mood just switched to · talk: seconds the speech bubble stays up
   */
  respond({ hop, mood, talk }) {
    if (mood === 'sleepy') return this.interrupt([{ kind: 'play', action: 'sleep', len: Infinity }]);

    const tasks = [];
    const running = this.task?.kind === 'goto' && this.task.gait === 'run';
    const jump = () => {
      if (this.clock - this.lastJump > 0.8) tasks.push({ kind: 'play', action: 'jump' });
    };
    if (hop) jump();
    if (mood === 'surprised' && !running && !hop) jump();
    if (mood === 'think') tasks.push({ kind: 'play', action: 'think', len: 2.6 });
    if ((mood === 'love' || mood === 'cool') && this.sheet.has('dance')) tasks.push({ kind: 'play', action: 'dance', len: 1.8 });
    if (mood === 'shy' && this.sheet.has('wave')) tasks.push({ kind: 'play', action: 'wave' });

    if (talk) {
      tasks.unshift({ kind: 'face', x: (this.lo + this.hi) / 2 });
      if (tasks.length === 1 && this.sheet.has('wave')) tasks.push({ kind: 'play', action: 'wave' });
      const used = tasks.reduce((t, k) => t + (k.kind === 'play' ? k.len ?? this.sheet.duration(k.action) : 0), 0);
      tasks.push({ kind: 'wait', len: Math.max(0.6, talk - used) });
    }
    if (tasks.length) this.interrupt(tasks);
  }

  /** Fast scrolling: run all the way to the screen edge in the scroll direction (down → right). */
  nudge(direction) {
    if (!this.canMove || this.anim === 'sleep' || this.clock - this.lastNudge < 0.35) return;
    this.lastNudge = this.clock;
    let dir = direction;
    if ((dir > 0 && this.hi - this.x < 30) || (dir < 0 && this.x - this.lo < 30)) dir = -dir; // already there: run back
    const edge = dir > 0 ? this.hi : this.lo;
    if (this.task?.kind === 'goto' && this.task.gait === 'run' && this.task.x === edge) return; // already on his way
    this.interrupt([{ kind: 'goto', x: edge, gait: 'run' }, { kind: 'wait', len: rnd(0.8, 1.6) }]);
  }
}
