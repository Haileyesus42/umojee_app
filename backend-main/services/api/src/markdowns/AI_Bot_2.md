# API ENDPOINTS | AI TEAM
Replace the local url, http://localhost:4001 with the production server address, https://enzo01.flyumojaairways.com, if you want send request to the production server. And don't forget to use the actual id of flights, users, booking etc. from the productions database.

## LOGIN
     
### GENERATE OTP AND SEND TO USER EMAIL
1. END POINT

POST `http://localhost:4001/api/client/auth/generate-otp`

2. REQUEST

Pass the following user email to the body of your request.

```json
{
    "email": "natnaelmekonnengebretsadik@gmail.com"
}
```

3. RESPONSE
   
```json
{
    "msg": "success"
}
```
Go to the inbox of the email to get the generated OTP and use it in the next step to login
     
### LOGIN WITH THE USER EMAIL AND GENERATED AND SENT OTP
1. END POINT

POST `http://localhost:4001/api/client/auth/login`

2. REQUEST

Pass the following json to the body of your request.

```json
{
    "email": "natnaelmekonnengebretsadik@gmail.com",
    "OTP": "y7IY7C" //This expire in 5mins
}
```

3. RESPONSE
   
```json
{
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MWVlMzc5MDUwOWVlNWU2OTQ1YmI5NiIsImlhdCI6MTczOTQ4NjM0MywiZXhwIjoxNzM5NTcyNzQzfQ.n872vidzwJMp8iS8rIjgfUmQVjF35Y_T1pDu0t2Up7k", //You will use this at the header of the requiest as a bearer authorization
    "data": {
        "user": {
            "preferences": {
                "destinations": [
                    "Trinidad",
                    "Guyana"
                ],
                "meal": [],
                "seat": [
                    "1A",
                    "1A"
                ]
            },
            "_id": "671ee3790509ee5e6945bb96",
            "email": "natnaelmekonnengebretsadik@gmail.com",
            "firstName": "Nat",
            "lastName": "G",
            "OTPAttempts": 0,
            "isBlocked": false,
            "verified": true,
            "active": true,
            "bookings": [
                "671eed54e1bae7013ba272e3",
                "671ef0a6fc80448b767ef9d4",
                "671f01728144f548b5f8a4b2",
                "673a425a7d2c10b5e22258c6",
                "678162fab355aa31280723db",
                "6785943f7fe022f632c7c420",
                "678595ed7fe022f632c7c62c",
                "67ae4a4c81e6424a7db92fea",
                "67ae4e290b24c0023dfd81ff",
                "67ae502ef81d98144bd74698",
                "67ae5171282e821d4411c8c3",
                "67ae529c7def33b3302e3fc1",
                "67ae5496d1ad717daef15a04"
            ],
            "createdAt": "2024-10-28T01:06:01.907Z",
            "updatedAt": "2025-02-13T22:39:03.289Z",
            "__v": 13,
            "country": "Ethiopia",
            "countryCode": "1",
            "dob": "2024-11-03T21:00:00.000Z",
            "phone": "910384471",
            "photo": "/api/client/uploads/client-671ee3790509ee5e6945bb96-1731871218708.jpg"
        }
    }
}
```
## BOOK A FLIGHT

## GET CHECKOUT SESSION - CREATE A BOOKING

1. END POINT

POST `http://localhost:4001/api/ai/booking/checkout-session/${userId}`

2. REQUEST

Example: http://localhost:4001/api/ai/booking/checkout-session/671ee3790509ee5e6945bb96

Pass the following json to the body of your request.

```json
{
  "data": 
  {
    "flightId": "673aabb827a5c033f4557767", // actual flight id
    "returnFlightId": "675755d9d6fd45c81bde92e1", // actual return flight id

    "passengers": [
      {
        "title": "Mr",
        "firstName": "Kebede Ali",
        "lastName": "Bela"
      },
      {
        "title": "Mr",
        "firstName": "Abele Chala",
        "lastName": "Bela"
      }
    ],
    "totalBaggages": 2,
    "tripType": "round-trip",
    "selectedSeats": [
      {
        "rowId": "673aabb927a5c033f4557801", // actual row id for the departure flight
        "seatId": "66a18ccee537edf80fc3f5e5" // actual seat id for the departure flight
      }
    ],
    "selectedSeatsReturn": [
      {
        "rowId": "675755dad6fd45c81bde937b", // actual row id for the return flight
        "seatId": "66a18ccee537edf80fc3f5e5" // actual seat id for the return flight
      }
    ]
  }
}
```
1. RESPONSE

