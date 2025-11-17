/*
Design Challenge Coach - Setup Instructions

1. Install dependencies:
   npm install

2. Create .env.local file with your Gemini API key:
   GEMINI_API_KEY=your-actual-gemini-api-key

3. Run the development server:
   npm run dev

4. Open http://localhost:3000 in Chrome (required for Web Speech API)

5. Click "Start Recording" to begin speaking, "Ask Coach" for guidance,
   and "End & Debrief" when finished for your evaluation.
*/

'use client';

import { useState, useEffect, useRef } from 'react';
import './globals.css';

type Phase = 'Discovery' | 'Heads-down' | 'Presentation';

interface Message {
  role: 'Coach' | 'You';
  text: string;
}

interface CoverageTags {
  framing: boolean;
  constraints: boolean;
  users: boolean;
  ideation: boolean;
  systems: boolean;
  metrics: boolean;
  accessibility: boolean;
}

const PHASE_DURATIONS: Record<Phase, number> = {
  'Discovery': 20 * 60,
  'Heads-down': 25 * 60,
  'Presentation': 15 * 60,
};

export default function Home() {
  const [phase, setPhase] = useState<Phase>('Discovery');
  const [timeLeft, setTimeLeft] = useState(PHASE_DURATIONS['Discovery']);
  const [isRunning, setIsRunning] = useState(false);

  const [prompt, setPrompt] = useState(
    'Design a collaboration tool that works fully offline for 24 hours. Strong constraint: No background sync during offline period.'
  );

  const [transcript, setTranscript] = useState<Message[]>([]);
  const [coverageTags, setCoverageTags] = useState<CoverageTags>({
    framing: false,
    constraints: false,
    users: false,
    ideation: false,
    systems: false,
    metrics: false,
    accessibility: false,
  });

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [screenshots, setScreenshots] = useState<Array<{ url: string; name: string }>>([]);
  const [textInput, setTextInput] = useState('');

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isRecordingRef = useRef(false);

  // Timer logic
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-advance to next phase
          if (phase === 'Discovery') {
            setPhase('Heads-down');
            setTimeLeft(PHASE_DURATIONS['Heads-down']);
          } else if (phase === 'Heads-down') {
            setPhase('Presentation');
            setTimeLeft(PHASE_DURATIONS['Presentation']);
          } else {
            setIsRunning(false);
            return 0;
          }
          return prev;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, phase]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Initialize coach intro
  useEffect(() => {
    const introMessage = `Welcome to your design challenge. We're starting with Discovery phase. Focus on understanding the problem space, constraints, and users. Remember the strong constraint in the prompt - keep it central to your thinking.`;

    setTranscript([{ role: 'Coach', text: introMessage }]);

    // Speak the intro
    if (!isMuted) {
      speakText(introMessage);
    }

    // Start timer
    setIsRunning(true);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const changePhase = (newPhase: Phase) => {
    setPhase(newPhase);
    setTimeLeft(PHASE_DURATIONS[newPhase]);
    setIsRunning(true);
  };

  const updateCoverageTags = (text: string) => {
    const lowerText = text.toLowerCase();
    const updates: Partial<CoverageTags> = {};

    if (lowerText.includes('goal') || lowerText.includes('problem')) {
      updates.framing = true;
    }
    if (lowerText.includes('constraint') || lowerText.includes('limit')) {
      updates.constraints = true;
    }
    if (lowerText.includes('user') || lowerText.includes('persona')) {
      updates.users = true;
    }
    if (lowerText.includes('idea') || lowerText.includes('approach')) {
      updates.ideation = true;
    }
    if (lowerText.includes('state') || lowerText.includes('flow') || lowerText.includes('error')) {
      updates.systems = true;
    }
    if (lowerText.includes('metric') || lowerText.includes('kpi') || lowerText.includes('experiment')) {
      updates.metrics = true;
    }
    if (lowerText.includes('accessibility') || lowerText.includes('wcag')) {
      updates.accessibility = true;
    }

    if (Object.keys(updates).length > 0) {
      setCoverageTags(prev => ({ ...prev, ...updates }));
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported. Please use Chrome.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;

      addUserMessage(text);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      isRecordingRef.current = false;
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        recognition.start(); // Restart if still recording
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    isRecordingRef.current = true;
    setIsRecording(true);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  const addUserMessage = (text: string) => {
    setTranscript(prev => [...prev, { role: 'You', text }]);
    updateCoverageTags(text);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      addUserMessage(textInput);
      setTextInput('');
    }
  };

  const speakText = async (text: string) => {
    if (isMuted) return;

    try {
      setIsSpeaking(true);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('TTS request failed');
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('TTS error:', error);
      setIsSpeaking(false);
    }
  };

  const askCoach = async () => {
    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          prompt,
          transcript,
          coverageTags,
          screenshotCount: screenshots.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Coach request failed');
      }

      const data = await response.json();

      if (data.error) {
        setTranscript(prev => [...prev, { role: 'Coach', text: `Error: ${data.error}` }]);
        return;
      }

      let fullNudge = data.nudge;
      if (data.coverageNudge) {
        fullNudge += ` ${data.coverageNudge}`;
      }

      setTranscript(prev => [...prev, { role: 'Coach', text: fullNudge }]);
      speakText(fullNudge);
    } catch (error) {
      console.error('Coach error:', error);
      setTranscript(prev => [...prev, { role: 'Coach', text: 'Failed to get coaching nudge.' }]);
    }
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScreenshots(prev => [...prev, {
            url: event.target!.result as string,
            name: file.name,
          }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const endAndDebrief = async () => {
    setIsRunning(false);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phase,
          prompt,
          transcript,
          coverageTags,
          screenshotCount: screenshots.length,
        }),
      });

      if (!response.ok) {
        throw new Error('Evaluation request failed');
      }

      const data = await response.json();

      if (data.error) {
        alert(`Evaluation error: ${data.error}`);
        return;
      }

      // Display evaluation
      const formatted = JSON.stringify(data, null, 2);
      alert(`Evaluation Complete!\n\n${formatted}`);

      setTranscript(prev => [...prev, { role: 'Coach', text: 'Debrief ready. Check the alert for your scores and recommendations.' }]);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Failed to generate evaluation.');
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#fff' }}>
      {/* Left Sidebar */}
      <div style={{
        width: '320px',
        background: '#f8f9fa',
        borderRight: '1px solid #dee2e6',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}>
        {/* Phase & Timer */}
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Phase: {phase}</h2>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#007bff' }}>
            {formatTime(timeLeft)}
          </div>
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => changePhase('Discovery')}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                background: phase === 'Discovery' ? '#007bff' : '#fff',
                color: phase === 'Discovery' ? '#fff' : '#000',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Discovery
            </button>
            <button
              onClick={() => changePhase('Heads-down')}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                background: phase === 'Heads-down' ? '#007bff' : '#fff',
                color: phase === 'Heads-down' ? '#fff' : '#000',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Heads-down
            </button>
            <button
              onClick={() => changePhase('Presentation')}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                background: phase === 'Presentation' ? '#007bff' : '#fff',
                color: phase === 'Presentation' ? '#fff' : '#000',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Presentation
            </button>
          </div>
        </div>

        {/* Recording Controls */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Speech Controls</h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                padding: '10px 15px',
                background: isRecording ? '#dc3545' : '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{
                padding: '10px 15px',
                background: isMuted ? '#6c757d' : '#007bff',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>
          {isSpeaking && <div style={{ marginTop: '5px', fontSize: '12px', color: '#007bff' }}>Speaking...</div>}
        </div>

        {/* Prompt */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Design Prompt</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{
              width: '100%',
              minHeight: '80px',
              padding: '10px',
              fontSize: '13px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Ask Coach Button */}
        <button
          onClick={askCoach}
          style={{
            padding: '12px',
            background: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          Ask Coach
        </button>

        {/* Coverage Tags */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Coverage</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(coverageTags).map(([tag, covered]) => (
              <span
                key={tag}
                style={{
                  padding: '5px 10px',
                  fontSize: '12px',
                  background: covered ? '#28a745' : '#e9ecef',
                  color: covered ? '#fff' : '#6c757d',
                  borderRadius: '12px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Screenshot Upload */}
        <div>
          <h3 style={{ fontSize: '14px', marginBottom: '10px' }}>Figma Screenshots</h3>
          <input
            type="file"
            accept="image/png,image/jpeg"
            multiple
            onChange={handleScreenshotUpload}
            style={{ fontSize: '12px' }}
          />
          {screenshots.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
              {screenshots.map((screenshot, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={screenshot.url}
                    alt={screenshot.name}
                    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* End Button */}
        <button
          onClick={endAndDebrief}
          style={{
            padding: '12px',
            background: '#dc3545',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            marginTop: 'auto',
          }}
        >
          End & Debrief
        </button>
      </div>

      {/* Main Transcript Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          background: '#fff',
        }}>
          {transcript.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: '15px',
                padding: '12px',
                background: msg.role === 'Coach' ? '#e7f3ff' : '#f8f9fa',
                borderRadius: '8px',
                borderLeft: `4px solid ${msg.role === 'Coach' ? '#007bff' : '#28a745'}`,
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '5px', fontSize: '14px' }}>
                {msg.role}
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>

        {/* Text Input at Bottom */}
        <div style={{
          padding: '15px',
          borderTop: '1px solid #dee2e6',
          background: '#f8f9fa',
          display: 'flex',
          gap: '10px',
        }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Type your message (optional)..."
            style={{
              flex: 1,
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ced4da',
              borderRadius: '4px',
            }}
          />
          <button
            onClick={handleTextSubmit}
            style={{
              padding: '10px 20px',
              background: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* Hidden audio element for TTS */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
}
