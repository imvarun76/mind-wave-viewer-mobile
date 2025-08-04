/*
 * 8-Channel EEG Data Acquisition System for ESP32
 * 
 * This code reads from 8 analog channels and sends the data to Firebase
 * Optimized for electrode positions: FP1, FP2, T4, and additional channels
 * 
 * Pin Configuration:
 * - CH1 (FP1): GPIO 36 (A0) - Left Forehead
 * - CH2 (FP2): GPIO 39 (A3) - Right Forehead  
 * - CH3 (T4):  GPIO 34 (A6) - Right Temporal
 * - CH4:       GPIO 35 (A7) - Available
 * - CH5:       GPIO 32 (A4) - Available
 * - CH6:       GPIO 33 (A5) - Available
 * - CH7:       GPIO 25 (A18)- Available
 * - CH8:       GPIO 26 (A19)- Available
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Firebase configuration
const char* firebaseHost = "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app";
const char* firebaseAuth = "YOUR_FIREBASE_AUTH_TOKEN"; // Optional

// ADC pin definitions for 8 channels
const int adcPins[8] = {
  36, // CH1 - FP1 (Left Forehead)
  39, // CH2 - FP2 (Right Forehead)
  34, // CH3 - T4 (Right Temporal)
  35, // CH4 - Available
  32, // CH5 - Available
  33, // CH6 - Available
  25, // CH7 - Available
  26  // CH8 - Available
};

// Channel names for easy identification
const char* channelNames[8] = {"ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8"};

// Sampling configuration
const int samplingRate = 250; // Hz
const int samplingInterval = 1000 / samplingRate; // ms
unsigned long lastSampleTime = 0;
unsigned long startTime = 0;

// Data buffers
int channelData[8];
unsigned long timestamp;

// WiFi and HTTP client
WiFiClient client;
HTTPClient http;

// Status LEDs (optional)
const int statusLED = 2; // Built-in LED
bool ledState = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize status LED
  pinMode(statusLED, OUTPUT);
  digitalWrite(statusLED, LOW);
  
  // Configure ADC
  analogReadResolution(12); // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db); // Full range voltage
  
  // Initialize ADC pins
  for (int i = 0; i < 8; i++) {
    pinMode(adcPins[i], INPUT);
  }
  
  Serial.println("🧠 8-Channel EEG System Initializing...");
  Serial.println("📍 Channel Configuration:");
  Serial.println("   CH1 (Pin 36) - FP1 Left Forehead");
  Serial.println("   CH2 (Pin 39) - FP2 Right Forehead");
  Serial.println("   CH3 (Pin 34) - T4 Right Temporal");
  Serial.println("   CH4 (Pin 35) - Available");
  Serial.println("   CH5 (Pin 32) - Available");
  Serial.println("   CH6 (Pin 33) - Available");
  Serial.println("   CH7 (Pin 25) - Available");
  Serial.println("   CH8 (Pin 26) - Available");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Record start time
  startTime = millis();
  
  Serial.println("🚀 EEG acquisition started!");
  Serial.printf("📊 Sampling rate: %d Hz\n", samplingRate);
  Serial.println("💡 LED will blink to indicate data transmission");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time for the next sample
  if (currentTime - lastSampleTime >= samplingInterval) {
    lastSampleTime = currentTime;
    
    // Read all 8 channels
    readAllChannels();
    
    // Calculate timestamp since start
    timestamp = currentTime - startTime;
    
    // Send data to Firebase
    sendDataToFirebase();
    
    // Toggle status LED
    ledState = !ledState;
    digitalWrite(statusLED, ledState);
    
    // Print data to serial (for debugging)
    printChannelData();
  }
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi disconnected, reconnecting...");
    connectToWiFi();
  }
}

void readAllChannels() {
  // Read all 8 analog channels
  for (int i = 0; i < 8; i++) {
    channelData[i] = analogRead(adcPins[i]);
    
    // Optional: Apply basic noise filtering
    // channelData[i] = applySimpleFilter(channelData[i], i);
  }
}

void sendDataToFirebase() {
  if (WiFi.status() == WL_CONNECTED) {
    http.begin(String(firebaseHost) + "/devices/eeg_signals.json");
    http.addHeader("Content-Type", "application/json");
    
    // Create JSON payload
    DynamicJsonDocument doc(512);
    doc["timestamp"] = timestamp;
    
    // Add all channel data
    for (int i = 0; i < 8; i++) {
      doc[channelNames[i]] = channelData[i];
    }
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Send PUT request to update Firebase
    int httpResponseCode = http.PUT(jsonString);
    
    if (httpResponseCode > 0) {
      if (httpResponseCode != 200) {
        Serial.printf("⚠️  HTTP Response: %d\n", httpResponseCode);
      }
    } else {
      Serial.printf("❌ HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
    }
    
    http.end();
  }
}

void connectToWiFi() {
  WiFi.begin(ssid, password);
  Serial.print("🔗 Connecting to WiFi");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.printf("📡 IP address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("📶 Signal strength: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    Serial.println("🔄 Will retry in 5 seconds...");
    delay(5000);
  }
}

void printChannelData() {
  // Print data every 50 samples (reduce serial spam)
  static int sampleCounter = 0;
  sampleCounter++;
  
  if (sampleCounter >= 50) {
    sampleCounter = 0;
    
    Serial.printf("📊 [%lu ms] ", timestamp);
    for (int i = 0; i < 8; i++) {
      Serial.printf("%s:%d ", channelNames[i], channelData[i]);
    }
    Serial.println();
    
    // Print signal quality indicators
    printSignalQuality();
  }
}

void printSignalQuality() {
  Serial.print("🔍 Signal Status: ");
  for (int i = 0; i < 8; i++) {
    char status;
    if (channelData[i] == 4095) {
      status = 'F'; // Floating
    } else if (channelData[i] == 0) {
      status = 'G'; // Grounded
    } else if (channelData[i] > 100 && channelData[i] < 4000) {
      status = 'A'; // Active
    } else {
      status = 'N'; // Noise
    }
    Serial.printf("%s:%c ", channelNames[i], status);
  }
  Serial.println();
}

// Optional: Simple moving average filter
int applySimpleFilter(int newValue, int channelIndex) {
  static int filterBuffer[8][4] = {0}; // 4-point moving average for each channel
  static int filterIndex[8] = {0};
  
  // Update circular buffer
  filterBuffer[channelIndex][filterIndex[channelIndex]] = newValue;
  filterIndex[channelIndex] = (filterIndex[channelIndex] + 1) % 4;
  
  // Calculate average
  int sum = 0;
  for (int i = 0; i < 4; i++) {
    sum += filterBuffer[channelIndex][i];
  }
  
  return sum / 4;
}

// Optional: Detect electrode connection status
bool isElectrodeConnected(int channelIndex) {
  int value = channelData[channelIndex];
  
  // Floating pin detection
  if (value == 4095 || (value < 100 && value != 0) || value > 4000) {
    return false; // Likely floating or disconnected
  }
  
  return true; // Likely connected
}

// Optional: Print detailed diagnostics
void printDiagnostics() {
  Serial.println("🔧 === EEG SYSTEM DIAGNOSTICS ===");
  Serial.printf("⏱️  Uptime: %lu ms\n", millis() - startTime);
  Serial.printf("📡 WiFi Status: %s\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.printf("📶 Signal Strength: %d dBm\n", WiFi.RSSI());
  Serial.printf("🔋 Free Heap: %d bytes\n", ESP.getFreeHeap());
  
  Serial.println("📍 Electrode Status:");
  for (int i = 0; i < 8; i++) {
    bool connected = isElectrodeConnected(i);
    Serial.printf("   %s (Pin %d): %s (Value: %d)\n", 
                  channelNames[i], adcPins[i], 
                  connected ? "Connected" : "Disconnected", 
                  channelData[i]);
  }
  Serial.println("================================");
}