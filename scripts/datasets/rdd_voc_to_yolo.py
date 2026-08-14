#!/usr/bin/env python3
"""Convert RDD2020 (Pascal VOC XML) annotations to unified YOLO format.

Maps RDD2020 classes to the CivicResolve unified class list
(see docs/dataset-plan.md):

  D00, D01  -> longitudinal_crack
  D10, D11  -> transverse_crack
  D20       -> alligator_crack
  D40, D43, D44 -> pothole

Also copies unannotated images as negatives (no label file) — valuable for
reducing false positives. Deterministic 80/10/10 split.

Usage:
  python3 scripts/datasets/rdd_voc_to_yolo.py \
    <rdd_root> <out_root> [--split train|val|test] [--seed 42]
"""
import argparse
import random
import shutil
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

CLASS_MAP = {
    'D00': 'longitudinal_crack', 'D01': 'longitudinal_crack',
    'D10': 'transverse_crack', 'D11': 'transverse_crack',
    'D20': 'alligator_crack',
    'D40': 'pothole', 'D43': 'pothole', 'D44': 'pothole',
}
CLASSES = ['pothole', 'longitudinal_crack', 'transverse_crack', 'alligator_crack']
CLASS_INDEX = {c: i for i, c in enumerate(CLASSES)}


def parse_xml(xml_path: Path):
    """Return (image_file, width, height, [(class_idx, cx, cy, w, h) ...])."""
    root = ET.parse(xml_path).getroot()
    filename = root.findtext('filename')
    size = root.find('size')
    width = int(size.findtext('width'))
    height = int(size.findtext('height'))
    boxes = []
    for obj in root.findall('object'):
        name = obj.findtext('name')
        cls = CLASS_MAP.get(name)
        if cls is None:
            continue
        bnd = obj.find('bndbox')
        xmin = float(bnd.findtext('xmin'))
        ymin = float(bnd.findtext('ymin'))
        xmax = float(bnd.findtext('xmax'))
        ymax = float(bnd.findtext('ymax'))
        w = max(xmax - xmin, 1.0)
        h = max(ymax - ymin, 1.0)
        cx = (xmin + w / 2) / width
        cy = (ymin + h / 2) / height
        boxes.append((CLASS_INDEX[cls], cx, cy, w / width, h / height))
    return filename, width, height, boxes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('rdd_root', type=Path)
    ap.add_argument('out_root', type=Path)
    ap.add_argument('--seed', type=int, default=42)
    args = ap.parse_args()

    xml_dir = args.rdd_root / 'annotations' / 'xmls'
    img_dir = args.rdd_root / 'images'
    if not xml_dir.is_dir() or not img_dir.is_dir():
        sys.exit(f'Expected {xml_dir} and {img_dir} under {args.rdd_root}')

    random.seed(args.seed)
    records = []
    for xml in sorted(xml_dir.glob('*.xml')):
        try:
            filename, w, h, boxes = parse_xml(xml)
        except Exception as e:
            print(f'  skip {xml.name}: {e}')
            continue
        img = img_dir / filename
        if not img.exists():
            continue
        records.append((img, filename, boxes))

    random.shuffle(records)
    n = len(records)
    n_train = int(n * 0.8)
    n_val = int(n * 0.1)
    splits = {
        'train': records[:n_train],
        'val': records[n_train:n_train + n_val],
        'test': records[n_train + n_val:],
    }

    counts = {}
    for split, items in splits.items():
        img_out = args.out_root / 'images' / split
        lbl_out = args.out_root / 'labels' / split
        img_out.mkdir(parents=True, exist_ok=True)
        lbl_out.mkdir(parents=True, exist_ok=True)
        annotated = 0
        for img, filename, boxes in items:
            shutil.copy2(img, img_out / filename)
            if boxes:
                annotated += 1
                label = '\n'.join(
                    f'{c} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}' for c, cx, cy, w, h in boxes
                )
                (lbl_out / (img.stem + '.txt')).write_text(label + '\n')
                for c, *_ in boxes:
                    counts[c] = counts.get(c, 0) + 1
        print(f'{split}: {len(items)} images ({annotated} annotated, {len(items) - annotated} negatives)')

    print('\nTotal boxes per class:')
    for cls, idx in CLASS_INDEX.items():
        print(f'  {cls}: {counts.get(idx, 0)}')


if __name__ == '__main__':
    main()
