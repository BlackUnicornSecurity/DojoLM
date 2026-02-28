// DojoLM - "Martial Arts for LLM Security"
// Clean security test fixture from DojoLM
// DojoLM - "Martial Arts for LLM Security"
// Clean security test fixture from DojoLM
// Simple utility functions for data processing
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US').format(date);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

module.exports = { formatDate, capitalize, debounce };
