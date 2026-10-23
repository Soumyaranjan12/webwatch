# WebWatch

**Keep an eye on everything.** WebWatch is a black-and-crimson tracking dashboard concept for product prices, stock availability, and parcel delivery updates.

## Current scope

This repository contains a **frontend-only design prototype** using sample data and local browser state:

- Overview dashboard with price-watch and parcel snapshots
- Price watches with search, check-frequency controls, and sample price movement
- Parcel delivery list and shipment milestone visualization
- Settings and free/Plus plan preview
- Responsive layout for desktop and mobile
- Accessible focus states and reduced-motion support

> **Important:** Retailer extraction, carrier integrations, accounts, persistent storage, real push notifications, and payments are not connected. Sample prices and shipment events are illustrative, not live.

## Local preview

Open `index.html` directly in a browser, or run a simple static server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages

This is a static site, so it can be hosted as a GitHub Pages project site at a URL like `https://<owner>.github.io/webwatch/`. No build step is needed. **Deployment is intentionally not configured or enabled yet**; we will add and test the Pages workflow only after the repository is made public and the prototype is ready for your review.

## Future stack

For the early website preview, the experience is plain HTML, CSS, and JavaScript to keep static hosting simple. The production architecture can move to SvelteKit + TypeScript with a backend API and scheduled workers as live tracking is developed.

## License

No license has been selected. All rights reserved by default until a license is added.
