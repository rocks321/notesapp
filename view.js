// This file (view.js) is for the read-only page

document.addEventListener('DOMContentLoaded', async () => {
    const sharedTitle = document.getElementById('shared-title');
    const sharedContent = document.getElementById('shared-content');

    // Get the note ID from the URL query parameter
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('id');

    if (!noteId) {
        sharedTitle.value = 'Error';
        sharedContent.value = 'No note ID was provided in the URL.';
        return;
    }

    try {
        // 1. Define the base URL (You already had this)
        const API_BASE_URL = 'https://rohan-notes-api.onrender.com/api';

        // 2. THIS IS THE MISSING LINE! (Actually fetch the data)
        // We combine the base URL with the specific path for shared notes and the ID
        const response = await fetch(`${API_BASE_URL}/notes/shared/${noteId}`);

        // 3. Now 'response' exists, so we can check it
        if (!response.ok) {
            if (response.status === 404) {
                 throw new Error('Note not found.');
            }
            throw new Error('Could not fetch the note.');
        }

        const note = await response.json();
        
        sharedTitle.value = note.title;
        sharedContent.value = note.content;
        document.title = note.title;

    } catch (error) {
        console.error('Error fetching shared note:', error);
        sharedTitle.value = 'Error';
        sharedContent.value = error.message;
    }

});