```json
{
    "status": "success",
    "message": "Payment link sent successfully",
    "paymentLink": "https://checkout.stripe.com/c/pay/cs_test_a1Dz3O78PchsT4rtdovY6DvZ8riQKBz5JQZgcPhPvQygI1QlFZkOLqdFsC#fidkdWxOYHwnPyd1blpxYHZxWjA0VVx1RmtAPVZdcVY1U3V9NUcwTmx3aExXU1xkbHFhVzxkdGc0bTRdbX9dTDJ%2FPFBJNmZwRGFUQkRBVUlIUnw1SEpkT2h2MExvUlx9SGRESDVJVWBEaGhvNTVCaz09bGxjQScpJ2N3amhWYHdzYHcnP3F3cGApJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl" //Ask the user to check his email to get this payment link or provide the user directly.
}
```

## GET USER INFORMATION
     
### GET All USER DATA 

1. END POINT

GET `http://localhost:4001/api/ai/user/getall`

2. RESPONSE

```json
{
    "status": "success",
    "data": {
        "users": [
            {
                "preferences": {
                    "destinations": [
                        "New York",
                        "London"
                    ],
                    "meal": [
                        "vegetarian",
                        "gluten-free"
                    ],
                    "seat": [
                        "1A",
                        "2B",
                        "25F"
                    ]
                },
                "_id": "665d84b5017f3a323dee8019",
                "email": "mbahar651@gmail.com",
                "firstName": "Baharudin",
                "lastName": "Mohammed",
                "OTPAttempts": 0,
                "isBlocked": false,
                "verified": true,
                "active": true,
                "bookings": [],
                "createdAt": "2024-06-03T08:54:13.452Z",
                "updatedAt": "2025-02-13T21:54:41.793Z",
                "__v": 3,
                "country": "Ethiopia",
                "countryCode": "82",
                "dob": "2013-06-18T21:00:00.000Z",
                "phone": "091200000",
                "blockUntil": "2024-06-20T08:15:54.462Z",
                "photo": "/api/client/uploads/client-665d84b5017f3a323dee8019-1731427771453.jpg"
            },
        //The rest user informations
      ]
    }
}
```

### GET USER INFORMATION BY USER ID

1. END POINT

GET `http://localhost:4001/api/ai/user/get/${userId}`

Request Example: http://localhost:4001/api/ai/user/get/665d84b5017f3a323dee8019


1. RESPONSE

```json
{
    "status": "success",
    "data": {
        "user": {
            "preferences": {
                "destinations": [
                    "Trinidad",
                    "Guyana"
                ],
                "meal": [],
                "seat": [
                    "1A",
                    "1A"
                ]
            },
            "_id": "671ee3790509ee5e6945bb96",
            "email": "natnaelmekonnengebretsadik@gmail.com",
            "firstName": "Nat",
            "lastName": "G",
            "OTPAttempts": 0,
            "isBlocked": false,
            "verified": true,
            "active": true,
            "bookings": [], //All bookings made by the user
            "createdAt": "2024-10-28T01:06:01.907Z",
            "updatedAt": "2025-02-13T20:22:47.170Z",
            "__v": 13,
            "country": "Ethiopia",
            "countryCode": "1",
            "dob": "2024-11-03T21:00:00.000Z",
            "phone": "910384471",
            "photo": "/api/client/uploads/client-671ee3790509ee5e6945bb96-1731871218708.jpg"
        }
    }
}
```


### UPDATE USER PREFERENCES

1. END POINT

PATCH `http://localhost:4001/api/ai/user/preferences/update/${userId}`

Request Example:
http://localhost:4001/api/ai/user/preferences/update/671ee3790509ee5e6945bb96


1. REQUEST

Pass the user preference at the body of your request.

```json
{
  "seat": ["1A", "2B", "25F"], //Make sure the seat row must be 1-25 and column A-F
  "meal": ["vegetarian", "gluten-free"],
  "destinations": ["New York", "London"]
}
```

