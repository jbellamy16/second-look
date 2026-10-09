# Second Look - Brand Kit v1.0

An original visual identity for Second Look, an AI-powered football intelligence product.

## Brand essence
- **Positioning:** The football match beneath the score.
- **Primary line:** You saw the game. Here's what you missed.
- **Campaign headline:** The game behind the score.
- **Personality:** Observant, confident, clear, considered, energetic without hype.
- **Mark:** Two offset frames create a stylized S; the green center point represents an observation brought into focus.

## Contents
- `logos/`: original scalable SVG marks and lockups, plus PNG exports.
- `icons/`: favicon SVG/ICO/PNG, touch icons, PWA icons, maskable icon, Safari mask.
- `social/`: Open Graph, X, LinkedIn, Instagram, YouTube, and profile artwork.
- `guidelines/`: printable PDF identity guide and contact sheet.
- `implementation/`: Next.js metadata sample, site manifest, design tokens.

## Implementation (Next.js App Router)
1. Copy `icons/*` into your app's `public/`.
2. Copy `social/opengraph-image.png` into `public/opengraph-image.png` and `social/twitter-image.png` into `public/twitter-image.png`.
3. Copy `implementation/site.webmanifest` into `public/site.webmanifest`.
4. Merge `implementation/metadata.example.ts` into `app/layout.tsx` (don't replace your real layout file). Set `NEXT_PUBLIC_SITE_URL` to your actual deployed origin.
5. Import `implementation/brand-tokens.css` or translate tokens into your theme. Load Inter via `next/font/google` or an existing supported Inter setup.
6. Verify OG and X link previews on the actual deployment.

## Notes
- These are original concept assets, not a registered trademark or an originality/legal clearance report. Check trademark availability before a public commercial launch.
- No football league, team, player, or broadcast footage is used in the supplied files.
- The SVG wordmark uses the Inter font family; for fully portable vector artwork, outline the text in your design tool before printing. The custom symbol paths are already fully vector.
- X and social banner safe areas vary by device. Check the previews before publishing.
- All icons are produced with a dark base. Use light-variant logos on white backgrounds.
- Do not commit deployment secrets or API keys with brand files.
