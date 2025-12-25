# Trip Planning Features

AI-powered trip logistics generation after voting ends.

## Features

1. **Voting Management**: End voting, detect/break ties
2. **Schedule Generation**: Transportation, accommodation, itinerary
3. **Google Places**: Address autocomplete for accurate locations

## Agents

- **Transportation Agent**: 3 options (individual/group, cost, duration)
- **Accommodation Agent**: 3 options (Airbnb/lodge, pricing, photos, booking links)
- **Itinerary Agent**: Day-by-day schedule (slopes by skill, meetups, apres-ski)
- **Trip Planner Agent**: Orchestrates all three

## API

`POST /api/schedule/generate` - Generates complete schedule

**Request**:
```typescript
{
  planId: string;
  winningResort: { name, location, fullAddress?, coordinates? };
  tripDates: { startDate, endDate, duration };
  members: Array<{ memberId, memberName, address, coordinates?, skillLevel, budget? }>;
  generatedBy: string;
}
```

## Data Storage

- `slopes-generated-schedules/{planId}` - Generated schedules in Firestore

## Regeneration

Owners can regenerate individual sections (transportation, accommodation, itinerary) via separate API endpoints.
