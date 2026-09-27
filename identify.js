const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const LOCAL_DONGLES_FILE = path.join(__dirname, 'known_dongles.json');
const EXAMPLE_DONGLES_FILE = path.join(__dirname, 'known_dongles.example.json');

// Wczytanie bazy dongli z lokalnego pliku JSON (ignorowanego w git) z fallbackiem na szablon
function loadKnownDongles() {
  if (fs.existsSync(LOCAL_DONGLES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(LOCAL_DONGLES_FILE, 'utf-8'));
    } catch (err) {
      console.warn(`⚠️ Błąd parsowania ${LOCAL_DONGLES_FILE}:`, err.message);
    }
  }

  if (fs.existsSync(EXAMPLE_DONGLES_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(EXAMPLE_DONGLES_FILE, 'utf-8'));
    } catch {}
  }

  return {};
}

// Funkcja rekurencyjnie przeszukująca drzewo USB z system_profiler
function findUSBDevicesProfiler(node, devicesList) {
  if (Array.isArray(node)) {
    node.forEach(child => findUSBDevicesProfiler(child, devicesList));
  } else if (typeof node === 'object' && node !== null) {
    if (node._name && node.vendor_id) {
      // Ignorujemy wewnętrzne urządzenia Apple
      if (!node._name.includes('Apple') && node.vendor_id !== 'apple_vendor_id') {
        devicesList.push(node);
      }
    }
    
    // Przeszukaj dzieci (huby)
    if (node._items) {
      findUSBDevicesProfiler(node._items, devicesList);
    }
  }
}

// Fallback: przeszukiwanie rejestru IOKit (ioreg) dla nowszych architektur macOS / Apple Silicon
function findUSBDevicesIoreg() {
  try {
    const output = execSync('ioreg -p IOUSB -l', { encoding: 'utf-8' });
    const devices = [];
    const blocks = output.split(/\+-o /);

    for (const block of blocks) {
      const nameMatch = block.match(/^([^\n<]+)/);
      const vidMatch = block.match(/"idVendor"\s*=\s*(\d+)/);
      const pidMatch = block.match(/"idProduct"\s*=\s*(\d+)/);
      const prodMatch = block.match(/"(?:USB Product Name|kUSBProductString)"\s*=\s*"([^"]+)"/);
      const mfrMatch = block.match(/"(?:USB Vendor Name|kUSBVendorString)"\s*=\s*"([^"]+)"/);

      if (vidMatch && pidMatch) {
        const vidNum = parseInt(vidMatch[1], 10);
        const pidNum = parseInt(pidMatch[1], 10);
        // Ignorujemy wewnętrzne kontrolery Apple (0x05ac)
        if (vidNum === 1452 || vidNum === 0x05ac) continue;

        const vid = '0x' + vidNum.toString(16).padStart(4, '0');
        const pid = '0x' + pidNum.toString(16).padStart(4, '0');
        const name = prodMatch ? prodMatch[1] : (nameMatch ? nameMatch[1].trim().split('@')[0] : 'Unknown');

        devices.push({
          _name: name,
          manufacturer: mfrMatch ? mfrMatch[1] : 'Generic',
          vendor_id: vid,
          product_id: pid
        });
      }
    }
    return devices;
  } catch {
    return [];
  }
}

function scanDongles() {
  console.log('🔍 Skanowanie szyny USB w poszukiwaniu urządzeń...');
  const knownDongles = loadKnownDongles();

  try {
    const devices = [];

    // 1. Próba przez system_profiler
    try {
      const output = execSync('system_profiler SPUSBDataType -json', { encoding: 'utf-8' });
      const data = JSON.parse(output);
      findUSBDevicesProfiler(data.SPUSBDataType, devices);
    } catch {}

    // 2. Jeśli system_profiler nie zwrócił urządzeń (częste na Apple Silicon dla USB-C), użyj ioreg
    if (devices.length === 0) {
      const ioregDevices = findUSBDevicesIoreg();
      devices.push(...ioregDevices);
    }

    if (devices.length === 0) {
      console.log('🤷 Brak zewnętrznych urządzeń USB.');
      return;
    }

    console.log('\n🔌 ZNALEZIONE URZĄDZENIA USB:');
    console.log('===============================');
    
    devices.forEach(dev => {
      // Extract HEX ID safely
      const vendorIdMatch = String(dev.vendor_id).match(/(0x[0-9a-f]+)/i);
      const productIdMatch = dev.product_id ? String(dev.product_id).match(/(0x[0-9a-f]+)/i) : null;
      
      const vid = vendorIdMatch ? vendorIdMatch[1].toLowerCase() : 'unknown';
      const pid = productIdMatch ? productIdMatch[1].toLowerCase() : 'unknown';
      const key = `${vid}:${pid}`;

      const isKnown = knownDongles[key];
      
      if (isKnown) {
        console.log(`✅ ZNANY DONGLE: ${isKnown}`);
        console.log(`   Nazwa systemowa: ${dev._name}`);
        console.log(`   ID: ${key}`);
      } else {
        console.log(`❓ NIEZNANE URZĄDZENIE: ${dev._name}`);
        console.log(`   Producent: ${dev.manufacturer || 'Brak danych'}`);
        console.log(`   ID do bazy (dopisz do known_dongles.json): "${key}": "Nazwa Twojego Urządzenia",`);
      }
      console.log('-------------------------------');
    });

  } catch (err) {
    console.error('❌ Błąd podczas skanowania USB:', err.message);
  }
}

scanDongles();
