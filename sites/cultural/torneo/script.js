import { h, render } from "preact";
import { useState, useEffect, useRef } from "preact/hooks";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, onSnapshot } from "firebase/firestore";
import { AMERICANO_MUJERES_URL, SUMA_14_MUJERES_URL, tournamentData, SUMA_13_HOMBRES_URL } from "./contants.js";
import { calculateStandings } from "./americano.js";
import { Sum14ClassificationView } from "./suma14.js";
import { MatchesView, PlayerTable, LoadingSpinner, convertToBracketFormat } from "./common.js";




const JQueryBracketView = ({ initialData }) => {
    const bracketRef = useRef(null);
    const [isBracketLoaded, setIsBracketLoaded] = useState(false);
    const dataKey = JSON.stringify(initialData);

    useEffect(() => {
        const $ = window.jQuery;
        if ($ && initialData.teams && initialData.teams.length > 0 && bracketRef.current) {
            if (!$.fn.bracket) {
                console.error("jQuery Bracket plugin NO SE ENCUENTRA. Verifique la carga.");
                setIsBracketLoaded(false);
                return;
            }

            $(bracketRef.current).empty();

            // Uso Mínimo como en el ejemplo:
            $(bracketRef.current).bracket({
                init: initialData,
                teamWidth: 200,
                scoreWidth: 30,
                matchMargin: 40,
                roundMargin: 50,
                decorator: {
                    render: function (container, teamData, score, state) {
                        // teamData puede ser string como "Valeria/Valeria [10:00]"
                        let name = teamData || "";
                        let time = "";

                        // Extraemos nombre y hora si existe
                        const match = teamData ? teamData.match(/(.*?)\s*\[(.*?)\]$/) : null;
                        if (match) {
                            name = match[1].trim();
                            time = match[2].trim();
                        }

                        // Limpiamos container y agregamos nombre + score
                        container.empty();
                        container.append(`<div class="team-name">${name}</div>`);

                        if (score !== null && score !== undefined) {
                            container.append(`<div class="team-score">${score}</div>`);
                        }

                        // Agregamos badge de hora sobre el partido
                        if (time) {
                            setTimeout(() => {
                                const matchContainer = $(container).closest('.team').parent(); // sube desde label -> team -> match (cuando ya existe)
                                if (matchContainer.length && !matchContainer.find('.team-time-badge').length) {
                                    matchContainer.css('position', 'relative');
                                    matchContainer.append(`
        <div class="team-time-badge"
             style="
                position:absolute;
                top:50%;
                left:75%;
                transform:translate(-50%, -50%);
                background:#2563EB;
                color:white;
                padding:2px 6px;
                border-radius:8px;
                font-size:12px;
                z-index:1000;
                pointer-events:none;
             ">
          ${time}
        </div>
      `);
                                }
                            }, 0); // ejecuta justo después del render real
                        }
                    },

                    edit: function (container, teamData, doneCb) {
                        // Mantener edición básica de nombre
                        let name = teamData || "";
                        let time = "";

                        const match = teamData ? teamData.match(/(.*?)\s*\[(.*?)\]$/) : null;
                        if (match) {
                            name = match[1].trim();
                            time = match[2].trim();
                        }

                        const input = $('<input type="text">');
                        input.val(name);
                        container.empty().append(input);
                        input.focus();

                        input.blur(() => {
                            doneCb(time ? `${input.val()} [${time}]` : input.val());
                        });
                    }

                }
            });
            setIsBracketLoaded(true);
        } else {
            setIsBracketLoaded(false);
        }

    }, [dataKey]);

    return h('div', {
        className: 'bracket-container-wrapper p-4 overflow-x-auto bg-white shadow-inner rounded-lg min-h-[400px]',
        key: dataKey,
        ref: bracketRef,
    },
        // Lógica de mensajes de carga/datos
        !isBracketLoaded && initialData.teams && initialData.teams.length > 0
            ? h('div', { className: 'p-4 text-center text-gray-500' }, 'Cargando llave del torneo...')
            : initialData.teams && initialData.teams.length === 0
                ? h('div', { className: 'p-4 text-center text-gray-500 font-semibold' }, 'La fase final aún no tiene partidos definidos o cargados.')
                : null
    );
};

const TournamentDetails = ({ data, firebaseStandings }) => {
    const isNormalTournament = data.id === 1;
    const initialSubTab = isNormalTournament ? 0 : 0;
    const [subTab, setSubTab] = useState(initialSubTab);
    const [matchData, setMatchData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [americanoStandingsData, setAmericanoStandingsData] = useState({ standingsArray: [], positionMap: new Map() });

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
                    setAmericanoStandingsData(calculateStandings(data));
                }

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
        } else if (data.id === 1) {
            fetchMatches(SUMA_13_HOMBRES_URL, 2);
        } else {
            setMatchData([]);
            setAmericanoStandingsData({ standingsArray: [], positionMap: new Map() });
            setLoading(false);
        }
    }, [data.id]);

    const subTabs = isNormalTournament
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

    let content;
    if (loading) {
        content = h(LoadingSpinner);
    } else if (error) {
        content = h('div', { className: 'p-6 text-center text-red-500 font-semibold border-2 border-red-300 rounded-lg' }, error);
    } else {
        if (data.id === 0) {
            content = subTab === 0
                ? h(MatchesView, { matches: matchData, standings: americanoStandingsData, isNormalTournament: false })
                : h(PlayerTable, { standings: americanoStandingsData.standingsArray, showRank: true });
        } else if (data.id === 1) {
            content = subTab === 0
                ? h(Sum14ClassificationView, { matchData: matchData })
                : h(JQueryBracketView, { initialData: convertToBracketFormat(matchData) });
        } else {
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
            h('h3', { className: 'text-2xl font-extrabold text-gray-800' }, data.fullTitle)
        ),
        h('p', { className: 'text-gray-600 mb-6 text-center border-b pb-4' }, data.description),

        (data.id === 0 || data.id === 1)
            ? h(TournamentDetails, { data: data, firebaseStandings: standings })
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
        if (!db || !userId || activeTournament.id === 0 || activeTournament.id === 1) {
            setStandings([]);
            return;
        }

        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const collectionPath = `/artifacts/${appId}/users/${userId}/tournament_standings_${activeTournament.id}`;

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
