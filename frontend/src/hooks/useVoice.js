import { useState, useRef, useCallback } from 'react';

export function useVoice() {
  const [state, setState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('en-IN');
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const isSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported. Please use Chrome.');
      setState('error');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setState('listening');
      setTranscript('');
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied.');
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setState('error');
    };

    recognition.onend = () => {
      // Will be set to 'thinking' by the caller
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!text) { resolve(); return; }

      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => {
        setState('idle');
        resolve();
      };
      utterance.onerror = () => {
        setState('idle');
        resolve();
      };

      setState('speaking');
      synthRef.current.speak(utterance);
    });
  }, [language]);

  const stopSpeaking = useCallback(() => {
    synthRef.current.cancel();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    stopListening();
    stopSpeaking();
    setTranscript('');
    setError(null);
    setState('idle');
  }, [stopListening, stopSpeaking]);

  return {
    state, setState, transcript, setTranscript, error, setError,
    language, setLanguage, isSupported,
    startListening, stopListening, speak, stopSpeaking, reset,
  };
}
