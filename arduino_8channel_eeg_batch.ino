#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "iPhone";
const char* password = "vasm@12345";

// Firebase endpoint
const char* FIREBASE_URL = "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/eeg_signals.json";

// EEG channels - Using all available ADC1 pins (ADC2 can't be used with WiFi)
#define CH1_PIN 32
#define CH2_PIN 33
#define CH3_PIN 34
#define CH4_PIN 35
#define CH5_PIN 36
#define CH6_PIN 37
#define CH7_PIN 38
#define CH8_PIN 39

const int eegPins[8] = {CH1_PIN, CH2_PIN, CH3_PIN, CH4_PIN, CH5_PIN, CH6_PIN, CH7_PIN, CH8_PIN};
const int channelCount = 8;

// Batch upload configuration
const int SAMPLES_PER_BATCH = 100;  // Collect 100 samples before sending
const int SAMPLE_RATE_HZ = 100;     // 100 Hz sampling (like LCD)
const unsigned long SAMPLE_INTERVAL = 1000 / SAMPLE_RATE_HZ; // 10ms per sample

// Data storage for batching
float eegBatch[SAMPLES_PER_BATCH][8];  // [sample][channel]
int currentSampleIndex = 0;
unsigned long lastSampleTime = 0;
unsigned long batchStartTime = 0;

// Smoothed ADC read with proper scaling (like LCD display)
float readCleanEEG(int pin, int samples = 16) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(50);
  }
  float rawValue = (float)sum / samples;
  
  // Convert ADC reading to voltage (0-3.3V range with 12-bit resolution)
  // This matches exactly what LCD display does: analogRead(SIG) * (3.3 / 4095.0)
  float voltage = (rawValue * 3.3) / 4095.0;
  
  return voltage; // Return voltage directly (0-3.3V range)
}

void setupADC() {
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // Allows full 0-3.3V range
  
  // Initialize all ADC pins
  for (int i = 0; i < channelCount; i++) {
    pinMode(eegPins[i], INPUT);
  }
}

// Send batch of EEG samples to Firebase
void sendBatchToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🚫 WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(FIREBASE_URL);
  http.addHeader("Content-Type", "application/json");

  // Create JSON structure optimized for smooth waveform display
  DynamicJsonDocument doc(8192); // Larger buffer for batch data
  
  // Add metadata
  doc["timestamp"] = millis();
  doc["batch_start"] = batchStartTime;
  doc["sample_rate"] = SAMPLE_RATE_HZ;
  doc["samples_count"] = SAMPLES_PER_BATCH;
  
  // Add channel arrays for smooth waveform reconstruction
  JsonObject channels = doc.createNestedObject("channels");
  
  for (int ch = 0; ch < channelCount; ch++) {
    String channelKey = "ch" + String(ch + 1);
    JsonArray channelArray = channels.createNestedArray(channelKey);
    
    // Add all samples for this channel
    for (int sample = 0; sample < SAMPLES_PER_BATCH; sample++) {
      channelArray.add(eegBatch[sample][ch]);
    }
  }
  
  // Also include latest single values for backward compatibility
  for (int ch = 0; ch < channelCount; ch++) {
    String channelKey = "ch" + String(ch + 1);
    doc[channelKey] = eegBatch[SAMPLES_PER_BATCH - 1][ch]; // Latest sample
  }

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("📤 Sending batch with " + String(SAMPLES_PER_BATCH) + " samples per channel");
  Serial.println("📏 JSON size: " + String(jsonString.length()) + " bytes");
  
  int responseCode = http.PUT(jsonString);
  Serial.print("📬 Firebase response: ");
  Serial.println(responseCode);
  
  if (responseCode != 200) {
    Serial.println("❌ Upload failed, response: " + String(responseCode));
  } else {
    Serial.println("✅ Batch uploaded successfully!");
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  setupADC();

  Serial.print("🔌 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi connected. IP: " + WiFi.localIP().toString());
  Serial.println("🧠 8-Channel EEG Batch System Initialized");
  Serial.println("📍 Using ADC1 pins: 32,33,34,35,36,37,38,39");
  Serial.println("📊 Batch size: " + String(SAMPLES_PER_BATCH) + " samples @ " + String(SAMPLE_RATE_HZ) + " Hz");
  
  batchStartTime = millis();
  lastSampleTime = millis();
}

void loop() {
  unsigned long currentTime = millis();
  
  // Sample at fixed rate (100 Hz like LCD display)
  if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {
    
    // Read all channels for this sample
    for (int ch = 0; ch < channelCount; ch++) {
      eegBatch[currentSampleIndex][ch] = readCleanEEG(eegPins[ch]);
    }
    
    // Print current sample (for debugging)
    Serial.print("Sample " + String(currentSampleIndex) + ": ");
    for (int ch = 0; ch < channelCount; ch++) {
      Serial.print("CH" + String(ch + 1) + "=" + String(eegBatch[currentSampleIndex][ch], 3) + "V ");
    }
    Serial.println();
    
    currentSampleIndex++;
    lastSampleTime = currentTime;
    
    // When batch is full, send to Firebase
    if (currentSampleIndex >= SAMPLES_PER_BATCH) {
      Serial.println("🏁 Batch complete! Sending to Firebase...");
      sendBatchToFirebase();
      
      // Reset for next batch
      currentSampleIndex = 0;
      batchStartTime = millis();
      
      Serial.println("🔄 Starting new batch collection...");
    }
  }
  
  // Small delay to prevent watchdog reset but maintain timing
  delay(1);
}