""" 
Synthetic training set for the civic issue classifier.

Around 50 examples per category. Each example combines an issue noun with varied
phrasings, locations, and severities to teach the classifier to focus on the
substance of the report rather than the surrounding boilerplate.

NOTE: This Synthetic Traning set was made using Generative AI.
"""
from itertools import product

# ---------------------- Category seeds ----------------------
ROAD_NOUNS = ["pothole", "potholes", "huge pothole", "deep pothole", "road damage",
              "cracked pavement", "broken asphalt", "sinkhole", "missing road sign",
              "faded crosswalk", "damaged guardrail", "loose manhole cover"]
ROAD_CTX = ["on Main Street", "near the highway exit", "blocking traffic",
            "on the corner of 5th and Oak", "in the middle of the road",
            "by the school zone", "after last week's rain", "outside my driveway"]

SIDEWALK_NOUNS = ["broken sidewalk", "cracked sidewalk", "uneven pavement",
                  "damaged curb", "missing curb ramp", "obstructed walkway",
                  "tree roots lifting the sidewalk", "pavement trip hazard",
                  "inaccessible ramp", "broken paving stones"]
SIDEWALK_CTX = ["near the bus stop", "outside the library", "wheelchair can't pass",
                "blocking pedestrians", "next to the park entrance",
                "on the way to the school", "by the corner store"]

UTILITY_NOUNS = ["broken streetlight", "streetlight out", "streetlight off at night",
                 "flickering streetlight", "dark street", "no light on the corner",
                 "downed power line", "exposed wire", "water main leak",
                 "burst water pipe", "fire hydrant leaking", "manhole steaming",
                 "traffic light malfunction", "stuck red light"]
UTILITY_CTX = ["all night", "for three days", "every evening", "since the storm",
               "creates a safety risk", "near the school", "downtown"]

SANITATION_NOUNS = ["overflowing trash", "trash bin overflowing", "garbage piling up",
                    "illegal dumping", "litter everywhere", "uncollected recycling",
                    "stinking dumpster", "trash not picked up", "scattered garbage",
                    "rats near garbage", "missed trash pickup"]
SANITATION_CTX = ["near the park entrance", "at the corner", "for over a week",
                  "outside the apartment building", "behind the grocery store",
                  "on collection day", "attracting pests"]

VANDALISM_NOUNS = ["graffiti on the wall", "spray paint on building",
                   "tagging on bus stop", "defaced public property",
                   "graffiti under the bridge", "vandalism on park bench",
                   "broken bus shelter glass", "smashed phone booth"]
VANDALISM_CTX = ["needs cleanup", "offensive content", "happened overnight",
                 "second time this month", "near the community center",
                 "outside the school", "on the playground equipment"]

ABANDONED_NOUNS = ["abandoned car", "abandoned vehicle", "junk car",
                   "dumped mattress", "abandoned furniture",
                   "old refrigerator on sidewalk", "tires dumped",
                   "broken sofa left on curb", "construction debris left",
                   "shopping cart abandoned"]
ABANDONED_CTX = ["for over a month", "blocking the lane", "rusting",
                 "no plates on the car", "in the alley", "near my house",
                 "on the side of the road"]


def _combine(nouns, ctxs):
    """Cross-product, plus the bare noun on its own."""
    out = [n for n in nouns]
    for n, c in product(nouns, ctxs):
        out.append(f"{n} {c}")
        out.append(f"There is a {n} {c}.")
    return out


def build_dataset() -> tuple[list[str], list[str]]:
    """Returns (texts, labels) lists ready for sklearn."""
    samples = {
        "Road Infrastructure": _combine(ROAD_NOUNS, ROAD_CTX),
        "Sidewalk Issues":     _combine(SIDEWALK_NOUNS, SIDEWALK_CTX),
        "Public Utilities":    _combine(UTILITY_NOUNS, UTILITY_CTX),
        "Sanitation":          _combine(SANITATION_NOUNS, SANITATION_CTX),
        "Vandalism":           _combine(VANDALISM_NOUNS, VANDALISM_CTX),
        "Abandoned Items":     _combine(ABANDONED_NOUNS, ABANDONED_CTX),
    }
    texts, labels = [], []
    for label, ex in samples.items():
        for t in ex:
            texts.append(t)
            labels.append(label)
    return texts, labels


if __name__ == "__main__":
    X, y = build_dataset()
    from collections import Counter
    print(f"Total examples: {len(X)}")
    print(f"Per category: {dict(Counter(y))}")