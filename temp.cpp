#define _USE_MATH_DEFINES
#include <iostream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <algorithm>
#include <vector>
#include "pugixml.hpp"
#include "Graph.h"
#include "parsing.h"
#include "Algo.h"
using namespace std;

int main()
{
    Algorithms a;
    Graph g;
    parseOSM(g, "florida-260425.osm.pbf");
    exporttocsv(g);
    exporttotxt(g);
    exportMLfeatures(g, "florida.csv");
    return 0;
}