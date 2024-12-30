// Fetch destinations from the server and display them on the homepage
async function loadDestinations() {
    try {
        // Fetch destinations from the API endpoint
        const response = await fetch('/api/destinations');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const destinations = await response.json(); // Parse the JSON response
        const container = document.getElementById('destination-cards'); // Get the container for the cards

        // Clear any existing content in the container
        container.innerHTML = '';

        // Loop through the destinations and create a card for each
        destinations.forEach(destination => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${destination.image}" alt="${destination.name}">
                <h3>${destination.name}</h3>
                <p>${destination.description}</p>
                <a href="${destination.link}" class="button">Learn More</a>
            `;
            container.appendChild(card); // Append the card to the container
        });
    } catch (error) {
        console.error('Error loading destinations:', error);
        const container = document.getElementById('destination-cards');
        container.innerHTML = '<p>Failed to load destinations. Please try again later.</p>';
    }
}

// Load destinations when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadDestinations);
