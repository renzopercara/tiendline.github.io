import { h, render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, onSnapshot } from "firebase/firestore";
import { ChevronDown, ChevronUp } from "lucide-preact"; // Importar iconos si están disponibles, si no, se usarán clases.

// Nuevas URL para el torneo Suma 14 Mujeres
const AMERICANO_MUJERES_URL = 'https://script.google.com/macros/s/AKfycbyPGwyWFJ4gSQyge_1HQ4g6Xn3-3KxMjzduHf9mef6Arqr4BjZC5mrziZjFT6K4xpsl/exec?action=americano';
const SUMA_14_MUJERES_URL = 'https://script.google.com/macros/s/AKfycbyPGwyWFJ4gSQyge_1HQ4g6Xn3-3KxMjzduHf9mef6Arqr4BjZC5mrziZjFT6K4xpsl/exec?action=torneo14';

const tournamentData = [
    { 
        id: 0, 
        name: 'Americano Mujeres', 
        fullTitle: "Torneo Americano - Categoría Mujeres",
        icon: '🏆',
        description: "Partidos y Tabla de Posiciones actualizados en tiempo real.",
    },
    { 
        id: 1, 
        name: '7° Mujeres', 
        fullTitle: "Torneo 7° - Categoría Mujeres",
        icon: '♟️',
        description: "Aquí se mostrarán los datos detallados y las rondas del Torneo 7° de Mujeres (Damas).",
    },
    { 
        id: 2, 
        name: 'Suma 13 Hombres', 
        fullTitle: "Torneo Suma 13 - Categoría Hombres",
        icon: '🏅',
        description: "Resultados actualizados del Torneo Suma 13 de Hombres (Caballeros).",
    },
];

const FINAL_PHASE_GROUPS = ["OCTAVOS", "CUARTOS", "SEMI", "FINAL"];

/**
 * Calcula la tabla de posiciones y crea un mapa de nombre -> posición para el Americano.
 */
const calculateStandings = (matchData) => {
    const standingsMap = new Map();

    const updateScore = (playerName, score) => {
        if (!playerName) return;
        const currentScore = standingsMap.get(playerName) || 0;
        standingsMap.set(playerName, currentScore + score);
    };

    for (const match of matchData) {
        const scoreA = parseInt(match.scoreA) || 0;
        const scoreB = parseInt(match.scoreB) || 0;
        
        if (scoreA > 0 || scoreB > 0) {
            updateScore(match.player1A, scoreA);
            updateScore(match.player2A, scoreA);
            
            updateScore(match.player1B, scoreB);
            updateScore(match.player2B, scoreB);
        }
    }

    let standingsArray = Array.from(standingsMap, ([name, score]) => ({ name, score }));

    standingsArray.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        return a.name.localeCompare(b.name);
    });

    // Crear el mapa de posiciones (maneja empates)
    const positionMap = new Map();
    if (standingsArray.length > 0) {
        let currentRank = 1;
        let lastScore = standingsArray[0].score;

        for (let i = 0; i < standingsArray.length; i++) {
            const item = standingsArray[i];
            
            if (item.score < lastScore) {
                currentRank = i + 1;
            }
            positionMap.set(item.name, currentRank);
            lastScore = item.score;
        }
    }

    return { standingsArray, positionMap };
};

/**
 * Calcula la tabla de posiciones para el Suma 14 (por juegos, sets y diferencia).
 */
