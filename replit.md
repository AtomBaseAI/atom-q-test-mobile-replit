# AtomQ - Quiz Application

## Overview
AtomQ is a React Native Expo quiz application with a futuristic design. It integrates with an external quiz API for authentication, quiz management, and profile management.

## Architecture
- **Frontend**: Expo (React Native) with Expo Router file-based navigation
- **Backend**: Express.js serving a landing page on port 5000 and proxying API calls
- **External API**: `https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile`
- **Auth**: JWT token stored in SecureStore (native) / AsyncStorage (web)

## Design System
- Theme: Warm copper/amber palette, dark (#0C0C10) and light (#F2F0ED) modes
- Primary color: #D4703C (copper orange)
- Border radius: 2-4px (low, futuristic feel)
- Typography: Inter font family
- No tab navigation - stack-based navigation only

## Key Files
- `lib/api.ts` - API service layer (auth, quizzes, profile)
- `lib/auth-context.tsx` - Auth context with SecureStore/AsyncStorage
- `lib/useTheme.ts` - Theme hook (dark/light)
- `lib/toast-context.tsx` - Toast notification system
- `constants/colors.ts` - Color definitions
- `app/_layout.tsx` - Root layout with providers
- `app/index.tsx` - Splash screen with auto-redirect
- `app/login.tsx` - Login screen
- `app/home.tsx` - Quiz list with animated cards
- `app/quiz/[id].tsx` - Quiz taking (timer, all 4 question types)
- `app/result.tsx` - Results display
- `app/profile.tsx` - Profile view/edit with logout

## Question Types Supported
- MULTIPLE_CHOICE (single select)
- MULTI_SELECT (answer as JSON array)
- TRUE_FALSE (single select)
- FILL_IN_BLANK (text input)

## Recent Changes (Feb 2026)
- Initial build of all screens and navigation
- Custom app icon and splash screen generated
