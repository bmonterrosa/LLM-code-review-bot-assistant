/*Toggle Apply and Undo button*/
function toggleButton(buttonElement) {
    if (buttonElement.innerText === 'Apply') {
        buttonElement.innerText = 'Undo';
    } else {
        buttonElement.innerText = 'Apply';
    }
}

document.querySelectorAll('.applyButton').forEach(function(button) {
    button.addEventListener('click', function() {
        toggleButton(button)
        button.classList="undoButton"
    });
});

document.querySelectorAll('.undoButton').forEach(function(button) {
    button.addEventListener('click', function() {
        toggleButton(button)
        button.classList="applyButton"
    });
});

/*Copy preview on clipboard*/
document.getElementById('copySuggestion').addEventListener('click', copyToClipboard);

function copyToClipboard() {
    const text = document.getElementById('previewContent').innerText;

    navigator.clipboard.writeText(text)
    .then(() => {
        console.log('Text copied to clipboard');
    })
    .catch(err => {
        console.error('Could not copy text: ', err);
    });
}
