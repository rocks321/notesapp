// --- API Base URL ---
const API_BASE_URL = 'https://rohan-notes-api.onrender.com/api';
const socket = io('https://rohan-notes-api.onrender.com');

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
});

// --- Handler Functions ---

/**
 * Handles the signup form submission.
 */
async function handleSignup(event) {
    event.preventDefault(); // Prevent the form from reloading the page
    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            // If the server responds with an error, show it to the user
            throw new Error(data.message || 'Failed to sign up.');
        }

        alert('Signup successful! Please log in.');
        window.location.href = '/login.html'; // Redirect to login page

    } catch (error) {
        console.error('Signup Error:', error);
        alert(error.message);
    }
}

/**
 * Handles the login form submission.
 */
async function handleLogin(event) {
    event.preventDefault();
    const username = event.target.username.value;
    const password = event.target.password.value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to log in.');
        }

        // IMPORTANT: Store the token in the browser's local storage
        localStorage.setItem('authToken', data.token);

        alert('Login successful!');
        window.location.href = '/index.html'; // Redirect to the main notes app

    } catch (error) {
        console.error('Login Error:', error);
        alert(error.message);
    }

}
