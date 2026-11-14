# Self-hosted fonts

Downloaded from Google Fonts on 14 November 2026, without modifying the files:

- Comfortaa v47, variable normal weights 300–700, all six supplied character subsets.
- Poppins v24, normal weights 400/500 (brand tagline/heading), all three supplied character subsets per weight.

The original stylesheets are available from the [Google Fonts CSS API](https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&family=Poppins:wght@400;500&display=swap).
The WOFF2 filenames in that response map to the descriptive filenames used here.
Both families use the SIL Open Font License 1.1; see [Comfortaa's license](../../../public/fonts/comfortaa-OFL.txt)
and [Poppins's license](../../../public/fonts/poppins-OFL.txt), including their copyright notices.
Upstream sources: [Comfortaa](https://github.com/google/fonts/tree/main/ofl/comfortaa)
and [Poppins](https://github.com/google/fonts/tree/main/ofl/poppins).

`src/styles/fonts.css` declares the faces with `font-display: swap` and the upstream
Unicode ranges so browsers fetch only needed subsets. Vite fingerprints these
assets in production. The HTML preloads only Comfortaa's primary Latin subset;
keep its path aligned with the CSS when replacing font files. No Google font
service is contacted at runtime. Keep licenses and character coverage when updating.

Licenses live in `public/fonts` so production deployments include them at
`/fonts/comfortaa-OFL.txt` and `/fonts/poppins-OFL.txt`.
