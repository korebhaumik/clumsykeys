<script lang="ts">
	import "../styles/legal.css";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";
</script>

<PracticeLayout mode="prose" contentLabel="Security" showShortcuts={false}>
	<div class="legal-page">
		<header class="page-heading">
			<p class="eyebrow">Security</p>
			<h1>Application Security</h1>
			<p class="lede">How Clumsy Keys safeguards user accounts, enforces database isolation, secures multiplayer races, and protects system integrity.</p>
		</header>

		<div class="legal-content">
			<section class="legal-section">
				<h2>1. Architecture &amp; Threat Model</h2>
				<p>Solo practice and room access are available to guests. Account routes verify identity before accessing private records. Live rooms and recovery state are held in one server process.</p>
			</section>

			<section class="legal-section">
				<h2>2. Authentication &amp; Token Isolation</h2>
				<p>Account authentication uses Supabase Auth, including PKCE for redirect flows. The frontend uses public configuration; privileged service credentials belong in the backend environment.</p>
				<ul>
					<li><strong>Cryptographic Verification:</strong> The backend verifies supplied account tokens through Supabase Auth. Guest multiplayer access does not require an account token.</li>
					<li><strong>Token Storage:</strong> Account sessions use browser storage. Scripts running on the same origin can access that storage, so protection against script injection remains important.</li>
					<li><strong>Token Rejection:</strong> Invalid or expired account tokens are rejected by authenticated operations; verified multiplayer identities expire with their tokens.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>3. Database Security &amp; Row-Level Security (RLS)</h2>
				<p>The application tables use PostgreSQL Row-Level Security. Backend writes use validated services and restricted database functions:</p>
				<ul>
					<li><strong>Owner Isolation:</strong> Private history and preferences are scoped to the authenticated owner. Backend services use privileged access and enforce ownership separately from RLS.</li>
					<li><strong>Public Projections:</strong> Public solo rankings expose display names, pseudonymous player keys and score fields, without account UUIDs, emails or per-word history.</li>
					<li><strong>Public Configuration:</strong> Client applications connect with low-privilege anon keys; privileged database service roles are never exposed to the frontend browser.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>4. Multiplayer Integrity &amp; Ephemeral Rooms</h2>
				<p>Multiplayer races use a single Express/Socket.IO server process:</p>
				<ul>
					<li><strong>Ephemeral Lifecycle:</strong> Live rooms, countdowns and short recovery windows are process-local. Signed-in race results can be archived to the database. Server restarts lose live state and pending archive writes.</li>
					<li><strong>Server-Side Verification:</strong> The server owns countdowns, timed deadlines and finish timestamps. Speeds and progress still depend on client reports: validation does not prove honest typing or prevent plausible fabricated scores.</li>
					<li><strong>Origin Enforcement:</strong> WebSocket transports enforce allowed origins and transport handshakes, defending against unauthorized cross-site hijacking attempts.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>5. Input Sanitization &amp; Web Hygiene</h2>
				<p>We apply defensive validation across the entire application stack:</p>
				<ul>
					<li><strong>Metric Validation:</strong> Saved submissions validate counts, durations and finite values, recompute metrics and impose plausibility limits. These checks are not proof of honest typing.</li>
					<li><strong>XSS Prevention:</strong> Svelte escapes displayed names and identifiers. Application URL validation restricts supported external schemes; this does not establish protection against every form of script injection.</li>
					<li><strong>Zero External Trackers:</strong> No third-party tracking scripts, external advertisement pixels, or invasive telemetry tools are loaded on any page.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>6. Vulnerability Disclosure &amp; Contact</h2>
				<p>We appreciate responsible disclosure from security researchers. If you believe you have discovered a vulnerability, security flaw, or bug in Clumsy Keys, please notify us privately so we can address it promptly:</p>
				<ul>
					<li>Direct email to maintainer: <a tabindex="0" href="mailto:bhaumik.kore31@gmail.com">bhaumik.kore31@gmail.com</a></li>
					<li>Security advisories &amp; code issues: <a tabindex="0" href="https://github.com/korebhaumik/clumsykeys" target="_blank" rel="noreferrer">GitHub Repository</a></li>
				</ul>
			</section>
		</div>
	</div>
</PracticeLayout>
