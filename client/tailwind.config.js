/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores bandera Colombia (logo)
        'colombia-amarillo': '#FFD700',
        'colombia-azul': '#004182',
        'colombia-rojo': '#D7281E',
        
        // Colores corporativos CSJ (Oficiales)
        'csj': {
          'azul': '#004182', // Azul Institucional
          'amarillo': '#FFD700', // Amarillo Institucional
          'rojo': '#D7281E', // Rojo Institucional
          'verde': '#359946', // Mantenemos verde solo para éxitos/estados
        },
        
        // Paleta de grises
        // Paleta de grises institucional
        'gray-custom': {
          100: '#AFAFAF',
          200: '#919191',
          300: '#696969',
        },
        
        // Semáforos para estados (Plan de Mejoramiento)
        'semaforo': {
          'rojo': '#D7281E',
          'amarillo': '#FFCF61',
          'verde': '#359946',
          'gris': '#919191',
        }
      },
      fontFamily: {
        'palatino': ['Palatino Linotype', 'Palatino', 'serif'],
        'montserrat': ['Montserrat', 'system-ui', 'sans-serif'],
        'cairo': ['Cairo', 'system-ui', 'sans-serif'],
        'sans': ['Montserrat', 'system-ui', 'sans-serif'], // Default
      },
    },
  },
  plugins: [],
}
