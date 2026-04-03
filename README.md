# R2C Platform (Ready to Collect)

A monorepo for the R2C platform, including user, partner, and admin applications, along with Firebase Cloud Functions and shared packages.

## Project Structure

- `apps/user`: The customer-facing mobile-first web application.
- `apps/partner`: The application for restaurant branches to manage orders.
- `apps/admin`: The dashboard for super admins and restaurant owners.
- `functions/`: Firebase Cloud Functions for backend logic, modularized into handlers.
- `packages/shared/`: Shared logic, hooks, and Firebase configuration used across all applications.

## Prerequisites

- Node.js (v20 or higher)
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project set up

## Getting Started

1. Install dependencies at the root level:
   ```bash
   npm install
   ```

2. Set up Firebase configuration:
   - Create or update `packages/shared/src/firebase/config.js` with your Firebase credentials.
   - Run `firebase login` and `firebase use <your-project-id>`.

## Development

You can run each application individually using the following commands:

- **User App:** `npm run dev:user`
- **Partner App:** `npm run dev:partner`
- **Admin App:** `npm run dev:admin`

To run Cloud Functions locally with emulators:
```bash
cd functions
npm run serve
```

## Building

To build all applications for production:
```bash
npm run build:all
```

## Testing

- **Root Tests:** `npm test`
- **Functions Tests:** `npm --prefix functions test`

## Deployment

To deploy everything to Firebase:
```bash
firebase deploy
```

To deploy specific parts:
- **Functions:** `firebase deploy --only functions`
- **Hosting:** `firebase deploy --only hosting`
- **Firestore Rules:** `firebase deploy --only firestore:rules`
