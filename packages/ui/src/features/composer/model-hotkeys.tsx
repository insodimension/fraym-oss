// Model-switch hotkeys are a product-only surface (model registry + loop model
// context) kept out of the open kit; these no-ops satisfy the composer's
// optional model-hotkey plumbing so the built-in shortcut is simply inert here.
export type ModelHotkeyFeedback = {
	readonly kind: string;
	readonly label?: string;
};

export function useModelHotkeys(): ModelHotkeyFeedback | null {
	return null;
}

export function ModelHotkeyToast(_props: {
	readonly feedback: ModelHotkeyFeedback | null;
}): null {
	return null;
}
