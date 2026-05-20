contry* street* city\* ( state zip code)
collect phone number

<!-- OTP feature  -->

- OTP Generation and email delivery
- Login with OTP
- OTPs are valid for 5 minutes // make it 1 minute
- OTPs cannot be reused
- Users are blocked for 1 hour after 5 consecutive wrong OTPs // increase the time gradually
  for first 3 > 30,1minute
  4 = 15 minute

* mintue
  5 = 20 minute

- There should be a minimum 1 min gap between two OTP generation requests

Roles and responsibilities – User, Supervisor, Manager, Super Admin

Super Admin (Override Admin) – Create Flight, Move Flight, Archive Flight, delete flight, Refund flight, Add User, Update User, Delete Disabled User
Manager – Create Flight, Cancel Flight, Refund Flight, Archive Flight, Add User, Update User, Disable User
Supervisor – Book flight, Move Flight, Create, Update Agent, Approve Refund, Disable User
Agent – Book flight, Move Flight, Update User, Update Agent, Request Refund

// Features i Need to build first tommorow

// Tasks wednesday
// make the round trip work
// add role and responsibilities part

// Task friday
// make the refund work

// pm.environment.set("jwt", pm.response.json().token);

// Super Admin (Override Admin) – Create Flight, Move Flight, Archive Flight, delete flight, Refund flight, Add User, Update User, Delete Disabled User
// Manager – Create Flight, Cancel Flight, Refund Flight, Archive Flight, Add User, Update User, Disable User
// Supervisor – Book flight, Move Flight, Create, Update Agent, Approve Refund, Disable User
// Agent – Book flight, Move Flight, Update User, Update Agent, Request Refund

// Create > price is dependant on the destination and departure location
// Move flight, Booking > only if flight have same destination and depature
// Archive > flight that is special
/// delte > NO need to implement
// Refund flight > refund the booking price

// Super Admin (Override Admin) – Create Flight XX ,Move Booking on a differnt flight, Archive/Star Flight XX ,( delete flight) not needed, Refund Booking X, Add User X, Update User X, Delete user X, Disabled User X
// Manager – Create Flight, Cancel Flight, Refund Flight, Archive Flight, Add User, Update User, Disable User
// Supervisor – Book flight, Move Flight, Create, Update Agent, Approve Refund, Disable User
// Agent – Book flight, Move Flight, Update User, Update Agent, Request Refund

Passsenger > Title , firstname , last name

I need Api for creating and iupdating user if they want to register.
Fields:
countryCode: "",
country: "",
phone: "",
email: "",
firstName: "",
lastName: "",
dob: "",

      2, Api for my bookings whether active or not

3,changing flight date,
4, asking for refund
