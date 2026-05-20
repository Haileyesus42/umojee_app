# API ENDPOINTS | AI TEAM

## CREAT A BOOKING
     
### GET All FLIGHT DATA 
Replace the local url, http://localhost:4001 with the production server address, https://enzo01.flyumojaairways.com, if you want send request to the production server.

1. END POINT

GET `http://localhost:4001/api/admin/flight/getall`

2. RESPONSE

```json
{
    "status": "success",
    "count": 7,
    "flights": [
        {
            "price": {
                "currency": "USD",
                "oneway": 323,
                "roundtrip": 646
            },
            "_id": "67575b42c12d12cc30e2109c",
            "flightNumber": "21",
            "airline": "Umoja Airways",
            "duration": "100",
            "TotalSeatsCapacity": 117,
            "departureAirport": "Guyana",
            "arrivalAirport": "Tobago",
            "departureAirportAcronym": "GEO",
            "arrivalAirportAcronym": "TAB",
            "departureTime": "2024-12-15T05:00:00.000Z",
            "arrivalTime": "2024-12-15T06:40:00.000Z",
            "flightStatus": "ON-TIME",
            "archived": false,
            "stoppageCount": 0,
            "gate": "",
            "terminal": "",
            "runway": "",
            "seatsLeft": 117,
            "createdAt": "2024-12-09T21:04:02.695Z",
            "updatedAt": "2024-12-14T17:09:15.102Z"
        },
        //The rest 6 flights
    ]
}
```

### GET SEAT INFORMATION OF A SELECTED FLIGHT USING FLIGHT ID
Replace the local url, http://localhost:4001 with the production server address, https://enzo01.flyumojaairways.com, if you want send request to the production server.

1. END POINT

GET `http://localhost:4001/api/admin/seats/getallsf/flight_id`

2. Replace the flight_id with the id of the flight selected by the user. E.g. 671ef3c2ce267b62e718d6e7
e.g. http://localhost:4001/api/admin/seats/getallsf/672db9ab92e02f6636aa8d29

3. RESPONSE

```json
{
    "status": "success",
    "count": 25,
    "allSeats": [
        {
            "_id": "671ef3c7ce267b62e718d7e1", // row id
            "rowNumber": 13,
            "seats": [
                {
                    "seatId": "13A",
                    "status": "unavailable",
                    "unsuitableForHandicap": false,
                    "armTrayLeft": false,
                    "armTrayRight": true,
                    "babyHammock": false,
                    "handicapArmRest": false,
                    "noBreakOver": true,
                    "limitedRecline": false,
                    "noRecline": false,
                    "hideSeat": false,
                    "_id": "66a19176e537edf80fc3f679" // seat id 
                },
                //all the rest 5 seats on this specific row
            ],
            "flightId": "671ef3c2ce267b62e718d6e7" //here for each rows the flight id is constant
        },
        //all the rest 24 rows, where each row holds 6 seats
    ]
}

```

### BOOK A FLIGHT

1. END POINT

POST `http://localhost:4001/api/ai/booking/checkout-session`

2. REQUEST

Pass the following json to the body of your request.

```json
{
  "data": 
  {
    "flightId": "672db9ab92e02f6636aa8d29", // actual flight id
    "returnFlightId": "672b6ec1543affb35b033e21", // actual return flight id
    "passengerUser": {
      "email": "amanuelmekonnengebretsadik@gmail.com", // please use a valid email address, so that the user can recieve a payment link and make the payment
      "phone": "11111111111111111"
    },
    "user": {
      "_id": "665094d65ca55d8ca46508b7" //this is the super admin id, for now, just use it as it is
    },
    "passengers": [
      {
        "title": "Mr",
        "firstName": "Kebede Ali",
        "lastName": "Bela"
      }
    ],
    "currency": "USD",
    "totalBaggages": 0,
    "tripType": "round-trip",
    "selectedSeats": [
      {
        "rowId": "672db9ae92e02f6636aa8e23", // actual row id for the departure flight
        "seatId": "66a19176e537edf80fc3f67b" // actual seat id for the departure flight
      }
    ],
    "selectedSeatsReturn": [
      {
        "rowId": "672b6ec4543affb35b033f1b", // actual row id for the return flight
        "seatId": "66a19176e537edf80fc3f67b" // actual seat id for the return flight
      }
    ],
    "seat": [
      {
        "rowId": "672db9ae92e02f6636aa8e23", // actual row id for the departure flight
        "seatId": "66a19176e537edf80fc3f67b" // actual seat id for the departure flight
      }
    ],
    "CustomerInfo": {
      "docNo": null,
      "issuingCountry": null,
      "expirationDate": null,
      "nationality": null,
      "email": "amanuelmekonnengebretsadik@gmail.com"
    }
  }
}
```
3. RESPONSE

```json
{
    "status": "success",
    "message": "Payment link sent successfully"
}
```



### GET BOOKING BY REFERENCE NUMBER  

1. END POINT

GET `http://localhost:4001/api/ai/booking/get/reference`

2. REQUEST

Pass the reference number at the body of your request.

```json
{
    //just an example. Use the exact reference number submitted by the user to get the booking information for further update
    "referenceNumber": "MM5VRQ9J" 
}
```

3. RESPONSE

