export const SHORT_TEXT =
	"Auth runs before the handler, so the client id is already on the request — I can key the limiter off it directly instead of re-parsing the token.";

export const LONG_TEXT = `Let me scope this before touching anything. The request is a rate limiter for the public API, so the real questions are the algorithm and where the counter state lives.

A fixed window is trivial but lets bursts double up at the window boundary. A sliding-window log is precise but stores every hit. A token bucket gives smooth limits with O(1) state, so that's the pick.

For state: in-memory is fastest but won't survive multiple instances; Redis with an atomic INCR/EXPIRE (or a small Lua script) stays correct across the fleet. I'll go Redis.

Failure modes matter most. If Redis is down I'll fail open with a loud metric — a cache blip shouldn't take the whole API down. The Lua script reads Redis's own clock so drifting nodes can't hand out extra tokens.

So: a token-bucket middleware backed by a Redis Lua script, keyed by client id, returning 429 + Retry-After when drained.`;

export const MARKDOWN_TEXT = `**Algorithm.** Comparing the options:

- *Fixed window* — trivial, but bursts double up at the boundary.
- *Sliding log* — precise, but O(n) memory per client.
- *Token bucket* — smooth, O(1) state. **Pick this.**

**State.** Needs to survive multiple instances, so Redis with an atomic refill:

\`\`\`lua
-- refill from Redis TIME, never the app clock
local now = redis.call('TIME')[1]
\`\`\`

Returning \`429\` + \`Retry-After\` when the bucket drains.`;

export const CONTENT_TEXT = {
	short: SHORT_TEXT,
	long: LONG_TEXT,
	markdown: MARKDOWN_TEXT,
} as const;

export const CUSTOM_SUMMARY = {
	short: "Keying the limiter off the authed client id",
	long: "Planning the rate limiter",
	markdown: "Choosing an algorithm and store",
} as const;
