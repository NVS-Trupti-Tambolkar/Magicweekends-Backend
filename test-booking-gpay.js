const axios = require('axios');

async function testBooking() {
  try {
    const response = await axios.post('http://localhost:4000/Booking/bookings', {
        trip_id: 2,
        trip_type: "weekend",
        full_name: "Test User",
        email: "test@example.com",
        phone: "9876543210",
        travel_date: "2026-04-01",
        number_of_people: 1,
        price_per_person: 5000,
        total_amount: 5000,
        payment_method: "gpay",
        travelers_data: [{name: "Test User", age: 25, gender: "male"}],
        special_request: ""
    });
    console.log("Success:", response.data);
  } catch (error) {
    if (error.response) {
      console.log("Failed with status:", error.response.status);
      console.log("Data:", error.response.data);
    } else {
      console.log("Network Error / Crash:", error.message);
    }
  }
}

testBooking();
