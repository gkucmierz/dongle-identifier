const { execSync } = require('child_process');

// Twoja osobista baza dongli (uzupełnij ją swoimi urządzeniami)
const KNOWN_DONGLES = {
  // Format: "VendorID:ProductID" w hex (pisane małymi literami)
  "0x248a:0x8208": "Klawiatura XQUANTUM WK500K (Kanał Radiowy)",
  "0x046d:0xc52b": "Logitech Unifying Receiver",
  "0x046d:0xc539": "Logitech Lightspeed Receiver",
  // dodaj kolejne tutaj, gdy skrypt pokaże Ci ich ID
};

// Funkcja rekurencyjnie przeszukująca drzewo USB z system_profiler
function findUSBDevices(node, devicesList) {
  if (Array.isArray(node)) {
    node.forEach(child => findUSBDevices(child, devicesList));
  } else if (typeof node === 'object' && node !== null) {
    if (node._name && node.vendor_id) {
      // Ignorujemy wewnętrzne urządzenia Apple (zazwyczaj zaczynają się od "Apple" lub mają określony vendor_id)
      if (!node._name.includes("Apple") && node.vendor_id !== "apple_vendor_id") {
        devicesList.push(node);
      }
    }
    
    // Przeszukaj dzieci (huby)
    if (node._items) {
      findUSBDevices(node._items, devicesList);
    }
  }
}

function scanDongles() {
  console.log("🔍 Skanowanie szyny USB w poszukiwaniu urządzeń...");
  try {
    const output = execSync('system_profiler SPUSBDataType -json', { encoding: 'utf-8' });
    const data = JSON.parse(output);
    
    const devices = [];
    findUSBDevices(data.SPUSBDataType, devices);

    if (devices.length === 0) {
      console.log("🤷 Brak zewnętrznych urządzeń USB.");
      return;
    }

    console.log("\n🔌 ZNALEZIONE URZĄDZENIA USB:");
    console.log("===============================");
    
    devices.forEach(dev => {
      // Extract HEX ID safely
      const vendorIdMatch = dev.vendor_id.match(/(0x[0-9a-f]+)/i);
      const productIdMatch = dev.product_id ? dev.product_id.match(/(0x[0-9a-f]+)/i) : null;
      
      const vid = vendorIdMatch ? vendorIdMatch[1].toLowerCase() : 'unknown';
      const pid = productIdMatch ? productIdMatch[1].toLowerCase() : 'unknown';
      const key = `${vid}:${pid}`;

      const isKnown = KNOWN_DONGLES[key];
      
      if (isKnown) {
        console.log(`✅ ZNANY DONGLE: ${isKnown}`);
        console.log(`   Nazwa systemowa: ${dev._name}`);
        console.log(`   ID: ${key}`);
      } else {
        console.log(`❓ NIEZNANE URZĄDZENIE: ${dev._name}`);
        console.log(`   Producent: ${dev.manufacturer || 'Brak danych'}`);
        console.log(`   ID do bazy (skopiuj to): "${key}": "Nazwa Twojego Urządzenia",`);
      }
      console.log("-------------------------------");
    });

  } catch (err) {
    console.error("❌ Błąd podczas skanowania USB:", err.message);
  }
}

scanDongles();
