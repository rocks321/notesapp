// SECURITY CHECK: Redirect to login if no token is found
const API_URL = 'https://rohan-notes-api.onrender.com/api/notes';
import { GoogleGenerativeAI } from "https://cdn.jsdelivr.net/npm/@google/generative-ai/dist/index.mjs";
const token = localStorage.getItem('authToken');
if (!token) {
    window.location.href = '/login.html';
}
const notesGrid = document.getElementById('notes-grid');
const noteTitleInput = document.getElementById('note-title');
const noteContentInput = document.getElementById('note-content');
const addNoteBtn = document.getElementById('add-note-btn');
let generativeModel;
let currentNoteContent = '';

// --- AI Initialization ---------
try {
    // NEW:
// CORRECT
const genAI = new GoogleGenerativeAI("AIzaSyAv0twSzuCX37iG4YLbXpdYFGvfHHpN8yI");
    // NEW (Correct):
generativeModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    console.log("AI Model Loaded Successfully.");
} catch(err) {
    console.error("AI Initialization Error:", err);
    alert("Could not load the AI. Please check your API key.");
}

// The backend server URL. For development, it's localhost.
const API_BASE_URL = 'https://rohan-notes-api.onrender.com/api'; 
// --- Functions ---

// Function to fetch all notes from the server and display them
async function loadNotes() {
    try {
         const response = await fetch(API_URL, {
         headers: {
        'Authorization': `Bearer ${token}` // Add this
    }
});
        if (!response.ok) throw new Error('Failed to fetch notes');
        const notes = await response.json();

        notesGrid.innerHTML = ''; // Clear existing notes
        notes.forEach(note => {
            const noteElement = createNoteElement(note._id, note.title, note.content, note.createdAt);
            notesGrid.appendChild(noteElement);
        });
    } catch (error) {
        console.error('Error loading notes:', error);
        notesGrid.innerHTML = '<p>Could not load notes. Is the server running?</p>';
    }
}

// Function to create the HTML for a single note
// Find this function and modify the innerHTML
function createNoteElement(id, title, content, createdAt) {
    const noteCard = document.createElement('div');
    noteCard.classList.add('note-card');
    noteCard.setAttribute('id', `note-${id}`);

    const formattedDate = new Date(createdAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });

   noteCard.innerHTML = `
    <button class="delete-btn" data-action="delete" data-id="${id}">×</button>
    <h2 class="note-title">${title}</h2>
    <p class="note-content">${content}</p>
    <div class="note-footer">
        <small>${formattedDate}</small>
        <span>
            <button class="share-btn" data-action="share-view" data-id="${id}">Share (View)</button>
            <button class="edit-btn" data-action="share-collab" data-id="${id}">Collaborate</button>
            <button class="edit-btn" data-action="edit" data-id="${id}">Edit</button>
            <button class="ai-btn" data-action="ai-chat" data-id="${id}">AI ✨</button>
            <button class="card-btn" onclick="downloadCardPDF(this)" title="Download PDF"> 📄</button>
        </span>
    </div>
`;
    return noteCard;
}

// Function to delete a note
async function deleteNote(id) {
    // Ask for confirmation before deleting
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: { // Add this whole headers object
        'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete note');

        // Remove the note element from the page immediately
        const noteElement = document.getElementById(`note-${id}`);
        if (noteElement) {
            noteElement.remove();
        }

    } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note.');
    }
}

// Function to add a new note
async function addNote() {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();

    if (!title || !content) {
        alert('Please provide both a title and content for the note.');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Add this
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) throw new Error('Failed to add note');
        
        // Clear input fields
        noteTitleInput.value = '';
        noteContentInput.value = '';
        
        // Reload notes to show the new one
        loadNotes();

    } catch (error) {
        console.error('Error adding note:', error);
        alert('Failed to add note.');
    }
}

