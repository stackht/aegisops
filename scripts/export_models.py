"""Export the trained scikit-learn models to JSON so that the static demo can run them in the browser.

Usage:  python scripts/export_models.py
Writes: frontend/src/demo/models.json
"""
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

import numpy as np

from ml.anomaly_detection.isolation_forest import AnomalyDetector
from ml.classification.service_classifier import ServiceHealthClassifier
from ml.failure_prediction.failure_predictor import FailurePredictor

OUT = os.path.join(ROOT, "frontend", "src", "demo", "models.json")


def r(x, nd=5):
    return round(float(x), nd)


def tree_arrays(tree, leaf_value):
    """Flatten a fitted sklearn tree. leaf_value(node_index) returns the number(s) stored for a leaf."""
    n = tree.node_count
    left, right = tree.children_left, tree.children_right
    feat, thr = tree.feature, tree.threshold
    f, t, l, rr, v = [], [], [], [], []
    for i in range(n):
        if left[i] == -1:
            f.append(-1)
            t.append(0)
            l.append(-1)
            rr.append(-1)
            v.append(leaf_value(i))
        else:
            f.append(int(feat[i]))
            t.append(r(thr[i], 6))
            l.append(int(left[i]))
            rr.append(int(right[i]))
            v.append(0)
    return {"f": f, "t": t, "l": l, "r": rr, "v": v}


def avg_path(n):
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    return 2.0 * (np.log(n - 1.0) + np.euler_gamma) - 2.0 * (n - 1.0) / n


def forest(model, classes_dim):
    trees = []
    for est in model.estimators_:
        tr = est.tree_

        def leaf(i, tr=tr):
            val = tr.value[i][0]
            val = val / val.sum()
            return r(val[1]) if classes_dim == 2 else [r(x, 4) for x in val]

        trees.append(tree_arrays(tr, leaf))
    return trees


fp = FailurePredictor()
sc = ServiceHealthClassifier()
ad = AnomalyDetector()

if_trees = []
for est in ad.model.estimators_:
    tr = est.tree_
    if_trees.append(tree_arrays(tr, lambda i, tr=tr: r(avg_path(tr.n_node_samples[i]), 5)))

data = {
    "failure": {
        "features": fp.feature_names,
        "importances": [r(x, 4) for x in fp.model.feature_importances_],
        "trees": forest(fp.model, 2),
    },
    "classifier": {
        "classes": [str(c) for c in sc.model.classes_],
        "trees": forest(sc.model, len(sc.model.classes_)),
    },
    "iforest": {
        "offset": r(ad.model.offset_, 8),
        "c_max": r(avg_path(ad.model.max_samples_), 8),
        "trees": if_trees,
    },
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w") as fh:
    json.dump(data, fh, separators=(",", ":"))
print("wrote", OUT, "%.2f MB" % (os.path.getsize(OUT) / 1e6))
