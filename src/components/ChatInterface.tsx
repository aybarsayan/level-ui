'use client';
import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Loader2, Sun, Moon } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const Avatar = ({ src, alt }: { src: string; alt: string }) => (
  <div className="w-10 h-10 rounded-xl overflow-hidden relative shadow-lg border-2 border-blue-500/20">
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(max-width: 48px) 100vw"
      className="object-cover"
      priority
    />
  </div>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(darkModePreference);
  }, []);

  // Asistan ve vektör store'u başlat
  useEffect(() => {
    const initializeAssistant = async () => {
      try {
        const response = await fetch('/api/analiz/init', {
          method: 'POST',
        });
        if (!response.ok) {
          throw new Error('Asistan başlatılamadı');
        }
        console.log('Asistan başarıyla başlatıldı');
      } catch (error) {
        console.error('Asistan başlatma hatası:', error);
      }
    };

    initializeAssistant();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/analiz/test', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(threadId && { 'X-Thread-Id': threadId })
        },
        body: JSON.stringify({ 
          prompt: inputMessage,
          threadId: threadId 
        })
      });

      // Thread ID'yi headerdan al
      const newThreadId = response.headers.get('X-Thread-Id');
      if (newThreadId) {
        setThreadId(newThreadId);
        console.log('Thread ID:', newThreadId);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botMessageText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  botMessageText += data.content;
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.sender === 'bot') {
                      return [...prev.slice(0, -1), {
                        id: lastMessage.id,
                        text: botMessageText,
                        sender: 'bot'
                      }];
                    } else {
                      return [...prev, {
                        id: Date.now(),
                        text: botMessageText,
                        sender: 'bot'
                      }];
                    }
                  });
                }
              } catch (error) {
                console.error('Error parsing JSON:', error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setThreadId(null); // Hata durumunda thread'i sıfırla
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  return (
    <div className={`flex flex-col h-screen ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100' 
        : 'bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-800'
    }`}>
      <div className={`${
        isDarkMode ? 'bg-gray-800/50 shadow-2xl' : 'bg-white/80 shadow-lg'
      } backdrop-blur-lg p-6 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex justify-between items-center max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4"
          >
            <div className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg">
              <Avatar src="/levelLogo.png" alt="Bot Logo" />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white font-sans">Level Asistan</span>
                <span className="text-sm text-blue-100 font-medium">
                  Mahallenin Oyuncu Abisi
                </span>
              </div>
            </div>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`p-3 rounded-xl ${
              isDarkMode 
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            } transition-all duration-300 shadow-lg`}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-6xl mx-auto w-full">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-end gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <Avatar src="/levelLogo.png" alt="Bot Avatar" />
              )}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/20'
                    : isDarkMode 
                      ? 'bg-gray-700/50 text-gray-100 shadow-gray-900/30' 
                      : 'bg-white text-gray-800 shadow-gray-200/50'
                } shadow-lg backdrop-blur-sm border ${
                  message.sender === 'user'
                    ? 'border-blue-600/20'
                    : isDarkMode
                      ? 'border-gray-600/20'
                      : 'border-gray-200/50'
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed font-medium">{message.text}</p>
              </motion.div>
              {message.sender === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                  <User className="text-white w-5 h-5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Avatar src="/levelLogo.png" alt="Bot Avatar" />
            <div className={`${
              isDarkMode ? 'bg-gray-700/50' : 'bg-white'
            } rounded-xl p-4 shadow-lg backdrop-blur-sm border ${
              isDarkMode ? 'border-gray-600/20' : 'border-gray-200/50'
            }`}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5 text-blue-500" />
              </motion.div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.form 
        onSubmit={handleSendMessage} 
        className={`${
          isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'
        } p-6 backdrop-blur-lg border-t ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        } shadow-lg`}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className={`flex-1 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium ${
              isDarkMode 
                ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-500'
            } border shadow-lg backdrop-blur-sm`}
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-4 rounded-xl shadow-lg transition-all ${
              isLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : isDarkMode 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
            } text-white`}
            disabled={isLoading}
          >
            <Send className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
};

export default ChatInterface;