const calculateSum14Standings = (matchData, groupName) => {
    const standingsMap = new Map();
    const groupMatches = matchData.filter(m => m.group === groupName);

    const updatePlayerStats = (playerName, setsWon, setsLost, gamesWon, gamesLost) => {
        if (!playerName) return;
        const current = standingsMap.get(playerName) || { 
            name: playerName,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            matchesPlayed: 0
        };

        current.setsWon += setsWon;
        current.setsLost += setsLost;
        current.gamesWon += gamesWon;
        current.gamesLost += gamesLost;
        if (setsWon + setsLost > 0) {
             current.matchesPlayed += 1; // Solo si el partido tiene un resultado
        }
        standingsMap.set(playerName, current);
    };

    for (const match of groupMatches) {
        const set1A = parseInt(match.set1A) || 0;
        const set1B = parseInt(match.set1B) || 0;
        const set2A = parseInt(match.set2A) || 0;
        const set2B = parseInt(match.set2B) || 0;
        const tiebreakA = parseInt(match.tiebreakA) || 0; // 7-6
        const tiebreakB = parseInt(match.tiebreakB) || 0; // 7-6

        if (set1A + set1B + set2A + set2B + tiebreakA + tiebreakB === 0) continue; // Partido sin jugar

        // Set 1
        let setsA = 0;
        let setsB = 0;
        let gamesA = set1A + set2A;
        let gamesB = set1B + set2B;

        if (set1A > set1B) setsA++;
        if (set1B > set1A) setsB++;
        if (set2A > set2B) setsA++;
        if (set2B > set2A) setsB++;

        // Tiebreak (se cuenta como 7-6)
        if (tiebreakA === 1) {
            setsA++;
            gamesA += 7; gamesB += 6;
        }
        if (tiebreakB === 1) {
            setsB++;
            gamesB += 7; gamesA += 6;
        }
        
        // El puntaje del Suma 14 es el número de sets ganados
        updatePlayerStats(match.player1A, setsA, setsB, gamesA, gamesB);
        updatePlayerStats(match.player2A, setsA, setsB, gamesA, gamesB);
        
        updatePlayerStats(match.player1B, setsB, setsA, gamesB, gamesA);
        updatePlayerStats(match.player2B, setsB, setsA, gamesB, gamesA);
    }
    
    // Convertir a array y agregar puntos y diferencia
    let standingsArray = Array.from(standingsMap, ([name, data]) => ({ 
        ...data,
        points: data.setsWon, // En Suma 14 se puntuará por sets ganados
        gameDifference: data.gamesWon - data.gamesLost 
    }));

    // Ordenar: 1. Puntos (Sets Ganados), 2. Diferencia de Juegos, 3. Nombre
    standingsArray.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
        return a.name.localeCompare(b.name);
    });

    return standingsArray;
};

// Componente para el dropdown de grupos
const GroupDropdown = ({ groups, selectedGroup, onGroupChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    
    const toggleDropdown = () => setIsOpen(!isOpen);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownRef]);

    const handleSelect = (group) => {
        onGroupChange(group);
        setIsOpen(false);
    };

    return h('div', { className: 'relative inline-block w-full sm:w-auto', ref: dropdownRef },
        h('button', {
            type: 'button',
            className: 'w-full sm:w-64 flex justify-between items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors',
            onClick: toggleDropdown,
            'aria-expanded': isOpen
        },
            h('span', null, `Grupo: ${selectedGroup}`),
            isOpen ? h(ChevronUp, { className: 'h-5 w-5 ml-2' }) : h(ChevronDown, { className: 'h-5 w-5 ml-2' })
        ),
        isOpen && h('div', {
            className: 'absolute z-20 mt-1 w-full sm:w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 transition-opacity duration-75',
            role: 'menu',
            'aria-orientation': 'vertical',
            'aria-labelledby': 'menu-button'
        },
            groups.map(group => h('a', {
                key: group,
                onClick: () => handleSelect(group),
                className: `block px-4 py-2 text-sm cursor-pointer ${group === selectedGroup ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-100'}`,
                role: 'menuitem'
            }, group))
        )
    );
};

// Componente para la tabla de posiciones general (Americano/Firebase)
const PlayerTable = ({ standings, showRank = true }) => {
    return h('div', { className: 'mt-6 bg-white rounded-xl shadow-lg overflow-hidden' },
        h('div', { className: 'p-4 bg-gray-50 border-b' },
            h('h4', { className: 'text-lg font-bold text-gray-800' }, `Tabla de Posiciones (${standings.length})`)
        ),
        standings.length === 0
            ? h('p', { className: 'p-4 text-sm text-gray-500 text-center' }, 'Aún no hay jugadores registrados o resultados cargados en este torneo.')
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'min-w-full divide-y divide-gray-200' },
                    h('thead', { className: 'bg-gray-100' },
                        h('tr', null,
                            showRank ? h('th', { className: 'px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/12' }, '#') : null,
                            h('th', { className: 'px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-6/12' }, 'Nombre'),
                            h('th', { className: 'px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-5/12' }, 'Puntos')
                        )
                    ),
                    h('tbody', { className: 'bg-white divide-y divide-gray-200' },
                        standings.map((s, index) => h('tr', { key: s.name, className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50' },
                            showRank ? h('td', { className: 'px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900' }, index + 1) : null,
                            h('td', { className: 'px-3 py-4 whitespace-nowrap text-sm text-gray-700' }, s.name),
                            h('td', { className: 'px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right' }, s.score || s.points) // soporta ambos modelos
                        ))
                    )
                )
            )
    );
};

