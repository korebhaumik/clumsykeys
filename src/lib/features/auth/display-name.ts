/** Public name precedence shared by account presentation and room defaults. */
export function displayName(metadata: Record<string, unknown> = {}): string {
	for (const key of ["display_name", "full_name", "name", "user_name", "preferred_username"]) {
		const value = metadata[key];
		if (typeof value === "string" && value.trim() && !value.includes("@")) return Array.from(value.trim()).slice(0, 50).join("");
	}
	return "";
}
