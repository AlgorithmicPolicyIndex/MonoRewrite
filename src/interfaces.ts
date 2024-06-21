interface Server {
        channelId: string,
        roleId: string,
        ping: boolean
}
interface Game {
        // ? Game
        killer?: string | null,
        victim?: string | null,
        started?: boolean,
        voting?: boolean,
        votedUsers?: {
                [key: string]: Vote
        } | null,

        // ? Stats
        totalGames?: number,
        totalWonGames?: number
}
interface Vote {
        voters: string[]
        name: string
                
}
interface User {
        [userId: string]: {
                totalWonGames: number
        }
}

export { Server, Game, User, Vote }