```json
{
    "status": "success",
    "data": {
        "flightData": {
            "flightStatus": "On Time",
            "archived": false,
            "stoppageCount": 0
        },
        "additionalInfo": {
            "docNo": null,
            "issuingCountry": null,
            "expirationDate": null,
            "nationality": null,
            "email": "amanuelmekonnengebretsadik@gmail.com"
        },
        "_id": "6762e5fd2b96eeebb6d27069",
        "flightId": "672db9ab92e02f6636aa8d29",
        "returnFlightId": "672b6ec1543affb35b033e21",
        "userId": "665094d65ca55d8ca46508b7",
        "price": 490,
        "paid": false,
        "status": "Booked",
        "passengers": [
            {
                "firstName": "Kebede Ali",
                "title": "Mr",
                "lastName": "Bela",
                "_id": "6762e5fd2b96eeebb6d2706a"
            }
        ],
        "totalBaggages": 0,
        "totalBaggagesReturn": 0,
        "tripType": "round-trip",
        "departureAirportAcronym": "POS",
        "arrivalAirportAcronym": "MIA",
        "departureTime": "2024-12-19T05:00:00.000Z",
        "arrivalTime": "2024-12-19T07:00:00.000Z",
        "gate": "g1",
        "terminal": "t1",
        "runway": "r1",
        "duration": "120",
        "stoppageCount": 0,
        "seatsLeft": 117,
        "checkInStatusDeparture": "NOT_CHECKED_IN",
        "checkInStatusReturn": "NOT_CHECKED_IN",
        "referenceNumber": "MM5VRQ9J",
        "createdAt": "2024-12-18T15:10:53.015Z",
        "updatedAt": "2024-12-18T15:10:53.015Z",
        "__v": 0
    }
}
```
 
---
### Edit Passengers Information
---

1. END POINT

PATCH `http://localhost:4001/api/admin/booking/update/passengers/information/id`

`id: booking._id` Actual Booking id retrived by reference number

2. REQUEST

Pass the booking ID to the params and the passenger or passengers info. to the body.
E.g. http://localhost:4001/api/admin/booking/update/passengers/information/6762e5fd2b96eeebb6d27069

```json
{
  "email": "natnaelmekonnengebretsadik@example.com",
  "passengers": [
    {
      "firstName": "Natnael",
      "title": "Mr",
      "lastName": "Gebretsadik"
    }
  ]
}

```
3. RESPONSE

```json
{
    "status": "success",
    "message": "Passengers information updated successfully"
}
```


---
### UPDATE LUGGAGE
---


1. END POINT

PATCH `http://localhost:4001/api/admin/booking/update/luggage/id`

`id: booking._id` Actual ID
e.g. http://localhost:4001/api/admin/booking/update/luggage/6762e5fd2b96eeebb6d27069

2. REQUEST

Pass the booking ID to the params and the luggage or totalExtraBaggage to the body.

Case 1. If the user wants to add additional luggage. Assume that the totalLuggage on the db is less than 2

```json
{
  "luggage": 2
}
```

RESPONSE

```json
{
    "status": "success",
    "message": "Laggage Added, additional payment required. Please check your email.",
    "paymentLinkUrl": "https://checkout.stripe.com/c/pay/cs_test_a1QzixNOscSMAkdEaik01pkVJfshf7Z4SXUeP9wEAwjY8LweF4RpzdNgy9#fidkdWxOYHwnPyd1blpxYHZxWjA0VVx1RmtAPVZdcVY1U3V9NUcwTmx3aExXU1xkbHFhVzxkdGc0bTRdbX9dTDJ%2FPFBJNmZwRGFUQkRBVUlIUnw1SEpkT2h2MExvUlx9SGRESDVJVWBEaGhvNTVCaz09bGxjQScpJ2N3amhWYHdzYHcnP3F3cGApJ2lkfGpwcVF8dWAnPyd2bGtiaWBabHFgaCcpJ2BrZGdpYFVpZGZgbWppYWB3dic%2FcXdwYHgl"
}
```


Case 2. if the user removes the luggage from the initial amount for instance from 2 to 1

```json
{
  "luggage": 1
}
```
RESPONSE
```json
{
    "status": "success",
    "message": "Laggage Removed, Refund request is sent for approval",
    "refund": {
        "bookingId": "6762e5fd2b96eeebb6d27069",
        "userId": "665094d65ca55d8ca46508b7",
        "userType": {
            "name": "No user found",
            "requesterName": "No user found",
            "requesterEmail": "No user found",
            "requestComesFrom": "No user found"
        },
        "bookerType": {
            "name": "No user found",
            "bookerName": "No user found",
            "bookerEmail": "No user found",
            "bookerComesFrom": "No user found"
        },
        "reason": "New refund request from the checkout section of $40",
        "status": "REQUEST REFUND",
        "bookingData": {
            "idBooking": "",
            "paid": false,
            "totalBaggages": 0,
            "totalBaggagesReturn": 0,
            "tripType": null,
            "stoppageCount": 0,
            "seatsLeft": 0,
            "checkInStatusDeparture": "NOT_CHECKED_IN",
            "checkInStatusReturn": "NOT_CHECKED_IN",
            "passengers": []
        },
        "_id": "6762e93e2b96eeebb6d270cf",
        "requestDate": "2024-12-18T15:24:46.075Z",
        "createdAt": "2024-12-18T15:24:46.075Z",
        "updatedAt": "2024-12-18T15:24:46.075Z",
        "__v": 0
    }
}
```

Case 3. If the new luggage value is the same as the one on the db

```json
{
  "luggage": 1
}
```
RESPONSE
```json
{
    "status": "success",
    "message": "No Update made to Laggages!"
}
```
