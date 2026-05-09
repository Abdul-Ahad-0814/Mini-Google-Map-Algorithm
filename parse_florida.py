import csv

try:
    from lxml import etree as ET
    print("Using lxml (fast)")
except:
    import xml.etree.ElementTree as ET
    print("Using standard library")

print("Starting streaming parse...")

nodes_file = open("nodes.csv", "w")
nodes_file.write("id,latitude,longitude\n")
features_file = open("node_features.csv", "w")
features_file.write("node_id,crossing,junction,railway,stop,traffic_signal\n")
adj_file = open("nodes.txt", "w")

road_nodes = {}
node_features = {}
edge_count = 0

current_way_nodes = []
current_way_is_highway = False
current_way_is_junction = False
current_way_is_railway = False

current_node_id = None
current_node_lat = 0
current_node_lon = 0
current_node_crossing = 0
current_node_stop = 0
current_node_signal = 0

context = ET.iterparse("florida_major.osm", events=("start", "end"))

for event, elem in context:
    if event == "start":
        if elem.tag == "node":
            current_node_id = int(elem.get("id", 0))
            current_node_lat = float(elem.get("lat", 0))
            current_node_lon = float(elem.get("lon", 0))
            current_node_crossing = 0
            current_node_stop = 0
            current_node_signal = 0
        elif elem.tag == "way":
            current_way_nodes = []
            current_way_is_highway = False
            current_way_is_junction = False
            current_way_is_railway = False

    elif event == "end":
        if elem.tag == "node":
            road_nodes[current_node_id] = (current_node_lat, current_node_lon)
            node_features[current_node_id] = [current_node_crossing, 0, 0, current_node_stop, current_node_signal]
            elem.clear()
        elif elem.tag == "nd":
            ref = int(elem.get("ref", 0))
            current_way_nodes.append(ref)
        elif elem.tag == "tag":
            k = elem.get("k", "")
            v = elem.get("v", "")
            if k == "highway":
                current_way_is_highway = True
                if v == "crossing":        current_node_crossing = 1
                if v == "stop":            current_node_stop = 1
                if v == "traffic_signals": current_node_signal = 1
            if k == "junction": current_way_is_junction = True
            if k == "railway":  current_way_is_railway = True
        elif elem.tag == "way":
            if current_way_is_highway and len(current_way_nodes) > 1:
                adj_file.write(f"Node: {current_way_nodes[0]}\n")
                for i in range(len(current_way_nodes) - 1):
                    a = current_way_nodes[i]
                    b = current_way_nodes[i+1]
                    adj_file.write(f"{b} 1.0\n")
                    if b in node_features:
                        if current_way_is_junction: node_features[b][1] = 1
                        if current_way_is_railway:  node_features[b][2] = 1
                edge_count += 1
                if edge_count % 10000 == 0:
                    print(f"Processed {edge_count} roads...")
            elem.clear()

print("Writing nodes.csv...")
for node_id, (lat, lon) in road_nodes.items():
    nodes_file.write(f"{node_id},{lat},{lon}\n")

print("Writing node_features.csv...")
for node_id, f in node_features.items():
    features_file.write(f"{node_id},{f[0]},{f[1]},{f[2]},{f[3]},{f[4]}\n")

nodes_file.close()
features_file.close()
adj_file.close()
print(f"Done! {len(road_nodes)} nodes, {edge_count} roads")
