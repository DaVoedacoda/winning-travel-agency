const express = require('express');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios'); // Use axios for HTTP requests
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('./')); // Serve static files from the root directory

const destinationsFile = './destinations.json';
const bookingsFile = './bookings.json';

// Helper functions to load and save data
const loadData = (file) => {
    if (fs.existsSync(file)) {
        try {
            const data = fs.readFileSync(file, 'utf-8');
            return data ? JSON.parse(data) : [];
        } catch (err) {
            console.error(`Error reading ${file}:`, err);
            return [];
        }
    }
    return [];
};

const saveData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(`Error writing to ${file}:`, err);
    }
};

// EmailJS configuration
const emailjsServiceID = "YOUR_serviceID"; // Replace with your EmailJS service ID
const emailjsTemplateID = "TEMPLATE_ID"; // Replace with your EmailJS template ID
const emailjsUserID = "USER_ID"; // Replace with your EmailJS user ID

// Routes
// Get all destinations
app.get('/api/destinations', (req, res) => {
    res.json(loadData(destinationsFile));
});

// Get a specific destination
app.get('/api/destination/:link', (req, res) => {
    const { link } = req.params;
    const destinations = loadData(destinationsFile);
    const destination = destinations.find(d => d.link === link);

    if (destination) {
        res.json(destination);
    } else {
        res.status(404).json({ error: 'Destination not found' });
    }
});

// Add a new destination
app.post('/api/destinations', (req, res) => {
    const { name, image, description, state, country, hotel, places, link, cost } = req.body;

    if (!name || !image || !description || !state || !country || !hotel || !places || !link || cost === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (isNaN(cost) || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be a positive number' });
    }

    const destinations = loadData(destinationsFile);
    destinations.push({ name, image, description, state, country, hotel, places, link, cost });
    saveData(destinationsFile, destinations);
    res.json({ message: 'Destination added successfully!' });
});

// Delete a destination
app.delete('/api/destination/:link', (req, res) => {
    const { link } = req.params;
    let destinations = loadData(destinationsFile);
    destinations = destinations.filter(d => d.link !== link);
    saveData(destinationsFile, destinations);
    res.json({ message: 'Destination deleted successfully!' });
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
    const bookings = loadData(bookingsFile);
    res.json(bookings.filter(b => b.status === 'pending'));
});

// Add a new booking
app.post('/api/bookings', (req, res) => {
    const { full_name, email, destination, cost, travel_date, guests, message } = req.body;

    if (!full_name || !email || !destination || !travel_date || !guests) {
        return res.status(400).json({ error: 'Required fields are missing' });
    }

    const bookings = loadData(bookingsFile);
    bookings.push({
        id: bookings.length + 1,
        full_name,
        email,
        destination,
        cost,
        travel_date,
        guests,
        message,
        status: 'pending',
    });
    saveData(bookingsFile, bookings);
    res.json({ message: 'Booking added successfully!' });
});

// Approve a booking and send confirmation email
app.post('/api/approve-booking/:id', async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const bookings = loadData(bookingsFile);
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    booking.status = 'approved';
    saveData(bookingsFile, bookings);

    // Prepare email data
    const emailData = {
        booker_name: booking.full_name,
        email: booking.email,
        destination_name: booking.destination,
        destination_cost: booking.cost,
        travel_date: booking.travel_date,
        number_of_guests: booking.guests,
        message: booking.message,
    };

    try {
        // Send email via EmailJS REST API
        const emailResponse = await axios.post(
            'https://api.emailjs.com/api/v1.0/email/send',
            {
                service_id: emailjsServiceID,
                template_id: emailjsTemplateID,
                user_id: emailjsUserID,
                template_params: emailData,
            }
        );
        res.json({ message: 'Booking approved and email sent', emailResponse: emailResponse.data });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Error sending confirmation email' });
    }
});

// Delete a booking
app.delete('/api/booking/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    let bookings = loadData(bookingsFile);
    bookings = bookings.filter(b => b.id !== id);
    saveData(bookingsFile, bookings);
    res.json({ message: 'Booking deleted successfully' });
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
