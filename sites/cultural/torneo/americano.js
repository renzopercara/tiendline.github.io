
export const calculateStandings = (matchData) => {
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