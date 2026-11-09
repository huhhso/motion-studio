#!/usr/bin/env bash
# Assemble the full bakery -> skill -> explainer sequence (1080x1920, 30 fps).
#
#   bash sequences/bakery-skill.sh            -> out/bakery-skill-sequence.mp4
#
# Needs these first:
#   assets/footage/bakery.mp4                  (the bakery clip, 720x1280)
#   out/training-to-content.mp4                (node render.mjs training-to-content)
#   out/skill-explainer-vertical.mp4           (node render.mjs skill-explainer --variant vertical)
#
# Shots:
#   A  bakery 0-4.5s: teaching, she sits, over-the-shoulder; pushes into the iPad screen
#   B  training-to-content motion clip (the interrupt), 10s
#   C  bakery 4.5s-end: pulls back out of the screen, then the phone and the Reel
#   D  skill explainer (vertical), 15s
# Bakery audio is kept under A and C; B and D are silent, ready for a voiceover.
set -euo pipefail
cd "$(dirname "$0")/.."

BAKERY=assets/footage/bakery.mp4
MOTION=${MOTION:-out/training-to-content.mp4}
EXPLAINER=out/skill-explainer-vertical.mp4
OUT=${OUT:-out/bakery-skill-sequence.mp4}

SPLIT=4.5        # where the bakery clip is cut for the interrupt (seconds)
ZOOM=0.9         # extra zoom into the iPad screen (1 + ZOOM at the peak)
CX=615; CY=930   # iPad screen center, in 1080x1920 frame pixels
X1=0.3; X2=0.3; X3=0.4   # crossfade lengths A->B, B->C, C->D

dur() { ffprobe -v error -show_entries format=duration -of csv=p=0 "$1"; }
LA=$SPLIT
LB=$(dur "$MOTION")
LC=$(echo "$(dur "$BAKERY") - $SPLIT" | bc -l)
LD=$(dur "$EXPLAINER")
OFF1=$(echo "$LA - $X1" | bc -l)
OFF2=$(echo "$OFF1 + $LB - $X2" | bc -l)
OFF3=$(echo "$OFF2 + $LC - $X3" | bc -l)
TOTAL=$(echo "$OFF3 + $LD" | bc -l)

# Zoom crop that keeps the iPad screen centered as the frame scales up.
crop="crop=1080:1920:x='min(max(${CX}*iw/1080-540,0),iw-1080)':y='min(max(${CY}*ih/1920-960,0),ih-1920)'"
zin="clip((t-($LA-0.65))/0.65,0,1)"    # push in over the last 0.65s of A
zout="clip(t/0.7,0,1)"                  # pull out over the first 0.7s of C
scaleZ() { echo "scale=w='trunc(1080*(1+$ZOOM*$1)/2)*2':h='trunc(1920*(1+$ZOOM*$1)/2)*2':eval=frame:flags=bicubic"; }

TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
ENC=(-c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p)

# A: bakery up to the split, pushing into the iPad screen at the end.
ffmpeg -y -loglevel error -t "$LA" -i "$BAKERY" -vf "fps=30,scale=1080:1920:flags=lanczos,setsar=1,
  $(scaleZ "($zin)*($zin)*(3-2*$zin)"),$crop" "${ENC[@]}" -c:a aac -b:a 192k "$TMP/a.mp4"
# C: bakery from the split, pulling back out of the screen.
ffmpeg -y -loglevel error -ss "$SPLIT" -i "$BAKERY" -vf "fps=30,scale=1080:1920:flags=lanczos,setsar=1,
  $(scaleZ "(1-($zout)*($zout)*(3-2*$zout))"),$crop" "${ENC[@]}" -c:a aac -b:a 192k "$TMP/c.mp4"
LC=$(dur "$TMP/c.mp4")
OFF3=$(echo "$OFF2 + $LC - $X3" | bc -l)
TOTAL=$(echo "$OFF3 + $LD" | bc -l)

# Join A, B, C, D with crossfades. Bakery audio sits under A and C only.
ffmpeg -y -loglevel error \
  -i "$TMP/a.mp4" -i "$MOTION" -i "$TMP/c.mp4" -i "$EXPLAINER" \
  -filter_complex "
    [0:v]settb=AVTB,fps=30,format=yuv420p[a];
    [1:v]settb=AVTB,fps=30,scale=1080:1920,setsar=1,format=yuv420p[b];
    [2:v]settb=AVTB,fps=30,format=yuv420p[c];
    [3:v]settb=AVTB,fps=30,scale=1080:1920,setsar=1,format=yuv420p[d];
    [a][b]xfade=transition=fade:duration=$X1:offset=$OFF1[ab];
    [ab][c]xfade=transition=fade:duration=$X2:offset=$OFF2[abc];
    [abc][d]xfade=transition=fade:duration=$X3:offset=$OFF3[v];
    [0:a]afade=t=out:st=$OFF1:d=$X1[aa];
    [2:a]afade=t=in:d=$X2,afade=t=out:st=$(echo "$LC - $X3" | bc -l):d=$X3,adelay=delays=$(echo "($OFF2 * 1000)/1" | bc):all=1[ac];
    [aa][ac]amix=inputs=2:normalize=0:duration=longest[am];
    [am]apad=whole_dur=$TOTAL[aout]
  " \
  -map "[v]" -map "[aout]" -t "$TOTAL" \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart \
  "$OUT"

echo "$(printf '%.2f' "$TOTAL")s -> $OUT"
