import { ChevronDown, ChevronUp } from "lucide-preact";
import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { FINAL_PHASE_GROUPS } from "./contants.js";

export const GroupDropdown = ({ groups, selectedGroup, onGroupChange }) => {
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

export const MatchCard = ({ match, standings, isNormalTournament = false }) => {
    const { player1A, player2A, player1B, player2B, court, time, scoreA, scoreB, set1A, set1B, set2A, set2B, tiebreakA, tiebreakB, group } = match;
    const { positionMap } = standings || { positionMap: new Map() };
    const isPlayed = isNormalTournament ? (set1A || set1B || set2A || set2B || tiebreakA || tiebreakB) : (scoreA || scoreB);
    const timeString = time;

    // --- LÓGICA DE SEPARACIÓN DE JUGADORES (Suma 14) ---
    // Usamos variables 'let' para poder modificarlas si es necesario
    let p1A = player1A;
    let p2A = player2A;
    let p1B = player1B; // Variable local para jugador 1B
    let p2B = player2B; // Variable local para jugador 2B

    if (isNormalTournament) {
        // Lógica para Equipo A
        if (p1A && p1A.includes('/') && !p2A) {
            // Separa el string por la primera '/'
            const parts = p1A.split('/', 2);

            // Asigna la primera parte (jugador 1)
            p1A = parts[0].trim();

            // Asigna la segunda parte (jugador 2), si existe
            if (parts.length > 1) {
                p2A = parts[1].trim();
            }
        }

        // Lógica para Equipo B (Nueva implementación)
        if (p1B && p1B.includes('/') && !p2B) {
            // Separa el string por la primera '/'
            const parts = p1B.split('/', 2);

            // Asigna la primera parte (jugador 1)
            p1B = parts[0].trim();

            // Asigna la segunda parte (jugador 2), si existe
            if (parts.length > 1) {
                p2B = parts[1].trim();
            }
        }
    }
    // --- FIN LÓGICA DE SEPARACIÓN DE JUGADORES ---

    // --- LÓGICA DE STYLES Y GANADOR ---
    let scoreClasses = 'text-2 font-extrabold p-1 rounded-lg';
    let setsA = 0;
    let setsB = 0;
    let winner = null;
    let scoreContent = null;

    if (isPlayed) {
        scoreClasses += ' bg-indigo-600 text-white shadow-lg';

        if (isNormalTournament) {
            // Lógica Suma 14: Contar sets para determinar setsA y setsB
            if ((parseInt(set1A) || 0) > (parseInt(set1B) || 0)) setsA++;
            if ((parseInt(set1B) || 0) > (parseInt(set1A) || 0)) setsB++;
            if ((parseInt(set2A) || 0) > (parseInt(set2B) || 0)) setsA++;
            if ((parseInt(set2B) || 0) > (parseInt(set2A) || 0)) setsB++;

            const tiebreakScoreA = parseInt(tiebreakA) || 0;
            const tiebreakScoreB = parseInt(tiebreakB) || 0;

            if (tiebreakScoreA > tiebreakScoreB) {
                setsA++;
            } else if (tiebreakScoreB > tiebreakScoreA) {
                setsB++;
            }

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
    const showRankChip = isNormalTournament ? false : true;

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
                h(PlayerChip, { name: p1A, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'A' : null }),
                h(PlayerChip, { name: p2A, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'A' : null })
            ),

            // Resultado (Centro)
            h('div', { className: 'col-span-1 text-center flex flex-col justify-center items-center' },
                scoreContent
            ),

            // Equipo B (Alineado a la izquierda)
            h('div', { className: 'col-span-2 flex flex-col items-start space-y-1' },
                // isWinner: TRUE si se jugó Y el ganador fue 'B'. FALSE si se jugó Y el ganador fue 'A' (perdedor)
                h(PlayerChip, { name: p1B, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'B' : null }),
                h(PlayerChip, { name: p2B, positionMap: positionMap, showRank: showRankChip, isWinner: isPlayed ? winner === 'B' : null })
            )
        )
    );
};


