# 🏔️ SlopeSync - AI-Powered Ski Trip Planning Agent

**Stop coordinating group trips through endless group chats. Start planning perfect ski trips in minutes.**

SlopeSync transforms the chaos of group trip planning into a seamless, AI-powered experience. Whether you're organizing a weekend getaway or a week-long adventure, our intelligent platform handles everything from resort recommendations to complete trip logistics—so you can focus on what matters: hitting the slopes.

## ✨ Why SlopeSync?

Planning a group ski trip is a nightmare. Coordinating dates, finding resorts that match everyone's skill level, booking accommodations, arranging transportation, and creating an itinerary—it's overwhelming. **SlopeSync eliminates the hassle** by:

- 🤖 **AI-Powered Recommendations**: Get personalized resort suggestions based on your group's preferences, skill levels, and budgets
- 🗳️ **Smart Voting System**: Let your group vote on recommendations with one-click voting and easy vote management
- 🚗 **Complete Trip Logistics**: AI generates transportation options, accommodation recommendations, and day-by-day itineraries tailored to your group
- 👥 **Seamless Group Coordination**: Create plans, invite members, and manage everything in one place
- 📍 **Intelligent Address Matching**: Google Places integration ensures accurate locations for transportation planning
- ⚡ **Real-Time Collaboration**: All changes sync instantly across your group

**From idea to itinerary in minutes, not days.**

## 🚀 Features

### Trip Planning
- **Create & Join Plans**: Start a new trip or join existing plans with a simple plan ID
- **Member Management**: Add members, assign roles (owner/member), and manage permissions
- **Preference Matching**: AI analyzes group preferences (skill levels, budgets, dates) to find perfect resorts

### AI-Powered Recommendations
- **Personalized Suggestions**: Get 3 resort recommendations tailored to your group
- **Smart Filtering**: Filter by destination type (Local, Domestic, International)
- **Skill & Budget Matching**: Recommendations consider everyone's skill levels and budget preferences
- **Pass Savings Detection**: Automatically identifies Epic/Ikon pass benefits

### Voting System
- **One Vote Per Recommendation**: Vote on multiple options, one vote each
- **Toggle Voting**: Easily add or remove your vote anytime before voting ends
- **Visual Feedback**: See which recommendations you've voted for with clear indicators
- **Tie Breaking**: Owner can break ties when multiple options have equal votes

### Complete Trip Logistics
- **Transportation Planning**: AI generates 3 transportation options (individual/group, carpooling, flights)
- **Accommodation Search**: Finds Airbnbs, lodges, and hotels near slopes with real pricing and photos
- **Personalized Itineraries**: Day-by-day schedules with:
  - Group slopes for everyone
  - Individual slope recommendations by skill level
  - Meetup times and locations
  - Lunch breaks and apres-ski activities
  - Ski map integration with slope details
- **Regeneration**: Regenerate individual sections (transportation, accommodation, itinerary) without losing other data

### User Experience
- **Google Authentication**: Quick sign-in with Google account
- **Address Autocomplete**: Google Places API for accurate address input
- **Real-Time Updates**: All changes sync instantly via Firebase
- **Responsive Design**: Works seamlessly on desktop and mobile

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase (Auth, Firestore)
- **AI**: OpenAI Agents (GPT-5 Nano) for trip planning and recommendations
- **Maps**: Google Places API for address autocomplete and geocoding
- **State Management**: React Context API

## 📦 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase project (for authentication and data storage)
- OpenAI API key
- Google Places API key (optional, for address autocomplete)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   # OpenAI
   OPENAI_API_KEY=your-openai-api-key
   
   # Firebase (required)
   NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   
   # Google Places (optional, for address autocomplete)
   NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-google-places-key
   ```

3. **Set up Firebase**:
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
   - Enable Authentication → Google sign-in
   - Create Firestore database
   - Copy configuration to `.env.local`
   - Set up Firestore security rules (see `FIRESTORE_RULES.md`)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
Slopes-trip-agent/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── plan/          # Plan CRUD operations
│   │   ├── schedule/      # Schedule generation & regeneration
│   │   └── recommendations/ # AI recommendations
│   ├── account/           # User account page
│   ├── onboarding/       # Plan creation flow
│   ├── plan/              # Plan details & voting
│   ├── preferences/       # User preferences
│   └── schedule/          # Trip schedule display
├── src/
│   ├── agents/            # AI agents
│   │   ├── accommodation-agent.ts
│   │   ├── transportation-agent.ts
│   │   ├── itinerary-agent.ts
│   │   └── trip-planner-agent.ts
│   ├── components/        # React components
│   ├── context/           # React Context (AppContext)
│   ├── lib/               # Utilities
│   │   ├── firebase/      # Firebase integration
│   │   └── types.ts       # TypeScript types
│   ├── services/          # Business logic
│   └── evals/             # Agent evaluation scripts
└── README.md
```

## 🔌 API Endpoints

### Plans
- `GET /api/plan?planId=xxx` - Get plan details
- `POST /api/plan` - Create new plan
- `PUT /api/plan` - Update plan (voting, status, etc.)
- `DELETE /api/plan?planId=xxx` - Delete plan

### Schedules
- `POST /api/schedule/generate` - Generate complete trip schedule
- `POST /api/schedule/accommodation` - Generate accommodation only
- `POST /api/schedule/regenerate` - Regenerate specific section

### Recommendations
- `POST /api/recommendations` - Generate resort recommendations

### Users
- `GET /api/user?userId=xxx` - Get user data
- `POST /api/user` - Create/update user

## 📚 Documentation

- **[Firebase Setup](./FIREBASE_SETUP.md)** - Complete Firebase configuration guide
- **[Firestore Rules](./FIRESTORE_RULES.md)** - Security rules for Firestore
- **[Firebase Troubleshooting](./FIREBASE_TROUBLESHOOTING.md)** - Common Firebase issues
- **[Trip Planning Features](./TRIP_PLANNING_FEATURES.md)** - Detailed feature documentation
- **[Troubleshooting](./TROUBLESHOOTING.md)** - General troubleshooting guide

## 🧪 Testing

### Agent Evaluations
Test the accommodation agent with the evaluation suite:

```bash
cd src/evals
pip3 install -r requirements.txt
python3 run_with_agent.py
```

See `src/evals/README.md` for details.

## 🚢 Building for Production

```bash
npm run build
npm start
```

## 🤝 Contributing

This is a private project, but suggestions and improvements are welcome!

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Ready to plan your next epic ski trip?** Get started in minutes and let AI handle the logistics while you focus on the powder. 🎿❄️
