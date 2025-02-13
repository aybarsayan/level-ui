'use client';
import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

const Avatar = ({ src, alt }: { src: string; alt: string }) => (
  <div className="w-12 h-12 rounded-full overflow-hidden relative">
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
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="flex flex-col h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <div className="bg-white shadow-lg p-6">
        <div className="flex justify-between items-center">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex flex-col items-center gap-1">
              <Avatar src="/levelLogo.png" alt="Bot Logo" />
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-[#FFA302] text-transparent bg-clip-text">
                Level Asistan
              </span>
              <span className="text-sm text-gray-600">
                Mahallenin Oyuncu Abisi
              </span>
            </div>
          </motion.div>
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
                <Avatar src="/levelLogo.png" alt="Bot Avatar" />
              )}
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className={`max-w-[70%] rounded-2xl p-4 ${
                  message.sender === 'user'
                    ? 'bg-gradient-to-r from-amber-500 to-[#FFA302] text-white'
                    : 'bg-white text-gray-800'
                } shadow-lg`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
              </motion.div>
              {message.sender === 'user' && (
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-[#FFA302] flex items-center justify-center">
                  <User className="text-white w-6 h-6" />
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
            <Avatar src="/levelLogo.png" alt="Bot Avatar" />
            <div className="bg-white rounded-2xl p-4 shadow-lg">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="w-5 h-5 text-[#FFA302]" />
              </motion.div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <motion.form 
        onSubmit={handleSendMessage} 
        className="bg-white p-6 shadow-lg"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
      >
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={inputMessage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            className="flex-1 p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFA302] transition-all bg-white text-gray-800 placeholder-gray-500"
            disabled={isLoading}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`text-white p-4 rounded-xl shadow-lg transition-all ${
              isLoading 
                ? 'opacity-50 cursor-not-allowed bg-gradient-to-r from-amber-400 to-[#FFA302]' 
                : 'bg-gradient-to-r from-amber-500 to-[#FFA302] hover:from-amber-600 hover:to-[#e59202]'
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