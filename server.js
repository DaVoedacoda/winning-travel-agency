const express = require('express');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // Use JWT for authentication
const cors = require('cors'); // Enable CORS
const emailjs = require('emailjs-com'); // EmailJS for sending emails
const app = express();
const PORT = 3000;

// Secret key for JWT
const secretKey = 'yourSecretKey';

// Middleware
app.use(express.json());
app.use(cors()); // Enable CORS
app.use(express.static(__dirname)); // Serve static files directly from the root directory

const destinationsFile = './destinations.json';
const bookingsFile = './bookings.json';

// Dummy admin credentials (for demonstration purposes)
const adminCredentials = {
    username: 'admin', // Username for login
    password: 'password123' // Password for login
};

// Load data from JSON file
const loadData = (file) => {
    if (fs.existsSync(file)) {
        try {
            const data = fs.readFileSync(file, 'utf-8');
            return data ? JSON.parse(data) : []; // Return empty array if data is empty
        } catch (err) {
            console.error(`Error parsing JSON from ${file}:`, err);
            return []; // Return empty array in case of malformed JSON
        }
    }
    return [];
};

// Save data to JSON file
const saveData = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === adminCredentials.username && password === adminCredentials.password) {
        const token = jwt.sign({ username }, secretKey, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.json({ success: false, message: 'Invalid username or password' });
    }
});

// Middleware to check authentication using JWT
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Assuming token is sent in the Authorization header

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        req.user = decoded;
        next();
    });
};

// Protect admin routes with JWT authentication
app.use('/admin.html', verifyToken);

// Get all destinations
app.get('/api/destinations', (req, res) => {
    res.json(loadData(destinationsFile));
});

// Get a specific destination by link
app.get('/api/destination/:link', (req, res) => {
    const link = req.params.link;
    const destinations = loadData(destinationsFile);
    const destination = destinations.find(d => d.link === link);

    if (destination) {
        res.json(destination);
    } else {
        res.status(404).send('Destination not found');
    }
});

// Add a new destination
app.post('/api/destinations', (req, res) => {
    const { name, image, description, state, country, hotel, places, link, cost } = req.body;

    // Validate required fields
    if (!name || !image || !description || !state || !country || !hotel || !places || !link || cost === undefined) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Validate cost
    if (isNaN(cost) || cost <= 0) {
        return res.status(400).json({ error: 'Cost must be a positive number.' });
    }

    const destinations = loadData(destinationsFile);
    const newDestination = { name, image, description, state, country, hotel, places, link, cost };
    destinations.push(newDestination);
    saveData(destinationsFile, destinations);
    res.json({ message: 'Destination added successfully!' });
});

// Delete a destination by link
app.delete('/api/destination/:link', (req, res) => {
    const link = req.params.link;
    let destinations = loadData(destinationsFile);
    destinations = destinations.filter(d => d.link !== link);
    saveData(destinationsFile, destinations);
    res.json({ message: 'Destination deleted successfully!' });
});

// Get all bookings
app.get('/api/bookings', (req, res) => {
    const bookings = loadData(bookingsFile);
    const pendingBookings = bookings.filter(booking => booking.status === 'pending');
    res.json(pendingBookings);
});

// Add a new booking
app.post('/api/bookings', (req, res) => {
    const { full_name, email, destination, cost, travel_date, guests, message } = req.body;

    if (!full_name || !email || !destination || !travel_date || !guests) {
        return res.status(400).json({ error: 'All fields except "message" are required.' });
    }

    const bookings = loadData(bookingsFile);
    const newBooking = {
        id: bookings.length + 1,
        full_name,
        email,
        destination,
        cost,
        travel_date,
        guests,
        message,
        status: 'pending'
    };
    bookings.push(newBooking);
    saveData(bookingsFile, bookings);
    res.json({ message: 'Booking submitted successfully!' });
});

// Approve a booking and send confirmation email to the booker
app.post('/api/approve-booking/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);

    const bookings = loadData(bookingsFile);
    const bookingIndex = bookings.findIndex(booking => booking.id === id);

    if (bookingIndex === -1) {
        return res.status(404).json({ error: 'Booking not found.' });
    }

    const booking = bookings[bookingIndex];

    // Update booking status to 'approved'
    bookings[bookingIndex].status = 'approved';
    saveData(bookingsFile, bookings);

    // Send email confirmation to the booker using EmailJS
    const emailData = {
        booker_name: booking.full_name,
        email: booking.email,
        destination_name: booking.destination,
        destination_cost: booking.cost,
        travel_date: booking.travel_date,
        number_of_guests: booking.guests,
        message: booking.message,
        payment_link: `https://yourwebsite.com/payment.html?destination=${encodeURIComponent(booking.destination)}&cost=${booking.cost}`
    };

    // Send email via EmailJS
    emailjs.send(emailjsServiceID, emailjsTemplateID, emailData)
        .then(() => {
            res.json({ message: 'Booking approved and email sent to the booker.' });
        })
        .catch(error => {
            console.error('Error sending email:', error);
            res.status(500).json({ error: 'Error sending the email. Please try again.' });
        });
});

// Reject a booking (delete it)
app.delete('/api/booking/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    let bookings = loadData(bookingsFile);
    bookings = bookings.filter(b => b.id !== id);
    saveData(bookingsFile, bookings);
    res.json({ message: 'Booking rejected and deleted.' });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