// Componente para la tabla de posiciones del Suma 14
const Sum14GroupTable = ({ standings }) => {
    return h('div', { className: 'mt-6 bg-white rounded-xl shadow-lg overflow-hidden' },
        h('div', { className: 'p-4 bg-gray-50 border-b' },
            h('h4', { className: 'text-lg font-bold text-gray-800' }, `Tabla de Posiciones`)
        ),
        standings.length === 0
            ? h('p', { className: 'p-4 text-sm text-gray-500 text-center' }, 'No hay resultados cargados para este grupo.')
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'min-w-full divide-y divide-gray-200 text-center' },
                    h('thead', { className: 'bg-gray-100' },
                        h('tr', null,
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[5%]' }, '#'),
                            h('th', { className: 'px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[35%]' }, 'Nombre'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'PJ'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'SF'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'SC'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'GF'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'GC'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'Dif')
                        )
                    ),
                    h('tbody', { className: 'bg-white divide-y divide-gray-200' },
                        standings.map((s, index) => h('tr', { key: s.name, className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50' },
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm font-medium text-gray-900' }, index + 1),
                            h('td', { className: 'px-3 py-4 whitespace-nowrap text-sm text-gray-700 text-left font-semibold' }, s.name),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-700' }, s.matchesPlayed),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-900 font-bold' }, s.setsWon),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-900 font-bold' }, s.setsLost),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-700' }, s.gamesWon),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-700' }, s.gamesLost),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-900 font-extrabold' }, s.gameDifference)
                        ))
                    )
                )
            )
    );
};


// 🟢 Componente para mostrar el nombre del jugador con su posición. (MODIFICADO)
const PlayerChip = ({ name, positionMap, showRank = true, isWinner = null }) => {
    
    // 1. Determinar clases CSS basadas en isWinner
    let chipClasses = 'inline-block px-3 py-1 text-xs font-medium rounded-full shadow-sm max-w-full truncate';
    
    if (isWinner === true) {
        // GANADOR: Fondo verde
        chipClasses += ' bg-green-200 text-green-800 border-green-400 border font-bold';
    } else if (isWinner === false) {
        // PERDEDOR: Fondo rojo
        chipClasses += ' bg-red-100 text-red-800 border-red-300 border';
    } else {
        // PENDIENTE O EMPATE: Estilo por defecto (indigo original)
        chipClasses += ' bg-indigo-100 text-indigo-800';
    }

    // Para Americano o un caso donde se use positionMap
    const position = positionMap ? positionMap.get(name) : undefined;
    const posText = position !== undefined ? position : '-';
    
    return h('span', { 
        className: chipClasses 
    }, 
        name,
        showRank && h('span', { className: 'ml-2 font-bold text-indigo-600' }, `(#${posText})`)
    );
};

