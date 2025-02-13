import ChatInterface from '../components/ChatInterface';

export default function Home() {
  const initializeAssistant = async () => {
    try {
      const response = await fetch('/api/analiz/init', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Initialization failed');
      }
      
      // Başarılı init'ten sonra test endpoint'ini çağır
      await testEndpoint();
      
    } catch (error) {
      console.error('Initialization error:', error);
    }
  };

  return (
    <main>
      <ChatInterface />
    </main>
  );
}