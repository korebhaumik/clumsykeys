<script lang="ts">
	import "../styles/legal.css";
	import PracticeLayout from "../lib/components/layout/PracticeLayout.svelte";
</script>

<PracticeLayout mode="prose" contentLabel="Privacy Policy" showShortcuts={false}>
	<div class="legal-page">
		<header class="page-heading">
			<p class="eyebrow">Privacy policy</p>
			<h1>Privacy Policy</h1>
			<p class="lede">How Clumsy Keys handles your data: guest-first storage, zero tracking ads, and strict respect for your personal information.</p>
		</header>

		<div class="legal-content">
			<section class="legal-section">
				<h2>1. Our Privacy Philosophy</h2>
				<p>Your typing habits and practice sessions are personal. We believe web software should function without invasive surveillance, cross-site profiling, or data brokering. Clumsy Keys does not sell user data, host third-party advertisements, or track you across the web.</p>
			</section>

			<section class="legal-section">
				<h2>2. Guest Practice &amp; Local Storage</h2>
				<p>You can use Clumsy Keys indefinitely without creating an account:</p>
				<ul>
					<li><strong>Guest Solo Practice:</strong> Guest solo results are calculated locally and are not saved to an account. Joining multiplayer sends your room identity, progress and race metrics to the server and other racers; signed-in opponents’ saved races can include guest participants.</li>
					<li><strong>Local Persistence:</strong> User interface preferences (such as selected color theme, test duration, word count, and difficulty modifiers) are saved in browser storage.</li>
					<li><strong>Full Control:</strong> Clearing site storage removes local settings and recovery data. It does not erase server-side race archives or close a live room immediately.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>3. Data Collected for Registered Accounts</h2>
				<p>If you choose to create an account to synchronize results across devices, we collect only the minimum information required to operate the service:</p>
				<ul>
					<li><strong>Authentication Details:</strong> Your email address and unique account ID managed securely via Supabase Auth.</li>
					<li><strong>Profile Metadata:</strong> Your display name and the profile metadata supplied during account creation or sign-in.</li>
					<li><strong>Performance History:</strong> Prose, code-snippet and code-keyword results, settings, speed and accuracy, timing, chart samples and per-word performance history. Saved multiplayer archives include participant scores.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>4. How Your Data Is Used</h2>
				<p>Information stored on our servers is strictly used for platform functionality:</p>
				<ul>
					<li>Calculating your personal bests, historical charts, and practice trends across devices.</li>
					<li>Compiling public solo rankings from saved results, exposing display names, pseudonymous player keys and score fields. Scores rely on client reports and are not verified proof of human typing.</li>
					<li>Delivering real-time multiplayer race scoring and participant scoreboards.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>5. Third-Party Services &amp; Trackers</h2>
				<p>We do not partner with data brokers or tracking companies:</p>
				<ul>
					<li><strong>No Advertising Networks:</strong> We do not serve third-party ads or monetize via programmatic ad exchanges.</li>
					<li><strong>No Behavioral Tracking:</strong> We do not load Google Analytics, Meta Pixel, or any third-party marketing tags.</li>
					<li><strong>Infrastructure:</strong> Supabase provides authentication and database services. Frontend and backend hosting providers deliver the application and network traffic. Their infrastructure may process connection information under their own policies.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>6. Your Data Rights &amp; Deletion</h2>
				<p>You retain full ownership of your data at all times:</p>
				<ul>
					<li><strong>Export:</strong> The History page exports the currently loaded results matching your filters as CSV. Load additional pages to include more records.</li>
					<li><strong>Account Deletion:</strong> Contact the maintainer to request account deletion. Private account records are removed when the Auth account is deleted; retained shared race entries are anonymized. Contact <a href="mailto:bhaumik.kore31@gmail.com">bhaumik.kore31@gmail.com</a>.</li>
				</ul>
			</section>

			<section class="legal-section">
				<h2>7. Contact Us</h2>
				<p>If you have any questions or feedback regarding this Privacy Policy or your personal information, reach out to the developer directly at <a href="mailto:bhaumik.kore31@gmail.com">bhaumik.kore31@gmail.com</a>.</p>
			</section>
		</div>
	</div>
</PracticeLayout>