3. RESPONSE

```json
{
    "status": "success",
    "data": {
        "user": {
            "preferences": {
                "seat": [
                    "1A",
                    "2B",
                    "25F"
                ],
                "meal": [
                    "vegetarian",
                    "gluten-free"
                ],
                "destinations": [
                    "New York",
                    "London"
                ]
            },
            "_id": "665d84b5017f3a323dee8019",
            "email": "mbahar651@gmail.com",
            "firstName": "Baharudin",
            "lastName": "Mohammed",
            "OTPAttempts": 0,
            "isBlocked": false,
            "verified": true,
            "active": true,
            "bookings": [
                "665d7f54c6313093a7091df8",
                "665d87936e18e162ed95681e",
                "668991b817524449800e7f7c",
                "668991b515aa01baba0029a2"
            ],
            "createdAt": "2024-06-03T08:54:13.452Z",
            "updatedAt": "2025-02-13T21:54:41.793Z",
            "__v": 3,
            "country": "Ethiopia",
            "countryCode": "82",
            "dob": "2013-06-18T21:00:00.000Z",
            "phone": "091200000",
            "blockUntil": "2024-06-20T08:15:54.462Z",
            "photo": "/api/client/uploads/client-665d84b5017f3a323dee8019-1731427771453.jpg"
        }
    }
}
```
 

### GET USER BOOKING HISTORY

1. END POINT

GET `http://localhost:4001/api/ai/user/booking/history/${userId}`

Request Example:
http://localhost:4001/api/ai/user/booking/history/671ee3790509ee5e6945bb96

```js
headers.Authorization = `Bearer ${token}`; 
```

1. RESPONSE

```json
{
    "status": "success",
    "data": {
        "bookings": [
            {
                "flightData": {
                    "price": {
                        "currency": "USD",
                        "oneway": 200,
                        "roundtrip": 300
                    },
                    "flightNumber": "1",
                    "airline": "Umoja",
                    "duration": "100",
                    "TotalSeatsCapacity": 117,
                    "departureAirport": "Guyana",
                    "arrivalAirport": "Trinidad",
                    "departureAirportAcronym": "GEO",
                    "arrivalAirportAcronym": "POS",
                    "departureTime": "2024-11-18T05:00:00.000Z",
                    "arrivalTime": "2024-11-18T06:40:00.000Z",
                    "flightStatus": "ON-TIME",
                    "archived": false,
                    "gate": "G1",
                    "terminal": "T1",
                    "runway": "R1",
                    "seatsLeft": 117,
                    "stoppageCount": 0
                },
                "additionalInfo": {
                    "email": "natnaelmekonnengebretsadik@gmail.com"
                },
                "_id": "673a425a7d2c10b5e22258c6",
                "flightId": "671ef3c2ce267b62e718d6e7",
                "returnFlightId": null,
                "userId": "671ee3790509ee5e6945bb96",
                "price": 200,
                "paid": true,
                "payment_intent": "pi_3QME2iE8SXtS0Vpx0BtwqVcw",
                "stripeCustomerId": "cus_REhRsWTZPASod8",
                "status": "REFUND APPROVED",
                "passengers": [
                    {
                        "firstName": "Amanuel Mekonnen",
                        "title": "Mr",
                        "lastName": "Gebretsadik",
                        "_id": "673a425a7d2c10b5e22258c8"
                    }
                ],
                "totalBaggages": 0,
                "totalBaggagesReturn": 0,
                "tripType": "one-way",
                "departureAirportAcronym": "GEO",
                "arrivalAirportAcronym": "POS",
                "departureTime": "1970-01-21T01:05:06.000Z",
                "arrivalTime": "1970-01-21T01:05:12.000Z",
                "stoppageCount": 0,
                "seatsLeft": 116,
                "checkInStatusDeparture": "NOT_CHECKED_IN",
                "checkInStatusReturn": "NOT_CHECKED_IN",
                "referenceNumber": "1G1VBPZV",
                "createdAt": "2024-11-17T19:22:02.388Z",
                "updatedAt": "2024-12-09T21:09:08.833Z",
                "__v": 0
            },
            //the remaining bookings
        ]
    }
}

```