const calendars = {};


document.addEventListener('DOMContentLoaded', function () {
  var elems = document.querySelectorAll('.collapsible');
  M.Collapsible.init(elems, {
    accordion: false 
  });
});

const jsonUrl1 = 'https://script.google.com/macros/s/AKfycbz5ou_awGp1A27Wl-8LuJrrVlZSZie4MJzrxfV8tuyAKcsNlaqEIt4iE5jH_h_zgo3HzQ/exec';
const jsonUrl2 = 'https://script.google.com/macros/s/AKfycbw4_pUtCYrMQOjtGZSf-fCmLyt_-tj-FKhRVbfzaDCgNkBlGhI1GQrSSnxH4Oeedqj0bA/exec';

var isSmallScreen = false;
var headerDateFormat = 'dddd';
document.addEventListener('DOMContentLoaded', () => {
  isSmallScreen = window.innerWidth <= 768;
  headerDateFormat = isSmallScreen ? "ddd" : "dddd";
});

function handleDataLoad() {
  document.getElementById('loading').style.display = 'none';
}

Promise.all([
  fetch(jsonUrl1)
    .then(response => response.json())
    .then(data => {
      const mergedData = mergeContinuousSlots(data);
      setupCalendar(mergedData, "dp");
    }),

  fetch(jsonUrl2)
    .then(response => response.json())
    .then(data => {
      const mergedData = mergeContinuousSlots(data);
      setupCalendar(mergedData, "dp2");
    })
])
.then(() => {
  if (document.getElementById('dp') && document.getElementById('dp2')) {
    handleDataLoad();
  }
  calendars.dp.init()
})
.catch(error => {
  console.error('Error:', error);
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
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const hourWidth = isMobile ? 30 : 60;
  console.log('hourWidth: ', hourWidth);

  calendars[divId] = new DayPilot.Calendar(divId, {
    viewType: "Week",
    theme: "calendar_modern",
    startDate: DayPilot.Date.today().firstDayOfWeek(),
    headerDateFormat: headerDateFormat,
    showCurrentTime: true,
    locale: "es-es",    
    initScrollPos: 840,
    hourWidth,
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

      calendars[divId].events.update(modal.result);
    },
    onBeforeEventRender: args => {
      args.data.barBackColor = "transparent";
      if (!args.data.barColor) {
        args.data.barColor = "#333";
      }
    },
  });
  calendars[divId].init();

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

  calendars[divId].update({ events });
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
