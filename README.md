# 🍁 Cannabis Pricing Calculator — Canada

End-to-end cannabis pricing pipeline calculator for all Canadian provinces and territories.

**LP Production Cost → CRA Excise Duty → Landed Cost → Wholesale Markup → Retail Price → Consumer Shelf Price**

## Features

- **Forward Pipeline** — Enter product details and compute the full pricing chain from LP cost to shelf price
- **Reverse Solver (Target Price)** — Find the required LP cost to hit an exact retail shelf price target
- **All-Province Matrix** — Compare pricing across all 13 provinces & territories side-by-side
- Supports all cannabis product types (dried flower, edibles, extracts, topicals, seeds/seedlings)
- CRA excise duty rates for 2025/2026
- Provincial/territorial tax calculations (GST, PST, HST)
- OCS wholesale markup data (Jan 2026)

## Live Demo

Deploy to GitHub Pages or open `index.html` directly in a browser — no build step required.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/cra-cannabis-pricing-calculator.git

# Open in browser
open index.html
```

This is a **static site** — no server, no build tools, no dependencies. Just HTML + CSS + JS.

## File Structure

```
├── index.html       # Main app page
├── styles.css       # All styling
├── calculator.js    # Core calculation logic & UI
├── .gitignore       # Excludes data files & OS junk
└── README.md        # This file
```

## Data Sources

- Excise rates from the [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency.html)
- Wholesale data from the OCS Pricing Calculator (January 2026)

## Disclaimer

For estimation purposes only. Consult the CRA for official filings.

## License

MIT
