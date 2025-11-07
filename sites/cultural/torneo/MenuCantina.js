import { useState, useEffect} from "preact/hooks";
import { MENU_URL } from "./contants-2.js";
import { h } from "preact";
import { LoadingSpinner } from "./common.js";
import { Coffee, Utensils, Zap } from "lucide-preact";

const getIconForCategory = (category) => {
    const lowerCategory = category.toLowerCase();
    if (lowerCategory.includes('bebida') || lowerCategory.includes('agua')) return h(Coffee, { className: "w-6 h-6 mr-3 text-indigo-400" });
    if (lowerCategory.includes('comida') || lowerCategory.includes('plato')) return h(Utensils, { className: "w-6 h-6 mr-3 text-indigo-400" });
    if (lowerCategory.includes('postre') || lowerCategory.includes('dulce')) return h(Zap, { className: "w-6 h-6 mr-3 text-indigo-400" });
    return null;
};

export const MenuCantina = () => {
    const [menuData, setMenuData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchMenu = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(MENU_URL); 
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const rawData = await response.json(); 
                
                const categories = rawData.reduce((acc, item) => {
                    const type = item.category || 'Varios';
                    if (!acc[type]) {
                        acc[type] = [];
                    }
                    acc[type].push({ name: item.name, price: item.price });
                    return acc;
                }, {});

                setMenuData(categories);
            } catch (e) {
                console.error("Fetch Menu error:", e);
                setError('Error al cargar el menú. Verifique la conexión a Internet o que la Web App esté publicada correctamente.');
            } finally {
                setLoading(false);
            }
        };

        fetchMenu();
    }, []);

    const formatPrice = (price) => `$${price.toFixed(0)}`; 
    
    if (loading) {
        return h('div', { className: 'p-8 text-center mt-20' }, h(LoadingSpinner));
    }

    if (error) {
        return h('div', { className: 'p-8 text-center text-red-600 font-semibold border-2 border-red-300 rounded-lg mt-20' }, error);
    }
    
    if (Object.keys(menuData).length === 0) {
        return h('div', { className: 'p-8 text-center text-gray-500 font-semibold mt-20' }, 'El menú de la cantina está vacío o no hay productos disponibles.');
    }

    return h('div', { 
            className: 'p-4 sm:p-6 bg-gray-50 rounded-xl shadow-2xl mt-[70px] max-w-4xl mx-auto min-h-screen border border-gray-100' 
        },
        // --- Encabezado Dinámico y Moderno ---
        h('div', { className: 'text-center mb-8 pb-4 border-b-4 border-indigo-500/20' },
            h('h2', { className: 'text-4xl font-extrabold text-gray-900 tracking-tight' }, 'La Cantina 🍔'),
        ),
        
        // --- Renderizar Categorías (Diseño Modular) ---
        h('div', { className: 'space-y-8' },
            Object.keys(menuData).map(category => 
                h('div', { key: category, className: 'bg-white p-4 rounded-2xl shadow-lg border border-gray-100 transform hover:scale-[1.01] transition-all duration-300 ease-in-out' },
                    // Título de la Categoría con Ícono y Separación
                    h('div', { className: 'flex items-center mb-4 border-b pb-2 border-gray-200' },
                        getIconForCategory(category),
                        h('h3', { className: 'text-xl font-extrabold text-indigo-700 tracking-wide' }, category),
                    ),
                    
                    // Lista de Productos (Diseño de Lista Compacta y Clara)
                    h('ul', { className: 'space-y-3' },
                        menuData[category].map(item =>
                            h('li', { key: item.name, className: 'flex justify-between items-center text-gray-800 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0' },
                                // Nombre del Producto (Texto grande y claro)
                                h('span', { className: 'text-base font-semibold pr-4 leading-snug' }, item.name),
                                // Precio (Badge flotante y contrastante)
                                h('span', { className: 'text-lg font-black text-white bg-lime-600 px-3 py-1 rounded-full shadow-md whitespace-nowrap' }, formatPrice(item.price))
                            )
                        )
                    )
                )
            )
        )
    );
};