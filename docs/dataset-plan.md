# CivicResolve — Dataset Plan (AI Observation Engine, Phase 3)

Status: DATA COLLECTION + CONVERSION DONE. SMOKE + V2 TRAIN DONE. UNSEEN-EVAL DONE (below). ONNX export/serving pending integration.

## Unseen real-world eval (11 Wikimedia images, vision-verified ground truth, yolo11n-v2)
- Test-set mAP50 .693 OVERSTATES real-world usefulness.
- Hits: crack_1 (alligator .50) — the one image matching RDD2020's distribution (asphalt close-up). Negatives clean: clean_road, street-debris → silent. Garbage → silent (no class, escalate to VLM). 
- MISSES: all 4 real-world potholes (wide scenes, water-filled, dirt/gravel) → ZERO boxes even at conf 0.05. Domain shift: RDD2020 = close-up asphalt shots; unseen = wide scenic shots, small objects, dirt surfaces.
- Scene-class false positives: closed manholes → broken_streetlight .96/.38; garbage dump → broken_streetlight .89. Full-image-box classes fire on generic urban scenes — DISCOUNT or DROP in the cascade.
- Lesson: model is reliable only on close-up road-surface defects (which IS how citizens photograph), unreliable on wide scenes. Cascade = YOLO for confident close-up calls only; everything else escalates to VLM. Calibration multipliers now evidence-based.
- Next lever for pothole recall: training diversity (RDD2022 India + QR4Change varied scenes), multi-scale aug. Unseen eval is rerunnable: /tmp/eval_unseen.py (ground truth in-file).

## Smoke training results (yolo11n, 30 ep, imgsz 640, test split)
- all: P .565 / R .582 / mAP50 .572 / mAP50-95 .437
- alligator_crack mAP50 .649 (good) | pothole .433 (mediocre — cascade pre-filter level) | longitudinal_crack .315 | transverse_crack .067 (DEAD — 12 test instances, drop)
- broken_streetlight .974 / open_manhole .995 — INFLATED by full-image-box trick (scene flags, not precise detections)
- Real run: drop transverse, imgsz 720, 60-100 epochs (curve still climbing), add RDD2022 India potholes, document streetlight/manhole as scene-flags
- Cascade design (logit→cloud escalation): YOLO absorbs high-conf/clean calls; ambiguous → VLM. Most potholes will escalate at current accuracy — correct and honest.

## Download status (as of this session)
- ✅ RoadDefects-ISeg — ../datasets/RoadDefects-ISeg (98MB, YOLO seg, needs polygon→box conversion)
- ✅ Manhole covers — ../datasets/manhole (21.5MB, classification format manhole/void — needs full-image-box conversion or classifier path)
- ✅ RDD2020 India train — ../datasets/RDD2020_train/train/India (601MB, 7,706 imgs, 3,785 annotated, VOC XML)
- ✅ CONVERTED → ../datasets/civic-yolo (RDD2020 India: train 6,164 / val 770 / test 772; classes pothole 4,306, alligator_crack 2,021, longitudinal_crack 1,734, transverse_crack 113; 50% clean-road negatives included; script: scripts/datasets/rdd_voc_to_yolo.py)
- ⏳ Streetlight ×2 GitHub repos — downloading (GitHub slow from this network)
- ⛔ TACO (SANITATION) — Google Drive + GitHub toolkit; blocked by network, pending
- ⛔ QR4Change — Mendeley login wall; GitHub mirrors unreachable, pending
- ⛔ RDD2022 India — figshare 12.4GB zip, deferred (RDD2020 already covers the 4 road classes; revisit if transverse_crack needs more data)

Goal: build a multi-class road/civic defect detector (YOLO11n) whose classes map
1:1 to the platform's issue categories, trained primarily on INDIA-relevant data.
Training is ON HOLD until approved — this document is the plan + verified sources.

## Platform categories → classes

| Platform category | YOLO classes (proposed) | Priority |
|---|---|---|
| ROADS | pothole, longitudinal_crack, transverse_crack, alligator_crack, speed_breaker | HIGH |
| SANITATION | garbage_pile, litter | HIGH |
| LIGHTING | broken_streetlight | MEDIUM |
| UTILITIES | open_manhole, waterlogging | MEDIUM |
| SAFETY | broken_sign, illegal_parking | MEDIUM |
| PARKS | — (no viable dataset; VLM-only for now) | LOW |

## Verified sources per category

