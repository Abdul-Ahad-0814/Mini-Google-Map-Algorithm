#!/usr/bin/env python3
import osmium
import sys

class OSMHandler(osmium.SimpleHandler):
    def __init__(self, outfile):
        super().__init__()
        self.outfile = outfile
        self.f = open(outfile, 'w')
        self.f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        self.f.write('<osm version="0.6">\n')
        self.node_count = 0
        self.way_count = 0
    
    def node(self, n):
        self.f.write(f'  <node id="{n.id}" lat="{n.lat}" lon="{n.lon}"/>\n')
        self.node_count += 1
    
    def way(self, w):
        self.f.write(f'  <way id="{w.id}">\n')
        for nd in w.nodes:
            self.f.write(f'    <nd ref="{nd.ref}"/>\n')
        for tag in w.tags:
            self.f.write(f'    <tag k="{tag.k}" v="{tag.v}"/>\n')
        self.f.write('  </way>\n')
        self.way_count += 1
    
    def close(self):
        self.f.write('</osm>\n')
        self.f.close()

def convert_pbf_to_osm(pbf_file, osm_file):
    """Convert PBF file to OSM XML format"""
    print(f"Converting {pbf_file} to {osm_file}...")
    
    handler = OSMHandler(osm_file)
    handler.apply_file(pbf_file)
    handler.close()
    
    print(f"✓ Conversion complete!")
    print(f"  Nodes: {handler.node_count}")
    print(f"  Ways: {handler.way_count}")

if __name__ == "__main__":
    pbf_file = "florida-260425.osm.pbf"
    osm_file = "florida-260425.osm"
    
    try:
        convert_pbf_to_osm(pbf_file, osm_file)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
