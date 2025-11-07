import { h, render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { GroupDropdown, MatchesView } from "./common.js";
import { FINAL_PHASE_GROUPS } from "./contants-2.js";

export const calculateSum14Standings = (matchData, groupName) => {
    const standingsMap = new Map();
    const groupMatches = matchData.filter(m => m.group === groupName);

    const updatePlayerStats = (playerName, setsWon, setsLost, gamesWon, gamesLost, isWinner) => {
        if (!playerName) return;
        const current = standingsMap.get(playerName) || {
            name: playerName,
            setsWon: 0,
            setsLost: 0,
            gamesWon: 0,
            gamesLost: 0,
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0
        };

        current.setsWon += setsWon;
        current.setsLost += setsLost;
        current.gamesWon += gamesWon;
        current.gamesLost += gamesLost;
        if (setsWon + setsLost > 0) current.matchesPlayed += 1;
        if (isWinner === true) current.matchesWon += 1;
        if (isWinner === false) current.matchesLost += 1;

        standingsMap.set(playerName, current);
    };

    for (const match of groupMatches) {
        const set1A = parseInt(match.set1A) || 0;
        const set1B = parseInt(match.set1B) || 0;
        const set2A = parseInt(match.set2A) || 0;
        const set2B = parseInt(match.set2B) || 0;
        const tiebreakA = parseInt(match.tiebreakA) || 0;
        const tiebreakB = parseInt(match.tiebreakB) || 0;

        if (set1A + set1B + set2A + set2B + tiebreakA + tiebreakB === 0) continue;

        let setsA = 0;
        let setsB = 0;
        let gamesA = set1A + set2A;
        let gamesB = set1B + set2B;

        if (set1A > set1B) setsA++;
        if (set1B > set1A) setsB++;
        if (set2A > set2B) setsA++;
        if (set2B > set2A) setsB++;

        if (tiebreakA > tiebreakB) {
            setsA++;
            gamesA += 7; gamesB += 6;
        } else if (tiebreakB > tiebreakA) {
            setsB++;
            gamesB += 7; gamesA += 6;
        }

        const winner = setsA > setsB ? "A" : setsB > setsA ? "B" : null;

        updatePlayerStats(match.player1A, setsA, setsB, gamesA, gamesB, winner === "A");
        updatePlayerStats(match.player1B, setsB, setsA, gamesB, gamesA, winner === "B");
    }

    let standingsArray = Array.from(standingsMap, ([name, data]) => ({
        ...data,
        points: data.setsWon,
        gameDifference: data.gamesWon - data.gamesLost,
        setDifference: data.setsWon - data.setsLost
    }));

    standingsArray.sort((a, b) => {
        if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
        if (b.setDifference !== a.setDifference) return b.setDifference - a.setDifference;
        if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
        return a.name.localeCompare(b.name);
    });

    return standingsArray;
};

export const Sum14GroupTable = ({ standings }) => {
    const sortedStandings = [...standings].sort((a, b) => {
        if (b.matchesWon !== a.matchesWon) {
            return b.matchesWon - a.matchesWon;
        }

        // Criterio 2: Sets Ganados (descendente)
        if (b.setsWon !== a.setsWon) {
            return b.setsWon - a.setsWon;
        }

        // Criterio 3: Mayor Diferencia de Games (descendente)
        return b.gameDifference - a.gameDifference;
    });

    return h('div', { className: 'mt-6 bg-white rounded-xl shadow-lg overflow-hidden' },
        h('div', { className: 'p-4 bg-gray-50 border-b' },
            h('h4', { className: 'text-lg font-bold text-gray-800' }, `Tabla de Posiciones`)
        ),
        sortedStandings.length === 0
            ? h('p', { className: 'p-4 text-sm text-gray-500 text-center' }, 'No hay resultados cargados para este grupo.')
            : h('div', { className: 'overflow-x-auto' },
                h('table', { className: 'min-w-full divide-y divide-gray-200 text-center' },
                    h('thead', { className: 'bg-gray-100' },
                        h('tr', null,
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[4%]' }, '#'),
                            h('th', { className: 'px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[28%]' }, 'Nombre'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'PJ'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'PG'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'PP'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'SF'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'SC'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'GF'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[8%]' }, 'GC'),
                            h('th', { className: 'px-1 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]' }, 'Dif')
                        )
                    ),
                    h('tbody', { className: 'bg-white divide-y divide-gray-200' },
                        sortedStandings.map((s, index) => h('tr', { key: s.name, className: index % 2 === 0 ? 'bg-white' : 'bg-gray-50' },
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm font-medium text-gray-900' }, index + 1),
                            h('td', { className: 'px-2 py-4 whitespace-nowrap text-sm text-gray-700 text-left font-semibold' }, s.name),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-700' }, s.matchesPlayed),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-green-600 font-bold' }, s.matchesWon),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-red-600 font-bold' }, s.matchesLost),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-green-600 font-bold' }, s.setsWon),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-red-600 font-bold' }, s.setsLost),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-green-600 font-bold' }, s.gamesWon),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-red-600 font-bold' }, s.gamesLost),
                            h('td', { className: 'px-1 py-4 whitespace-nowrap text-sm text-gray-900 font-extrabold' }, s.gameDifference)
                        ))
                    )
                )
            )
    );
};

export const Sum14ClassificationView = ({ matchData }) => {
    const groups = [...new Set(matchData
        .map(match => match.group)
        .filter(group => group && !FINAL_PHASE_GROUPS.includes(group.toUpperCase()))
    )].sort((a, b) => a.localeCompare(b));;

    const [selectedGroup, setSelectedGroup] = useState(groups[0] || 'N/A');

    useEffect(() => {
        if (groups.length > 0 && selectedGroup === 'N/A') {
            setSelectedGroup(groups[0]);
        }
    }, [groups]);

    const groupStandings = selectedGroup && selectedGroup !== 'N/A'
        ? calculateSum14Standings(matchData, selectedGroup)
        : [];

    const groupMatches = selectedGroup && selectedGroup !== 'N/A'
        ? matchData.filter(m => m.group === selectedGroup)
        : [];

    return h('div', { className: 'space-y-6' },
        h('div', { className: 'flex justify-center sm:justify-start' },
            groups.length > 0
                ? h(GroupDropdown, { groups, selectedGroup, onGroupChange: setSelectedGroup })
                : h('div', { className: 'text-gray-500 font-medium' }, 'No hay grupos de clasificación.')
        ),

        h(Sum14GroupTable, { standings: groupStandings }),

        h('div', { className: 'mt-8' },
            h('h4', { className: 'text-xl font-bold text-gray-800 mb-4 border-b pb-2' }, `Partidos del Grupo ${selectedGroup}`),
            h(MatchesView, { matches: groupMatches, standings: { positionMap: new Map() }, isNormalTournament: true })
        )
    );
};