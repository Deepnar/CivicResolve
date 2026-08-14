#!/usr/bin/env python3
"""Convert a classification-style dataset (class folders) to YOLO detection.

Semantics: each image gets a FULL-IMAGE bounding box of its class. That is
crude but honest — the model learns to flag scenes of that defect type. The
optional `neg_dir` images are copied WITHOUT labels as negatives (teaches the
model not to flag e.g. working streetlights or covered manholes).

Appends to the existing civic-yolo layout (does not touch existing labels).

Usage:
  python3 scripts/datasets/classify_to_yolo.py \
    <class_dir> <class_name> <split> [--neg-dir <dir>] [--out-root ../datasets/civic-yolo]
"""
import argparse
import shutil
from pathlib import Path

CLASSES = ['pothole', 'longitudinal_crack', 'transverse_crack', 'alligator_crack',
           'broken_streetlight', 'open_manhole']

def add_images(img_dir: Path, out_root: Path, split: str, class_idx: int | None):
    img_out = out_root / 'images' / split
    lbl_out = out_root / 'labels' / split
    img_out.mkdir(parents=True, exist_ok=True)
    lbl_out.mkdir(parents=True, exist_ok=True)
    count = 0
    for img in sorted(img_dir.iterdir()):
        if img.suffix.lower() not in ('.jpg', '.jpeg', '.png'):
            continue
        shutil.copy2(img, img_out / img.name)
        if class_idx is not None:
            (lbl_out / (img.stem + '.txt')).write_text(f'{class_idx} 0.5 0.5 1.0 1.0\n')
        count += 1
    print(f'  {split}: {count} images from {img_dir.name} '
          f'({"class " + str(class_idx) if class_idx is not None else "negative"})')
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('class_dir', type=Path)
    ap.add_argument('class_name', choices=CLASSES)
    ap.add_argument('split', choices=['train', 'val', 'test'])
    ap.add_argument('--neg-dir', type=Path)
    ap.add_argument('--out-root', type=Path, default=Path('/home/deepnar/Programs/civic_resolve/datasets/civic-yolo'))
    args = ap.parse_args()

    idx = CLASSES.index(args.class_name)
    add_images(args.class_dir, args.out_root, args.split, idx)
    if args.neg_dir:
        add_images(args.neg_dir, args.out_root, args.split, None)


if __name__ == '__main__':
    main()
