import csv
import json
import datetime
import os

stops_file = 'data.gov.my/stops.txt'
ridership_file = 'data.gov.my/ridership_headline.csv'
output_file = 'datasets/station.json'

active_hours = 16
peak_hours = [(8, 10), (17, 19)]
visual_capacity_factor = 5  # scale to keep crowd below 1.0

# Load stops
stations = []
with open(stops_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        stations.append({
            'id': row['stop_id'],
            'name': row['stop_name'],
            'lat': float(row['stop_lat']),
            'lng': float(row['stop_lon']),
            'route_id': row.get('route_id', '')
        })

# Map route_id to ridership column
route_to_column = {
    'AG': 'rail_lrt_ampang',
    'PH': 'rail_lrt_ampang',
    'KJ': 'rail_lrt_kj',
    'MR': 'rail_monorail',
    'MRT': 'rail_mrt_kajang',
    'PYL': 'rail_mrt_pjy',
}

# Line capacities
line_capacity = {
    'rail_lrt_ampang': 5000,
    'rail_mrt_kajang': 8000,
    'rail_lrt_kj': 4000,
    'rail_monorail': 3000,
    'rail_mrt_pjy': 6000,
    'rail_ets': 2000,
    'rail_intercity': 1500,
    'rail_komuter_utara': 2500,
    'rail_tebrau': 2500,
    'rail_komuter': 2500,
}

# Load latest ridership
with open(ridership_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    ridership_rows = list(reader)
    latest_ridership = ridership_rows[-1]

hour = datetime.datetime.now().hour

# Count stations per line for even distribution
line_station_counts = {}
for s in stations:
    line_station_counts[s['route_id']] = line_station_counts.get(s['route_id'], 0) + 1

for s in stations:
    column = route_to_column.get(s['route_id'], None)
    daily_str = latest_ridership.get(column, '') if column else ''
    try:
        daily = int(float(daily_str)) if daily_str.strip() != '' else 0
    except ValueError:
        daily = 0

    # Evenly distribute passengers across stations on the line
    station_count = line_station_counts.get(s['route_id'], 1)
    hourly = (daily / active_hours) / station_count

    # Apply peak-hour multiplier
    for start, end in peak_hours:
        if start <= hour <= end:
            hourly *= 1.5
            break

    # Scale crowd for visualization
    capacity = line_capacity.get(column, 500)
    s['crowd'] = round(min(hourly / (capacity * visual_capacity_factor), 1.0), 3)

os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(stations, f, indent=4)

print(f"Done! JSON saved to {output_file}")