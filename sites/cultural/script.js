document.addEventListener('DOMContentLoaded', function () {
  var elems = document.querySelectorAll('.collapsible');
  M.Collapsible.init(elems, {
    accordion: false  // Permite que más de un acordeón esté abierto a la vez
  });
});

const jsonUrl1 = 'https://script.google.com/macros/s/AKfycbyvEKPNaItiD3uuoeltUF-7NWc2K9Cf4B6D3SNwM5C8LNm0t3xURVcTx1Cmt9pcY6dXeg/exec';
const jsonUrl2 = 'https://script.google.com/macros/s/AKfycbzKONyvT3ut-qfLlC-7m3pLaRuUpsU_fjS79cy1piewsnPs0PnPycPpYu3oG4NjZKAZ_A/exec';

var isSmallScreen = false;
var headerDateFormat = 'dddd';
document.addEventListener('DOMContentLoaded', () => {
  isSmallScreen = window.innerWidth <= 768;
  headerDateFormat = isSmallScreen ? "ddd" : "dddd";
});

// Función para manejar la carga de datos y actualizar la vista
function handleDataLoad() {
  document.getElementById('loading').style.display = 'none';
}

fetch(jsonUrl1)
  .then(response => response.json())
  .then(data => {
    const mergedData = mergeContinuousSlots(data);
    setupCalendar(mergedData, "dp");
  })
  .catch(error => console.error('Error:', error))
  .finally(() => {
    if (document.getElementById('dp') && document.getElementById('dp2')) {
      handleDataLoad(); // Solo muestra el contenido cuando ambos calendarios se han cargado
    }
  });

fetch(jsonUrl2)
  .then(response => response.json())
  .then(data => {
    const mergedData = mergeContinuousSlots(data);
    setupCalendar(mergedData, "dp2");
  })
  .catch(error => console.error('Error:', error))
  .finally(() => {
    if (document.getElementById('dp') && document.getElementById('dp2')) {
      handleDataLoad(); // Solo muestra el contenido cuando ambos calendarios se han cargado
    }
  });

function mergeContinuousSlots(data) {
  const mergedData = {};

  Object.keys(data).forEach(day => {
    const slots = data[day];
    let currentSlot = null;

    slots.forEach(slot => {
      if (currentSlot && slot.ocupante === currentSlot.ocupante && slot.desde === currentSlot.hasta) {
        currentSlot.hasta = slot.hasta;
      } else {
        if (currentSlot) {
          if (!mergedData[day]) {
            mergedData[day] = [];
          }
          mergedData[day].push(currentSlot);
        }
        currentSlot = { ...slot };
      }
    });

    if (currentSlot) {
      if (!mergedData[day]) {
        mergedData[day] = [];
      }
      mergedData[day].push(currentSlot);
    }
  });

  return mergedData;
}

function setupCalendar(data, divId) {
  const dp = new DayPilot.Calendar(divId, {
    viewType: "Week",
    theme: "calendar_modern",
    startDate: DayPilot.Date.today().firstDayOfWeek(),
    headerDateFormat: headerDateFormat,
    showCurrentTime: true,
    locale: "es-es",
    onEventClick: async args => {
      const form = [
        { name: "Texto", id: "text", disabled: true }, 
        { name: "Inicio", id: "start", type: "datetime", disabled: true },
        { name: "Fin", id: "end", type: "datetime", disabled: true }
      ];

      const modal = await DayPilot.Modal.form(form, args.e.data, { cancelText: "Cancelar", okDisabled: true });

      if (modal.canceled) {
        return;
      }

      dp.events.update(modal.result);
    },
    onBeforeEventRender: args => {
      args.data.barBackColor = "transparent";
      if (!args.data.barColor) {
        args.data.barColor = "#333";
      }
    },
  });
  dp.init();

  const events = [];

  const colors = ["#3c78d8", "#d9e5f6", "#005b96", "#b3cde0"];
  let colorIndex = 0;

  Object.keys(data).forEach(day => {
    data[day].forEach(slot => {
      const start = createDayPilotDate(day, slot.desde);
      const end = createDayPilotDate(day, slot.hasta);

      const color = colors[colorIndex % colors.length];
      colorIndex++;

      events.push({
        start: start,
        end: end,
        id: DayPilot.guid(),
        text: slot.ocupante,
        barColor: color
      });
    });
  });

  dp.update({ events });
}

function createDayPilotDate(day, time) {
  const daysMap = {
    "lunes": 1,
    "martes": 2,
    "miércoles": 3,
    "jueves": 4,
    "viernes": 5,
    "sábado": 6,
    "domingo": 0
  };

  const firstDayOfWeek = DayPilot.Date.today().firstDayOfWeek();
  const dayOffset = daysMap[day];
  const [hour, minute] = time.split(':').map(Number);
  return firstDayOfWeek.addDays(dayOffset).addHours(hour).addMinutes(minute);
}
