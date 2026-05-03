# Dongle Identifier (macOS)

A lightweight, zero-dependency Node.js utility for identifying mysterious 2.4GHz USB receivers (dongles) on macOS.

Have too many identical black USB dongles from different mice and keyboards? This script queries the native macOS `system_profiler` to extract the `VendorID:ProductID` of connected USB devices and matches them against your custom dictionary, instantly telling you which device the dongle belongs to.

## Features
- **Zero Dependencies:** Uses only native Node.js `child_process` and macOS `system_profiler`.
- **Zero-Trust Safe:** Fully offline, no external NPM packages required.
- **Smart Filtering:** Automatically ignores internal Apple USB hubs and components.

## Usage

1. Plug the unknown USB dongle into your Mac.
2. Run the script:
   ```bash
   node identify.js
   ```
3. If the dongle is recognized, you will see its mapped name. If it's new, the script will output a HEX key (e.g., `"0x248a:0x8208"`).
4. Copy the newly discovered HEX key and add it to the `KNOWN_DONGLES` dictionary inside `identify.js` along with a friendly name.

## Configuration

Open `identify.js` and populate the `KNOWN_DONGLES` object with your devices:

```javascript
const KNOWN_DONGLES = {
  "0x248a:0x8208": "XQUANTUM WK500K Keyboard",
  "0x046d:0xc52b": "Logitech Unifying Receiver",
  // Add your dongles here...
};
```

## Requirements
- macOS (relies on `system_profiler SPUSBDataType`)
- Node.js installed
