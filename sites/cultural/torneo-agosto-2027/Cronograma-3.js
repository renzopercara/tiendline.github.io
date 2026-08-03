import { h } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import {
    SUMA_15_MUJERES_URL,
    SUMA_13_HOMBRES_URL
} from "./contants-3.js";

export const CronogramaView = () => {

    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const currentMatchRef = useRef(null);

    const fetchWithBackoff = async (url, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                return await response.json();

            } catch (err) {

                if (i < retries - 1) {
                    await new Promise(resolve =>
                        setTimeout(resolve, delay * (2 ** i))
                    );
                } else {
                    throw err;
                }

            }
        }
    };

    const isFinished = (match) => {

        const scores = [
            match.set1A,
            match.set1B,
            match.set2A,
            match.set2B
        ].map(Number);


        return scores.some(score => score > 0);

    };

    const finishedCount = matches.filter(isFinished).length;

    const getWinner = (match) => {

        if (!isFinished(match)) {
            return null;
        }


        let setsA = 0;
        let setsB = 0;


        if (Number(match.set1A) > Number(match.set1B)) {
            setsA++;
        }

        if (Number(match.set1B) > Number(match.set1A)) {
            setsB++;
        }


        if (Number(match.set2A) > Number(match.set2B)) {
            setsA++;
        }

        if (Number(match.set2B) > Number(match.set2A)) {
            setsB++;
        }


        if (setsA > setsB) {
            return "A";
        }

        if (setsB > setsA) {
            return "B";
        }


        return null;
    };

    const renderScore = (match, player) => {

        if (!isFinished(match)) {
            return null;
        }

        const isA = player === "A";
        const winner = getWinner(match);
        const won = winner && winner === player;
        const lost = winner && winner !== player;


        return h(
            'div',
            {
                className:
                    "mt-2 flex flex-col items-center gap-1"
            },

            h(
                'div',
                {
                    className:
                        "flex gap-1 items-center text-xs font-bold text-gray-600"
                },

                h(
                    'span',
                    {
                        className:
                            "bg-white border rounded-md px-2 py-1 shadow-sm"
                    },
                    isA ? match.set1A : match.set1B
                ),

                Number(isA ? match.set2A : match.set2B) > 0 &&
                h(
                    'span',
                    {
                        className:
                            "bg-white border rounded-md px-2 py-1 shadow-sm"
                    },
                    isA ? match.set2A : match.set2B
                ),

                Number(isA ? match.tiebreakA : match.tiebreakB) > 0 &&
                h(
                    'span',
                    {
                        className:
                            "bg-yellow-100 text-yellow-800 rounded px-2 py-1"
                    },
                    `TB ${isA ? match.tiebreakA : match.tiebreakB}`
                )
            ),


            winner &&
            h(
                'span',
                {
                    className:
                        won
                            ?
                            "bg-green-600 text-white rounded-full px-3 py-1 text-xs font-bold"
                            :
                            "bg-red-500 text-white rounded-full px-3 py-1 text-xs font-bold"
                },
                won ? "GANÓ" : "PERDIÓ"
            )

        );

    };

    useEffect(() => {

        const loadMatches = async () => {

            setLoading(true);
            setError(null);

            try {

                const [suma15, suma13] = await Promise.all([
                    fetchWithBackoff(SUMA_15_MUJERES_URL),
                    fetchWithBackoff(SUMA_13_HOMBRES_URL)
                ]);

                const convertir = (data, categoria) => {

                    return data.map(item => {

                        const numeroPartido = (() => {
                            const match = (item.time || "").match(/\d+/);
                            return match ? parseInt(match[0], 10) : 9999;
                        })();

                        return {

                            id: `${categoria}-${item.time}`,

                            order: numeroPartido,

                            matchNumber: numeroPartido,

                            category: categoria,

                            group: item.group,

                            teamA: item.player1A,

                            teamB: item.player1B,

                            set1A: item.set1A,
                            set1B: item.set1B,

                            set2A: item.set2A,
                            set2B: item.set2B,

                            tiebreakA: item.tiebreakA,
                            tiebreakB: item.tiebreakB

                        };

                    });

                };

                const todos = [
                    ...convertir(suma15, "Suma 15"),
                    ...convertir(suma13, "Suma 13")
                ];

                todos.sort((a, b) => a.order - b.order);

                setMatches(todos);

            } catch (e) {

                console.error(e);
                setError("No fue posible cargar el cronograma.");

            } finally {

                setLoading(false);

            }

        };

        loadMatches();

    }, []);

    useEffect(() => {

        if (currentMatchRef.current) {

            setTimeout(() => {

                currentMatchRef.current?.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

            }, 500);

        }

    }, [matches]);

    const getZoneStyle = (zone) => {

        const colors = {
            A: "bg-blue-100 text-blue-700",
            B: "bg-green-100 text-green-700",
            C: "bg-purple-100 text-purple-700",
            D: "bg-orange-100 text-orange-700",
            E: "bg-pink-100 text-pink-700",
            F: "bg-yellow-100 text-yellow-700",
            G: "bg-red-100 text-red-700"
        };

        return colors[zone] || "bg-gray-100 text-gray-700";

    };

    const isReady = (match) => {

        return (
            !match.teamA.includes("Ganador") &&
            !match.teamA.includes("Perdedor") &&
            !match.teamB.includes("Ganador") &&
            !match.teamB.includes("Perdedor")
        );

    };


    const nextMatch = matches.find(
        m => !isFinished(m) && isReady(m)
    );

    // Renderiza cada pareja como badges verticales
    const renderTeam = (
        team,
        color = "blue",
        match = null,
        side = null
    ) => {

        const players = (team || "")
            .split("/")
            .map(p => p.trim())
            .filter(Boolean);

        const styles = {
            blue: "bg-blue-100 text-blue-800",
            green: "bg-green-100 text-green-800"
        };

        return h(
            'div',
            { className: 'flex flex-col gap-1 items-center' },

            players.map((player, idx) =>

                h(
                    'span',
                    {
                        key: idx,
                        className: `inline-block ${styles[color]} rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap`
                    },
                    player
                )

            ),

            match &&
            renderScore(match, side)

        );

    };

    if (loading) {

        return h(
            'div',
            {
                className: 'flex flex-col items-center justify-center py-12'
            },

            h('div', {
                className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4'
            }),

            h(
                'p',
                {
                    className: 'text-lg font-semibold text-indigo-600'
                },
                'Cargando Datos...'
            )
        );

    }

    if (error) {

        return h(
            'div',
            {
                className: 'bg-red-50 border border-red-300 rounded-xl p-6 text-center text-red-600'
            },
            error
        );

    }

    return h(
        'div',
        { className: 'space-y-6' },

        h(
            'div',
            { className: 'bg-white rounded-xl shadow-lg overflow-hidden' },

            h(
                'div',
                { className: 'p-4 bg-gray-50 border-b flex items-center justify-between' },

                h(
                    'h4',
                    {
                        className: 'text-lg font-bold text-gray-800'
                    },
                    'Cronograma de Partidos'
                ),

                h(
                    'span',
                    {
                        className: 'bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold'
                    },
                    `${finishedCount}/${matches.length} finalizados`
                )
            ),

            h(
                'div',
                { className: 'overflow-x-auto' },

                h(
                    'table',
                    {
                        className: 'w-full table-fixed divide-y divide-gray-200'
                    },

                    h(
                        'thead',
                        { className: 'bg-gray-100' },

                        h(
                            'tr',

                            null,

                            h('th', {
                                className: 'w-12 px-1 py-2 text-center text-xs font-semibold uppercase text-gray-600'
                            }, 'Orden'),

                            h('th', {
                                className: 'w-16 px-10 py-2 text-center text-xs font-semibold uppercase text-gray-600'
                            }, 'Cat.'),

                            h('th', { className: 'w-10 px-1 py-2 text-center text-xs font-semibold uppercase text-gray-600' }, '📍 Zona'),

                            h('th', { className: 'px-3 py-3 text-center text-xs font-semibold uppercase text-gray-600' }, '👥 Pareja 1'),

                            h('th', { className: 'px-3 py-3 text-center text-xs font-semibold uppercase text-gray-600' }, '👥 Pareja 2')

                        )

                    ),

                    h(
                        'tbody',
                        { className: 'divide-y divide-gray-200 bg-white' },

                        matches.map((match, index) =>

                            h(
                                'tr',
                                {
                                    key: match.id,
                                    ref:
                                        match.id === nextMatch?.id
                                            ? currentMatchRef
                                            : null,
                                    className:

                                        isFinished(match)

                                            ?
                                            'bg-green-50 hover:bg-green-100 transition-colors'

                                            :

                                            index % 2 === 0

                                                ?
                                                'bg-white hover:bg-blue-50 transition-colors'

                                                :
                                                'bg-gray-50 hover:bg-blue-50 transition-colors'
                                },

                                h(
                                    'td',
                                    {
                                        className: 'px-2 py-2 text-center relative'
                                    },

                                    match.id === nextMatch?.id &&
                                    h(
                                        'span',
                                        {
                                            className:
                                                "absolute -left-6 top-1/2 -translate-y-1/2 animate-bounce text-blue-600 text-2xl"
                                        },
                                        "➜"
                                    ),

                                    h(
                                        'span',
                                        {
                                            className:
                                                isFinished(match)
                                                    ?
                                                    'bg-green-600 text-white rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap'
                                                    :
                                                    'bg-indigo-600 text-white rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap'
                                        },
                                        isFinished(match)
                                            ?
                                            `✓ ${match.matchNumber}`
                                            :
                                            match.matchNumber
                                    )
                                ),

                                // Categoría
                                h(
                                    'td',
                                    { className: 'px-2 py-2 text-center' },

                                    h(
                                        'span',
                                        {
                                            className:
                                                match.category === "Suma 13"
                                                    ? 'bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap'
                                                    : 'bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap'
                                        },
                                        match.category
                                    )
                                ),

                                // Zona
                                h(
                                    'td',
                                    { className: 'px-2 py-2 text-center' },

                                    h(
                                        'span',
                                        {
                                            className: `${getZoneStyle(match.group)} px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap`
                                        },
                                        match.group
                                    )
                                ),

                                // Pareja 1
                                h(
                                    'td',
                                    { className: 'p-2 align-top overflow-hidden' },
                                    renderTeam(
                                        match.teamA,
                                        'blue',
                                        match,
                                        "A"
                                    )
                                ),

                                // Pareja 2
                                h(
                                    'td',
                                    { className: 'p-2 align-top overflow-hidden' },
                                    renderTeam(
                                        match.teamB,
                                        'green',
                                        match,
                                        "B"
                                    )
                                )

                            )

                        )

                    )

                )

            )

        )

    );

};