### ROADS (core — India-heavy, all verified earlier)
- **RDD2022** — figshare.com/articles/dataset/21431547 (CC BY 4.0, 47,420 imgs, 6 countries; one 12.4GB zip — extract India folder). YOLO .txt labels: HF mirror `edwrdc/RDD2022` (labels only; sample of 229 India files). Kaggle mirror: `aliabdelmenam/rdd-2022`.
- **RDD2020** — HF `ShixuanAn/RDD2020` (7.4GB: train/val/test zips; India train = 7,706 imgs @720x720) or Mendeley 5ty2wb6gvg. Annotations CSV → needs conversion to YOLO.
- **RoadDefects-ISeg** — zenodo.org/records/17194814 (97.9MB, YOLO segmentation format, 1,000 imgs: crack/lane/pothole/speed_breaker; made at RGUKT Basar, Telangana; CC BY 4.0; research-use note). ✅ already downloaded to ../datasets/RoadDefects-ISeg.
- **QR4Change Urban Civic Issues (Pune)** — data.mendeley.com/datasets/zndzygc3p3/2 (pothole + garbage).
- **Road Issues Detection Dataset** — Kaggle `programmerrdai/road-issues-detection-dataset`; HF mirror `Programmer-RD-AI/road-issues-detection-dataset` (potholes, damaged roads, broken signs, illegal parking, mixed, garbage).

### SANITATION
- **TACO (Trash Annotations in Context)** — tacodataset.org; toolkit github.com/pedropro/TACO; Roboflow mirror (`mohamed-traore-2ekkp/taco-trash-annotations-in-context`). ~5k images, 60 trash classes, COCO format, CC BY 4.0. Map → `garbage_pile`/`litter` via class subsets.
- QR4Change garbage + Road Issues Detection garbage (above) as India-flavored extras.

### LIGHTING
- **Street-Light-Dataset** — github.com/Team16Project/Street-Light-Dataset (normal vs fault states).
- **Urban streetlight dataset** — arxiv.org/pdf/2407.01117 (comprehensive urban streetlight, 2024).
- **Broken-Streetlight-Detection** — github.com/HarshithhGit/Broken-Streetlight-Detection (CNN, broken light poles).
- Roboflow `street-light-lbrt8-afp7l` object detection (2025).
- Caveat: streetlight datasets are small/heterogeneous — expect to label-collect from own platform reports to reach viable class size.

### UTILITIES
- **Manhole covers** — HF `delima87/manhole_covers_dataset`; Kaggle `manholecoveriot`; Roboflow `manhole-cover`. Class: open_manhole (damaged/open cover).
- **Waterlogging / flooded roads** — HydroSense Lab IIT Delhi: hydrosense.iitd.ac.in/resources/ (India-specific); github.com/idhikavaidya/Smart-Water-Logging-Detection; ISPRS DNN waterlogging on road (isprs-annals X-5-W2-2025-203-2025). Class: waterlogging.

### SAFETY
- **Road Issues Detection** — broken signs + illegal parking (see ROADS).
- **Mapillary Traffic Sign Dataset** — mapillary.com/dataset/trafficsign; HF mirror `sparshgarg57/mapillary_traffic_signs` (for damaged/missing sign context + general sign detection).

### PARKS — GAP (honest)
No viable park-maintenance dataset found (only a tiny Roboflow `PARK_BENCH` bench-detection set). Decision: PARKS stays VLM-only (the gateway vision model can judge park condition from a photo) — do not dilute the YOLO with junk classes.

## License notes (check before shipping anything)
- CC BY 4.0: RDD2022, RoadDefects-ISeg, TACO, QR4Change (verify).
- RDD2020: research license — verify terms before production use.
- Roboflow datasets: individual licenses vary (many CC BY 4.0 / research-only).
- RoadDefects-ISeg explicitly "research and academic use only" — fine for SIH, note for production.

## Proposed flow (when training is approved)
1. Download approved sources (todo #2). RDD2022: prefer HF labels + India images from figshare zip (extract only India/), or Kaggle mirror if auth available.
2. Convert to unified YOLO layout: datasets/civic-yolo/{images,labels}/{train,val,test} with the class list above; per-source conversion scripts under scripts/datasets/.
3. Balance: cap dominant classes (pothole/crack), undersample, augment (flip/rotate/mosaic via ultralytics).
4. Train yolov11n on RTX 5090 (uv venv `~/.venvs/yolo` ready), export ONNX int8.
5. Evaluate per-class mAP on a held-out India split; iterate.

## Open questions
- RDD2022 India images: confirm best partial-download route (figshare zip extraction vs Kaggle mirror).
- Streetlight/manhole class sizes after conversion — decide min-class threshold (drop class if < ~300 boxes).
- Whether to include `lane` from RoadDefects-ISeg (not a defect — exclude from defects model).
