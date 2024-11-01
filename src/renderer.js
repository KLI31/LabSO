const filterCPU = document.getElementById("filterCPU");
const filterMemory = document.getElementById("filterMemory");
const processCountInput = document.getElementById("processCount");
const processTableBody = document
  .getElementById("processTable")
  .querySelector("tbody");

// Asegurar que solo un filtro esté seleccionado a la vez
filterCPU.addEventListener("change", () => {
  if (filterCPU.checked) filterMemory.checked = false;
  loadProcesses(); // Cargar procesos al cambiar el filtro
});

filterMemory.addEventListener("change", () => {
  if (filterMemory.checked) filterCPU.checked = false;
  loadProcesses(); // Cargar procesos al cambiar el filtro
});

// Función para obtener y mostrar procesos
async function loadProcesses() {
  const processCount = parseInt(processCountInput.value, 10);
  const filterType = filterCPU.checked
    ? "cpu"
    : filterMemory.checked
    ? "memory"
    : null;

  if (!processCount || !filterType) {
    alert(
      "Por favor, selecciona el tipo de filtro y asegúrate de que la cantidad de procesos sea válida."
    );
    return;
  }

  try {
    const processes = await window.electronAPI.getProcesses(
      processCount,
      filterType
    );

    if (!processes || !Array.isArray(processes)) {
      throw new Error("Datos de procesos inválidos recibidos.");
    }

    // Limpiar la tabla antes de añadir nuevos datos
    processTableBody.innerHTML = "";

    processes.forEach((process) => {
      const row = document.createElement("tr");

      // Calcular memoria solo si el filtro es memoria, de lo contrario mostrar "N/A"
      const memoryMB =
        filterType === "memory"
          ? (parseInt(process.workingSetSize) / 1024 / 1024).toFixed(2) + " MB"
          : "N/A";

      const cpuUsage =
        filterType === "cpu" ? formatUserModeTime(process.userModeTime) : "N/A";

      row.innerHTML = `
        <td>${process.catalogId}</td>
        <td>${process.name}</td>
        <td>${cpuUsage}</td>
        <td>${memoryMB}</td>
        <td>${process.user}</td>
        <td>${process.priority}</td>
        <td>${process.expulsivo}</td>
      `;

      processTableBody.appendChild(row);
    });
  } catch (error) {
    console.error("Error al cargar los procesos:", error);
    alert("Ocurrió un error al obtener los procesos.");
  }
}

function formatUserModeTime(userModeTime) {
  if (isNaN(parseInt(userModeTime))) return "0m 0s";
  const totalSeconds = Math.floor(parseInt(userModeTime) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

// Eventos para cargar procesos al cambiar la entrada
processCountInput.addEventListener("change", loadProcesses);
filterCPU.addEventListener("change", loadProcesses);
filterMemory.addEventListener("change", loadProcesses);

loadProcesses();