export const PlayerChip = ({ name, positionMap, showRank = true, isWinner = null }) => {

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

export const MatchesView = ({ matches, standings, isNormalTournament = false }) => {
    const matchRefs = useRef([]);
    useEffect(() => {
        if (matches.length > 0) {
            const isPending = (match) => isNormalTournament
                ? !(match.set1A || match.set1B || match.set2A || match.set2B || match.tiebreakA || match.tiebreakB)
                : !(match.scoreA || match.scoreB);

            const firstPendingIndex = matches.findIndex(isPending);

            if (firstPendingIndex !== -1 && matchRefs.current[firstPendingIndex]) {
                const scrollIndex = Math.max(0, firstPendingIndex - 1);
                matchRefs.current[scrollIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (matchRefs.current[0]) {
                matchRefs.current[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        matchRefs.current = [];
    }, [matches, isNormalTournament]);

    return h('div', { className: 'space-y-4' },
        matches.length === 0
            ? h('div', { className: 'p-4 text-center text-gray-500' }, 'No hay partidos programados o cargados.')
            : matches.map((match, index) => {
                return h('div', {
                    key: index,
                    ref: el => matchRefs.current[index] = el,
                }, h(MatchCard, { match, standings, isNormalTournament }));
            })
    );
};

export const PlayerTable = ({ standings, showRank = true }) => {
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
                            h('td', { className: 'px-3 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right' }, s.score || s.points)
                        ))
                    )
                )
            )
    );
};

export const LoadingSpinner = () => {
    return h('div', { className: 'p-12 text-center flex flex-col items-center justify-center' },
        h('svg', {
            className: 'animate-spin h-8 w-8 text-indigo-600 mb-3',
            xmlns: 'http://www.w3.org/2000/svg',
            fill: 'none',
            viewBox: '0 0 24 24'
        },
            h('circle', {
                className: 'opacity-25',
                cx: '12',
                cy: '12',
                r: '10',
                stroke: 'currentColor',
                'stroke-width': '4'
            }),
            h('path', {
                className: 'opacity-75',
                fill: 'currentColor',
                d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
            })
        ),
        h('p', { className: 'text-lg font-semibold text-indigo-600' }, 'Cargando Datos...')
    );
};

export const convertToBracketFormat = (matchData) => {
    const phases = ["OCTAVOS", "CUARTOS", "SEMI", "FINAL"];
    const groupedMatches = phases.reduce((acc, phase) => {
        acc[phase] = matchData.filter(m => (m.group || '').toUpperCase() === phase).sort((a, b) => (a.id || 0) - (b.id || 0));
        return acc;
    }, {});

    const teams = [];
    const results = [];

    const initialRound = groupedMatches['OCTAVOS'];

    if (initialRound && initialRound.length > 0) {
        initialRound.forEach(match => {
            let teamA = match.player1A ? match.player1A : null;
            let teamB = match.player1B ? match.player1B : null;

            // --- INICIO: Creación de objetos de datos completos ---
            const matchDetails = { // Datos que adjuntaremos a CADA EQUIPO del partido
                time: match.time || null,
                set1A: match.set1A || null,
                set1B: match.set1B || null,
                set2A: match.set2A || null,
                set2B: match.set2B || null,
                tieA: match.tiebreakA || null,
                tieB: match.tiebreakB || null,
            };

            let teamAData = teamA ? { name: teamA, ...matchDetails } : null;
            let teamBData = teamB ? { name: teamB, time: null } : null; // El tiempo solo lo adjuntamos al primer equipo para evitar duplicados en el badge.

            // Sobrescribimos teamAData y teamBData con los sets específicos
            if (teamAData) {
                teamAData.set1 = match.set1A;
                teamAData.set2 = match.set2A;
                teamAData.tie = match.tiebreakA;
            }
            if (teamBData) {
                teamBData.set1 = match.set1B;
                teamBData.set2 = match.set2B;
                teamBData.tie = match.tiebreakB;
            }
            
            teams.push([teamAData, teamBData]); // Ahora pasamos objetos
            // --- FIN: Creación de objetos de datos completos ---
        });
    }

    // ... (El cálculo de 'results' se mantiene igual, ya que solo necesita el conteo total de sets ganados)

    phases.forEach(phase => {
        const roundMatches = groupedMatches[phase];
        if (roundMatches && roundMatches.length > 0) {
            const roundResults = roundMatches.map(match => {
                let setsA = 0;
                let setsB = 0;
                // ... (Lógica de conteo de sets se mantiene igual)
                if ((parseInt(match.set1A) || 0) > (parseInt(match.set1B) || 0)) setsA++;
                if ((parseInt(match.set1B) || 0) > (parseInt(match.set1A) || 0)) setsB++;
                if ((parseInt(match.set2A) || 0) > (parseInt(match.set2B) || 0)) setsA++;
                if ((parseInt(match.set2B) || 0) > (parseInt(match.set2A) || 0)) setsB++;

                if (match.tiebreakA > match.tiebreakB) {
                    setsA++;
                } else if (match.tiebreakB > match.tiebreakA) {
                    setsB++;
                }

                if (!match.set1A && !match.set1B) {
                    return [null, null];
                }

                return [setsA, setsB];
            });
            results.push(roundResults);
        }
    });

    return { teams: teams, results: results };
};