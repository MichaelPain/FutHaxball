const sqlite3 = require('sqlite3').verbose();

const DB_PATH = './haxball_clone.db';
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database: " + DB_PATH);
        initializeDatabaseSchema();
    }
});

const USER_TABLE_COLUMNS = [
    { name: 'email_verification_token', type: 'TEXT' },
    { name: 'email_verification_token_expiry', type: 'TEXT' },
    { name: 'password_reset_token', type: 'TEXT' },
    { name: 'password_reset_token_expiry', type: 'TEXT' }
];

const GAME_ROOMS_TABLE_COLUMNS = [
    { name: 'host_user_id', type: 'INTEGER NOT NULL REFERENCES users(user_id)' },
    { name: 'host_socket_id', type: 'TEXT' },
    { name: 'room_name', type: 'TEXT NOT NULL' },
    { name: 'password_hash', type: 'TEXT NULLABLE' },
    { name: 'max_players', type: 'INTEGER NOT NULL DEFAULT 4' },
    { name: 'current_players_count', type: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'game_settings', type: 'TEXT DEFAULT \'{}\'' }, 
    { name: 'status', type: 'TEXT NOT NULL DEFAULT \'waiting\'' }, 
    { name: 'is_public', type: 'INTEGER NOT NULL DEFAULT 1' }, 
    { name: 'created_at', type: 'TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP' }
];

const PLAYER_MMR_TABLE_COLUMNS = [
    // user_id and game_mode are part of primary key in initial schema
    { name: 'mmr', type: 'INTEGER NOT NULL DEFAULT 1200' },
    { name: 'last_played_date', type: 'TEXT' },
    { name: 'wins', type: 'INTEGER NOT NULL DEFAULT 0' },      // Added
    { name: 'losses', type: 'INTEGER NOT NULL DEFAULT 0' }    // Added
];

const RANKED_MATCHES_TABLE_COLUMNS = [
    // match_id is primary key
    { name: 'game_mode', type: 'TEXT NOT NULL' },
    { name: 'status', type: 'TEXT NOT NULL DEFAULT \'pending\'' },
    { name: 'start_time', type: 'TEXT' },
    { name: 'end_time', type: 'TEXT' },
    { name: 'score_team_red', type: 'INTEGER DEFAULT 0' },
    { name: 'score_team_blue', type: 'INTEGER DEFAULT 0' },
    { name: 'server_or_host_id', type: 'TEXT' },
    { name: 'game_settings', type: 'TEXT DEFAULT \'{}\'' } // Added in a previous step
];

const MATCH_PARTICIPANTS_TABLE_COLUMNS = [
    // match_id and user_id are part of foreign keys in initial schema
    { name: 'team', type: 'TEXT NOT NULL' },
    { name: 'mmr_before_match', type: 'INTEGER' },
    { name: 'mmr_after_match', type: 'INTEGER' },
    { name: 'mmr_change', type: 'INTEGER' }
];


