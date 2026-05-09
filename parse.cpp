#include "parsing.h"

int main() {
    Graph g;
    parseOSM(g, "florida-260425.osm"); // converted from PBF
    exporttotxt(g);
    exporttocsv(g);
    exportMLfeatures(g, "florida-260425.osm", "florida.csv");
    return 0;
}