// 🟢 Componente para mostrar un partido, adaptado para Suma 14 y Americano (MODIFICADO)
const MatchCard = ({ match, standings, isSuma14 = false }) => {
    const { player1A, player2A, player1B, player2B, court, time, scoreA, scoreB, set1A, set1B, set2A, set2B, tiebreakA, tiebreakB, group } = match;
    const { positionMap } = standings || { positionMap: new Map() };
    const isPlayed = isSuma14 ? (set1A || set1B || set2A || set2B || tiebreakA || tiebreakB) : (scoreA || scoreB);
    const timeString = time; 

    // --- LÓGICA DE STYLES Y GANADOR ---
    let scoreClasses = 'text-2 font-extrabold p-1 rounded-lg';
    let setsA = 0;
    let setsB = 0;
    let winner = null;
    let scoreContent = null;

    if (isPlayed) {
        scoreClasses += ' bg-indigo-600 text-white shadow-lg';
        
        if (isSuma14) {
            // Lógica Suma 14: Contar sets para determinar setsA y setsB
            if ((parseInt(set1A) || 0) > (parseInt(set1B) || 0)) setsA++;
            if ((parseInt(set1B) || 0) > (parseInt(set1A) || 0)) setsB++;
            if ((parseInt(set2A) || 0) > (parseInt(set2B) || 0)) setsA++;
            if ((parseInt(set2B) || 0) > (parseInt(set2A) || 0)) setsB++;
            if (parseInt(tiebreakA) === 1) setsA++;
            if (parseInt(tiebreakB) === 1) setsB++;

            if (setsA > setsB) winner = 'A';
            else if (setsB > setsA) winner = 'B';
            // Empate: setsA === setsB, winner se mantiene en null

            // Contenido del score para Suma 14
            const set1Text = `${set1A || 0}-${set1B || 0}`;
            const set2Text = set2A || set2B ? `${set2A || 0}-${set2B || 0}` : '';
            const tiebreakText = tiebreakA || tiebreakB ? `(${tiebreakA || 0}-${tiebreakB || 0})` : '';

            scoreContent = h('div', { className: 'flex flex-col items-center' },
                h('span', { className: scoreClasses }, `${setsA} - ${setsB}`),
                h('div', { className: 'text-xs text-gray-500 mt-1 font-medium' }, [set1Text, set2Text, tiebreakText].filter(Boolean).join(' '))
            );

        } else {
            // Lógica de Score Simple
            scoreContent = h('span', { className: scoreClasses }, `${scoreA} - ${scoreB}`);
            
            // Determinar ganador por scoreA/scoreB
            if ((parseInt(scoreA) || 0) > (parseInt(scoreB) || 0)) winner = 'A';
            else if ((parseInt(scoreB) || 0) > (parseInt(scoreA) || 0)) winner = 'B';
        }
    } else {
        scoreClasses = 'text-2 font-extrabold p-1 rounded-lg bg-gray-200 text-gray-500';
        scoreContent = h('span', { className: scoreClasses }, 'vs');
    }
    
    // Si no es Americano, no se muestra el rank en el chip
    const showRankChip = isSuma14 ? false : true;

    // --- LÓGICA DE CONTENIDO DEL HEADER (CONDICIÓN DE CANCHA) ---
    const headerContent = [];

    // Condición 1: Mostrar Cancha SOLO si 'court' está definido/tiene valor
    if (court) {
        headerContent.push(
            h('span', { className: 'font-bold text-lg text-gray-800' }, `Cancha ${court}`)
        );
    }
    
    // Condición 2: Mostrar Grupo (Si no es fase final)
    if (group && !FINAL_PHASE_GROUPS.includes(group.toUpperCase())) {
         headerContent.push(
            h('span', { className: 'px-2 py-1 bg-gray-100 rounded-full font-semibold text-gray-700' }, `Grupo ${group}`)
        );
    }

    // Condición 3: Mostrar Hora (Siempre se muestra)
    headerContent.push(
        h('span', { className: 'px-2 py-1 bg-gray-100 rounded-full font-semibold text-indigo-600' }, timeString)
    );
    // --- FIN LÓGICA DE CONTENIDO DEL HEADER ---

    return h('div', { 
        className: `p-4 rounded-xl shadow-lg transition-all border-l-4 ${isPlayed ? 'bg-green-50 border-green-500' : 'bg-white border-indigo-400'}` 
    },
        // Header (Ahora usando el array headerContent para la lógica condicional)
        h('div', { className: 'flex justify-between items-center mb-3 border-b pb-2 text-sm text-gray-500' }, headerContent),

        // Cuerpo: Jugadores y Resultado
        h('div', { className: 'grid grid-cols-5 gap-2 items-center text-center' },
            
            // Equipo A (Alineado a la derecha)
            h('div', { className: 'col-span-2 flex flex-col items-end space-y-1' }, 
                // isWinner: TRUE si se jugó Y el ganador fue 'A'. FALSE si se jugó Y el ganador fue 'B' (perdedor)
                h(PlayerChip, { name: player1A, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'A' : null }),
                h(PlayerChip, { name: player2A, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'A' : null })
            ),

            // Resultado (Centro)
            h('div', { className: 'col-span-1 text-center flex flex-col justify-center items-center' }, 
                scoreContent
            ),

            // Equipo B (Alineado a la izquierda)
            h('div', { className: 'col-span-2 flex flex-col items-start space-y-1' }, 
                // isWinner: TRUE si se jugó Y el ganador fue 'B'. FALSE si se jugó Y el ganador fue 'A' (perdedor)
                h(PlayerChip, { name: player1B, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'B' : null }),
                h(PlayerChip, { name: player2B, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'B' : null })
            )
        )
    );
};


