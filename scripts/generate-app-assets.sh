#!/usr/bin/env bash
#
# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Lychee-Mobile contributors.
#
# Regenerates the app icons and splash images of the native projects from the
# official Lychee logo (assets/lychee-logo.png, the LycheeOrg GitHub avatar at
# its largest size, 460x460). Requires ImageMagick 7 (`magick`).
#
#   scripts/generate-app-assets.sh
#
# The logo is a photo on an uneven off-white backdrop. Its backdrop is replaced
# by BG and its edges are faded out, so it sits seamlessly on any canvas of
# that colour. BG is the mean of the photo's 12 px border and is also the
# adaptive icon background (android/app/src/main/res/values/ic_launcher_background.xml).

set -euo pipefail

cd "$(dirname "$0")/.."

SRC=assets/lychee-logo.png
BG='#F3EEED'
RES=android/app/src/main/res
XCASSETS=ios/App/App/Assets.xcassets

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Logo tile, 460x460 with alpha:
# 1. backdrop pixels (light, grey) blurred into a model of the lighting, and
#    the fruit and leaves scaled by BG / model to match the flat backdrop;
# 2. the backdrop itself replaced by BG, softly by lightness and greyness so the
#    shadow under the fruit (lower 30 %, a higher threshold there) stays;
# 3. faded out over 8 px at the sides (the leaves reach 9 px from the right
#    edge) and 40 px at the top and bottom.
magick "$SRC" \
	\( +clone -fx 'lum=0.299*r+0.587*g+0.114*b; chroma=max(r,max(g,b))-min(r,min(g,b)); lum>0.84 && chroma<0.06' \) \
	\( -clone 0 -clone 1 -compose multiply -composite -blur 0x30 \) \
	\( -clone 1 -blur 0x30 \) \
	\( +clone -fill "$BG" -colorize 100 \) \
	-delete 1 \
	-fx 'lum=0.299*r+0.587*g+0.114*b; chroma=max(r,max(g,b))-min(r,min(g,b));
		ky=min(1,max(0,(j/h-0.55)/0.15)); thr=0.80+0.07*ky*ky*(3-2*ky);
		kl=min(1,max(0,(lum-thr)/0.06)); kc=min(1,max(0,(0.09-chroma)/0.05));
		wbg=kl*kl*(3-2*kl)*kc*kc*(3-2*kc);
		gain=u[3]/max(u[1]/max(u[2],0.001),0.001);
		u*min(max(gain,0.95),1.08)*(1-wbg)+u[3]*wbg' \
	\( +clone -fx 'sx=min(1,min(i,w-1-i)/8); sy=min(1,min(j,h-1-j)/40); sx*sx*(3-2*sx)*sy*sy*(3-2*sy)' \) \
	-alpha off -compose copy_opacity -composite -depth 8 "$TMP/tile.png"

# place <width> <height> <logo size> <out>: the tile <logo size> px wide,
# centred on a BG canvas.
place() {
	magick -size "$1x$2" "xc:$BG" \
		\( "$TMP/tile.png" -filter Lanczos -resize "$3x$3" \) \
		-gravity center -compose over -composite -alpha off -depth 8 "$4"
}

# iOS app icon: the logo edge to edge, no alpha channel (App Store rule).
place 1024 1024 1024 "$XCASSETS/AppIcon.appiconset/AppIcon-512@2x.png"

# iOS splash: shown with aspect fill, so a phone in portrait only sees the
# middle ~1260 px of the 2732 px square. 720 px keeps the logo at ~57 % of the
# screen width there.
for f in splash-2732x2732.png splash-2732x2732-1.png splash-2732x2732-2.png; do
	place 2732 2732 720 "$XCASSETS/Splash.imageset/$f"
done

# Android launcher icons. Legacy square and round icons (API 24-25) show the
# whole logo. The adaptive foreground (108 dp, API 26+) has the logo 64 dp wide,
# which keeps the leaves inside the 66 dp safe zone, over the BG background.
for density in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
	name=${density%%:*}
	size=${density##*:}
	place "$size" "$size" "$size" "PNG32:$RES/mipmap-$name/ic_launcher.png"
	place "$size" "$size" "$size" "$TMP/square.png"
	magick "$TMP/square.png" \
		\( +clone -fill black -colorize 100 -fill white \
			-draw "circle $((size / 2)),$((size / 2)) $((size / 2)),0" \) \
		-alpha off -compose copy_opacity -composite "PNG32:$RES/mipmap-$name/ic_launcher_round.png"
	fg=$((size * 108 / 48))
	logo=$((size * 64 / 48))
	magick -size "${fg}x${fg}" xc:none \
		\( "$TMP/tile.png" -filter Lanczos -resize "${logo}x${logo}" \) \
		-gravity center -compose over -composite "PNG32:$RES/mipmap-$name/ic_launcher_foreground.png"
done

# Android splash (stretched over the window before the web view draws, so one
# image per density and orientation). The logo is 55 % of the shorter side.
for spec in \
	drawable:480x320 \
	drawable-land-mdpi:480x320 drawable-land-hdpi:800x480 drawable-land-xhdpi:1280x720 \
	drawable-land-xxhdpi:1600x960 drawable-land-xxxhdpi:1920x1280 \
	drawable-port-mdpi:320x480 drawable-port-hdpi:480x800 drawable-port-xhdpi:720x1280 \
	drawable-port-xxhdpi:960x1600 drawable-port-xxxhdpi:1280x1920; do
	dir=${spec%%:*}
	size=${spec##*:}
	w=${size%x*}
	h=${size#*x}
	short=$((w < h ? w : h))
	place "$w" "$h" $((short * 55 / 100)) "$RES/$dir/splash.png"
done

echo "App icons and splash images regenerated from $SRC"
