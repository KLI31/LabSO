const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./processes.db", (err) => {
  if (err) {
    console.error("Error al abrir la base de datos:", err.message);
  } else {
    console.log("Conectado a la base de datos SQLite.");
    db.run(`
      CREATE TABLE IF NOT EXISTS processes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        catalogId INTEGER,
        pid TEXT,
        name TEXT,
        user TEXT,
        priority TEXT,
        description TEXT,
        expulsivo INTEGER,
        userModeTime TEXT,
        workingSetSize TEXT
      )
    `);
  }
});

function saveProcessesToDatabase(processes) {
  db.serialize(() => {
    db.run("DELETE FROM processes");
    const stmt = db.prepare(`
      INSERT INTO processes (id, catalogId, pid, name, user, priority, description, expulsivo,userModeTime,workingSetSize)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? ,?)
    `);
    processes.forEach((process) => {
      stmt.run(
        process.id,
        process.catalogId,
        process.pid,
        process.name,
        process.user,
        process.priority,
        process.description,
        process.expulsivo,
        process.userModeTime,
        process.workingSetSize
      );
    });
    stmt.finalize();
    console.log("Procesos guardados en la base de datos.");
  });
}

module.exports = { db, saveProcessesToDatabase };