const MatchesView = ({ matches, standings, isSuma14 = false }) => {
    // Usamos useRef para mantener la referencia a los elementos de los partidos
    const matchRefs = useRef([]);

    // Efecto para hacer scroll al primer partido pendiente
    useEffect(() => {
        if (matches.length > 0) {
            // El criterio de "pendiente" es diferente para Suma 14 vs Americano
            const isPending = (match) => isSuma14 
                ? !(match.set1A || match.set1B || match.set2A || match.set2B || match.tiebreakA || match.tiebreakB)
                : !(match.scoreA || match.scoreB);
                
            const firstPendingIndex = matches.findIndex(isPending);
            
            if (firstPendingIndex !== -1 && matchRefs.current[firstPendingIndex]) {
                // Hacer scroll suave al partido pendiente. Intentar ir al anterior para que se vea el encabezado.
                const scrollIndex = Math.max(0, firstPendingIndex - 1);
                matchRefs.current[scrollIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (matchRefs.current[0]) {
                // Si todos están jugados, o es el único, hacer scroll al inicio
                matchRefs.current[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        // Limpiar las referencias para el próximo render
        matchRefs.current = [];
    }, [matches, isSuma14]);

    return h('div', { className: 'space-y-4' },
        matches.length === 0 
            ? h('div', { className: 'p-4 text-center text-gray-500' }, 'No hay partidos programados o cargados.')
            : matches.map((match, index) => {
                return h('div', { 
                    key: index, 
                    // Asignar la referencia al elemento del partido
                    ref: el => matchRefs.current[index] = el,
                }, h(Suma14MatchCard, { match, standings, isSuma14 }));
            })
    );
};

// Nuevo componente para el indicador de carga
const LoadingSpinner = () => {
    // Usamos SVG para un spinner suave y centrado
    return h('div', { className: 'p-12 text-center flex flex-col items-center justify-center' },
        // Spinner SVG con animación Tailwind
        h('svg', { 
            className: 'animate-spin h-8 w-8 text-indigo-600 mb-3', 
            xmlns: 'http://www.w3.org/2000/svg', 
            fill: 'none', 
            viewBox: '0 0 24 24' 
        },
            // Fondo gris
            h('circle', { 
                className: 'opacity-25', 
                cx: '12', 
                cy: '12', 
                r: '10', 
                stroke: 'currentColor', 
                'stroke-width': '4' 
            }),
            // Parte activa del spinner
            h('path', { 
                className: 'opacity-75', 
                fill: 'currentColor', 
                d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' 
            })
        ),
        h('p', { className: 'text-lg font-semibold text-indigo-600' }, 'Cargando Datos...')
    );
};

// --- Nuevos Componentes para Suma 14 ---

// Componente para la vista de Clasificación (Grupos y Tabla)
const Sum14ClassificationView = ({ matchData }) => {
    // Filtrar grupos válidos y obtener una lista única
    const groups = [...new Set(matchData
        .map(match => match.group)
        .filter(group => group && !FINAL_PHASE_GROUPS.includes(group.toUpperCase()))
    )];

    const [selectedGroup, setSelectedGroup] = useState(groups[0] || 'N/A');

    // Efecto para establecer el primer grupo como seleccionado por defecto
    useEffect(() => {
        if (groups.length > 0 && selectedGroup === 'N/A') {
            setSelectedGroup(groups[0]);
        }
    }, [groups]);

    // Calcular las posiciones para el grupo seleccionado
    const groupStandings = selectedGroup && selectedGroup !== 'N/A' 
        ? calculateSum14Standings(matchData, selectedGroup) 
        : [];
    
    // Obtener los partidos del grupo seleccionado
    const groupMatches = selectedGroup && selectedGroup !== 'N/A' 
        ? matchData.filter(m => m.group === selectedGroup)
        : [];

    return h('div', { className: 'space-y-6' },
        h('div', { className: 'flex justify-center sm:justify-start' },
            groups.length > 0
                ? h(GroupDropdown, { groups, selectedGroup, onGroupChange: setSelectedGroup })
                : h('div', { className: 'text-gray-500 font-medium' }, 'No hay grupos de clasificación.')
        ),
        
        // Tabla de Posiciones
        h(Sum14GroupTable, { standings: groupStandings }),

        // Partidos del Grupo
        h('div', { className: 'mt-8' },
            h('h4', { className: 'text-xl font-bold text-gray-800 mb-4 border-b pb-2' }, `Partidos del Grupo ${selectedGroup}`),
            h(MatchesView, { matches: groupMatches, standings: { positionMap: new Map() }, isSuma14: true })
        )
    );
};

// Componente para una llave de la Fase Final
const BracketGame = ({ game, roundName }) => {
    const isPlayed = game.set1A || game.set1B || game.set2A || game.set2B || game.tiebreakA || game.tiebreakB;
    
    // Calcular sets ganados para el resultado
    let setsA = 0;
    let setsB = 0;
    if ((parseInt(game.set1A) || 0) > (parseInt(game.set1B) || 0)) setsA++;
    if ((parseInt(game.set1B) || 0) > (parseInt(game.set1A) || 0)) setsB++;
    if ((parseInt(game.set2A) || 0) > (parseInt(game.set2B) || 0)) setsA++;
    if ((parseInt(game.set2B) || 0) > (parseInt(game.set2A) || 0)) setsB++;
    if (parseInt(game.tiebreakA) === 1) setsA++;
    if (parseInt(game.tiebreakB) === 1) setsB++;

    // Determinar ganador para el estilo
    const isWinnerA = isPlayed && setsA > setsB;
    const isWinnerB = isPlayed && setsB > setsA;

    // Se mantiene el estilo de BracketGame simple, solo el nombre cambia de color.
    const teamAClasses = `p-1 px-2 text-sm font-semibold truncate ${isWinnerA ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`;
    const teamBClasses = `p-1 px-2 text-sm font-semibold truncate ${isWinnerB ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800'}`;
    const scoreClasses = `font-bold text-xs ${isPlayed ? 'text-indigo-600' : 'text-gray-400'}`;
    const containerClasses = `flex flex-col border border-gray-300 rounded-lg shadow-sm w-full transition-all ${isPlayed ? 'border-green-400' : 'border-indigo-300'}`;

    const playerA = game.player1A || 'A Definir';
    const playerB = game.player1B || 'A Definir';

    return h('div', { className: containerClasses },
        h('div', { className: 'text-xs font-bold text-center text-indigo-700 bg-indigo-100 p-1 rounded-t-lg' }, roundName),
        h('div', { className: `flex justify-between items-center border-b p-2 ${isWinnerA ? 'bg-green-100/50' : ''}` },
            h('span', { className: teamAClasses }, playerA),
            h('span', { className: scoreClasses }, isPlayed ? setsA : '-'),
        ),
        h('div', { className: `flex justify-between items-center p-2 ${isWinnerB ? 'bg-green-100/50' : ''}` },
            h('span', { className: teamBClasses }, playerB),
            h('span', { className: scoreClasses }, isPlayed ? setsB : '-'),
        ),
        game.court && h('div', { className: 'text-xs text-center text-gray-500 bg-gray-50 p-1 rounded-b-lg border-t' }, `Cancha ${game.court} | ${game.time}`)
    );
};

// Componente para la vista de Llaves (Fase Final)
const FinalPhaseView = ({ matchData }) => {
    // Filtrar partidos de la Fase Final
    const finalPhaseMatches = matchData.filter(m => FINAL_PHASE_GROUPS.includes((m.group || '').toUpperCase()));
    
    // Agrupar por ronda
    const rounds = finalPhaseMatches.reduce((acc, match) => {
        const group = match.group.toUpperCase();
        if (!acc[group]) acc[group] = [];
        acc[group].push(match);
        return acc;
    }, {});

    const roundOrder = ["OCTAVOS", "CUARTOS", "SEMI", "FINAL"];

    return h('div', { className: 'p-2 space-y-8' },
        Object.keys(rounds).length === 0 
            ? h('div', { className: 'p-4 text-center text-gray-500 font-semibold' }, 'La Fase Final aún no ha sido cargada.')
            : roundOrder.filter(round => rounds[round]).map(roundName => {
                const games = rounds[roundName];
                // Determinar el número de columnas basado en la ronda
                const gridClasses = roundName === 'FINAL' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
                
                return h('div', { key: roundName, className: 'mb-8' },
                    h('h4', { className: 'text-2 font-extrabold text-indigo-700 mb-4 border-b-2 border-indigo-200 pb-2 text-center' }, roundName),
                    h('div', { className: `grid ${gridClasses} gap-4 justify-center` },
                        games.map((game, index) => h(BracketGame, { key: index, game, roundName }))
                    )
                );
            })
    );
};


const TournamentDetails = ({ data, firebaseStandings }) => {
    const isSuma14 = data.id === 1;
    const initialSubTab = isSuma14 ? 0 : 0; // 0: Partidos/Clasificación, 1: Tabla/Fase Final
    const [subTab, setSubTab] = useState(initialSubTab); 
    const [matchData, setMatchData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Para Americano
    const [americanoStandingsData, setAmericanoStandingsData] = useState({ standingsArray: [], positionMap: new Map() }); 

    // Función de obtención de datos con Backoff (se mantiene)
    const fetchWithBackoff = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (2 ** i)));
                } else {
                    throw error;
                }
            }
        }
    };


    useEffect(() => {
        const fetchMatches = async (url, tournamentId) => {
            setLoading(true);
            setError(null);
            try {
                const data = await fetchWithBackoff(url);
                setMatchData(data);
                
                if (tournamentId === 0) {
                    // Calcular y guardar las posiciones del Americano
                    setAmericanoStandingsData(calculateStandings(data));
                }
                // Las posiciones del Suma 14 se calculan en su componente de vista (por grupo)

            } catch (e) {
                console.error("Fetch error:", e);
                setError('Error al cargar los datos. Intente recargar.');
            } finally {
                setLoading(false);
            }
        };

        if (data.id === 0) {
            fetchMatches(AMERICANO_MUJERES_URL, 0);
        } else if (data.id === 1) {
            fetchMatches(SUMA_14_MUJERES_URL, 1);
        } else {
            // Limpiar el estado para otros torneos no manejados por URL
            setMatchData([]);
            setAmericanoStandingsData({ standingsArray: [], positionMap: new Map() });
            setLoading(false);
        }
    }, [data.id]);

    const subTabs = isSuma14
        ? [{ id: 0, name: 'Clasificación' }, { id: 1, name: 'Fase Final' }]
        : [{ id: 0, name: 'Partidos' }, { id: 1, name: 'Tabla de Posiciones' }];

    const SubTabButton = ({ index, name }) => {
        const isActive = index === subTab;
        const baseClasses = 'flex-1 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 focus:outline-none';
        const activeClasses = 'text-indigo-600 border-indigo-600';
        const inactiveClasses = 'text-gray-500 border-transparent hover:text-indigo-500';

        return h('button', {
            className: `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`,
            onClick: () => setSubTab(index),
            role: 'tab',
            'aria-selected': isActive,
        }, name);
    };

    // Renderizado del Contenido Principal por Torneo
    let content;
    if (loading) {
        content = h(LoadingSpinner);
    } else if (error) {
        content = h('div', { className: 'p-6 text-center text-red-500 font-semibold border-2 border-red-300 rounded-lg' }, error);
    } else {
        if (data.id === 0) { // Americano Mujeres
            content = subTab === 0 
                ? h(MatchesView, { matches: matchData, standings: americanoStandingsData, isSuma14: false }) 
                : h(PlayerTable, { standings: americanoStandingsData.standingsArray, showRank: true });
        } else if (data.id === 1) { // Suma 14 Mujeres
            content = subTab === 0 
                ? h(Sum14ClassificationView, { matchData: matchData }) 
                : h(FinalPhaseView, { matchData: matchData });
        } else { // Otros torneos (usan la tabla de Firebase como fallback)
            content = subTab === 1 
                ? h(PlayerTable, { standings: firebaseStandings, showRank: true }) 
                : h('div', { className: 'p-4 text-center text-gray-500' }, 'Partidos y llaves no disponibles.');
        }
    }


    return h('div', null,
        h('nav', { className: 'flex justify-between bg-gray-50 border-b border-gray-200 shadow-inner rounded-t-lg mb-4' },
            subTabs.map((tab, index) => h(SubTabButton, { key: tab.id, index: index, name: tab.name }))
        ),
        content
    );
};

