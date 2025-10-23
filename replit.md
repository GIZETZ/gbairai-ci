# Gbairai PWA - Replit Architecture Guide

## Overview

Gbairai is a Progressive Web App (PWA) designed as a social network for Côte d'Ivoire. The application allows users to share anonymous, geolocated stories called "Gbairais" with AI-powered emotion analysis. The core feature is an interactive map displaying emotion-colored markers representing these stories, creating a visual emotional landscape of the country.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety
- **Vite** as the build tool for fast development
- **Tailwind CSS** with custom Ivorian color themes
- **Wouter** for lightweight client-side routing
- **TanStack Query** for server state management
- **Leaflet** with React-Leaflet for interactive maps
- **Radix UI** components with shadcn/ui styling
- **PWA features** with service worker support

### Backend Architecture
- **Node.js** with Express framework
- **PostgreSQL** database with Neon serverless
- **Drizzle ORM** for database operations
- **Passport.js** for authentication
- **Express sessions** with PostgreSQL store
- **Socket.IO** capabilities for real-time features
- **RESTful API** design

## Key Components

### Database Schema
- **Users table**: Authentication and profile data
- **Gbairais table**: Main content with emotion classification and geolocation
- **Interactions table**: User engagements (likes, comments, shares)
- **Conversations/Messages tables**: Private messaging system
- **Follows table**: User following relationships for TikTok-style social connections

### Frontend Components
- **InteractiveMap**: Core map component with emotion markers
- **GbairaiCard**: Post display with interaction buttons
- **GbairaiForm**: Content creation with AI emotion analysis
- **EmotionSelector**: Visual emotion picker with AI suggestions
- **Navigation**: App-wide navigation with authentication status
- **UserProfilePage**: Comprehensive user profile with follower statistics and management
- **SearchPage**: Combined search for gbairais and users with tabbed interface

### AI Services
- **EmotionAnalysisService**: OpenRouter API integration with local fallback
- **ContentValidationService**: Spam detection and content moderation
- **ContentModerationService**: AI-powered content moderation using OpenRouter GPT-4o-mini
- **IvoirianDictionary**: Local emotion analysis using Ivorian expressions
- **BlacklistService**: Local word filtering with comprehensive French and international banned words

### Authentication System
- **Session-based authentication** with PostgreSQL storage
- **Password hashing** using Node.js crypto
- **Protected routes** with authentication middleware
- **User registration and login** with form validation

## Data Flow

### Content Creation Flow
1. User types content in GbairaiForm
2. Real-time AI analysis suggests emotions
3. User selects emotion and location
4. **Two-stage content moderation process**:
   - Stage 1: Local blacklist checking (instant)
   - Stage 2: AI analysis with OpenRouter GPT-4o-mini (if passes stage 1)
5. Content validation checks for spam/inappropriate content
6. Gbairai saved to database with metadata
7. Map updates with new emotion marker

### Map Interaction Flow
1. Interactive map loads with current Gbairais
2. Emotion markers clustered by geographic proximity
3. User clicks marker to view Gbairai details
4. Filtering by emotion or location updates markers
5. Real-time updates via periodic refetching

### Authentication Flow
1. User submits login/registration form
2. Server validates credentials and creates session
3. Client stores authentication state
4. Protected routes check authentication status
5. API requests include session cookies

### Rich Messaging System Flow
1. User types in large textarea with modern interface design
2. Audio file selection and voice recording through integrated toolbar
3. Sticker selection from extensive emoji/sticker collection
4. File validation (audio only) and preview generation in textarea corner
5. Upload via FormData to dedicated endpoint with authentication
6. Server processes audio files with multer, stores metadata
7. Display adapted for audio playback and rich text with emojis
8. Files served from /uploads directory with proper access control

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **passport**: Authentication middleware
- **@tanstack/react-query**: Server state management
- **leaflet**: Interactive maps
- **wouter**: Client-side routing
- **zod**: Schema validation

### AI Integration
- **OpenRouter API**: Primary emotion analysis service and content moderation
- **GPT-4o-mini**: Content moderation with cultural context awareness
- **Local fallback**: Ivorian dictionary for offline analysis
- **Blacklist filtering**: Local word filtering for instant moderation

### UI/UX Dependencies
- **@radix-ui/***: Accessible component primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date formatting utilities

## Deployment Strategy

### Development Setup
- **Vite dev server** for frontend development
- **tsx** for running TypeScript server code
- **Hot reloading** for both frontend and backend
- **Environment variables** for database and API keys

### Production Build
- **Vite build** creates optimized frontend bundle
- **esbuild** bundles server code for production
- **Static asset serving** from Express server
- **Database migrations** via Drizzle Kit

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string
- **SESSION_SECRET**: Session encryption key
- **OPENROUTER_API_KEY**: AI service authentication
- **OPENROUTER_CHECK_WORD**: Content moderation API key
- **NODE_ENV**: Environment designation

### Performance Optimizations
- **Service worker** for offline functionality
- **Progressive loading** of map markers
- **Query caching** with TanStack Query
- **Image optimization** and lazy loading
- **Bundle splitting** for code efficiency

The application follows a modern fullstack architecture with clear separation of concerns, type safety throughout, and scalable patterns for growth. The AI-powered emotion analysis and interactive mapping create a unique social experience tailored to Ivorian culture.