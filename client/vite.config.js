import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Keep your existing Tailwind CSS plugin
import { viteStaticCopy } from 'vite-plugin-static-copy' // <-- ADD THIS IMPORT

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Your existing Tailwind CSS plugin
    viteStaticCopy({ // <-- ADD THIS PLUGIN CONFIGURATION
      targets: [
        {
          src: 'node_modules/tinymce', // Source: the tinymce folder in your node_modules
          dest: 'tinymce' // Destination: the root of your public folder (e.g., public/tinymce)
        }
      ]
    })
  ],
  server: {
    host: true, // Needed to expose the server to the Docker network
    port: 5173, // Ensure this matches your docker-compose port mapping
    watch: {
      usePolling: true, // Forces Vite to check for file changes manually
      interval: 100,    // How often to check (in milliseconds)
    },
  },
})