const TournamentContent = ({ data, standings, db, userId }) => (
    h('div', { className: 'p-4 sm:p-6 bg-white rounded-lg shadow-inner' },
        h('div', { className: 'flex items-center justify-center mb-4' },
            h('div', { className: 'text-5xl mr-3' }, data.icon),
            h('h3', { className: 'text-2 font-extrabold text-gray-800' }, data.fullTitle)
        ),
        h('p', { className: 'text-gray-600 mb-6 text-center border-b pb-4' }, data.description),
        
        // El componente TournamentDetails ahora maneja Americano y Suma 14
        (data.id === 0 || data.id === 1) 
            ? h(TournamentDetails, { data: data, firebaseStandings: standings })
            // Los demás torneos usan la tabla de Firebase directamente si no tienen un detalle especial
            : h('div', { className: 'space-y-4' }, 
                  h(PlayerTable, { standings: standings, showRank: true }),
                  h('div', { className: 'p-4 text-center text-gray-500 text-sm' }, 'Para este torneo solo está disponible la tabla de posiciones general (vía Firebase).')
              )
    )
);


function App() {
    const [activeTab, setActiveTab] = useState(0);
    const [userId, setUserId] = useState(null);
    const [db, setDb] = useState(null);
    const [standings, setStandings] = useState([]);
    const activeTournament = tournamentData[activeTab];

    useEffect(() => {
        // Inicialización de Firebase (se mantiene sin cambios)
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (Object.keys(firebaseConfig).length === 0) {
            console.error("Firebase config is missing.");
            return;
        }

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const firestore = getFirestore(app);

        setDb(firestore);

        const authPromise = initialAuthToken
            ? signInWithCustomToken(auth, initialAuthToken).catch(error => {
                console.error("Custom sign-in failed. Falling back to anonymous.", error);
                return signInAnonymously(auth);
              })
            : signInAnonymously(auth);

        authPromise.then(() => {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(crypto.randomUUID());
                }
            });
        });

    }, []);

    useEffect(() => {
        // Suscripción a Firebase Firestore (solo para torneos que NO son Americano o Suma 14)
        if (!db || !userId || activeTournament.id === 0 || activeTournament.id === 1) {
             setStandings([]); // Limpiar standings si no se usan
             return;
        }

        const collectionPath = `/artifacts/${userId}/users/${userId}/tournament_standings_${activeTournament.id}`;

        const q = query(collection(db, collectionPath));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = [];
            snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            
            const sortedList = list.sort((a, b) => b.score - a.score);
            setStandings(sortedList);
        }, (error) => {
            console.error("Error fetching standings:", error);
            setStandings([]);
        });

        return () => unsubscribe();
    }, [db, userId, activeTab]);

    const TabButton = ({ index, name }) => {
        const isActive = index === activeTab;
        const baseClasses = 'flex-1 py-3 text-sm font-semibold transition-colors duration-200 border-b-4 focus:outline-none';
        const activeClasses = 'text-blue-600 border-blue-600 bg-blue-50/50';
        const inactiveClasses = 'text-gray-600 border-transparent hover:text-blue-500 hover:border-gray-300';

        return h('button', {
            className: `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`,
            onClick: () => setActiveTab(index),
            role: 'tab',
            'aria-selected': isActive,
        }, name);
    };

    return h('div', { className: 'flex flex-col' },
        h('header', { className: 'bg-indigo-700 text-white p-4 shadow-lg' },
            h('div', { className: 'text-center' },
                h('h1', { className: 'text-xl font-bold' }, 'Gestor de Torneos'),
                h('p', { className: 'text-sm text-indigo-200' }, 'Actualizaciones en tiempo real')
            )
        ),
        
        h('nav', { 
            className: 'flex justify-between bg-white border-b border-gray-200 shadow-md sticky top-0 z-10',
            role: 'tablist'
        },
            tournamentData.map((tab, index) => h(TabButton, { key: tab.id, index: index, name: tab.name }))
        ),

        h('main', { className: 'p-2' },
            userId && h('div', { className: 'p-3 bg-gray-100 text-xs text-gray-600 break-words rounded-lg mb-4 text-center' }, `ID de Usuario: ${userId}`),
            h(TournamentContent, { data: activeTournament, standings: standings, db, userId })
        )
    );
}

render(h(App), document.getElementById('app'));