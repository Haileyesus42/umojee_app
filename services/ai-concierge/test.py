

# try:
#     response = amadeus.shopping.activities.get(
#         latitude=40.41436995,
#         longitude=-3.69170868
#     )

#     # Print to console
#     print(response.data)

#     # Save to file
#     with open("amadeus_output.json", "w", encoding="utf-8") as f:
#         json.dump(response.data, f, indent=4)

#     print("✅ Output saved to amadeus_output.json")

# except ResponseError as error:
#     raise error

# import requests
# import os

# OPENCAGE_KEY = os.getenv("OPENCAGE_API_KEY")
# print("KEY:", OPENCAGE_KEY)
# lat = 8.5409
# lng = 39.2710  # Adama

# url = f"https://api.opencagedata.com/geocode/v1/json?q={lat}+{lng}&key={OPENCAGE_KEY}"

# res = requests.get(url).json()
# print(res["results"][0]["components"])

# import requests
# import os
# from dotenv import load_dotenv

# load_dotenv()

# API_KEY = os.getenv("AERODATABOX_API_KEY")

# lat = 8.5409
# lon = 39.2710
# radius_km = 100
# limit = 10

# url = f"https://aerodatabox.p.rapidapi.com/airports/search/location/{lat}/{lon}/km/{radius_km}/{limit}"

# headers = {
#     "X-RapidAPI-Key": API_KEY,
#     "X-RapidAPI-Host": "aerodatabox.p.rapidapi.com"
# }

# response = requests.get(url, headers=headers)

# print(response.json())



from amadeus import Client, ResponseError
import os
import json
from dotenv import load_dotenv

load_dotenv()

amadeus = Client(
    client_id=os.getenv("AMADEUS_CLIENT_ID"),
    client_secret=os.getenv("AMADEUS_CLIENT_SECRET"),
)

try:
    # Retrieve the seat map of a flight present in an order
    flight_order_id = "eJzTd9e3tHQ19o4AAAo_AjM"
    response = amadeus.shopping.seatmaps.get(flightOrderId=flight_order_id)

    # Save response to JSON file
    with open("seatmap_response.json", "w") as f:
        json.dump(response.data, f, indent=4)

    print(f"Seat map saved to seatmap_response.json")

except ResponseError as error:
    raise error