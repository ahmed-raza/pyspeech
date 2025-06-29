'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const audioRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      socketRef.current = ws;
    };

    ws.onmessage = (event) => {
      setMessages((prev) => [...prev, event.data]);
    };

    ws.onerror = (e) => {
      console.error('❌ WebSocket error:', e);
    };

    ws.onclose = () => {
      console.log('❎ WebSocket closed');
    };

    return () => {
      ws.close();
    };
  }, []);

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript && socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(finalTranscript);
        console.log('Sent:', finalTranscript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      console.log('Speech recognition ended, restarting...');
      if (listening) {
        recognition.start();
      }
    };

    recognition.start();
  };


  const startMic = async () => {
    if (listening) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Clear previous bars
      if (audioRef.current) {
        audioRef.current.innerHTML = '';
      }

      const bars = Array.from({ length: bufferLength }, () => {
        const bar = document.createElement('div');
        bar.className = 'w-1 bg-lime-400 mx-[1px] transition-all';
        audioRef.current?.appendChild(bar);
        return bar;
      });

      const animate = () => {
        requestAnimationFrame(animate);
        analyser.getByteFrequencyData(dataArray);
        bars.forEach((bar, i) => {
          const height = dataArray[i] / 2;
          bar.style.height = `${height}px`;
        });
      };

      animate();
      setListening(true);
      startSpeechRecognition();
    } catch (err) {
      console.error('Mic error:', err);
    }
  };

  const stopMic = () => {
    setListening(false);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.innerHTML = '';
    }
  };

  return (
    <main className="h-screen w-screen flex flex-col">
      {/* Top 70% */}
      <section className="flex-[7] bg-gradient-to-br from-slate-800 to-gray-900 flex flex-col items-center justify-center relative">
        {listening &&
            <button
              onClick={stopMic}
              className="bg-red-600 text-white px-8 py-4 text-xl font-bold rounded-2xl shadow-lg hover:bg-red-700 hover:scale-105 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
            >
              End Call
            </button>
        }

        {!listening &&
          <button
            onClick={startMic}
            className="bg-white text-purple-700 px-8 py-4 text-xl font-extrabold rounded-2xl shadow-xl hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-200 ease-out cursor-pointer"
          >
            Call AI
          </button>
        }
        <div
          ref={audioRef}
          className="absolute bottom-8 flex items-end h-32 w-full justify-center"
        ></div>
      </section>

      {/* Bottom 30% */}
      <section className="flex-[3] bg-black text-green-400 p-4 overflow-y-auto text-sm font-mono">
        {messages.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </section>
    </main>
  );
}
