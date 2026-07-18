const G = "\u001b[32m"; // green
const R = "\u001b[31m"; // red
const D = "\u001b[2m"; //  dim
const X = "\u001b[0m"; //  reset

export const INPUT = {
	status: { host: "staging-1", command: "uptime && free -h" },
	deploy: { host: "staging-1", command: "sudo /opt/deploy/release.sh", cwd: "/opt/deploy", timeout: 600 },
	audit: { host: "db-1", command: "journalctl -u ssh -n 9000" },
	restart: { host: "cache-1", command: "systemctl restart redis && systemctl is-active redis" },
};

export const STATUS_OUTPUT = [
	" 12:04:18 up 37 days,  4:11,  2 users,  load average: 0.18, 0.27, 0.31",
	`${D}              total        used        free      shared  buff/cache   available${X}`,
	"Mem:           31Gi        9.4Gi        2.1Gi       412Mi         19Gi         21Gi",
	"Swap:         2.0Gi          0B        2.0Gi",
].join("\n");

export const DEPLOY_OUTPUT = [
	`${D}==> pulling release bundle (build 4821)${X}`,
	...Array.from({ length: 30 }, (_, i) => `[${String(i + 1).padStart(2, "0")}/30] unpacked service/module_${i + 1}`),
	`${G}✓${X} migrated 14 pending changesets`,
	`${G}✓${X} restarted api.service (pid 20194)`,
	`${G}✓${X} health check passed (200 in 84ms)`,
	`${G}deploy complete — build 4821 live on staging-1${X}`,
].join("\n");

export const RESTART_OUTPUT = `${G}active${X}`;

export const SERVICE_DOWN = [
	`${R}● worker.service - Background job worker${X}`,
	"     Loaded: loaded (/etc/systemd/system/worker.service; enabled)",
	`     Active: ${R}failed${X} (Result: exit-code) since Thu 12:03:51 UTC`,
	"    Process: 19842 ExecStart=/usr/bin/worker (code=exited, status=1/FAILURE)",
	`${R}journal: FATAL: could not connect to redis at 127.0.0.1:6379 (connection refused)${X}`,
].join("\n");

export const TRUNCATED_OUTPUT = `${Array.from(
	{ length: 40 },
	(_, i) =>
		`${D}2026-06-05T12:${String(i).padStart(2, "0")}:00Z${X} sshd[${4000 + i}]: accepted publickey for deploy from 10.0.${i % 8}.${i + 2}`,
).join("\n")}

[Showing last 200 of 9000 lines. Full output at artifact://ssh-audit-7b3c]`;

