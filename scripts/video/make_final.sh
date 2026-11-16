#!/bin/bash
# Usage: make_final.sh <your-face-recording> <output.mp4>
# Product B-roll in the background (stretched to your speaking length), you in a circle bottom-left.
set -e
V="$(cd "$(dirname "$0")" && pwd)"
FACE="$1"; OUT="$2"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FACE")
B=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V/broll.mp4")
F=$(python3 -c "print(max(0.2, $D/$B))")
ffmpeg -y -loglevel error -i "$V/broll.mp4" -i "$FACE" -i "$V/ring.png" -i "$V/mask.png" -filter_complex "
[0:v]setpts=$F*PTS,fps=30,scale=1920:1080[bg];
[1:v]crop='min(iw,ih)':'min(iw,ih)',scale=360:360,format=rgba[face];
[face][3:v]alphamerge[circ];
[bg][2:v]overlay=34:1080-372-34[bg2];
[bg2][circ]overlay=40:1080-360-40:shortest=0[v]" \
 -map "[v]" -map 1:a? -t "$D" -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT"
echo "done: $OUT ($D s)"
