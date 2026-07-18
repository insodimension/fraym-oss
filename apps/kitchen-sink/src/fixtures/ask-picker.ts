import type { AskPickerOption } from "@fraym/ui";

// Demo option sets for the AskPicker showcase.

export const ASK_PICKER_SUPERPOWERS: readonly AskPickerOption[] = [
	{ label: "Teleportation", description: "Instant travel anywhere, anytime.", recommended: true },
	{ label: "Time manipulation", description: "Pause, rewind, or fast-forward time." },
	{ label: "Telepathy", description: "Read minds and communicate silently." },
	{ label: "Flight", description: "Soar through the skies unassisted." },
	{ label: "Invisibility", description: "Become unseen at will." },
];

export const ASK_PICKER_DEPLOY_TARGETS: readonly AskPickerOption[] = [
	{ label: "AWS Lambda", description: "Serverless, pay-per-execution.", recommended: true },
	{ label: "AWS ECS (Fargate)", description: "Containers without managing nodes." },
	{ label: "Google Cloud Run", description: "Autoscaling stateless containers." },
	{ label: "Fly.io", description: "Edge VMs scheduled near users." },
	{ label: "Railway", description: "Zero-config Git deploys." },
	{ label: "Render", description: "Managed web services and cron." },
	{ label: "Bare metal", description: "Maximum control, fixed cost." },
	{ label: "Kubernetes", description: "Self-managed orchestration." },
];

