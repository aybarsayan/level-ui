'use client';
import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, Sun, Moon } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(darkModePreference);
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
      const response = await fetch('http://localhost:3000/analiz/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputMessage })
      });

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
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  return (
    <div className={`flex flex-col h-screen ${
      isDarkMode 
        ? 'bg-gradient-to-b from-gray-900 to-gray-800 text-white' 
        : 'bg-gradient-to-b from-gray-50 to-gray-100 text-gray-800'
    }`}>
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg p-6`}>
        <div className="flex justify-between items-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold flex items-center gap-3"
          >
            <Bot className={isDarkMode ? 'text-blue-400' : 'text-blue-500'} />
            AI Asistan
          </motion.h1>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className={`p-2 rounded-full ${
              isDarkMode ? 'bg-gray-700 text-yellow-400' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex items-end gap-2 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="text-white w-5 h-5" />
                </div>
              )}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : isDarkMode 
                      ? 'bg-gray-700 text-gray-100' 
                      : 'bg-white text-gray-800'
                } shadow-lg`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </motion.div>
              {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
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
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <Bot className="text-white w-5 h-5" />
            </div>
            <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-2xl p-4 shadow-lg`}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
              </motion.div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.form 
        onSubmit={handleSendMessage} 
        className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} p-6 shadow-lg`}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className={`flex-1 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-800 placeholder-gray-500'
            }`}
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`text-white p-4 rounded-xl shadow-lg transition-all ${
              isLoading 
                ? 'opacity-50 cursor-not-allowed' 
                : isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-blue-500 hover:bg-blue-600'
            }`}
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.form>
    </div>
  );
};

export default ChatInterface;