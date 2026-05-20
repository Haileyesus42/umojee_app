{
  "data": {
    "type": "flight-offers-pricing",
    "flightOffers": [
      {
        "type": "flight-offer",
        "id": "1",
        "source": "GDS",
        "validatingAirlineCodes": ["EY"],
        "itineraries": [
          {
            "segments": [
              {
                "departure": {
                  "iataCode": "ADD",
                  "at": "2026-02-20T14:05:00"
                },
                "arrival": {
                  "iataCode": "AUH",
                  "at": "2026-02-20T19:25:00"
                },
                "carrierCode": "EY",
                "number": "728",
                "aircraft": { "code": "320" },
                "operating": { "carrierCode": "EY" },
                "duration": "PT4H20M",
                "id": "3"
              },
              {
                "departure": {
                  "iataCode": "AUH",
                  "at": "2026-02-20T20:45:00"
                },
                "arrival": {
                  "iataCode": "DOH",
                  "at": "2026-02-20T20:55:00"
                },
                "carrierCode": "EY",
                "number": "669",
                "aircraft": { "code": "320" },
                "operating": { "carrierCode": "EY" },
                "duration": "PT1H10M",
                "id": "4"
              }
            ]
          }
        ],
        "travelerPricings": [
          {
            "travelerId": "1",
            "travelerType": "ADULT",
            "fareOption": "STANDARD",
            "price": {
              "currency": "USD",
              "total": "231.05",
              "base": "60.00"
            },
            "fareDetailsBySegment": [
              {
                "segmentId": "3",
                "cabin": "ECONOMY",
                "fareBasis": "ENN00V4T",
                "class": "E"
              },
              {
                "segmentId": "4",
                "cabin": "ECONOMY",
                "fareBasis": "ENN00V4T",
                "class": "E"
              }
            ]
          }
        ]
      }
    ]
  }
}
