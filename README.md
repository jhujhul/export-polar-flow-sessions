# export-polar-flow-sessions

A nodejs script to bulk export multiples Polar Flow sessions in different file formats.

## Basic example

This command will export all of your Polar Flow sessions made between the 26-06-2017 and the 30-07-2017, in the .csv format, in the 'sessions_csv' directory.
```
node script.js --email=my@email.com --password=myPassword --start=26.06.2017 --end=30.07.2017 --format=csv
```

## Installation

First, you need nodejs installed in your machine (version >= 6.4.0).

Then, just

```
npm install
```

## Usage

```
node script.js --email=[string] --password=[string] --start=[string] --end=[string] --format=[string]
```
- --email:     Your Polar Flow email                                   [required]
- --password:  Your Polar Flow password                                [required]
- --start     The start date of the export (default: 1.7.2017)
- --end       The end date of the export (default: today)
- --format    The format of the exported files, possible values: tcx / csv / gpx (default: tcx)