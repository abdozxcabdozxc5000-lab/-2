import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // تقسيم المكتبات الكبيرة إلى ملفات منفصلة لتحسين الأداء
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('recharts')) {
              return 'recharts-vendor';
            }
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('lucide')) {
              return 'lucide-vendor';
            }
            if (id.includes('framer-motion')) {
              return 'framer-vendor';
            }
            // باقي المكتبات في ملف عام
            return 'vendor';
          }
        },
      },
    },
  },
});