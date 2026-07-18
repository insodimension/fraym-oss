import type { ComposerAttachmentItem, ComposerQueueItem, MessageData } from "@fraym/ui";

export const COCKPIT_QUEUE: readonly ComposerQueueItem[] = [
	{ id: "review", label: "Review diff", detail: "3 files", tone: "accent" },
	{ id: "tests", label: "Run focused tests", detail: "after edit" },
];

export const COCKPIT_ATTACHMENTS: readonly ComposerAttachmentItem[] = [
	{ id: "plan", name: "implementation-plan.md", detail: "docs/notes", kind: "file" },
	{ id: "screen", name: "checkout-regression.png", detail: "1280×720", kind: "image" },
];

export const USER_MESSAGE: MessageData = {
	role: "user",
	name: "You",
	meta: "just now",
	blocks: [
		{ type: "text", html: "<p>Can you wire the composer to the selected branch and keep the toolbar visible?</p>" },
	],
};

export const AGENT_MESSAGE: MessageData = {
	role: "agent",
	name: "Fraym",
	meta: "working",
	activity: { verb: "Updating composer surfaces", mode: "edit", energy: 0.7 },
	blocks: [
		{
			type: "text",
			html: '<p>Yes — the <code class="font-secondary text-fr-accent">ComposerCockpit</code> now stays mounted across branch switches. Toolbar visibility is controlled by the <b>showToolbar</b> setting in the session config.</p>',
		},
	],
};

export const FOLLOWUP_MESSAGE: MessageData = {
	role: "user",
	blocks: [{ type: "text", html: "<p>Also make sure queued sends and attachments can be hidden independently.</p>" }],
};