function initializeDatabaseSchema() {
    const initialUserSchema = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nickname TEXT UNIQUE NOT NULL,
        registration_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        is_verified INTEGER NOT NULL DEFAULT 0,
        last_login_date TEXT,
        profile_avatar_url TEXT
    );`;

    const initialGameRoomsSchema = `
    CREATE TABLE IF NOT EXISTS game_rooms (
        room_id TEXT PRIMARY KEY NOT NULL
    );`;

    const initialPlayerMmrSchema = `
    CREATE TABLE IF NOT EXISTS player_mmr (
        player_mmr_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        game_mode TEXT NOT NULL,
        mmr INTEGER NOT NULL DEFAULT 1200,      -- Added default here
        wins INTEGER NOT NULL DEFAULT 0,        -- Added
        losses INTEGER NOT NULL DEFAULT 0,      -- Added
        last_played_date TEXT,                  -- Added default here
        UNIQUE(user_id, game_mode) 
    );`; 

    const initialRankedMatchesSchema = `
    CREATE TABLE IF NOT EXISTS ranked_matches (
        match_id TEXT PRIMARY KEY NOT NULL
    );`; 

    const initialMatchParticipantsSchema = `
    CREATE TABLE IF NOT EXISTS match_participants (
        match_participant_id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id TEXT NOT NULL REFERENCES ranked_matches(match_id),
        user_id INTEGER NOT NULL REFERENCES users(user_id)
    );`;

    db.serialize(() => {
        db.run(initialUserSchema, (err) => {
            if (err) console.error("Users table init error:", err.message);
            else { console.log("Users table OK."); addMissingColumns('users', USER_TABLE_COLUMNS, maybeCloseDbConnection); }
        });

        db.run(initialGameRoomsSchema, (err) => {
            if (err) console.error("Game_rooms table init error:", err.message);
            else { console.log("Game_rooms table OK."); addMissingColumns('game_rooms', GAME_ROOMS_TABLE_COLUMNS, maybeCloseDbConnection); }
        });

        db.run(initialPlayerMmrSchema, (err) => {
            if (err) console.error("Player_mmr table init error:", err.message);
            else { 
                console.log("Player_mmr table OK (with wins/losses in initial create)."); 
                // addMissingColumns will now check against the *fuller* PLAYER_MMR_TABLE_COLUMNS
                // but since wins/losses are in initial create, it should find them.
                // If the table *already* existed from a very old version *without* wins/losses,
                // then addMissingColumns would add them.
                addMissingColumns('player_mmr', PLAYER_MMR_TABLE_COLUMNS, maybeCloseDbConnection); 
            }
        });

        db.run(initialRankedMatchesSchema, (err) => {
            if (err) console.error("Ranked_matches table init error:", err.message);
            else { console.log("Ranked_matches table OK."); addMissingColumns('ranked_matches', RANKED_MATCHES_TABLE_COLUMNS, maybeCloseDbConnection); }
        });

        db.run(initialMatchParticipantsSchema, (err) => {
            if (err) console.error("Match_participants table init error:", err.message);
            else { console.log("Match_participants table OK."); addMissingColumns('match_participants', MATCH_PARTICIPANTS_TABLE_COLUMNS, maybeCloseDbConnection); }
        });
    });
}

let pendingSchemaOperations = 0; 

function addMissingColumns(tableName, columnDefinitions, callback) {
    pendingSchemaOperations++; 
    db.all(`PRAGMA table_info(${tableName});`, (pragmaErr, columns) => {
        if (pragmaErr) {
            console.error(`Error querying table info for ${tableName}:`, pragmaErr.message);
            pendingSchemaOperations--;
            if (callback) callback();
            return;
        }

        const existingColumnNames = columns.map(col => col.name);
        let newColumnsToAdd = columnDefinitions.filter(colDef => !existingColumnNames.includes(colDef.name));
        
        if (newColumnsToAdd.length === 0) {
            pendingSchemaOperations--;
            if (callback) callback();
            return;
        }

        let completedAlterOpsForTable = 0;
        newColumnsToAdd.forEach(col => {
            const addColumnSql = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type};`;
            db.run(addColumnSql, (addErr) => {
                completedAlterOpsForTable++;
                if (addErr) {
                    console.error(`Error adding column ${col.name} to ${tableName}:`, addErr.message);
                } else {
                    console.log(`Column ${col.name} added successfully to ${tableName}.`);
                }
                if (completedAlterOpsForTable === newColumnsToAdd.length) {
                    pendingSchemaOperations--;
                    if (callback) callback();
                }
            });
        });
    });
}

function maybeCloseDbConnection() {
    if (require.main === module && pendingSchemaOperations === 0) {
        db.close((closeErr) => {
            if (closeErr) console.error("Error closing database:", closeErr.message);
            else console.log("Database connection closed after schema checks.");
        });
    }
}

module.exports = db;
