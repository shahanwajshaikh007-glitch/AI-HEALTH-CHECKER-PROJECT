/**
 * VoiceInputButton.jsx — Robust Web Speech API Microphone Component.
 * Accurately captures voice input without stutter, repetition, or duplicate appends.
 */

import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VoiceInputButton({ onTranscript, currentText = '', className = '' }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const baseTextRef = useRef('');

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Voice recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    try {
      // Snapshot the initial text before speech starts
      baseTextRef.current = (currentText || '').trim();

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      // Use navigator language or fallback to en-US
      recognition.lang = navigator.language || 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        toast.success('Listening... Speak your symptoms clearly.', { id: 'mic-toast', duration: 3000 });
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const item = event.results[i];
          const transcriptChunk = item[0].transcript;
          if (item.isFinal) {
            finalTranscript += transcriptChunk + ' ';
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const recognizedSessionText = (finalTranscript + interimTranscript).trim();

        if (recognizedSessionText && onTranscript) {
          const combined = baseTextRef.current
            ? `${baseTextRef.current} ${recognizedSessionText}`
            : recognizedSessionText;

          onTranscript(combined);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition warning/error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          toast.error('Microphone permission denied. Please allow microphone access in browser settings.', { id: 'mic-toast' });
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // Do not treat silence as fatal error, wait or allow manual stop
        } else {
          toast.error(`Microphone: ${event.error}`, { id: 'mic-toast' });
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
      toast.error('Could not initialize microphone access.');
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore if already stopped
      }
    }
    setIsListening(false);
    toast.dismiss('mic-toast');
    toast.success('Voice captured!', { duration: 2000 });
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer select-none ${
        isListening
          ? 'bg-red-500 text-white shadow-lg shadow-red-200 ring-2 ring-red-400 animate-pulse'
          : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
      } ${className}`}
      title={isListening ? 'Click to finish speaking' : 'Start voice symptom input'}
    >
      {isListening ? (
        <>
          <MicOff className="w-4 h-4 text-white animate-bounce" />
          <span className="font-semibold">Listening... (Tap to Stop)</span>
        </>
      ) : (
        <>
          <Mic className="w-4 h-4 text-red-500" />
          <span>Voice Input 🎤</span>
        </>
      )}
    </button>
  );
}
