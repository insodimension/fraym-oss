import { type ShowcaseEntry, withGroup } from "../../showcase/types";
import { aethrEntries } from "./aethr";
import { askEntries } from "./ask";
import { astEditEntries } from "./ast-edit";
import { astGrepEntries } from "./ast-grep";
import { bashEntries } from "./bash";
import { browserEntries } from "./browser";
import { calcEntries } from "./calc";
import { checkpointEntries } from "./checkpoint";
import { composerCommandArgsEntries } from "./composer-command-args";
import { debugEntries } from "./debug";
import { demoThreadEntries } from "./demo-thread";
import { environmentCardEntries } from "./environment-card";
import { evalEntries } from "./eval";
import { findEntries } from "./find";
import { generateImageEntries } from "./generate-image";
import { githubEntries } from "./github";
import { goalEntries } from "./goal";
import { inspectImageEntries } from "./inspect-image";
import { ircEntries } from "./irc";
import { jobEntries } from "./job";
import { lspEntries } from "./lsp";
import { readEntries } from "./read";
import { reasoningEntries } from "./reasoning";
import { recallEntries } from "./recall";
import { reflectEntries } from "./reflect";
import { renderMermaidEntries } from "./render-mermaid";
import { reportToolIssueEntries } from "./report-tool-issue";
import { resolveEntries } from "./resolve";
import { retainEntries } from "./retain";
import { rewindEntries } from "./rewind";
import { searchEntries } from "./search";
import { searchToolBm25Entries } from "./search-tool-bm25";
import { sshEntries } from "./ssh";
import { todoEntries } from "./todo";
import { toolGroupEntries } from "./tool-group";
import { toolIconRegistryEntries } from "./tool-icon-registry";
import { webSearchEntries } from "./web-search";
import { workflowConceptsEntries } from "./workflow-concepts";
import { writeEntries } from "./write";

// Clustered into navigable sub-groups (rendered as sub-headers under the
// Features tier in the nav). Ordered roughly by chat flow.
export const featuresEntries: readonly ShowcaseEntry[] = [
	...withGroup("Conversation", [
		...demoThreadEntries,
		...reasoningEntries,
		...composerCommandArgsEntries,
	]),
	...withGroup("Tools & execution", [
		...askEntries,
		...readEntries,
		...resolveEntries,
		...goalEntries,
		...writeEntries,
		...bashEntries,
		...jobEntries,
		...sshEntries,
		...workflowConceptsEntries,
		...todoEntries,
		...toolGroupEntries,
		...evalEntries,
		...ircEntries,
		...searchEntries,
		...webSearchEntries,
		...browserEntries,
		...searchToolBm25Entries,
		...githubEntries,
		...inspectImageEntries,
		...generateImageEntries,
		...findEntries,
		...astEditEntries,
		...astGrepEntries,
		...lspEntries,
		...debugEntries,
		...calcEntries,
		...toolIconRegistryEntries,
	]),
	...withGroup("Docks & files", environmentCardEntries),
	...withGroup("Presence, diagram & diff", [
		...aethrEntries,
		...renderMermaidEntries,
		...checkpointEntries,
		...rewindEntries,
		...recallEntries,
		...retainEntries,
		...reflectEntries,
		...reportToolIssueEntries,
	]),
];
