AERODATA APIKEY
==================
import requests

url = "https://aerodatabox.p.rapidapi.com/airports/search/location"

querystring = {"lat":"40.688812","lon":"-74.044369","radiusKm":"50","limit":"10","withFlightInfoOnly":"false"}

headers = {
	"x-rapidapi-key": "80def9a2bdmsh2a25a2787f19a5dp1af664jsn8ae4d0e7764b",
	"x-rapidapi-host": "aerodatabox.p.rapidapi.com"
}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())

RESPONSE
===========

{
  "searchBy": {
    "lat": 40.688812,
    "lon": -74.04437
  },
  "count": 7,
  "items": [
    {
      "icao": "KEWR",
      "iata": "EWR",
      "name": "Newark Liberty",
      "shortName": "Liberty",
      "municipalityName": "Newark",
      "location": {
        "lat": 40.6925,
        "lon": -74.1687
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KLGA",
      "iata": "LGA",
      "name": "New York La Guardia",
      "shortName": "La Guardia",
      "municipalityName": "New York",
      "location": {
        "lat": 40.7772,
        "lon": -73.8726
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KTEB",
      "iata": "TEB",
      "name": "Teterboro",
      "shortName": "Teterboro",
      "municipalityName": "Teterboro",
      "location": {
        "lat": 40.8501,
        "lon": -74.0608
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KLDJ",
      "iata": "LDJ",
      "name": "Linden",
      "shortName": "Linden",
      "municipalityName": "Linden",
      "location": {
        "lat": 40.6174,
        "lon": -74.2446
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KJFK",
      "iata": "JFK",
      "name": "New York John F Kennedy",
      "shortName": "John F Kennedy",
      "municipalityName": "New York",
      "location": {
        "lat": 40.6398,
        "lon": -73.7789
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KCDW",
      "iata": "CDW",
      "name": "Caldwell Essex County",
      "shortName": "Essex County",
      "municipalityName": "Caldwell",
      "location": {
        "lat": 40.8752,
        "lon": -74.2814
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    },
    {
      "icao": "KMMU",
      "iata": "MMU",
      "name": "Morristown Municipal",
      "shortName": "Municipal",
      "municipalityName": "Morristown",
      "location": {
        "lat": 40.7994,
        "lon": -74.4149
      },
      "countryCode": "US",
      "timeZone": "America/New_York"
    }
  ]
}



OPENCAGE APIKEY

REQUEST
https://api.opencagedata.com/geocode/v1/json?key=897beea42a2a404b8884295488543879&q=52.5432379%2C+13.4142133&pretty=1&no_annotations=1

RESPONSE
{
   "documentation" : "https://opencagedata.com/api",
   "licenses" : [
      {
         "name" : "see attribution guide",
         "url" : "https://opencagedata.com/credits"
      }
   ],
   "rate" : {
      "limit" : 2500,
      "remaining" : 2499,
      "reset" : 1771545600
   },
   "results" : [
      {
         "bounds" : {
            "northeast" : {
               "lat" : 52.5432879,
               "lng" : 13.4142633
            },
            "southwest" : {
               "lat" : 52.5431879,
               "lng" : 13.4141633
            }
         },
         "components" : {
            "ISO_3166-1_alpha-2" : "DE",
            "ISO_3166-1_alpha-3" : "DEU",
            "ISO_3166-2" : [
               "DE-BE"
            ],
            "_category" : "building",
            "_normalized_city" : "Berlin",
            "_type" : "building",
            "borough" : "Pankow",
            "city" : "Berlin",
            "continent" : "Europe",
            "country" : "Germany",
            "country_code" : "de",
            "house_number" : "78/79",
            "neighbourhood" : "Bremer H\u00f6he",
            "office" : "Office Club",
            "political_union" : "European Union",
            "postcode" : "10437",
            "quarter" : "Helmholtzkiez",
            "road" : "Pappelallee",
            "state" : "Berlin",
            "state_code" : "BE",
            "suburb" : "Prenzlauer Berg"
         },
         "confidence" : 10,
         "distance_from_q" : {
            "meters" : 0
         },
         "formatted" : "Office Club, Pappelallee 78/79, 10437 Berlin, Germany",
         "geometry" : {
            "lat" : 52.5432379,
            "lng" : 13.4142133
         }
      }
   ],
   "status" : {
      "code" : 200,
      "message" : "OK"
   },
   "stay_informed" : {
      "blog" : "https://blog.opencagedata.com",
      "mastodon" : "https://en.osm.town/@opencage"
   },
   "thanks" : "For using an OpenCage API",
   "timestamp" : {
      "created_http" : "Thu, 19 Feb 2026 20:32:29 GMT",
      "created_unix" : 1771533149
   },
   "total_results" : 1
}