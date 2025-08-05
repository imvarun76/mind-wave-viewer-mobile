#include <WiFi.h>
#include <HTTPClient.h>

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

unsigned long lastPush = 0;
const unsigned long PUSH_INTERVAL = 1000; // ms
float eegData[8] = {0};  // Filtered EEG values for all 8 channels

// No filtering - raw EEG data for natural zig-zag patterns

// Smoothed ADC read with proper scaling
float readCleanEEG(int pin, int samples = 16) {
  long sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin);
    delayMicroseconds(50);
  }
  float rawValue = (float)sum / samples;
  
  // Convert ADC reading to voltage (0-3.3V range with 12-bit resolution)
  float voltage = (rawValue * 3.3) / 4095.0;
  
  // Convert to microvolts for EEG (typical EEG range is 10-100 µV)
  // Scale appropriately based on your amplification circuit
  float microvolts = voltage * 1000000; // Convert to µV
  
  return microvolts;
}

void setupADC() {
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);  // Allows full 0-3.3V range
  
  // Initialize all ADC pins
  for (int i = 0; i < channelCount; i++) {
    pinMode(eegPins[i], INPUT);
  }
}

void sendEEGToFirebase(float channels[8]) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(FIREBASE_URL);
    http.addHeader("Content-Type", "application/json");

    String json = "{";
    for (int i = 0; i < 8; i++) {
      json += "\"ch" + String(i + 1) + "\":" + String(channels[i], 2);
      if (i < 7) json += ",";
    }
    json += ",\"timestamp\":" + String(millis());
    json += "}";

    Serial.println("📤 Sending JSON: " + json);
    int responseCode = http.PUT(json);
    Serial.print("📬 Firebase response: ");
    Serial.println(responseCode);
    http.end();
  } else {
    Serial.println("🚫 WiFi not connected");
  }
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
  Serial.println("🧠 8-Channel EEG System Initialized");
  Serial.println("📍 Using ADC1 pins: 32,33,34,35,36,37,38,39");
}

void loop() {
  // Read raw EEG data without filtering for natural zig-zag patterns
  for (int i = 0; i < channelCount; i++) {
    eegData[i] = readCleanEEG(eegPins[i]);
  }

  // Print all channel data
  Serial.print("🧠 EEG: ");
  for (int i = 0; i < channelCount; i++) {
    Serial.print("CH" + String(i + 1) + "=" + String(eegData[i], 1) + " ");
  }
  Serial.println();

  // Send to Firebase at specified interval
  if (millis() - lastPush >= PUSH_INTERVAL) {
    sendEEGToFirebase(eegData);
    lastPush = millis();
  }

  delay(4);  // 250 Hz sampling rate
}