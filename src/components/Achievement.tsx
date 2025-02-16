'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

interface AchievementProps {
  title: string;
  subtitle: string;
  isVisible: boolean;
  onClose: () => void;
}

const Achievement = ({ title, subtitle, isVisible, onClose }: AchievementProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Başarım sesi çal
      const audio = new Audio('/achievement.mp3'); // Ses dosyasını eklemeyi unutmayın
      audio.play().catch(console.error);

      // 5 saniye sonra otomatik kapat
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.5 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 cursor-pointer"
        >
          <motion.div
            animate={isExpanded ? "expanded" : "collapsed"}
            variants={{
              expanded: { width: "400px", height: "auto" },
              collapsed: { width: "300px", height: "auto" }
            }}
            className="bg-white rounded-xl shadow-lg overflow-hidden"
          >
            <div className="relative">
              {/* Parıltı efekti */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="absolute inset-0 bg-gradient-to-r from-amber-200/30 to-[#FFA302]/30 rounded-xl"
              />

              <div className="relative p-4 flex items-center gap-4">
                <div className="flex-shrink-0">
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [0, 10, -10, 0]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                    className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-[#FFA302] flex items-center justify-center"
                  >
                    <Trophy className="w-6 h-6 text-white" />
                  </motion.div>
                </div>

                <div className="flex-1">
                  <motion.h3
                    animate={{ color: ["#f59e0b", "#FFA302", "#f59e0b"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="font-bold text-lg bg-gradient-to-r from-amber-500 to-[#FFA302] text-transparent bg-clip-text"
                  >
                    {title}
                  </motion.h3>
                  
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-sm text-gray-600 mt-1"
                  >
                    {subtitle}
                  </motion.p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Achievement; 