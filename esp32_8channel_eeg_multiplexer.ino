#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "iPhone";
const char* password = "vasm@12345";

// Firebase endpoint
const char* FIREBASE_URL = "https://databaseeeg-default-rtdb.asia-southeast1.firebasedatabase.app/devices/eeg_signals.json";

// 74HC4067 Multiplexer pins
#define MUX_SIG_PIN 36    // Signal pin (ADC input)
#define MUX_S0 32         // Select pin 0
#define MUX_S1 33         // Select pin 1  
#define MUX_S2 25         // Select pin 2
#define MUX_S3 26         // Select pin 3 (only needed for 16 channels, but we'll use 8)

// EEG Configuration
const int NUM_CHANNELS = 8;
const int SAMPLING_RATE = 250;  // Hz - Standard EEG sampling rate
const int SAMPLES_PER_CHANNEL = 16; // Oversampling for noise reduction
const unsigned long SAMPLE_INTERVAL = 1000000 / SAMPLING_RATE; // Microseconds
const unsigned long FIREBASE_INTERVAL = 100; // Send every 100ms for smooth waveforms

// Data storage
float eegChannels[NUM_CHANNELS];
unsigned long lastSampleTime = 0;
unsigned long lastFirebaseTime = 0;
unsigned long sampleCounter = 0;

// Initialize multiplexer
void setupMultiplexer() {
  pinMode(MUX_S0, OUTPUT);
  pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);
  pinMode(MUX_S3, OUTPUT);
  pinMode(MUX_SIG_PIN, INPUT);
  
  // Set ADC resolution and attenuation
  analogReadResolution(12); // 12-bit resolution (0-4095)
  analogSetAttenuation(ADC_11db); // Full 0-3.3V range
}

// Select multiplexer channel (0-7 for 8 channels)
void selectMuxChannel(int channel) {
  digitalWrite(MUX_S0, (channel & 0x01) ? HIGH : LOW);
  digitalWrite(MUX_S1, (channel & 0x02) ? HIGH : LOW);
  digitalWrite(MUX_S2, (channel & 0x04) ? HIGH : LOW);
  digitalWrite(MUX_S3, (channel & 0x08) ? HIGH : LOW);
  
  // Small delay for multiplexer switching
  delayMicroseconds(10);
}

// Read EEG channel with proper scaling and noise reduction
float readEEGChannel(int channel) {
  selectMuxChannel(channel);
  
  // Oversample for noise reduction
  long sum = 0;
  for (int i = 0; i < SAMPLES_PER_CHANNEL; i++) {
    sum += analogRead(MUX_SIG_PIN);
    delayMicroseconds(10);
  }
  
  float avgReading = (float)sum / SAMPLES_PER_CHANNEL;
  
  // Convert ADC reading to voltage
  float voltage = (avgReading * 3.3) / 4095.0;
  
  // Convert to microvolts for EEG display
  // Assuming your amplifier has appropriate gain for EEG signals
  float microvolts = voltage * 1000000; // Convert to µV
  
  // Add some realistic EEG-like variation for testing
  // Remove this in production with real EEG electrodes
  float timeVar = sin(millis() * 0.001 * (channel + 1)) * 50;
  float noiseVar = (random(-100, 100) * 0.1);
  
  return microvolts + timeVar + noiseVar;
}

// Generate realistic EEG test signal (remove when using real electrodes)
float generateTestEEGSignal(int channel) {
  float t = millis() * 0.001; // Time in seconds
  
  // Different frequency components for each channel
  float alpha = sin(2 * PI * (8 + channel) * t) * 20; // Alpha waves 8-13 Hz
  float beta = sin(2 * PI * (20 + channel) * t) * 10;  // Beta waves 13-30 Hz
  float noise = (random(-50, 50) * 0.1);               // Random noise
  
  // Base offset to center around typical EEG range
  float baseOffset = 1650000 + (channel * 1000); // Offset per channel
  
  return baseOffset + alpha + beta + noise;
}

// Send EEG data to Firebase
void sendEEGToFirebase() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("🚫 WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(FIREBASE_URL);
  http.addHeader("Content-Type", "application/json");

  // Create JSON payload
  StaticJsonDocument<512> doc;
  
  for (int i = 0; i < NUM_CHANNELS; i++) {
    String channelKey = "ch" + String(i + 1);
    doc[channelKey] = eegChannels[i];
  }
  
  doc["timestamp"] = millis();
  doc["sampling_rate"] = SAMPLING_RATE;
  doc["sample_count"] = sampleCounter;

  String jsonString;
  serializeJson(doc, jsonString);

  Serial.println("📤 Sending: " + jsonString);
  
  int responseCode = http.PUT(jsonString);
  Serial.print("📬 Response: ");
  Serial.println(responseCode);
  
  if (responseCode > 0) {
    String response = http.getString();
    if (responseCode != 200) {
      Serial.println("❌ Error: " + response);
    }
  }
  
  http.end();
}

void setup() {
  Serial.begin(115200);
  
  // Initialize multiplexer
  setupMultiplexer();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("🔌 Connecting to WiFi");
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n✅ WiFi connected!");
  Serial.println("📡 IP: " + WiFi.localIP().toString());
  Serial.println("🧠 8-Channel EEG with 74HC4067 Multiplexer");
  Serial.println("📊 Sampling Rate: " + String(SAMPLING_RATE) + " Hz");
  Serial.println("🔄 Firebase Update Rate: " + String(1000/FIREBASE_INTERVAL) + " Hz");
  
  lastSampleTime = micros();
  lastFirebaseTime = millis();
}

void loop() {
  unsigned long currentTime = micros();
  
  // Sample at precise intervals
  if (currentTime - lastSampleTime >= SAMPLE_INTERVAL) {
    
    // Read all 8 channels quickly
    for (int channel = 0; channel < NUM_CHANNELS; channel++) {
      // Use real EEG reading or test signal
      // eegChannels[channel] = readEEGChannel(channel); // Real EEG
      eegChannels[channel] = generateTestEEGSignal(channel); // Test signal
    }
    
    sampleCounter++;
    lastSampleTime = currentTime;
    
    // Print current readings
    if (sampleCounter % 50 == 0) { // Print every 50 samples (5 Hz when sampling at 250 Hz)
      Serial.print("🧠 [" + String(sampleCounter) + "] ");
      for (int i = 0; i < NUM_CHANNELS; i++) {
        Serial.print("CH" + String(i+1) + ":" + String((int)eegChannels[i]) + " ");
      }
      Serial.println();
    }
  }
  
  // Send to Firebase at specified interval
  if (millis() - lastFirebaseTime >= FIREBASE_INTERVAL) {
    sendEEGToFirebase();
    lastFirebaseTime = millis();
  }
  
  // Small delay to prevent watchdog issues
  delayMicroseconds(100);
}

// Optional: Function to calibrate channels
void calibrateChannels() {
  Serial.println("🔧 Calibrating channels...");
  
  for (int channel = 0; channel < NUM_CHANNELS; channel++) {
    float sum = 0;
    int samples = 100;
    
    for (int i = 0; i < samples; i++) {
      sum += readEEGChannel(channel);
      delay(10);
    }
    
    float baseline = sum / samples;
    Serial.println("CH" + String(channel + 1) + " baseline: " + String(baseline) + " µV");
  }
}