// Function to handle sharing
function shareNote(id, mode) {
    let page = '';
    if (mode === 'view') {
        page = 'view.html';
    } else {
        page = 'collaborate.html';
    }

    const shareUrl = `${window.location.origin}/${page}?id=${id}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
        alert(`Link for "${mode}" copied to clipboard!`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Could not copy link. Here it is: ' + shareUrl);
    });
}

// Add these two new functions anywhere in script.js

// Function to turn a note card into an editable form
function editNote(id) {
    const noteCard = document.getElementById(`note-${id}`);
    const titleElement = noteCard.querySelector('.note-title');
    const contentElement = noteCard.querySelector('.note-content');

    const currentTitle = titleElement.innerText;
    const currentContent = contentElement.innerText;

    // Replace the note's content with an editable form
    noteCard.innerHTML = `
       <input type="text" class="edit-title" value="${currentTitle}">
        <textarea class="edit-content">${currentContent}</textarea>
        <div class="note-footer">
            <button class="save-btn" data-action="save-update" data-id="${id}">Save</button>
            <button class="cancel-btn" data-action="cancel-edit">Cancel</button>
        </div>
    `;
}

// Function to save the updated note
async function saveUpdate(id) {
    const noteCard = document.getElementById(`note-${id}`);
    const newTitle = noteCard.querySelector('.edit-title').value;
    const newContent = noteCard.querySelector('.edit-content').value;

    try {
       const response = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // Add this
    },
    body: JSON.stringify({ title: newTitle, content: newContent })
});

        if (!response.ok) throw new Error('Failed to update note.');

        // Easiest way to see the change is to reload all notes
        loadNotes();

    } catch (error) {
        console.error('Error updating note:', error);
        alert('Failed to update note.');
    }
}
// --- New Logout Function ---
function logout() {
    localStorage.removeItem('authToken'); // Clear the token
    window.location.href = '/login.html'; // Go back to login page
}

// Load notes when the page is first opened




// REPLACE your entire "DOMContentLoaded" block at the bottom of script.js with this:

document.addEventListener('DOMContentLoaded', () => {
    
    // Load notes when page is ready
    loadNotes();

    // --- AI Helper Functions ---
    function openChatbot(noteId) {
        // Find elements *inside* the function
        const modalBackdrop = document.getElementById('ai-modal-backdrop');
        const aiNoteTitle = document.getElementById('ai-note-title');
        const chatHistory = document.getElementById('ai-chat-history');

        // Find the note's content from the page
        const noteCard = document.getElementById(`note-${noteId}`);
        const title = noteCard.querySelector('.note-title').innerText;
        const content = noteCard.querySelector('.note-content').innerText;
        
        currentNoteContent = content; 
        aiNoteTitle.innerText = title; 

        chatHistory.innerHTML = '<div class="ai-message">Hello! Ask me to summarize, explain, or create questions about this note.</div>';
        
        modalBackdrop.style.display = 'flex';
    }

    function closeChatbot() {
        // Find elements *inside* the function
        const modalBackdrop = document.getElementById('ai-modal-backdrop');
        const userPromptEl = document.getElementById('ai-user-prompt');

        modalBackdrop.style.display = 'none';
        currentNoteContent = ''; 
        userPromptEl.value = ''; 
    }

    async function handleChatSend() {
        // Find elements *inside* the function
        const userPromptEl = document.getElementById('ai-user-prompt');
        const chatHistory = document.getElementById('ai-chat-history');

        const userPrompt = userPromptEl.value.trim();
        if (userPrompt === '' || !generativeModel) return;

        const userMsgDiv = document.createElement('div');
        userMsgDiv.className = 'user-message';
        userMsgDiv.textContent = userPrompt;
        chatHistory.appendChild(userMsgDiv);

        userPromptEl.value = '';
        const aiThinkingDiv = document.createElement('div');
        aiThinkingDiv.className = 'ai-message';
        aiThinkingDiv.textContent = 'Thinking...';
        chatHistory.appendChild(aiThinkingDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const fullPrompt = `Here is a note:\n\n"${currentNoteContent}"\n\nMy request is: "${userPrompt}"\n\nProvide a concise and helpful response.`;
            const result = await generativeModel.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();
            aiThinkingDiv.textContent = text;
            chatHistory.scrollTop = chatHistory.scrollHeight;
        } catch(err) {
            console.error("AI Response Error:", err);
            aiThinkingDiv.textContent = "Sorry, I had trouble with that request.";
        }
    }
    // --- END OF AI FUNCTIONS ---
// --- Function to Download a Specific Note Card as PDF ---
function downloadCardPDF(button) {
    // 1. Find the parent card of the button that was clicked
    // (Adjust '.note-card' to match the class name of your main card div if it's different)
    const card = button.closest('.note-card') || button.parentElement.parentElement; 

    if (!card) {
        alert("Error: Could not find the note content.");
        return;
    }

    // 2. Get the specific title and content from that card
    // (We look for the h3 and p tags inside the card)
    const titleElement = card.querySelector('h3') || card.querySelector('.note-title');
    const contentElement = card.querySelector('p') || card.querySelector('.note-content');

    const title = titleElement ? titleElement.innerText : "My Note";
    const content = contentElement ? contentElement.innerText : "";

    // 3. Create a clean format for printing
    const element = document.createElement('div');
    element.innerHTML = `
        <h2 style="font-family: sans-serif; color: #333;">${title}</h2>
        <hr>
        <p style="font-family: sans-serif; font-size: 14px; line-height: 1.6;">${content}</p>
        <br><br>
        <small style="color: gray;">Generated by Notoa App</small>
    `;

    // 4. Generate PDF
    const opt = {
        margin:       1,
        filename:     `${title}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

    // --- Event Listeners for Static Page Buttons ---
    const modalCloseBtn = document.getElementById('ai-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeChatbot);
    }
    const modalSendBtn = document.getElementById('ai-send-btn');
    if (modalSendBtn) {
        modalSendBtn.addEventListener('click', handleChatSend);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }

    // --- THIS IS THE MISSING PIECE ---
    // Event Listener for all dynamically created Note Card Buttons
    const notesGridEl = document.getElementById('notes-grid');
    if (notesGridEl) {
        notesGridEl.addEventListener('click', (event) => {
            const action = event.target.dataset.action;
            const id = event.target.dataset.id;

            if (!action || !id) return; // Didn't click a button

            // Call the right function based on the button's data-action
            switch (action) {
                case 'delete':
                    deleteNote(id);
                    break;
                case 'share-view':
                    shareNote(id, 'view');
                    break;
                case 'share-collab':
                    shareNote(id, 'collaborate');
                    break;
                case 'edit':
                    editNote(id);
                    break;
                case 'ai-chat':
                    openChatbot(id);
                    break;
                    // --- ADD THESE TWO NEW CASES ---
                case 'save-update':
                    saveUpdate(id);
                    break;
                case 'cancel-edit':
                    loadNotes(); // This reloads all notes, canceling the edit
                    break;
                    

            }
        });
    }

});





