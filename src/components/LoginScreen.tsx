'use client';
import { useState, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const LoginScreen = () => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        if (isRegisterMode) {
          // Kayıt başarılı, giriş moduna geç
          setIsRegisterMode(false);
          setFormData({ ...formData, password: '' });
          setError('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
        } else {
          // Giriş başarılı, chat sayfasına yönlendir
          router.push('/chat');
        }
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err) {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 relative mb-4">
            <Image
              src="/levelLogo.png"
              alt="Level Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-[#FFA302] text-transparent bg-clip-text">
            Level Asistan
          </h1>
          <p className="text-gray-600 mt-2">Giriş Yap</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 text-red-500 p-4 rounded-lg mb-6 text-center"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              placeholder="Kullanıcı Adı"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFA302] transition-all"
              required
            />
          </div>
          
          {isRegisterMode && (
            <div>
              <input
                type="email"
                placeholder="E-posta"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFA302] transition-all"
                required
              />
            </div>
          )}

          <div>
            <input
              type="password"
              placeholder="Şifre"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FFA302] transition-all"
              required
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-4 rounded-xl text-white font-medium shadow-lg transition-all
              ${isLoading
                ? 'bg-gradient-to-r from-amber-400 to-[#FFA302] cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-[#FFA302] hover:from-amber-600 hover:to-[#e59202]'
              }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              <div className="flex items-center justify-center gap-2">
                <LogIn className="w-5 h-5" />
                <span>{isRegisterMode ? 'Kayıt Ol' : 'Giriş Yap'}</span>
              </div>
            )}
          </motion.button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-[#FFA302] hover:underline"
            >
              {isRegisterMode ? 'Zaten hesabınız var mı? Giriş yapın' : 'Hesabınız yok mu? Kayıt olun'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginScreen; 