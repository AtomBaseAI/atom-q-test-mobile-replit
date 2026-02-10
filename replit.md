# AtomQ - Quiz Application

## Overview

AtomQ is a React Native Expo quiz application with a futuristic design theme. The app allows users to authenticate, browse available quizzes, take quizzes (supporting multiple question types), view results, and manage their profile. It communicates with an external quiz API hosted at `https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile` for all backend logic including authentication, quiz data, and profile management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React Native / Expo)
- **Framework:** Expo SDK 54 with React Native 0.81, using the new architecture
- **Navigation:** Expo Router (file-based routing) with stack-based navigation only — no tab navigation. Routes include: splash (`index`), `login`, `home`, `quiz/[id]`, `result`, and `profile`
- **State Management:** React Query (`@tanstack/react-query`) for server state; React Context for auth state (`lib/auth-context.tsx`) and toast notifications (`lib/toast-context.tsx`)
- **Animations:** `react-native-reanimated` for smooth transitions and animated UI elements
- **Keyboard Handling:** `react-native-keyboard-controller` with a compatibility wrapper (`KeyboardAwareScrollViewCompat`) that falls back to plain `ScrollView` on web
- **Typography:** Inter font family loaded via `@expo-google-fonts/inter` (Regular, Medium, SemiBold, Bold weights)
- **Theming:** System-driven dark/light mode via `useColorScheme()` hook, with a warm copper/amber color palette defined in `constants/colors.ts`. Primary color: `#D4703C`. Dark background: `#0C0C10`, Light background: `#F2F0ED`
- **Design Language:** Low border radius (2-4px) for a futuristic feel, copper/amber accent colors

### API Layer (`lib/api.ts`)
- All API calls go directly to the external API at `https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile`
- JWT-based authentication with 60-day token expiry
- Token storage: `expo-secure-store` on native platforms, `@react-native-async-storage/async-storage` on web
- User data cached in AsyncStorage for offline access to profile info
- Supports endpoints for: login, quiz listing, quiz attempt management, answer submission, profile view/update

### Question Types
The quiz engine supports four question types:
- **MULTIPLE_CHOICE** — single select from options
- **MULTI_SELECT** — multiple selections, answer sent as JSON array
- **TRUE_FALSE** — single select (true/false)
- **FILL_IN_BLANK** — free text input

### Build & Development
- **Dev:** `npm run expo:dev` starts the Expo dev server with Replit proxy configuration
- **Replit-specific:** Environment variables like `REPLIT_DEV_DOMAIN` and `EXPO_PUBLIC_DOMAIN` are used for URL configuration

### Error Handling
- Class-based `ErrorBoundary` component wraps the app for catching React rendering errors
- `ErrorFallback` component provides user-friendly error display with app restart capability
- Toast notification system for showing success/error/warning/info messages

## External Dependencies

### External API
- **Quiz API:** `https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile` — handles all authentication, quiz management, and profile operations. This is the sole backend for business logic.

### Key NPM Packages
- `expo` ~54.0.27 — Core framework
- `expo-router` ~6.0.17 — File-based navigation
- `expo-secure-store` — Secure token storage on native
- `@react-native-async-storage/async-storage` — Key-value storage (web fallback + user data cache)
- `@tanstack/react-query` — Server state management
- `react-native-reanimated` — Animations
- `react-native-gesture-handler` — Gesture support
- `react-native-keyboard-controller` — Keyboard-aware scrolling
