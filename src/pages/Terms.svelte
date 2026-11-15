<script lang="ts">
	import "../styles/legal.css";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";
</script>

<PracticeLayout mode="prose" contentLabel="Terms of Service" showShortcuts={false}>
	<div class="legal-page">
		<header class="page-heading">
			<p class="eyebrow">Terms of service</p>
			<h1>Terms of Service</h1>
			<p class="lede">Simple, clear rules for using Clumsy Keys, practicing your typing speed, and competing fairly with others.</p>
		</header>

		<div class="legal-content">
			<section class="legal-section">
				<h2>1. Acceptance of Terms</h2>
				<p>By accessing or using Clumsy Keys ("the service"), whether as an unauthenticated guest or a registered account holder, you agree to be bound by these Terms of Service. If you do not agree with these terms, please do not use the application.</p>
			</section>

			<section class="legal-section">
				<h2>2. Fair Competition &amp; Anti-Cheating</h2>
				<p>Clumsy Keys is designed to help people practice, measure, and improve genuine human keyboard skills. To preserve fair play and the integrity of our community:</p>
				<ul>
					<li><strong>No Automated Input:</strong> The use of automated keystroke injection software, auto-typers, bot scripts, or browser macro automation is strictly prohibited during ranked solo practice and multiplayer races.</li>
					<li><strong>No Falsified Metrics:</strong> Attempting to submit spoofed, impossible, or manipulated typing records to public leaderboards or race lobbies undermines fair competition and may result in immediate record forfeiture or account suspension.</li>
					<li><strong>Fair Racing:</strong> Multiplayer races provide real-time side-by-side racing; exploiting network latency or manipulating socket timing is considered cheating.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>3. User Accounts &amp; Access</h2>
				<p>Registration is completely optional. Anyone can use the prose and code practice features anonymously as a guest.</p>
				<ul>
					<li>If you choose to create an account, you must provide a valid email address and maintain the confidentiality of your session and credentials.</li>
					<li>You are responsible for all activities conducted under your authenticated account.</li>
					<li>We reserve the right to suspend or remove accounts that violate our fair play standards or participate in abusive activities.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>4. Acceptable Conduct &amp; Multiplayer Etiquette</h2>
				<p>When participating in public rooms, creating custom room identifiers, or configuring user profiles, you agree to respect fellow typists:</p>
				<ul>
					<li>Do not use usernames or room identifiers that are hateful, harassing, defamatory, sexually explicit, or unlawful.</li>
					<li>Do not attempt to disrupt the service through denial-of-service attacks, socket flooding, automated scraping, or unauthorized server probing.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>5. Source Code &amp; Content Rights</h2>
				<p>The application source is available on <a href="https://github.com/korebhaumik/clumsykeys" target="_blank" rel="noreferrer">GitHub</a>. Availability of source code does not itself grant a license; consult the applicable license notices before reuse.</p>
				<p>Prose passages, literary quotes, and code snippets curated for typing practice remain the intellectual property or public domain works of their respective authors and licenses.</p>
			</section>

			<section class="legal-section">
				<h2>6. Disclaimer of Warranties &amp; Limitation of Liability</h2>
				<p>The service is provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. While we strive to maintain uninterrupted service and reliable data persistence, we do not warrant that practice sessions, race servers, or statistics storage will be uninterrupted or error-free.</p>
				<p>In no event shall the authors or maintainers be liable for any indirect, incidental, or consequential damages resulting from your use of or inability to use the platform.</p>
			</section>

			<section class="legal-section">
				<h2>7. Changes to Terms</h2>
				<p>We may update these terms periodically to reflect service evolutions. Continued use of Clumsy Keys following any modifications constitutes your acceptance of the revised Terms of Service.</p>
			</section>
		</div>
	</div>
</PracticeLayout>
