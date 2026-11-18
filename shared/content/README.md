# Practice content

This browser-safe directory owns the content used by solo practice and multiplayer.
It contains no Svelte stores, DOM operations, transports, environment reads or Node
runtime imports. Import specific modules directly, rather than adding a barrel.

## Flow

Settings adapter → catalog → selection → modifiers → renderer.

- `code-catalog.ts`: stable language IDs, snippet length choices and source type.
- `prose-catalog.ts`: word catalogs. The 2K list remains the first
  2,000 alphabetic entries from the filtered 5K list; preserve its ordering.
- `quote-catalog.ts`: complete English quotes, classified from original text by
  `quote-length.ts`: short ≤100 characters, medium 101–300, long >300.
  Solo and multiplayer both default to medium.
- `keyword-catalog.ts`: all six languages use JSON word arrays.
- `snippet-catalog.ts`: complete snippets with stable IDs, language, authored
  `short` / `medium` / `long` category, source metadata and indentation-preserving lines.
- `sampling.ts`: prose avoids immediate repeats; keywords shuffle each vocabulary
  cycle without replacement. Both accept a `RandomIndex(length)` dependency.
- `passages.ts`: `generateTokens` selects prose, keywords or a complete quote,
  then calls `modifiers.ts`. Solo uses Math.random; races inject crypto.randomInt.
- `snippets.ts`: selects a complete snippet in the chosen category. Restart avoids
  the last ID when alternatives exist; a singleton category safely reuses its item.

Feature modules adapt existing settings to these helpers. They retain different
formatting policies: prose difficulty levels, keyword modifiers, and multiplayer's
existing number/comma placement. Time limits retain the historical five tokens per
second allocation. Quotes keep their complete text apart from requested stripping
of punctuation and insertion of numbers. Snippets never receive random modifiers.
Typing engines and result calculations remain in their original feature modules.

## Adding content

1. Add words to the appropriate JSON under `data/prose` or `data/keywords`.
   Keyword entries are individual tokens; do not mix snippets into these lists.
2. Add complete snippets to the language's JSON file under `data/snippets/`:
   `python.json`, `javascript.json`, `typescript.json`, `java.json`, `cpp.json`, or
   `c.json`. The catalog checks that each entry belongs to its file's language.
   Use a unique stable ID, a
   supported language, an explicit length category, source description/URL and
   lines containing literal tabs for indentation. Cover every length per language.
   Existing categories do not shift when more snippets are added.
3. Record verifiable attribution when known. Migrated catalogs explicitly mark
   external provenance as unverified; do not invent sources or licenses. Quotes
   retain their original per-entry source labels, which do not establish permission.
4. Run the content/unit tests and browser practice flows. Existing dataset labels
   such as “1K” are approximate; actual catalog sizes are tested separately.

The shared directory is source-only, not a dependency workspace. Its CommonJS
package boundary matches the Node server's TypeScript module target; Vite consumes
the TypeScript source for the browser. Server builds emit both trees beneath
`backend/build`, and start at `build/backend/src/app.js`. Docker copies `shared`
before compiling; changes under `shared` trigger the server image workflow.

Snippet length remains local to the current practice view, as before this refactor.
Existing preference storage keys, routes and socket events are retained. Solo quote
length is an optional `quoteLength` preference/result setting, with a medium fallback
for older preferences. Guest length selection uses `clumsy-keys:quote-length` in
session storage; the existing `quotes: "Random Quotes"` mode value is retained. Each language has 20 snippets: seven short, seven medium and six long. The
original five examples remain in their existing categories.
