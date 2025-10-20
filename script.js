const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const copyButton = document.getElementById('copyButton');

inputText.addEventListener('input', () => {
  outputText.value = inputText.value.toUpperCase();
});

copyButton.addEventListener('click', () => {
  navigator.clipboard.writeText(outputText.value)
    .then(() => {
      copyButton.textContent = 'Kopiert!';
      setTimeout(() => {
        copyButton.textContent = 'Text kopieren';
      }, 2000);
    })
    .catch(err => {
      console.error('Fehler beim Kopieren:', err);
    });
});
