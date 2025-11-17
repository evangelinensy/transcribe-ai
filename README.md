# Design Challenge Coach

A local Next.js web app that runs a 60-minute mock design interview with speech-to-text, text-to-speech, Gemini AI coaching, and Figma screenshot uploads.

## Features

- **Three-phase interview structure**: Discovery (20 min), Heads-down (25 min), Presentation (15 min)
- **Speech-to-text**: Use Chrome's Web Speech API to speak your thoughts
- **Text-to-speech**: AI coach speaks responses using Gemini TTS
- **Real-time coaching**: Get nudges and guidance from Gemini AI
- **Coverage tracking**: Visual tags show which design topics you've covered
- **Screenshot uploads**: Upload Figma mockups for evaluation
- **Final evaluation**: Comprehensive rubric scores and improvement drills

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

Get your Gemini API key from: https://ai.google.dev/

### 3. Run Development Server

```bash
npm run dev
```

### 4. Open in Chrome

Navigate to http://localhost:3000 in **Google Chrome** (required for Web Speech API support).

## How to Use

1. **Start Recording**: Click "Start Recording" to begin speaking. Your speech will be transcribed automatically.

2. **Type Messages**: You can also type messages in the input box at the bottom of the transcript pane.

3. **Ask Coach**: Click "Ask Coach" anytime to get guidance. The coach will provide short, targeted nudges based on your current phase and coverage.

4. **Coverage Tags**: Watch the coverage tags turn green as you mention keywords related to:
   - Framing (goal, problem)
   - Constraints (constraint, limit)
   - Users (user, persona)
   - Ideation (idea, approach)
   - Systems (state, flow, error)
   - Metrics (metric, kpi, experiment)
   - Accessibility (accessibility, wcag)

5. **Upload Screenshots**: Upload Figma mockups or wireframes to show your design work.

6. **Phase Navigation**: The timer auto-advances through phases, or you can manually jump to any phase.

7. **End & Debrief**: Click "End & Debrief" when finished to receive a comprehensive evaluation with rubric scores, strengths, weaknesses, and practice drills.

## Project Structure

```
designexercise/
├── src/
│   └── app/
│       ├── api/
│       │   ├── coach/route.ts      # AI coaching endpoint
│       │   ├── tts/route.ts        # Text-to-speech endpoint
│       │   └── evaluate/route.ts   # Final evaluation endpoint
│       ├── layout.tsx              # Root layout
│       ├── page.tsx                # Main UI component
│       └── globals.css             # Global styles
├── .env.local                      # Environment variables (create this)
├── next.config.js                  # Next.js configuration
├── package.json                    # Dependencies
└── README.md                       # This file
```

## Technologies Used

- **Next.js 15**: React framework with App Router
- **Google Gemini AI**:
  - `gemini-2.0-flash-exp` for coaching
  - `gemini-2.0-flash-exp` for evaluation
  - `gemini-2.0-flash-exp` for TTS (placeholder implementation)
- **Web Speech API**: Browser-native speech recognition
- **TypeScript**: Type-safe development

## Security Notes

- API key is only used server-side in API routes
- Never expose `GEMINI_API_KEY` in client code
- All Gemini API calls happen through Next.js API routes

## Browser Compatibility

- **Chrome/Edge**: Full support (Web Speech API)
- **Firefox/Safari**: Limited support (no speech recognition, text input still works)

## Troubleshooting

### Speech Recognition Not Working
- Ensure you're using Chrome or Edge
- Check microphone permissions in browser settings
- Try reloading the page

### API Errors
- Verify your `GEMINI_API_KEY` is correct in `.env.local`
- Check the terminal for error messages
- Ensure you have internet connection for Gemini API calls

### Audio Not Playing
- Check browser audio permissions
- Ensure "Mute" button is not active
- Check browser console for errors

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

This project is for educational and practice purposes.
