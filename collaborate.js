// Connect to our Socket.IO server
const API_BASE_URL = 'https://rohan-notes-api.onrender.com/api';
const socket = io('https://rohan-notes-api.onrender.com');

// Get elements from the page
const titleInput = document.getElementById('shared-title');
const contentInput = document.getElementById('shared-content');

// Get the note ID from the URL
const params = new URLSearchParams(window.location.search);
const noteId = params.get('id');

// --- NEW: Variables to lock the ORIGINAL content ---
let originalTitle = '';
let originalContent = '';

// --- NEW: Variables to store the last known GOOD text ---
let lastValidTitle = '';
let lastValidContent = '';


if (!noteId) {
    titleInput.value = 'Error';
    contentInput.value = 'No note ID was provided in the URL.';
} else {
    // --- 1. Load the initial note content ---
    async function getInitialNote() {
        try {
            const response = await fetch(`http://localhost:3000/api/notes/${noteId}`);
            if (!response.ok) throw new Error('Note not found.');
            
            const note = await response.json();
            
            titleInput.value = note.title;
            contentInput.value = note.content;
            document.title = note.title;

            // --- NEW: Set the "sharer" content. This will NOT change. ---
            originalTitle = note.title;
            originalContent = note.content;

            // --- NEW: Set the initial "last valid" state ---
            lastValidTitle = note.title;
            lastValidContent = note.content;

        } catch (error) {
            console.error('Error fetching note:', error);
            titleInput.value = 'Error';
            contentInput.value = error.message;
        }
    }

    // --- 2. Tell the server we want to join this note's room ---
    socket.emit('joinNoteRoom', noteId);
    
    // --- 3. Send updates (if they are valid) ---
    
    // --- NEW: Modified event listener for TITLE ---
    titleInput.addEventListener('input', () => {
        if (titleInput.value.startsWith(originalTitle)) {
            // This is a valid edit (it respects the original).
            lastValidTitle = titleInput.value; // Update the last valid state
            sendUpdate(); // Send the valid change
        } else {
            // This is an invalid edit. Reset to the last valid state.
            titleInput.value = lastValidTitle;
        }
    });

    // --- NEW: Modified event listener for CONTENT ---
    contentInput.addEventListener('input', () => {
        if (contentInput.value.startsWith(originalContent)) {
            // This is a valid edit (it respects the original).
            lastValidContent = contentInput.value; // Update the last valid state
            sendUpdate(); // Send the valid change
        } else {
            // This is an invalid edit. Reset to the last valid state.
            contentInput.value = lastValidContent;
        }
    });

    // This function sends the data
    function sendUpdate() {
        const data = {
            noteId: noteId,
            title: titleInput.value,
            content: contentInput.value
        };
        socket.emit('noteUpdate', data);
    }
    
    // --- 4. Listen for updates from others ---
    socket.on('receiveUpdate', (data) => {
        console.log('Received update from another user');
        titleInput.value = data.title;
        contentInput.value = data.content;

        // --- NEW: Update the last valid state with remote changes ---
        // This "locks in" the other user's additions
        lastValidTitle = data.title;
        lastValidContent = data.content;
    });

    // Load the note when the page opens
    getInitialNote();

}
