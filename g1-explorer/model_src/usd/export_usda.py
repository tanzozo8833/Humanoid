"""Convert Unitree's binary G1 USD (usdc crate, from HuggingFace unitreerobotics/unitree_model,
G1/29dof/usd/g1_29dof_rev_1_0) to readable ASCII .usda.

  python model_src/usd/export_usda.py            -> model_src/usd/g1_29dof_rev_1_0.usda (~170 MB, flattened)
  python model_src/usd/export_usda.py --layers   -> one .usda per layer, references kept (smaller)

Needs: pip install usd-core
The USD has the same 29-DoF body as the URDF used by the web page (same link names), but no hands;
the page uses g1_29dof_with_hand_rev_1_0.urdf so the Dex3-1 hands are included.
"""
import os
import sys

from pxr import Sdf, Usd

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "g1_29dof_rev_1_0.usd")

if "--layers" in sys.argv:
    for root, _, files in os.walk(HERE):
        for f in files:
            if f.endswith(".usd"):
                path = os.path.join(root, f)
                Sdf.Layer.FindOrOpen(path).Export(path[:-4] + ".usda")
                print("wrote", path[:-4] + ".usda")
else:
    stage = Usd.Stage.Open(SRC)
    out = os.path.join(HERE, "g1_29dof_rev_1_0.usda")
    stage.Export(out)          # composed + flattened: every mesh inline, one self-contained file
    print("wrote", out, f"{os.path.getsize(out) / 1e6:.0f} MB")
