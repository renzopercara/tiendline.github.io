import { h } from "preact";
import { useState, useEffect } from "preact/hooks";

// Función de mezcla (Fisher-Yates shuffle)
const shuffleArray = (array) => {
    // Creamos una copia para no modificar el array original
    const shuffled = [...array]; 
    for (let i = shuffled.length - 1; i > 0; i--) {
        // Escoge un elemento restante al azar
        const j = Math.floor(Math.random() * (i + 1));
        // Intercambia el elemento actual con el elemento elegido
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const SponsorsSlider = () => {
    // 1. Array original (sin cambios)
    const originalSponsors = [
        'images/sponsors/Bovier.jpg',
        'images/sponsors/Calisa.png',
        'images/sponsors/Cimes.jpg',
        'images/sponsors/CN.png',
        'images/sponsors/Cueva Cervecera.png',
        'images/sponsors/El-tata.png',
        'images/sponsors/escorpio.png',
        'images/sponsors/Fresa.png',
        'images/sponsors/Friburg.png',
        'images/sponsors/fruteria_crespo_logo_fixed.png',
        'images/sponsors/Gotas de sol.jpg',
        'images/sponsors/Gottig.png',
        'images/sponsors/Hielos-pachin.png',
        'images/sponsors/IMG-20251021-WA0058.jpg',
        'images/sponsors/IMG-20251022-WA0014.jpg',
        'images/sponsors/IMG-20251028-WA0026.jpg',
        'images/sponsors/Indiv Ingeniería 5.jpg',
        'images/sponsors/LACYB.png',
        'images/sponsors/LIAM logo solo.png',
        'images/sponsors/Logo COMO ME QUEDA_.jpg',
        'images/sponsors/Logo Darcy.jpg',
        'images/sponsors/logo JM Cortinados fondo blanco.png',
        'images/sponsors/Logo Pedrito Deportes.png',
        'images/sponsors/Logo Realeza Gourmet.png',
        'images/sponsors/Logo Sporty Crespo.png',
        'images/sponsors/Logo WWW.png',
        'images/sponsors/Logo zapatería Lindt_.jpg',
        'images/sponsors/Loris-Bitar.png',
        'images/sponsors/nomade.jpeg',
        'images/sponsors/pantalla grupo spretz-03.jpg',
        'images/sponsors/toto.png',
    ];

    // 2. Aplicar la mezcla solo en el montaje inicial
    const [sponsors] = useState(() => shuffleArray(originalSponsors));

    const [activeIndex, setActiveIndex] = useState(0);

    // Lógica para el auto-avance del slider
    useEffect(() => {
        if (sponsors.length === 0) return;
        
        const interval = setInterval(() => {
            setActiveIndex(prevIndex => (prevIndex + 1) % sponsors.length);
        }, 3000); 

        return () => clearInterval(interval);
    }, [sponsors.length]);

    if (sponsors.length === 0) {
        return null;
    }


    // --- CAMBIO CLAVE: Obtener los 5 índices visibles (2 a la izquierda, 2 a la derecha) ---
    const getVisibleIndices = () => {
        const len = sponsors.length;
        const center = activeIndex;
        
        // Elementos a la izquierda
        const left1 = (center - 1 + len) % len;
        const left2 = (center - 2 + len) % len;
        
        // Elementos a la derecha
        const right1 = (center + 1) % len;
        const right2 = (center + 2) % len;
        
        return { center, left1, left2, right1, right2 };
    };

    const { center, left1, left2, right1, right2 } = getVisibleIndices();
    const visibleIndices = [center, left1, left2, right1, right2];
    // ------------------------------------------------------------------------------------

    // Altura del contenedor ajustada para 5 elementos (un poco más alto)
    return h('div', { className: 'py-4 bg-gray-50 border-b border-gray-200 overflow-hidden' },
        h('div', { className: 'flex justify-center items-center h-24 sm:h-28 md:h-32 space-x-3 transition-all duration-500 ease-in-out' },
            sponsors.map((src, index) => {
                
                // Si el índice no está en el conjunto de 5 visibles, no lo renderizamos
                if (!visibleIndices.includes(index)) {
                    return null;
                }

                let scaleClass = 'scale-75 opacity-50'; // Por defecto, es pequeño y tenue
                let sizeClass = 'h-14 w-14 sm:h-16 sm:w-16'; // Tamaño más pequeño

                if (index === center) {
                    // 1. Imagen central (MÁS GRANDE)
                    scaleClass = 'scale-100 opacity-100 shadow-xl ring-4 ring-indigo-500/50'; 
                    sizeClass = 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28'; 
                } else if (index === left1 || index === right1) {
                    // 2. Primer nivel lateral (Mediano)
                    scaleClass = 'scale-90 opacity-90 shadow-md'; 
                    sizeClass = 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24';
                } else if (index === left2 || index === right2) {
                    // 3. Segundo nivel lateral (Más pequeño)
                    scaleClass = 'scale-80 opacity-70'; 
                    sizeClass = 'h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20';
                }
                
                // Nota: Usamos 'block' o 'flex' en lugar de 'visibilityClass'
                return h('div', { 
                    key: src, 
                    className: `flex items-center justify-center p-1 bg-white rounded-lg transition-all duration-500 ${scaleClass} ${sizeClass} flex-shrink-0`,
                },
                    h('img', { 
                        src: src, 
                        alt: `Sponsor ${index + 1}`,
                        className: 'max-h-full max-w-full object-contain'
                    })
                );
            })
        )
    );
};