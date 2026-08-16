const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Veritabanı dosyasını oluştur (eğer yoksa) ve bağlan
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Veritabanı bağlantı hatası:', err.message);
    } else {
        console.log('SQLite veritabanına bağlanıldı.');
    }
});

// Tabloları oluştur
const initDB = () => {
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            character_name TEXT NOT NULL,
            payment_type TEXT NOT NULL,
            location TEXT NOT NULL,
            status TEXT DEFAULT 'bekliyor', -- 'bekliyor', 'onaylandi', 'reddedildi'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
};

initDB();

module.exports = db;
