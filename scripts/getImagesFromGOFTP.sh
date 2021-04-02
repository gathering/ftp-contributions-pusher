#!/usr/bin/env bash
echo "Getting raw TG file list from FTP, writing results to ./ftp-files"

if [ -f './ftp-files' ]
then
  echo "./ftp-files already exists skipping ftp fetching (this data should generally be pretty static)"
else
  export LC_ALL=C.UTF-8
  lftp -c "open http://ftp.gathering.org/TG/ && find -l && exit" >> ftp-files
fi

echo "Converting relevant images paths to ftp urls, writing results to ./ftp-image-urls"

cat ftp-files | \
  # Only paths
  grep -o '\.\/.*' | \
  # Certain competitions
  grep '/MSPaint/\|Rendered\|capture_the\|themed\|Themed\|Graphics\|Photo\|freestyle\|SpiritOfTheGathering\|FreestyleGraphics\|Casemod\|Pimpmy\|Cosplay\|Freestyle\|Colouring' | \
  # No work in progress files
  grep -v 'WIP' | \
  grep -v '/Folders/' | \
  grep -v '/Minecraft/' | \
  grep -v '/Press/' | \
  grep -v '/Originals/' | \
  grep -v 'Workshop/' | \
  # Only allow certain filetypes
  grep '\(png\|jpg\|jpeg\)$' | \
  # Append the full url, and output
  sed -e 's/\.\//http\:\/\/ftp\.gathering\.org\/TG\//' > ftp-image-urls


echo "Running JS script to convert ftp urls into proper image objects, writing rsults to ./images.json"

./convertFTPImageUrlsToJson.mjs
