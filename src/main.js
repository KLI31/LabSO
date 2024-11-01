const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { exec } = require("child_process");
const express = require("express");
const { db, saveProcessesToDatabase } = require("../database/database");
const sudo = require("sudo-prompt");

let mainWindow;

// Configuración de la ventana de la aplicación
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile(path.join(__dirname, "views/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// Inicialización de la aplicación
app.on("ready", createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (mainWindow === null) createWindow();
});

// Manejador para obtener procesos y guardar en la base de datos
ipcMain.handle("get-processes", async (_, processCount, filterType) => {
  try {
    const command = getProcessCommand(filterType, processCount);
    const processesOutput = await executeCommand(command);
    const processes = parseProcesses(processesOutput, processCount);
    console.log(processes);
    saveProcessesToDatabase(processes);
    return processes;
  } catch (error) {
    console.error("Error obteniendo procesos:", error);
    throw error;
  }
});

// Construcción del comando de obtención de procesos según el sistema y el filtro
function getProcessCommand(filterType, processCount) {
  if (!processCount || isNaN(processCount)) {
    throw new Error("El número de procesos (processCount) no es válido.");
  }

  if (process.platform === "win32") {
    if (filterType === "cpu") {
      return `wmic process get Name,ProcessId,UserModeTime,Priority,WorkingSetSize`;
    } else if (filterType === "memory") {
      return `wmic process get Name,ProcessId,UserModeTime,Priority,WorkingSetSize`;
    }
  } else if (process.platform === "linux" || process.platform === "darwin") {
    if (filterType === "cpu") {
      return `ps -eo pid,pri,comm,pcpu --sort=-pcpu | head -n ${
        processCount + 1
      }`;
    } else if (filterType === "memory") {
      return `ps -eo pid,pri,comm,pmem --sort=-pmem | head -n ${
        processCount + 1
      }`;
    }
  }

  throw new Error(
    "Sistema operativo no compatible o filtro inválido. Selecciona 'cpu' o 'memory'."
  );
}

// Función para ejecutar un comando y obtener su salida
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error ejecutando comando: ${stderr}`);
      } else {
        resolve(stdout);
      }
    });
  });
}

function parseProcesses(output, processCount) {
  const lines = output.split("\n").slice(1);
  console.log(lines);
  return lines
    .filter((line) => line.trim() !== "")
    .map((line, index) => {
      const parts = line.trim().split(/\s{2,}/);

      const name = parts[0];
      const priority = parts[1];
      const pid = parts[2];
      const userModeTime = parts[3];
      const workingSetSize = parts[4];

      return {
        catalogId: index + 1,
        pid,
        name,
        user: "unknown",
        priority,
        description: "NA",
        expulsivo: isSystemProcess(name) ? 1 : 0,
        userModeTime,
        workingSetSize,
      };
    })
    .filter((process) => process !== null)
    .slice(0, processCount);
}

function isSystemProcess(name) {
  const systemProcesses = [
    "System Idle Process",
    "System",
    "Registry",
    "smss.exe",
    "csrss.exe",
    "wininit.exe",
    "services.exe",
  ];
  return systemProcesses.includes(name);
}

// Servicio web REST para exponer los procesos en XML
const expressApp = express();
expressApp.get("/processes", (req, res) => {
  db.all("SELECT * FROM processes", (err, rows) => {
    if (err) {
      res
        .status(500)
        .send("Error al obtener los procesos de la base de datos.");
    } else {
      const xmlResponse = generateXMLResponse(rows);
      res.set("Content-Type", "text/xml");
      res.send(xmlResponse);
    }
  });
});

expressApp.listen(3000, () =>
  console.log("Servicio web corriendo en http://localhost:3000")
);

function generateXMLResponse(processes) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<processes>\n';
  processes.forEach((process) => {
    xml += `  <process>\n`;
    xml += `    <catalogId>${process.catalogId}</catalogId>\n`;
    xml += `    <pid>${process.pid}</pid>\n`;
    xml += `    <name>${process.name}</name>\n`;
    xml += `    <user>${process.user}</user>\n`;
    xml += `    <priority>${process.priority}</priority>\n`;
    xml += `    <expulsivo>${process.expulsivo}</expulsivo>\n`;
    xml += `    <description>${process.description}</description>\n`;
    xml += `    <cpu>${process.userModeTime}</cpu>\n`;
    xml += `    <memory>${process.workingSetSize}</memory>\n`;
    xml += `  </process>\n`;
  });
  xml += `</processes>`;
  return xml;
}
