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
        // We use our public API endpoint to get the note
        const response = await fetch(`http://localhost:3000/api/notes/${noteId}`);
        if (!response.ok) {
            if (response.status === 404) {
                 throw new Error('Note not found.');
            }
            throw new Error('Could not fetch the note.');
        }
        const note = await response.json();
        
        sharedTitle.value = note.title;
        sharedContent.value = note.content;
        document.title = note.title; // Update the page title

    } catch (error) {
        console.error('Error fetching shared note:', error);
        sharedTitle.value = 'Error';
        sharedContent.value = error.message;
    }
});