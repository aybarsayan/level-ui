'use client';
import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Loader2, LogOut, Download } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Achievement from './Achievement';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
}

interface UserData {
  name: string;
  email: string;
  image: string | null;
}

interface MessageWithPdf extends Message {
  pdfUrl?: string;
  showPdf?: boolean;
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

function extractCitation(text: string) {
  // Return false if there's no closing bracket - incomplete citation
  if (!text.includes('】')) {
    return false;
  }

  // Find the last opening bracket
  const lastOpenBracket = text.lastIndexOf('【');
  if (lastOpenBracket === -1) {
    return false;
  }

  // Get the substring between the last opening bracket and the closing bracket
  const potentialCitation = text.slice(lastOpenBracket);
  const closingBracketIndex = potentialCitation.indexOf('】');
  
  if (closingBracketIndex === -1) {
    return false;
  }

  // Extract the citation content
  const citationContent = potentialCitation.slice(0, closingBracketIndex + 1);
  
  // Check if it matches the expected format
  const regex = /【\d+:\d+†(.+?)】/;
  const match = citationContent.match(regex);

  if (!match) {
    return false;
  }

  // Return just the filename
  return match[1];
}

// Worker URL'ini statik olarak tanımla
const WORKER_URL = '/pdf-worker/pdf.worker.min.js';

const ChatInterface = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<MessageWithPdf[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [achievementVisible, setAchievementVisible] = useState(false);
  const [citation, setCitation] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const messageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri alınamadı:', error);
        router.push('/');
      }
    };

    fetchUserData();
  }, [router]);

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    // Yeni mesaj başladığında citation'ı ve PDF'i temizle
    setCitation('');
    setSelectedPdf(null);
    
    const userMessage: MessageWithPdf = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      pdfUrl: undefined
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

      const newThreadId = response.headers.get('X-Thread-Id');
      if (newThreadId) {
        setThreadId(newThreadId);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let botMessageText = '';
      let foundCitation = false;

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
                  
                  // Citation kontrolünü sadece bir kez yap
                  if (!foundCitation) {
                    const newCitation = extractCitation(botMessageText);
                    if (newCitation !== false && newCitation !== citation) {
                      console.log('Found Citation:', newCitation);
                      setCitation(newCitation);
                      setAchievementVisible(true);
                      foundCitation = true;
                      // Citation bulunduğunda bir kez PDF'i indir
                      await handleDownload(newCitation);
                    }
                  }

                  // Mesajı güncelle ama PDF'i koruyarak
                  setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.sender === 'bot') {
                      return [...prev.slice(0, -1), {
                        ...lastMessage,
                        text: botMessageText,
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
      setThreadId(null);
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: false 
      });
      router.push('/');
    } catch (error) {
      console.error('Çıkış yapılırken hata oluştu:', error);
    }
  };

  const handleDownload = async (filename: string) => {
    if (isDownloading || !filename) return;

    try {
      setIsDownloading(true);
      console.log('Downloading PDF:', filename);
      
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error('İndirme hatası');
      }

      const { data } = await response.json();
      console.log('PDF data received, length:', data.length);
      console.log('PDF data starts with:', data.substring(0, 50));
      
      // Son mesajı güncelle ve yeni PDF'i ekle
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.sender === 'bot') {
          return [...prev.slice(0, -1), {
            ...lastMessage,
            pdfUrl: data,
            showPdf: true
          }];
        }
        return prev;
      });
      
    } catch (error) {
      console.error('Dosya indirme hatası:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // PDF görüntüleyici bileşenlerini güncelleyelim
  const PDFViewer = ({ url }: { url: string }) => {
    console.log('Rendering PDF with URL:', url.substring(0, 50));
    
    return (
      <div className="w-[400px] h-[500px] rounded-lg overflow-hidden bg-white shadow-lg border border-gray-100">
        <object
          data={url}
          type="application/pdf"
          className="w-full h-full"
          style={{
            border: 'none',
            borderRadius: '8px',
          }}
        >
          <embed
            src={url}
            type="application/pdf"
            className="w-full h-full"
          />
        </object>
      </div>
    );
  };

  const ModalPDFViewer = ({ url }: { url: string }) => {
    console.log('Rendering Modal PDF with URL:', url.substring(0, 50));
    
    return (
      <div className="w-full h-full">
        <object
          data={url}
          type="application/pdf"
          className="w-full h-full"
        >
          <embed
            src={url}
            type="application/pdf"
            className="w-full h-full"
          />
        </object>
      </div>
    );
  };

  return (
    <>
      <Achievement
        title="Kaynak Bulundu!"
        subtitle={citation}
        isVisible={achievementVisible}
        onClose={() => setAchievementVisible(false)}
      />
      
      {/* PDF Modal */}
      <AnimatePresence>
        {selectedPdf && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPdf(null)}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-[90vw] h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <ModalPDFViewer url={selectedPdf} />
              <button
                onClick={() => setSelectedPdf(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 bg-gray-50 p-2 px-4 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {userData?.image ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden relative">
                      <Image
                        src={userData.image}
                        alt="Profil"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-[#FFA302] flex items-center justify-center">
                      <User className="text-white w-6 h-6" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {userData?.name || 'Kullanıcı'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {userData?.email}
                    </span>
                  </div>
                </div>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#FFA302] text-white hover:from-amber-600 hover:to-[#e59202] transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Çıkış Yap</span>
              </motion.button>
            </div>
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
                className={`flex items-start gap-4 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'bot' && (
                  <Avatar src="/levelLogo.png" alt="Bot Avatar" />
                )}
                <div className="flex items-start gap-4 max-w-[90%]">
                  <motion.div
                    ref={(el) => messageRefs.current[message.id] = el}
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={`rounded-2xl p-4 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-[#FFA302] text-white'
                        : 'bg-white text-gray-800'
                    } shadow-lg flex-shrink-0`}
                    style={{ 
                      maxWidth: message.pdfUrl ? '350px' : '100%',
                      width: message.pdfUrl ? '350px' : 'auto'
                    }}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  </motion.div>
                  {message.pdfUrl && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group cursor-pointer"
                      style={{
                        marginTop: messageRefs.current[message.id] ? 
                          `${(messageRefs.current[message.id]?.offsetHeight || 0) / 2 - 250}px` : '0'
                      }}
                      onClick={() => setSelectedPdf(message.pdfUrl)}
                    >
                      <PDFViewer url={message.pdfUrl} />
                      {/* Maximize indicator */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                        <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                            />
                          </svg>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
                {message.sender === 'user' && (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-[#FFA302] flex items-center justify-center flex-shrink-0">
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
    </>
  );
};

export default ChatInterface;