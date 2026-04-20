import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    port: 9999,
  },
  base: './', // Thiết lập đường dẫn tương đối để dễ dàng deploy lên Github Pages
})
